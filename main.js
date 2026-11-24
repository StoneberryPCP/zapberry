// ZapBerry — cliente WhatsApp multi-conta (Electron)
// Cada conta = BrowserView com sessão isolada (partition persist:wa-<id>).
// UI da barra lateral é HTML puro (ui/sidebar.html) — leve, sem framework.
const {
  app, BrowserWindow, BrowserView, Tray, Menu, MenuItem, shell, ipcMain,
  nativeTheme, nativeImage, globalShortcut, session, dialog, Notification, powerSaveBlocker, safeStorage,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { criarFila } = require('./lib/filaAviso');
const { criarServico } = require('./lib/bot/servico');
const { criarAuth, criarRest, cifraElectron } = require('./lib/sbAuth');

const SIDEBAR_W = 76;
const WA_URL = 'https://web.whatsapp.com';
// User-agent de Chrome puro — sem isso o WhatsApp Web recusa ("navegador não suportado")
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

let win = null;
let tray = null;
let snipWin = null;
let berryWin = null;
let autoWin = null;
let cfg = null;
let bot = null;              // serviço do bot "berry" (lib/bot/servico.js)
let auth = null;             // login no Supabase (lib/sbAuth.js): o banco só aceita quem está logado
let restFn = null;           // fetch no PostgREST com o token do login
const views = new Map();     // id -> BrowserView
const badges = new Map();    // id -> número de não lidas
const blurKeys = new Map();  // id -> chave do CSS de blur inserido
const popped = new Map();    // id -> BrowserWindow (conta destacada em janela própria)

/* ─── Config persistida ─────────────────────────────────────────── */
const cfgPath = () => path.join(app.getPath('userData'), 'whatsapx.json');

function loadCfg() {
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath(), 'utf8'));
  } catch {
    cfg = null;
  }
  if (!cfg || !Array.isArray(cfg.contas)) {
    cfg = {
      contas: [{ id: 1, nome: 'Principal', cor: CORES[0] }],
      ativa: 1,
      tema: 'system',
      dnd: false,
      blurPrivacidade: false,
      alwaysOnTop: false,
      autostart: false,
      zooms: {},
      bounds: null,
      snippets: [
        { atalho: 'preço', texto: 'Bom dia! Segue nossa tabela de preços atualizada. Qualquer dúvida estou à disposição.' },
        { atalho: 'pix', texto: 'Nossa chave PIX é o CNPJ: 00.000.000/0000-00 (edite em Respostas rápidas).' },
      ],
    };
  }
  if (!Array.isArray(cfg.snippets)) cfg.snippets = [];
  // Duplo clique na mensagem → reage com este emoji (null = desligado)
  if (cfg.reacao === undefined) cfg.reacao = '👍';
  // Integração Stoneberry (Supabase do sistema) — pode trocar no whatsapx.json
  if (!cfg.berry) {
    cfg.berry = {
      url: 'https://csdjgalquzlwvqxxslmm.supabase.co',
      login: null, // { email, senhaEnc } — senha criptografada pelo Windows (ver lib/sbAuth.js)
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZGpnYWxxdXpsd3ZxeHhzbG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTIxOTUsImV4cCI6MjA5MTM2ODE5NX0.KjehxbTro07JPzI7-hkElBQ1aou3p_WmFMDQGuvbZJ8',
    };
  }
  return cfg;
}
function saveCfg() {
  try { fs.writeFileSync(cfgPath(), JSON.stringify(cfg, null, 2)); } catch { /* ignore */ }
}

/* ─── Views (uma por conta) ─────────────────────────────────────── */
function boundsView() {
  const [w, h] = win.getContentSize();
  return { x: SIDEBAR_W, y: 0, width: Math.max(0, w - SIDEBAR_W), height: h };
}

// WhatsApp novo pode renderizar dentro de iframe: manda pra TODOS os frames
// (o preload roda em cada um; quem tiver o DOM do app age, o resto ignora).
function sendWa(wc, canal, dados) {
  try {
    wc.mainFrame.framesInSubtree.forEach((f) => { try { f.send(canal, dados); } catch { /* frame morto */ } });
  } catch { try { wc.send(canal, dados); } catch { /* ignore */ } }
}

function enviarSnippets() {
  for (const view of views.values()) {
    try { sendWa(view.webContents, 'snippets', cfg.snippets); } catch { /* ignore */ }
  }
}

// Diagnóstico do preload (comandos/inserir): %APPDATA%/zapberry/zapberry-debug.log
ipcMain.on('wa-log', (_e, msg) => {
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'zapberry-debug.log'),
      `${new Date().toISOString()} ${msg}\n`);
  } catch { /* ignore */ }
});

function criarView(conta) {
  if (views.has(conta.id)) return views.get(conta.id);
  const ses = session.fromPartition(`persist:wa-${conta.id}`);
  ses.setSpellCheckerLanguages(['pt-BR', 'en-US']);
  ses.setPermissionRequestHandler((wc, permission, cb) => {
    if (permission === 'notifications') return cb(!cfg.dnd);
    if (['media', 'clipboard-sanitized-write', 'fullscreen'].includes(permission)) return cb(true);
    cb(false);
  });
  ses.setPermissionCheckHandler((wc, permission) => {
    if (permission === 'notifications') return !cfg.dnd;
    return ['media', 'clipboard-sanitized-write', 'fullscreen'].includes(permission);
  });

  const view = new BrowserView({
    webPreferences: {
      partition: `persist:wa-${conta.id}`,
      preload: path.join(__dirname, 'wa-preload.js'),
      spellcheck: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true, // preload também nos iframes (layout novo do WA)
    },
  });
  view.setBackgroundColor('#0b141a');
  const wc = view.webContents;
  wc.setUserAgent(CHROME_UA);
  wc.loadURL(WA_URL, { userAgent: CHROME_UA });

  // Badge: WhatsApp põe "(N)" no título quando há não lidas
  wc.on('page-title-updated', (_e, title) => {
    const m = title.match(/\((\d+)\)/);
    badges.set(conta.id, m ? parseInt(m[1], 10) : 0);
    atualizarBadges();
  });

  // Link externo → navegador do sistema; navegação presa no WhatsApp
  wc.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('https://web.whatsapp.com')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith('https://web.whatsapp.com')) { e.preventDefault(); shell.openExternal(url); }
  });

  // Se o renderer morrer, ressuscita sozinho
  wc.on('render-process-gone', () => { try { wc.reload(); } catch { /* ignore */ } });

  // WA-JS (WPPConnect): API interna do WhatsApp — envio por ID de chat,
  // sem depender da interface. Injeta a cada load da página.
  wc.on('did-finish-load', () => { injetarWaJs(wc); });

  // Bot berry: escuta as perguntas que chegam nesta conta (só age se estiver ligado e for a conta escolhida)
  if (bot) bot.anexar(conta.id, wc);

  // Zoom persistido + snippets + atalhos com foco dentro do site
  wc.on('dom-ready', () => {
    const z = cfg.zooms[conta.id];
    if (z) wc.setZoomFactor(z);
    sendWa(wc, 'snippets', cfg.snippets);
    sendWa(wc, 'reacao', cfg.reacao);
  });
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (handleAtalho(input, conta.id)) e.preventDefault();
  });

  views.set(conta.id, view);
  return view;
}

function selecionarConta(id) {
  const conta = cfg.contas.find((c) => c.id === id);
  if (!conta || !win) return;
  // Conta destacada em janela própria → só foca a janela dela
  if (popped.has(id)) { const w2 = popped.get(id); w2.show(); w2.focus(); return; }
  cfg.ativa = id;
  saveCfg();
  const view = criarView(conta);
  win.setBrowserView(view);
  view.setBounds(boundsView());
  view.setAutoResize({ width: true, height: true });
  view.webContents.focus();
  enviarContas();
}

function addConta() {
  const id = Math.max(0, ...cfg.contas.map((c) => c.id)) + 1;
  cfg.contas.push({ id, nome: `Conta ${id}`, cor: CORES[(id - 1) % CORES.length] });
  saveCfg();
  selecionarConta(id);
}

function removerConta(id) {
  if (cfg.contas.length <= 1) return;
  const conta = cfg.contas.find((c) => c.id === id);
  const ok = dialog.showMessageBoxSync(win, {
    type: 'warning',
    buttons: ['Cancelar', 'Remover'],
    defaultId: 0, cancelId: 0,
    message: `Remover a conta "${conta?.nome}"?`,
    detail: 'A sessão (login) dessa conta será apagada deste computador.',
  });
  if (ok !== 1) return;
  if (popped.has(id)) { popped.get(id).destroy(); popped.delete(id); }
  const view = views.get(id);
  if (view) {
    if (win.getBrowserView() === view) win.setBrowserView(null);
    view.webContents.destroy();
    views.delete(id);
  }
  session.fromPartition(`persist:wa-${id}`).clearStorageData().catch(() => { /* ignore */ });
  cfg.contas = cfg.contas.filter((c) => c.id !== id);
  badges.delete(id);
  delete cfg.zooms[id];
  if (cfg.ativa === id) cfg.ativa = cfg.contas[0].id;
  saveCfg();
  selecionarConta(cfg.ativa);
  atualizarBadges();
}

/* ─── Pop-out: conta em janela separada (multi-monitor) ─────────── */
function destacarConta(id) {
  const conta = cfg.contas.find((c) => c.id === id);
  if (!conta || popped.has(id)) return;
  const view = criarView(conta);
  if (win.getBrowserView() === view) win.setBrowserView(null);

  const w2 = new BrowserWindow({
    width: 1000, height: 760, minWidth: 480, minHeight: 480,
    title: `${conta.nome} — ZapBerry`,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#111b21',
  });
  w2.setBrowserView(view);
  const fit = () => { const [w, h] = w2.getContentSize(); view.setBounds({ x: 0, y: 0, width: w, height: h }); };
  fit();
  view.setAutoResize({ width: true, height: true });
  ['resize', 'maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen'].forEach((ev) => {
    w2.on(ev, () => { fit(); setTimeout(fit, 60); });
  });
  w2.on('closed', () => {
    popped.delete(id);
    // devolve a view pra janela principal se a conta for a ativa
    if (!win || win.isDestroyed()) return;
    if (cfg.ativa === id) selecionarConta(id);
    enviarContas();
  });
  popped.set(id, w2);

  // janela principal mostra outra conta no lugar
  const outra = cfg.contas.find((c) => c.id !== id && !popped.has(c.id));
  if (outra) selecionarConta(outra.id);
  else { win.setBrowserView(null); enviarContas(); }
}

function trazerDeVolta(id) {
  const w2 = popped.get(id);
  if (w2) w2.close(); // 'closed' handler devolve
}

function menuConta(id) {
  const conta = cfg.contas.find((c) => c.id === id);
  if (!conta) return;
  const estaPopped = popped.has(id);
  const menu = new Menu();
  menu.append(new MenuItem({ label: conta.nome, enabled: false }));
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem(estaPopped
    ? { label: '⬅ Trazer de volta pra janela principal', click: () => trazerDeVolta(id) }
    : { label: '🗗 Abrir em janela separada', click: () => destacarConta(id) }));
  menu.append(new MenuItem({ label: 'Renomear', click: () => win.webContents.send('pedir-rename', id) }));
  menu.append(new MenuItem({
    label: 'Cor', submenu: CORES.map((cor) => ({
      label: cor, type: 'radio', checked: conta.cor === cor,
      click: () => { conta.cor = cor; saveCfg(); enviarContas(); },
    })),
  }));
  menu.append(new MenuItem({ label: 'Recarregar', click: () => views.get(id)?.webContents.reload() }));
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({ label: 'Remover conta…', click: () => removerConta(id) }));
  menu.popup({ window: win });
}

/* ─── Badges (sidebar + tray + título) ──────────────────────────── */
function totalBadges() {
  return [...badges.values()].reduce((s, n) => s + n, 0);
}
function atualizarBadges() {
  const total = totalBadges();
  if (win && !win.isDestroyed()) {
    win.setTitle(total > 0 ? `ZapBerry (${total})` : 'ZapBerry');
    win.webContents.send('badges', Object.fromEntries(badges));
    if (process.platform === 'win32') {
      win.setOverlayIcon(total > 0 ? dotIcon() : null, total > 0 ? `${total} não lidas` : '');
      if (total > 0 && !win.isFocused()) win.flashFrame(true);
    }
  }
  for (const [id, w2] of popped) {
    const conta = cfg.contas.find((c) => c.id === id);
    const n = badges.get(id) || 0;
    if (!w2.isDestroyed()) w2.setTitle(`${n > 0 ? `(${n}) ` : ''}${conta?.nome ?? 'Conta'} — ZapBerry`);
  }
  if (app.setBadgeCount) app.setBadgeCount(total); // Linux (Unity/KDE) e macOS
  if (tray) tray.setToolTip(total > 0 ? `ZapBerry — ${total} não lida(s)` : 'ZapBerry');
}

let _dot = null;
function dotIcon() {
  if (_dot) return _dot;
  const png = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAmklEQVQ4jc2SsQ3CMBBFn5MFogwQZYAMkAFSMkAGSJkBMkAGSMkAKRkgAyRlBkiJhCiQEsWxfSdE8au7f/f/vzsb/gYDcAWmwAy4AHegDXSABnAG9sAJOAJ7YAe0gS3QAdZAE1gBS2AOTIEJMAYGQA/oAi2gCTSAGlAFKkAZKAFFoADkgRyQBTJAGkgBSSABxIEYEP31Cb/HB6cAJqvR9wZfAAAAAElFTkSuQmCC';
  _dot = nativeImage.createFromDataURL('data:image/png;base64,' + png);
  return _dot;
}

/* ─── Blur de privacidade (janela sem foco → conversa desfocada) ── */
async function aplicarBlur(on) {
  for (const [id, view] of views) {
    if (popped.has(id)) continue; // janela destacada tem foco próprio
    try {
      if (on && !blurKeys.has(id)) {
        const key = await view.webContents.insertCSS('body{filter:blur(9px) !important;transition:filter .15s}');
        blurKeys.set(id, key);
      } else if (!on && blurKeys.has(id)) {
        await view.webContents.removeInsertedCSS(blurKeys.get(id));
        blurKeys.delete(id);
      }
    } catch { /* view ainda carregando */ }
  }
}

/* ─── Tema ──────────────────────────────────────────────────────── */
function aplicarTema() {
  nativeTheme.themeSource = cfg.tema;
  const t = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  for (const w of [win, snipWin, berryWin]) {
    if (w && !w.isDestroyed()) { w.webContents.send('ui-theme', t); w.webContents.send('tema-escolha', cfg.tema); }
  }
}
ipcMain.on('set-tema', (_e, tema) => {
  if (['system', 'light', 'dark'].includes(tema)) { cfg.tema = tema; saveCfg(); aplicarTema(); }
});
ipcMain.handle('get-tema', () => cfg.tema);

/* ─── Atalhos ───────────────────────────────────────────────────── */
function handleAtalho(input, contaId = null) {
  const ctrl = input.control || input.meta;
  const alvo = contaId ?? cfg.ativa;
  const view = views.get(alvo);
  if (ctrl && !input.shift && /^[1-9]$/.test(input.key)) {
    const conta = cfg.contas[parseInt(input.key, 10) - 1];
    if (conta) selecionarConta(conta.id);
    return true;
  }
  if (ctrl && (input.key === '=' || input.key === '+')) { mudarZoom(alvo, 0.1); return true; }
  if (ctrl && input.key === '-') { mudarZoom(alvo, -0.1); return true; }
  if (ctrl && input.key === '0') { mudarZoom(alvo, null); return true; }
  if (ctrl && input.key.toLowerCase() === 'n' && !input.shift) { addConta(); return true; }
  if (ctrl && input.key.toLowerCase() === 'r' && view) { view.webContents.reload(); return true; }
  if (input.key === 'Escape' && ctrl) { win.hide(); return true; } // boss key Ctrl+Esc
  return false;
}
function mudarZoom(id, delta) {
  const view = views.get(id);
  if (!view) return;
  const wc = view.webContents;
  const z = delta == null ? 1 : Math.min(2, Math.max(0.5, wc.getZoomFactor() + delta));
  wc.setZoomFactor(z);
  cfg.zooms[id] = z;
  saveCfg();
}

/* ─── Respostas rápidas (gerenciador) ───────────────────────────── */
function abrirSnippets() {
  if (snipWin && !snipWin.isDestroyed()) { snipWin.show(); snipWin.focus(); return; }
  snipWin = new BrowserWindow({
    width: 520, height: 620, title: 'Respostas rápidas — ZapBerry',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true, parent: win, backgroundColor: '#111b21',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  snipWin.loadFile(path.join(__dirname, 'ui', 'snippets.html'));
  snipWin.webContents.on('did-finish-load', () => aplicarTema());
  snipWin.on('closed', () => { snipWin = null; });
}
/* ─── ZapBerry: integração com o sistema Stoneberry ─────────────── */
function abrirBerry() {
  if (berryWin && !berryWin.isDestroyed()) { berryWin.show(); berryWin.focus(); return; }
  berryWin = new BrowserWindow({
    width: 1240, height: 800, minWidth: 980, minHeight: 640,
    title: 'ZapBerry — Stoneberry',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true, backgroundColor: '#111b21',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  berryWin.loadFile(path.join(__dirname, 'ui', 'berry.html'));
  berryWin.webContents.on('did-finish-load', () => {
    aplicarTema();
    if (berryPreset) { berryWin.webContents.send('berry-preset', berryPreset); berryPreset = null; }
  });
  // devolve o foco do teclado à página sempre que a janela é ativada (campos de texto não podem ficar mudos)
  berryWin.on('focus', () => { try { berryWin.webContents.focus(); } catch { /* janela fechando */ } });
  berryWin.on('closed', () => { berryWin = null; });
}
ipcMain.on('abrir-berry', abrirBerry);
// A janela 🍓 só recebe url e chave pública: a senha guardada nunca sai do processo principal
ipcMain.handle('get-berry-config', () => ({ url: cfg.berry.url, key: cfg.berry.key }));
ipcMain.handle('berry-token', (_e, forcar) => auth.token({ forcar: !!forcar }).catch(() => null));
ipcMain.handle('berry-login-status', () => auth.status());
ipcMain.handle('berry-login-salvar', async (_e, { email, senha } = {}) => {
  try { return { ok: true, ...(await auth.definirLogin(email, senha)) }; } catch (e) { return { ok: false, erro: e.message }; }
});
ipcMain.handle('berry-login-sair', () => auth.sair());
// Insere texto no campo de mensagem da conta ativa (a conversa precisa estar aberta)
ipcMain.on('berry-inserir', (_e, texto) => {
  const view = views.get(cfg.ativa);
  if (view) sendWa(view.webContents, 'inserir-texto', texto);
  if (popped.has(cfg.ativa)) { const w2 = popped.get(cfg.ativa); w2.show(); w2.focus(); }
  else if (win) { win.show(); win.focus(); view?.webContents.focus(); }
});

/* ─── Comandos no chat: /estoque X · /blocos X · /serrado X (+ Tab) ─
   Abre a janela 🍓 já na aba certa com a busca feita — você confere o que
   tem, marca o que vai e clica "Inserir no chat ativo". Nada entra sozinho. */
let berryPreset = null;
ipcMain.on('berry-comando', (_e, { cmd, arg }) => {
  const aba = cmd === 'estoque' ? 'chapas' : cmd === 'blocos' ? 'blocos' : 'serradas';
  berryPreset = { aba, cliente: arg };
  if (berryWin && !berryWin.isDestroyed()) {
    berryWin.show(); berryWin.focus();
    berryWin.webContents.send('berry-preset', berryPreset);
    berryPreset = null;
  } else {
    abrirBerry(); // did-finish-load manda o preset pendente
  }
});

/* ─── Envio aprovado: "Revisei → enviar" (F1 serradas) ──────────────
   Berry manda a lista [{clienteId, grupoNome, grupoJid, texto, refs[]}].
   Envia UM grupo por vez pela conta ativa, confere o JID antes de soltar,
   grava em zapberry_avisos (anti-duplicata) e reporta o progresso. */
async function sbRest(pathQS, opts = {}) {
  if (!restFn) throw new Error('ZapBerry ainda iniciando');
  return restFn(pathQS, opts); // usa o token do login (lib/sbAuth.js); sem login, falha com mensagem clara
}

let WA_JS_SRC = null;
async function injetarWaJs(wc) {
  try {
    if (!WA_JS_SRC) WA_JS_SRC = fs.readFileSync(path.join(__dirname, 'assets', 'wppconnect-wa.js'), 'utf8');
    const ja = await wc.executeJavaScript('typeof WPP !== "undefined"', true).catch(() => false);
    if (!ja) await wc.executeJavaScript(WA_JS_SRC, true);
  } catch { /* tenta de novo no próximo load/envio */ }
}

/* ─── Reação no duplo clique ────────────────────────────────────────
   wa-preload detecta o duplo clique em cima da bolha da mensagem e manda
   o data-id dela; aqui reage pelo WA-JS na mesma conta (webContents que mandou). */
const REACOES = ['👍', '❤️', '😂', '😮', '😢', '🙏', '✅', '👏', '🔥', '🤝', '👀'];

ipcMain.on('reagir-msg', async (e, msgId) => {
  const emoji = cfg.reacao;
  if (!emoji || typeof msgId !== 'string' || !/^[\w@.:-]{6,200}$/.test(msgId)) return;
  const wc = e.sender;
  const responder = (txt) => { try { (e.senderFrame ?? wc).send('reacao-resultado', txt); } catch { /* frame fechou */ } };
  await injetarWaJs(wc);
  const script = `(async () => {
    const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 10; i++) {
      if (typeof WPP !== 'undefined' && WPP.isReady) break;
      await dorme(300);
    }
    if (typeof WPP === 'undefined' || !WPP.isReady) return 'WPP nao carregou';
    const ID = ${JSON.stringify(msgId)};
    // id completo (formato antigo): reage direto
    if (/^(true|false)_/.test(ID)) {
      await WPP.chat.sendReactionToMessage(ID, ${JSON.stringify(emoji)});
      return 'ok';
    }
    // id curto (formato novo do WhatsApp): acha a mensagem pelo id dentro do chat aberto
    const chat = WPP.chat.getActiveChat();
    const doChat = (m) => !chat || String(m.id.remote?._serialized ?? m.id.remote) === chat.id._serialized;
    let msg = null;
    try { msg = WPP.whatsapp.MsgStore.getModelsArray().find((m) => m.id && m.id.id === ID && doChat(m)); } catch (e) { /* segue */ }
    if (!msg && chat) {
      const lista = await WPP.chat.getMessages(chat.id._serialized, { count: 300 });
      const achou = lista.find((m) => m.id && m.id.id === ID);
      if (achou) msg = achou.id._serialized;
    }
    if (!msg) return 'mensagem nao encontrada no chat aberto';
    await WPP.chat.sendReactionToMessage(msg, ${JSON.stringify(emoji)});
    return 'ok';
  })()`;
  try {
    const r = await wc.executeJavaScript(script, true);
    if (r !== 'ok') throw new Error(r);
  } catch (err) {
    try {
      fs.appendFileSync(path.join(app.getPath('userData'), 'zapberry-debug.log'),
        `${new Date().toISOString()} reagir-msg ERRO (${msgId}): ${err?.message ?? err}\n`);
    } catch { /* ignore */ }
    responder(`ZapBerry: reação falhou — ${String(err?.message ?? err).slice(0, 120)}`);
  }
});

function enviarReacao() {
  if (win && !win.isDestroyed()) win.webContents.send('reacao-atual', cfg.reacao);
  for (const view of views.values()) sendWa(view.webContents, 'reacao', cfg.reacao);
}
ipcMain.handle('get-reacao', () => cfg.reacao);
ipcMain.on('menu-reacao', () => {
  const menu = new Menu();
  menu.append(new MenuItem({ label: 'Duplo clique na mensagem reage com:', enabled: false }));
  menu.append(new MenuItem({ type: 'separator' }));
  for (const r of REACOES) {
    menu.append(new MenuItem({
      label: r, type: 'radio', checked: cfg.reacao === r,
      click: () => { cfg.reacao = r; saveCfg(); enviarReacao(); },
    }));
  }
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({
    label: 'Desligado', type: 'radio', checked: !cfg.reacao,
    click: () => { cfg.reacao = null; saveCfg(); enviarReacao(); },
  }));
  menu.popup({ window: win });
});

// Envio preferencial: WA-JS (API interna, por ID). Fallback: automação da UI.
async function enviarViaWpp(item) {
  const view = views.get(cfg.ativa);
  if (!view) return { ok: false, motivo: 'nenhuma conta ativa' };
  await injetarWaJs(view.webContents);
  const script = `(async () => {
    const GRUPO = ${JSON.stringify(item.grupoNome)};
    const JID = ${JSON.stringify(item.grupoJid || '')};
    const TEXTO = ${JSON.stringify(item.texto)};
    const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 30; i++) {
      if (typeof WPP !== 'undefined' && WPP.isReady) break;
      await dorme(500);
    }
    if (typeof WPP === 'undefined' || !WPP.isReady) return { ok: false, motivo: 'WPP nao carregou' };
    let jid = JID;
    if (!jid) {
      const chats = await WPP.chat.list();
      const alvo = chats.filter((c) => {
        const n = (c.name || c.formattedTitle || '').trim().toLowerCase();
        return n === GRUPO.trim().toLowerCase();
      });
      if (alvo.length === 0) return { ok: false, motivo: 'grupo nao encontrado pelo nome: ' + GRUPO };
      if (alvo.length > 1) return { ok: false, motivo: 'mais de um chat com esse nome — vincule pelo ID' };
      jid = alvo[0].id._serialized;
    }
    try { await WPP.chat.openChatBottom(jid); } catch (e) { /* visual apenas */ }
    const r = await WPP.chat.sendTextMessage(jid, TEXTO, { createChat: false });
    return { ok: true, jidDetectado: jid, msgId: r && r.id ? String(r.id) : null };
  })()`;
  try {
    const r = await Promise.race([
      view.webContents.executeJavaScript(script, true),
      new Promise((res) => setTimeout(() => res({ ok: false, motivo: 'tempo esgotado (WPP)' }), 45000)),
    ]);
    return r ?? { ok: false, motivo: 'sem resposta (WPP)' };
  } catch (e) {
    return { ok: false, motivo: `WPP: ${e?.message ?? e}` };
  }
}

// Fallback: automação da interface (busca → abre → cola → envia).
async function enviarNoWhats(item) {
  const view = views.get(cfg.ativa);
  if (!view) return { ok: false, motivo: 'nenhuma conta ativa' };
  const script = `(async () => {
    const GRUPO = ${JSON.stringify(item.grupoNome)};
    const JID = ${JSON.stringify(item.grupoJid || '')};
    const TEXTO = ${JSON.stringify(item.texto)};
    const NL = String.fromCharCode(10);
    const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
    const dbg = {};
    const clique = (el) => {
      const r = el.getBoundingClientRect();
      const o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((t) =>
        el.dispatchEvent(t.indexOf('pointer') === 0 ? new PointerEvent(t, o) : new MouseEvent(t, o)));
    };
    const enter = (el) => ['keydown', 'keypress', 'keyup'].forEach((t) =>
      el.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })));
    const campoMsg = () => {
      const cs = [...document.querySelectorAll('div[contenteditable="true"]')];
      return cs.find((el) => el.closest('footer')) || null;
    };
    const jidAberto = () => {
      // 1º: id oficial do chat ativo, se o WA-JS estiver de pé
      try {
        if (typeof WPP !== 'undefined' && WPP.isReady) {
          const c = WPP.chat.getActiveChat();
          if (c && c.id && c.id._serialized) { dbg.via = 'wpp'; return c.id._serialized; }
        }
      } catch (e) { /* cai pro DOM */ }
      // 2º: id mais frequente no DOM. Vínculo de GRUPO só compara com ids de grupo: as mensagens trazem o id (@lid)
      // de quem escreveu, e num grupo movimentado esse id aparecia mais vezes que o do próprio grupo.
      let all = [...document.body.innerHTML.matchAll(/([0-9][0-9-]{6,}@(?:g\\.us|c\\.us|lid|s\\.whatsapp\\.net))/g)].map((m) => m[1]);
      if (JID.indexOf('@g.us') > 0) all = all.filter((j) => j.indexOf('@g.us') > 0);
      if (!all.length) return null;
      const f = {};
      all.forEach((j) => { f[j] = (f[j] || 0) + 1; });
      return Object.entries(f).sort((a, b) => b[1] - a[1])[0][0];
    };

    const editaveis = [...document.querySelectorAll('div[contenteditable="true"], [role="textbox"]')];
    dbg.editaveis = editaveis.length;
    let busca = document.querySelector('div[contenteditable="true"][data-tab="3"]')
      || document.querySelector('[aria-label="Pesquisar"] div[contenteditable="true"]')
      || document.querySelector('[aria-label="Caixa de texto de pesquisa"]')
      || document.querySelector('[aria-label="Search input textbox"]');
    if (!busca) {
      const c = editaveis
        .filter((el) => !el.closest('footer'))
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 50 && r.height > 0; })
        .sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (ra.top + ra.left) - (rb.top + rb.left); });
      busca = c[0] || null;
    }
    if (!busca) return { ok: false, motivo: 'sem campo de busca', dbg };

    clique(busca);
    busca.focus();
    const sel = getSelection();
    sel.selectAllChildren(busca);
    document.execCommand('insertText', false, GRUPO);
    await dorme(1500);
    enter(busca);
    await dorme(1400);
    if (!campoMsg()) {
      const p = document.querySelector('#pane-side [role="listitem"], #pane-side [role="row"]');
      if (p) { clique(p); await dorme(1300); }
    }
    const campo = campoMsg();
    if (!campo) return { ok: false, motivo: 'conversa nao abriu pela busca', dbg };

    const aberto = jidAberto();
    dbg.jidAberto = aberto;
    if (JID) {
      const a = (aberto || '').split('@')[0];
      const b = JID.split('@')[0];
      if (!a || (a !== b && a.indexOf(b) < 0 && b.indexOf(a) < 0)) {
        return { ok: false, motivo: 'chat aberto nao confere com o grupo vinculado', dbg };
      }
    } else {
      const hs = [...document.querySelectorAll('header')].filter((h) => !h.closest('#pane-side'));
      let nome = null;
      for (const h of hs) {
        const t = (h.querySelector('span[dir="auto"], span[title]') || {}).textContent || '';
        if (t.trim()) { nome = t.trim(); break; }
      }
      dbg.nomeAberto = nome;
      if (!nome || nome.toLowerCase() !== GRUPO.toLowerCase()) {
        return { ok: false, motivo: 'chat aberto (' + (nome || '?') + ') nao e o grupo', dbg };
      }
    }

    clique(campo);
    campo.focus();
    const s2 = getSelection();
    s2.selectAllChildren(campo);
    s2.collapseToEnd();
    const antes = campo.textContent || '';
    const dt = new DataTransfer();
    dt.setData('text/plain', TEXTO);
    campo.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await dorme(500);
    if ((campo.textContent || '') === antes) {
      const linhas = TEXTO.split(NL);
      for (let i = 0; i < linhas.length; i++) {
        if (linhas[i]) document.execCommand('insertText', false, linhas[i]);
        if (i < linhas.length - 1) document.execCommand('insertLineBreak');
      }
    }
    await dorme(600);
    const btn = (document.querySelector('span[data-icon="send"]') || {}).closest
      ? (document.querySelector('span[data-icon="send"]').closest('button'))
      : null;
    const btn2 = btn || document.querySelector('button[aria-label="Enviar"], button[aria-label="Send"]');
    if (btn2) btn2.click();
    else enter(campo);
    await dorme(700);
    return { ok: true, jidDetectado: aberto, dbg };
  })()`;
  try {
    const r = await Promise.race([
      view.webContents.executeJavaScript(script, true),
      new Promise((res) => setTimeout(() => res({ ok: false, motivo: 'tempo esgotado' }), 45000)),
    ]);
    if (r && !r.ok && r.dbg) r.motivo = `${r.motivo} [${JSON.stringify(r.dbg)}]`;
    return r ?? { ok: false, motivo: 'sem resposta' };
  } catch (e) {
    return { ok: false, motivo: `script: ${e?.message ?? e}` };
  }
}

ipcMain.handle('enviar-avisos', async (_e, itens) => {
  const resultado = [];
  // traz a janela principal com a conta ativa pra frente — envio é visível
  if (win) { win.show(); win.focus(); }
  for (const item of itens) {
    let r = await enviarViaWpp(item);
    if (!r.ok && /WPP nao carregou|WPP:/.test(r.motivo ?? '')) {
      const motivoWpp = r.motivo;
      r = await enviarNoWhats(item); // fallback UI
      // se o plano B também falhar, mostra a causa de verdade (o erro do WA-JS), não só a do plano B
      if (!r.ok) r.motivo = `${r.motivo} · causa: ${motivoWpp}`;
    }
    if (r.ok) {
      // vínculo era só por nome e o envio confirmou o chat → grava o ID (trava máxima)
      if (!item.grupoJid && r.jidDetectado && item.clienteId) {
        sbRest(`zapberry_grupos?cliente_id=eq.${item.clienteId}`, {
          method: 'PATCH', body: JSON.stringify({ jid: r.jidDetectado, updated_at: new Date().toISOString() }),
        }).catch(() => { /* completa na próxima */ });
      }
      try {
        await sbRest('zapberry_avisos', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify(item.refs.map((ref) => ({
            tipo: 'serrada', ref: ref.ref, cliente_id: item.clienteId || null,
            grupo_jid: item.grupoJid || null, quantidade: ref.qtd ?? null,
          }))),
        });
      } catch { /* registro falhou — envio já foi; berry reconsulta */ }
    }
    resultado.push({ cliente: item.grupoNome, ...r });
    if (berryWin && !berryWin.isDestroyed()) berryWin.webContents.send('envio-progresso', resultado);
    await new Promise((res) => setTimeout(res, 2500)); // pausa entre grupos
  }
  return resultado;
});

/* ─── Aviso geral: imagem + saudação variada pros grupos vinculados a clientes ──
   A fila roda AQUI (processo principal), então não para se a janela do Berry for fechada.
   Um grupo por vez, pausa aleatória entre envios, pausa maior a cada lote, para sozinha depois de
   falhas seguidas. Anti-duplicata em zapberry_avisos (tipo 'aviso', ref "aviso:<id>:<cliente>"):
   se o app fechar no meio, rodar o mesmo aviso de novo pula quem já recebeu. */
let avisoFila = null;
let avisoEstado = null; // { avisoId, total, jaEnviados, resultados[], fase, pausado, proximoEm, motivoFim, atual }

async function enviarImagemViaWpp({ grupoNome, grupoJid, imagem, legenda }) {
  const view = views.get(cfg.ativa);
  if (!view) return { ok: false, motivo: 'nenhuma conta ativa' };
  await injetarWaJs(view.webContents);
  const script = `(async () => {
    const GRUPO = ${JSON.stringify(grupoNome)};
    const JID = ${JSON.stringify(grupoJid || '')};
    const IMG = ${JSON.stringify(imagem)};
    const LEGENDA = ${JSON.stringify(legenda)};
    const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 30; i++) {
      if (typeof WPP !== 'undefined' && WPP.isReady) break;
      await dorme(500);
    }
    if (typeof WPP === 'undefined' || !WPP.isReady) return { ok: false, motivo: 'WPP nao carregou' };
    let jid = JID;
    if (!jid) {
      const chats = await WPP.chat.list();
      const alvo = chats.filter((c) => (c.name || c.formattedTitle || '').trim().toLowerCase() === GRUPO.trim().toLowerCase());
      if (alvo.length === 0) return { ok: false, motivo: 'grupo nao encontrado pelo nome: ' + GRUPO };
      if (alvo.length > 1) return { ok: false, motivo: 'mais de um chat com esse nome — vincule pelo ID' };
      jid = alvo[0].id._serialized;
    }
    try { await WPP.chat.openChatBottom(jid); } catch (e) { /* visual apenas */ }
    let r;
    try {
      r = await WPP.chat.sendFileMessage(jid, IMG, { type: 'image', caption: LEGENDA, createChat: false });
    } catch (e) { return { ok: false, motivo: 'envio recusado: ' + ((e && e.message) || e) }; }
    // sendFileMessage devolve { id, sendMsgResult }: espera o WhatsApp confirmar o envio
    let conf = null;
    try { conf = await Promise.race([r && r.sendMsgResult, dorme(30000).then(() => 'TEMPO')]); }
    catch (e) { return { ok: false, motivo: 'envio recusado: ' + ((e && e.message) || e) }; }
    if (conf === 'TEMPO') return { ok: false, motivo: 'sem confirmacao do WhatsApp em 30s' };
    const rs = conf && conf.messageSendResult;
    if (rs && String(rs).toUpperCase() !== 'OK') return { ok: false, motivo: 'WhatsApp recusou: ' + rs };
    return { ok: true, jidDetectado: jid, msgId: r && r.id ? String(r.id) : null };
  })()`;
  try {
    const r = await Promise.race([
      view.webContents.executeJavaScript(script, true),
      new Promise((res) => setTimeout(() => res({ ok: false, motivo: 'tempo esgotado (WPP)' }), 70000)),
    ]);
    return r ?? { ok: false, motivo: 'sem resposta (WPP)' };
  } catch (e) {
    return { ok: false, motivo: `WPP: ${e?.message ?? e}` };
  }
}

function avisoEmitir(ev) {
  if (berryWin && !berryWin.isDestroyed()) berryWin.webContents.send('aviso-progresso', { ...ev, estado: avisoEstado });
}

ipcMain.handle('aviso-geral-iniciar', async (_e, { avisoId, imagem, saudacoes, grupos, ritmo }) => {
  if (avisoFila) return { ok: false, motivo: 'já existe um aviso em andamento' };
  if (!/^[\w-]{3,60}$/.test(String(avisoId)) || !imagem || !Array.isArray(grupos) || !grupos.length) return { ok: false, motivo: 'dados incompletos' };
  if (!views.get(cfg.ativa)) return { ok: false, motivo: 'nenhuma conta ativa' };

  // quem já recebeu este aviso (retomada depois de fechar o app / cair a conta)
  let jaRecebeu = new Set();
  try {
    const rows = await sbRest(`zapberry_avisos?select=ref&tipo=eq.aviso&ref=like.${encodeURIComponent(`aviso:${avisoId}:`)}*`);
    jaRecebeu = new Set((rows ?? []).map((x) => x.ref));
  } catch { /* sem consulta: segue; o risco é só repetir pra quem já recebeu em execução anterior */ }
  const refDe = (g) => `aviso:${avisoId}:${g.clienteId}`;
  const pendentes = grupos.filter((g) => !jaRecebeu.has(refDe(g)));
  if (!pendentes.length) return { ok: false, motivo: 'todos os grupos selecionados já receberam este aviso' };

  avisoEstado = {
    avisoId, total: pendentes.length, jaEnviados: grupos.length - pendentes.length,
    resultados: [], fase: 'enviando', pausado: false, proximoEm: null, motivoFim: null, atual: null,
  };
  const bloqueio = powerSaveBlocker.start('prevent-app-suspension'); // PC não dorme durante o envio
  if (win) { win.show(); win.focus(); } // envio é visível, igual ao envio de avisos de serrada

  avisoFila = criarFila({
    itens: pendentes, saudacoes, ritmo,
    enviar: async (g, { saudacao }) => {
      const r = await enviarImagemViaWpp({ grupoNome: g.grupoNome, grupoJid: g.grupoJid, imagem, legenda: saudacao });
      if (r.ok) {
        try {
          await sbRest('zapberry_avisos', {
            method: 'POST',
            headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
            body: JSON.stringify([{ tipo: 'aviso', ref: refDe(g), cliente_id: g.clienteId || null, grupo_jid: g.grupoJid || null }]),
          });
        } catch { /* registro falhou — o envio já foi; só perde a trava de retomada deste grupo */ }
      }
      return r;
    },
    aoEvento: (ev) => {
      if (ev.tipo === 'enviando') { avisoEstado.atual = ev.item.grupoNome; avisoEstado.proximoEm = null; }
      else if (ev.tipo === 'resultado') avisoEstado.resultados.push(ev.resultado);
      else if (ev.tipo === 'espera') avisoEstado.proximoEm = Date.now() + ev.segundos * 1000;
      else if (ev.tipo === 'fim') { avisoEstado.fase = 'fim'; avisoEstado.motivoFim = ev.motivo; avisoEstado.atual = null; avisoEstado.proximoEm = null; }
      avisoEmitir(ev);
    },
  });
  // roda em segundo plano: a tela acompanha pelos eventos 'aviso-progresso'
  avisoFila.iniciar()
    .catch((e) => { avisoEstado.fase = 'fim'; avisoEstado.motivoFim = `erro: ${e?.message ?? e}`; avisoEmitir({ tipo: 'fim', motivo: avisoEstado.motivoFim }); })
    .finally(() => { powerSaveBlocker.stop(bloqueio); avisoFila = null; });
  return { ok: true, total: pendentes.length, jaEnviados: avisoEstado.jaEnviados };
});

ipcMain.on('aviso-geral-controle', (_e, acao) => {
  if (!avisoFila || !avisoEstado) return;
  if (acao === 'pausar') { avisoFila.pausar(); avisoEstado.pausado = true; }
  else if (acao === 'continuar') { avisoFila.continuar(); avisoEstado.pausado = false; }
  else if (acao === 'cancelar') { avisoFila.cancelar(); avisoEstado.pausado = false; }
  avisoEmitir({ tipo: 'controle', acao });
});
// A tela pede o estado ao abrir (o envio continua rodando mesmo com a janela fechada)
ipcMain.handle('aviso-geral-estado', () => avisoEstado);

/* ─── Bot berry (configuração e testes) ─────────────────────────── */
const botSeguro = (fn) => async (_e, arg) => {
  try { return { ok: true, dados: await fn(arg) }; } catch (e) { return { ok: false, erro: String((e && e.message) || e) }; }
};
ipcMain.handle('bot-estado', botSeguro(() => ({
  config: bot.getConfig(), status: bot.status(), remetentes: bot.remetentes(), log: bot.log(),
  contas: cfg.contas.map((c) => ({ id: c.id, nome: c.nome })),
})));
ipcMain.handle('bot-salvar', botSeguro((novo) => bot.definirConfig(novo)));
ipcMain.handle('bot-grupos', botSeguro((contaId) => bot.listarGrupos(contaId)));
ipcMain.handle('bot-contatos', botSeguro((contaId) => bot.listarContatos(contaId)));
ipcMain.handle('bot-vincular-ids', botSeguro(() => bot.vincularIds()));
ipcMain.handle('bot-testar', botSeguro((texto) => bot.testar(String(texto || '').slice(0, 300))));
ipcMain.handle('bot-liberar-numero', botSeguro((n) => bot.adicionarNumero(n || {})));
ipcMain.handle('bot-semanal-agora', botSeguro(() => bot.semanalAgora()));
ipcMain.handle('bot-saude-agora', botSeguro((opcoes) => bot.saudeAgora(opcoes || {})));

// Vincular: lê o chat aberto na conta ativa (JID + nome) — script direto na
// página (não depende do preload nem de reinício).
ipcMain.handle('ler-chat-aberto', async () => {
  const view = views.get(cfg.ativa);
  if (!view) return null;
  // 1º: WA-JS (id oficial do chat ativo)
  try {
    await injetarWaJs(view.webContents);
    const r = await view.webContents.executeJavaScript(`(async () => {
      for (let i = 0; i < 10; i++) {
        if (typeof WPP !== 'undefined' && WPP.isReady) break;
        await new Promise((x) => setTimeout(x, 400));
      }
      if (typeof WPP === 'undefined' || !WPP.isReady) return null;
      const c = WPP.chat.getActiveChat();
      if (!c) return null;
      return { jid: c.id && c.id._serialized ? c.id._serialized : null, nome: c.name || c.formattedTitle || null, debug: { via: 'wpp' } };
    })()`, true);
    if (r && r.jid) { r.contaAtiva = cfg.contas.find((c) => c.id === cfg.ativa)?.nome ?? '?'; return r; }
  } catch { /* cai pro método DOM */ }
  try {
    const r = await view.webContents.executeJavaScript(`(() => {
      // JID: varre o HTML e pega o id de conversa MAIS FREQUENTE (o chat aberto
      // tem dezenas de mensagens — domina qualquer outro id solto no DOM).
      const html = document.body.innerHTML;
      const all = [...html.matchAll(/([0-9][0-9-]{6,}@(?:g\\.us|c\\.us|lid|s\\.whatsapp\\.net))/g)].map((m) => m[1]);
      const freq = {};
      all.forEach((j) => { freq[j] = (freq[j] || 0) + 1; });
      const rank = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const jid = rank[0]?.[0] ?? null;
      // nome: primeiro título de header fora da lista lateral
      const hs = [...document.querySelectorAll('header')].filter((h) => !h.closest('#pane-side'));
      let nome = null;
      for (const h of hs) {
        const t = (h.querySelector('span[dir="auto"], span[title]')?.textContent || '').trim();
        if (t) { nome = t; break; }
      }
      const amostraIds = [...document.querySelectorAll('[data-id]')].slice(0, 3).map((e) => (e.getAttribute('data-id') || '').slice(0, 40));
      return { jid, nome, debug: { jids: rank.slice(0, 3), amostraIds, headers: hs.map((h) => (h.textContent || '').slice(0, 25)) } };
    })()`, true);
    if (r) r.contaAtiva = cfg.contas.find((c) => c.id === cfg.ativa)?.nome ?? '?';
    return r;
  } catch (e) {
    return { jid: null, nome: null, debug: { erro: String(e?.message ?? e) } };
  }
});

ipcMain.handle('get-snippets', () => cfg.snippets);
ipcMain.on('save-snippets', (_e, lista) => {
  cfg.snippets = (Array.isArray(lista) ? lista : [])
    .map((s) => ({ atalho: String(s.atalho || '').trim().replace(/^\//, '').toLowerCase().slice(0, 24), texto: String(s.texto || '').slice(0, 2000) }))
    .filter((s) => s.atalho && s.texto);
  saveCfg();
  enviarSnippets();
});

/* ─── Tray ──────────────────────────────────────────────────────── */
function criarTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  tray.setToolTip('ZapBerry');
  const rebuild = () => {
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Mostrar / Ocultar', click: toggleJanela },
      {
        label: 'ZapBerry (avisos e estoque)…',
        icon: nativeImage.createFromPath(path.join(__dirname, 'assets', 'logo_sb.png')).resize({ width: 16, height: 16 }),
        click: abrirBerry,
      },
      { label: 'Respostas rápidas…', click: abrirSnippets },
      { type: 'separator' },
      {
        label: 'Tema', submenu: [
          { label: 'Sistema', type: 'radio', checked: cfg.tema === 'system', click: () => { cfg.tema = 'system'; saveCfg(); aplicarTema(); } },
          { label: 'Claro', type: 'radio', checked: cfg.tema === 'light', click: () => { cfg.tema = 'light'; saveCfg(); aplicarTema(); } },
          { label: 'Escuro', type: 'radio', checked: cfg.tema === 'dark', click: () => { cfg.tema = 'dark'; saveCfg(); aplicarTema(); } },
        ],
      },
      { label: 'Não perturbe (silenciar notificações)', type: 'checkbox', checked: cfg.dnd, click: (mi) => { cfg.dnd = mi.checked; saveCfg(); } },
      { label: 'Desfocar quando perder o foco (privacidade)', type: 'checkbox', checked: cfg.blurPrivacidade, click: (mi) => { cfg.blurPrivacidade = mi.checked; saveCfg(); if (!mi.checked) aplicarBlur(false); } },
      { label: 'Sempre no topo', type: 'checkbox', checked: cfg.alwaysOnTop, click: (mi) => { cfg.alwaysOnTop = mi.checked; saveCfg(); win.setAlwaysOnTop(mi.checked); } },
      { label: 'Iniciar com o sistema', type: 'checkbox', checked: cfg.autostart, click: (mi) => { cfg.autostart = mi.checked; saveCfg(); app.setLoginItemSettings({ openAtLogin: mi.checked }); } },
      { type: 'separator' },
      { label: `Verificar atualização (versão ${app.getVersion()})`, click: () => verificarAtualizacao(true) },
      { label: 'Sair do ZapBerry', click: sairDeVez },
    ]));
  };
  rebuild();
  tray.on('click', toggleJanela);
  tray.on('right-click', rebuild);
}
function toggleJanela() {
  if (!win) return;
  if (win.isVisible() && win.isFocused()) win.hide();
  else { win.show(); win.focus(); }
}

/* ─── IPC (sidebar) ─────────────────────────────────────────────── */
function enviarContas() {
  if (!win) return;
  win.webContents.send('contas', {
    contas: cfg.contas.map((c) => ({ ...c, popped: popped.has(c.id) })),
    ativa: cfg.ativa,
  });
  win.webContents.send('badges', Object.fromEntries(badges));
}
ipcMain.on('add-conta', addConta);
ipcMain.on('select-conta', (_e, id) => selecionarConta(id));
ipcMain.on('menu-conta', (_e, id) => menuConta(id));
ipcMain.on('rename-conta', (_e, { id, nome }) => {
  const c = cfg.contas.find((x) => x.id === id);
  if (c && nome.trim()) { c.nome = nome.trim().slice(0, 24); saveCfg(); enviarContas(); atualizarBadges(); }
});
ipcMain.on('abrir-snippets', abrirSnippets);
ipcMain.on('wa-secao', (_e, s) => {
  const view = views.get(cfg.ativa);
  if (view) { sendWa(view.webContents, 'wa-secao', s); view.webContents.focus(); }
});
ipcMain.on('ui-pronta', () => { enviarContas(); aplicarTema(); });

/* ─── Janela principal ──────────────────────────────────────────── */
function criarJanela() {
  const b = cfg.bounds;
  win = new BrowserWindow({
    width: b?.width ?? 1280,
    height: b?.height ?? 820,
    x: b?.x, y: b?.y,
    minWidth: 900, minHeight: 600,
    title: 'ZapBerry',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#111b21',
    alwaysOnTop: cfg.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'ui', 'sidebar.html'));

  // Reposiciona a view em TODA mudança de tamanho — resize normal, maximizar,
  // restaurar e tela cheia (setAutoResize sozinho falha nesses casos no Windows).
  const refit = () => { const v = win.getBrowserView(); if (v) v.setBounds(boundsView()); };
  ['resize', 'maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen'].forEach((ev) => {
    win.on(ev, () => { refit(); setTimeout(refit, 60); }); // 2º fit pega o tamanho final da animação
  });
  win.on('close', (e) => {
    cfg.bounds = win.getBounds(); saveCfg();
    if (!app.isQuiting) { e.preventDefault(); win.hide(); } // fechar = ir pra bandeja
  });
  win.on('blur', () => { if (cfg.blurPrivacidade) aplicarBlur(true); });
  win.on('focus', () => { aplicarBlur(false); win.flashFrame(false); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && handleAtalho(input)) e.preventDefault();
  });

  selecionarConta(cfg.ativa);
}

/* ─── Sair de verdade ───────────────────────────────────────────────
   O WhatsApp Web registra um "beforeunload" que, no Electron, cancela o fechamento da página em silêncio: o app ficava vivo na
   bandeja mesmo com "Sair" e não dava para substituí-lo na atualização. Ignora o veto e, se algo ainda travar, encerra à força. */
app.on('web-contents-created', (_e, wc) => { wc.on('will-prevent-unload', (ev) => ev.preventDefault()); });
function sairDeVez() {
  app.isQuiting = true;
  app.quit();
  setTimeout(() => app.exit(0), 4000);
}

/* ─── Atualização automática ────────────────────────────────────────
   Confere as versões publicadas em github.com/StoneberryPCP/zapberry (Releases): 30 s depois de abrir e a cada 4 h.
   Achou versão maior → baixa em segundo plano e pergunta se reinicia agora. "Depois" = instala sozinha quando o ZapBerry
   for fechado pelo "Sair". Nunca reinicia no meio de um Aviso geral (espera terminar). Só vale pra versão instalada (Setup). */
let updater = null;
let atualizacaoPronta = null; // versão já baixada, esperando reinício
let checagemManual = false;
const logAtualizacao = (m) => {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'zapberry-update.log'), `${new Date().toISOString()} ${m}\n`); } catch { /* sem log */ }
};
function iniciarAtualizacao() {
  if (!app.isPackaged) return; // rodando pelo código (npm start): não atualiza
  try { updater = require('electron-updater').autoUpdater; } catch (e) { logAtualizacao(`sem electron-updater: ${e?.message ?? e}`); return; }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('error', (e) => {
    logAtualizacao(`erro: ${e?.message ?? e}`);
    if (checagemManual) { checagemManual = false; dialog.showMessageBox({ type: 'warning', title: 'ZapBerry', message: 'Não foi possível verificar atualização.', detail: String(e?.message ?? e).slice(0, 300) }); }
  });
  updater.on('update-available', (info) => {
    logAtualizacao(`baixando ${info.version}`);
    if (checagemManual) { checagemManual = false; dialog.showMessageBox({ type: 'info', title: 'ZapBerry', message: `Versão ${info.version} encontrada.`, detail: 'Baixando em segundo plano. Aviso quando estiver pronta.' }); }
  });
  updater.on('update-not-available', () => {
    if (checagemManual) { checagemManual = false; dialog.showMessageBox({ type: 'info', title: 'ZapBerry', message: `Você já está na versão mais nova (${app.getVersion()}).` }); }
  });
  updater.on('update-downloaded', (info) => {
    logAtualizacao(`pronta ${info.version}`);
    atualizacaoPronta = info.version;
    perguntarReinicio();
  });
  setTimeout(() => verificarAtualizacao(false), 30 * 1000);
  setInterval(() => verificarAtualizacao(false), 4 * 60 * 60 * 1000);
}
function verificarAtualizacao(manual) {
  if (!updater) {
    if (manual) dialog.showMessageBox({ type: 'info', title: 'ZapBerry', message: 'Atualização automática só funciona na versão instalada (Setup).' });
    return;
  }
  if (atualizacaoPronta) { if (manual) perguntarReinicio(); return; }
  checagemManual = !!manual;
  updater.checkForUpdates().catch((e) => logAtualizacao(`checagem falhou: ${e?.message ?? e}`));
}
const avisoGeralRodando = () => !!(avisoEstado && avisoEstado.fase !== 'fim');
let perguntando = false;
async function perguntarReinicio() {
  if (!atualizacaoPronta || perguntando) return;
  if (avisoGeralRodando()) { setTimeout(perguntarReinicio, 5 * 60 * 1000); return; } // não corta envio no meio
  perguntando = true;
  const opcoes = {
    type: 'info', buttons: ['Reiniciar agora', 'Depois'], defaultId: 0, cancelId: 1, title: 'ZapBerry',
    message: `Nova versão ${atualizacaoPronta} pronta.`,
    detail: 'Reiniciar agora para instalar? Leva poucos segundos e o ZapBerry abre de novo sozinho.\n"Depois": instala quando você fechar pelo "Sair do ZapBerry".',
  };
  const r = win && !win.isDestroyed() ? await dialog.showMessageBox(win, opcoes) : await dialog.showMessageBox(opcoes);
  perguntando = false;
  if (r.response !== 0) return;
  if (avisoGeralRodando()) { perguntarReinicio(); return; } // começou um envio enquanto a pergunta estava aberta
  logAtualizacao(`instalando ${atualizacaoPronta}`);
  app.isQuiting = true;
  updater.quitAndInstall(true, true); // silencioso + reabre depois de instalar
}

/* ─── Ciclo de vida ─────────────────────────────────────────────── */
const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

  app.whenReady().then(() => {
    loadCfg();
    auth = criarAuth({ getCfg: () => cfg, salvar: saveCfg, cifra: cifraElectron(safeStorage) });
    restFn = criarRest({ auth, getCfg: () => cfg });
    bot = criarServico({
      getCfg: () => cfg,
      salvar: saveCfg,
      // a conta do bot pode nunca ter sido aberta: cria a view (fica em segundo plano, sem aparecer na janela)
      getView: (id) => {
        const conta = cfg.contas.find((c) => c.id === id);
        return conta ? criarView(conta) : null;
      },
      sbGet: (p) => sbRest(p),
      getToken: () => auth.token(),
      relatorio: require('./lib/relatorio360.bundle.js'),
      dirDados: app.getPath('userData'),
      injetarWaJs,
    });
    criarJanela();
    criarTray();
    aplicarTema();
    app.setLoginItemSettings({ openAtLogin: cfg.autostart });
    globalShortcut.register('Control+Shift+W', toggleJanela);
    nativeTheme.on('updated', aplicarTema);
    bot.iniciar();
    iniciarAtualizacao();
  });

  app.on('window-all-closed', () => { /* fica vivo na bandeja */ });
  app.on('before-quit', () => { app.isQuiting = true; globalShortcut.unregisterAll(); });
}
