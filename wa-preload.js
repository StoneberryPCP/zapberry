// Roda dentro de cada WhatsApp Web (BrowserView).
// 1) Respostas rápidas: /atalho + ESPAÇO (ou Tab) → texto cadastrado.
// 2) Comandos do sistema Stoneberry (+ TAB, porque o cliente tem espaço no nome):
//    /estoque <cliente>  → chapas disponíveis
//    /blocos <cliente>   → blocos disponíveis pra serrar
//    /serrado <cliente>  → serradas dos últimos 14 dias
const { ipcRenderer } = require('electron');

// Diagnóstico: cada frame se apresenta e loga o que acha do DOM
const FRAME = `[${window === window.top ? 'TOP' : 'IFRAME'} ${location.href.slice(0, 60)}]`;
function log(msg) { try { ipcRenderer.send('wa-log', `${FRAME} ${msg}`); } catch { /* ignore */ } }
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const nEdit = document.querySelectorAll('div[contenteditable="true"]').length;
    const iframes = document.querySelectorAll('iframe').length;
    log(`carregado · contenteditables=${nEdit} · iframes=${iframes} · footer=${!!document.querySelector('footer')} · pane-side=${!!document.querySelector('#pane-side')}`);
  }, 8000);
});

let snippets = [];
ipcRenderer.on('snippets', (_e, lista) => { snippets = Array.isArray(lista) ? lista : []; });

const COMANDOS = ['estoque', 'blocos', 'serrado'];

// Texto do editor sem sujeira: zero-width/BOM fora, NBSP vira espaço comum
function textoLimpo(el) {
  return (el?.textContent ?? '').replace(/[​-‏﻿]/g, '').replace(/ /g, ' ');
}

function visivel(el) {
  const r = el.getBoundingClientRect();
  return r.width > 40 && r.height > 0;
}

function campoMensagem() {
  // 1) seletores diretos (layouts conhecidos do WhatsApp Web, pt + en)
  const direto = document.querySelector('footer div[contenteditable="true"]')
    || document.querySelector('div[contenteditable="true"][data-tab="10"]')
    || document.querySelector('div[contenteditable="true"][data-tab="6"]')
    || document.querySelector('div[contenteditable="true"][aria-placeholder="Digite uma mensagem"]')
    || document.querySelector('div[contenteditable="true"][aria-placeholder="Type a message"]')
    || document.querySelector('div[contenteditable="true"][aria-label="Digite uma mensagem"]')
    || document.querySelector('div[contenteditable="true"][aria-label="Type a message"]')
    || document.querySelector('#main div[contenteditable="true"]')
    || document.querySelector('#main [role="textbox"][contenteditable="true"]');
  if (direto) return direto;
  // 2) fallback: contenteditable visível fora da lista lateral e fora da busca,
  //    o mais pra baixo na tela (campo de mensagem fica no rodapé)
  const cands = [...document.querySelectorAll('div[contenteditable="true"], [role="textbox"][contenteditable="true"]')]
    .filter((el) => !el.closest('#pane-side'))
    .filter(visivel);
  if (!cands.length) return null;
  cands.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
  return cands[0];
}

// Cola preservando quebras de linha: "paste" sintético (igual Ctrl+V);
// fallback linha a linha se o editor ignorar. substituir=true → troca o campo
// inteiro (paste em cima da seleção) em vez de emendar no fim.
function colarTexto(texto, campo = campoMensagem(), substituir = false) {
  if (!campo) return;
  campo.focus();
  const sel = window.getSelection();
  sel.selectAllChildren(campo);
  if (!substituir) sel.collapseToEnd();
  const antes = campo.textContent ?? '';
  const dt = new DataTransfer();
  dt.setData('text/plain', texto);
  campo.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  setTimeout(() => {
    const agora = campo.textContent ?? '';
    if (agora !== antes && !(substituir && agora === antes)) return;
    // paste ignorado (editor novo) → digitação sintética linha a linha
    campo.focus();
    if (substituir) { sel.selectAllChildren(campo); document.execCommand('delete'); }
    else { sel.selectAllChildren(campo); sel.collapseToEnd(); }
    const linhas = texto.split('\n');
    linhas.forEach((l, i) => {
      if (l) document.execCommand('insertText', false, l);
      if (i < linhas.length - 1) {
        // editores novos ignoram insertLineBreak — tenta Shift+Enter sintético
        if (!document.execCommand('insertLineBreak')) {
          campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, shiftKey: true, bubbles: true, cancelable: true }));
        }
      }
    });
    // ainda vazio? último recurso: beforeinput direto (Lexical escuta ele)
    setTimeout(() => {
      if ((campo.textContent ?? '').trim()) return;
      campo.focus();
      campo.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: texto.replace(/\n/g, ' — '), bubbles: true, cancelable: true }));
    }, 120);
  }, 120);
}

// Resíduo de comando (ex.: "/blocos capital") no campo → colagem substitui tudo
const RE_CMD_RESIDUO = /^\s*\/(estoque|blocos|serrado)\b[^\n]{0,80}$/i;

function apagarTras(qtd) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  for (let i = 0; i < qtd; i++) sel.modify('extend', 'backward', 'character');
  document.execCommand('delete');
}

// Campo em edição: activeElement (ou pai contenteditable dele), senão o campo de mensagem
function campoEmEdicao() {
  const a = document.activeElement;
  if (a?.isContentEditable) return a.closest('[contenteditable="true"]') ?? a;
  const campo = campoMensagem();
  return campo && document.activeElement && campo.contains(document.activeElement) ? campo : campo;
}

function expandirSnippet() {
  const el = campoEmEdicao();
  if (!el) return false;
  const texto = textoLimpo(el).replace(/\s+$/, '');
  const m = texto.match(/\/([\p{L}\p{N}_-]{1,24})$/u);
  if (!m) return false;
  const snip = snippets.find((s) => s.atalho === m[1].toLowerCase());
  if (!snip) return false;
  el.focus();
  apagarTras(m[0].length);
  document.execCommand('insertText', false, snip.texto);
  return true;
}

// Comando → apaga do campo e abre a janela 🍓 já com a busca pronta
// (você confere o que tem disponível e clica "Inserir no chat ativo").
function executarComando() {
  const el = campoEmEdicao();
  if (!el) return false;
  const texto = textoLimpo(el).replace(/\s+$/, '');
  const m = texto.match(/\/(\p{L}+)\s+(.{2,60})$/u);
  if (!m) return false;
  const cmd = m[1].toLowerCase();
  if (!COMANDOS.includes(cmd)) return false;
  el.focus();
  // campo inteiro é o comando → limpa tudo (mais confiável no editor do WhatsApp)
  if (texto.trim() === m[0].trim()) {
    const sel = window.getSelection();
    sel.selectAllChildren(el);
    document.execCommand('delete');
  } else {
    apagarTras(m[0].length);
  }
  ipcRenderer.send('berry-comando', { cmd, arg: m[2].trim() });
  return true;
}

// Navegação pelas seções do WhatsApp (barra do ZapBerry): status, canais,
// grupos, não lidas... Clica nos controles do próprio site (pt-BR e en).
function clicarAria(labels) {
  for (const l of labels) {
    const el = document.querySelector(`[aria-label="${l}"]`) || document.querySelector(`[aria-label^="${l}"]`);
    if (el) { el.click(); return true; }
  }
  return false;
}
function clicarChip(textos) {
  const botoes = [...document.querySelectorAll('button, div[role="button"]')];
  const alvo = botoes.find((b) => textos.includes((b.textContent || '').trim()));
  if (alvo) { alvo.click(); return true; }
  return false;
}
ipcRenderer.on('wa-secao', (_e, s) => {
  try {
    if (s === 'status') { clicarAria(['Status', 'Atualizações', 'Updates']); return; }
    if (s === 'canais') { clicarAria(['Canais', 'Channels']); return; }
    if (s === 'comunidades') { clicarAria(['Comunidades', 'Communities']); return; }
    if (s === 'midias') {
      // abre os dados da conversa atual — mídia/links/docs ficam ali.
      const h = headerConversa();
      if (!h) return;
      const alvo = h.querySelector('div[role="button"]') || h.querySelector('img')?.closest('div') || h;
      ['mousedown', 'mouseup', 'click'].forEach((tipo) =>
        alvo.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true, view: window })));
      return;
    }
    // filtros da lista de conversas — garante que está na aba Conversas antes
    clicarAria(['Conversas', 'Chats']);
    setTimeout(() => {
      if (s === 'todas') clicarChip(['Tudo', 'All']);
      else if (s === 'nao-lidas') clicarChip(['Não lidas', 'Unread']);
      else if (s === 'favoritas') clicarChip(['Favoritas', 'Favorites', 'Favourites']);
      else if (s === 'grupos') clicarChip(['Grupos', 'Groups']);
    }, 150);
  } catch { /* layout mudou — ignora */ }
});

// ZapBerry (janela 🍓): insere a mensagem montada no chat aberto.
// Se sobrou o "/comando cliente" digitado no campo, a colagem substitui ele.
ipcRenderer.on('inserir-texto', (_e, texto) => {
  try {
    const campo = campoMensagem();
    log(`inserir-texto: campo=${campo ? 'ACHOU' : 'NULL'} · len=${texto.length}`);
    if (!campo) return;
    const atual = textoLimpo(campo).trim();
    colarTexto(texto, campo, RE_CMD_RESIDUO.test(atual));
    setTimeout(() => log(`inserir-texto: depois, campo tem ${ (campo.textContent ?? '').length } chars`), 400);
  } catch (e) { log(`inserir-texto ERRO: ${e.message}`); }
});

/* ─── Envio automático (sem API): busca o grupo, cola e clica enviar ───
   Usado pelo auto-aviso de carregamento. Uma mensagem por vez, com pausas
   humanas entre os passos. Reporta sucesso/falha pro processo principal. */
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

function campoBusca() {
  // seletores conhecidos primeiro; senão, o textbox visível mais no topo-esquerda
  const direto = document.querySelector('div[contenteditable="true"][data-tab="3"]')
    || document.querySelector('[aria-label="Pesquisar"] div[contenteditable="true"]')
    || document.querySelector('[aria-label="Caixa de texto de pesquisa"]')
    || document.querySelector('[aria-label="Search input textbox"]');
  if (direto) return direto;
  const cands = [...document.querySelectorAll('div[contenteditable="true"], [role="textbox"]')]
    .filter((el) => !el.closest('footer'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 50 && r.height > 0; });
  if (!cands.length) return null;
  cands.sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return (ra.top + ra.left) - (rb.top + rb.left);
  });
  return cands[0];
}
function cliqueReal(el) {
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((t) =>
    el.dispatchEvent(t.startsWith('pointer') ? new PointerEvent(t, opts) : new MouseEvent(t, opts)));
}
function digitarEm(el, texto) {
  cliqueReal(el); // acorda o listener do React antes de digitar
  el.focus();
  const sel = window.getSelection();
  sel.selectAllChildren(el);
  document.execCommand('insertText', false, texto);
}
function teclaEnter(el) {
  ['keydown', 'keypress', 'keyup'].forEach((tipo) =>
    el.dispatchEvent(new KeyboardEvent(tipo, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })));
}

// JID do chat aberto (id real do grupo) — id de conversa MAIS FREQUENTE no DOM
// (as mensagens do chat aberto dominam qualquer outro id solto).
function jidChatAberto() {
  const html = document.body.innerHTML;
  const all = [...html.matchAll(/([0-9][0-9-]{6,}@(?:g\.us|c\.us|lid|s\.whatsapp\.net))/g)].map((m) => m[1]);
  if (!all.length) return null;
  const freq = {};
  all.forEach((j) => { freq[j] = (freq[j] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}
function headerConversa() {
  // header da conversa = o que NÃO está dentro da lista lateral (#pane-side)
  const hs = [...document.querySelectorAll('header')].filter((h) => !h.closest('#pane-side'));
  return hs.find((h) => h.querySelector('img')) ?? hs[hs.length - 1] ?? null;
}
function nomeChatAberto() {
  const h = headerConversa();
  return h?.querySelector('span[dir="auto"]')?.textContent?.trim() ?? null;
}
// Vincular cliente ↔ grupo: ZapBerry pede o chat aberto agora
ipcRenderer.on('ler-chat-aberto', () => {
  ipcRenderer.send('chat-aberto', { jid: jidChatAberto(), nome: nomeChatAberto() });
});

let enviando = false;
ipcRenderer.on('auto-enviar', async (_e, { grupo, jid, texto, refId }) => {
  if (enviando) { ipcRenderer.send('auto-falhou', { refId, motivo: 'ocupado' }); return; }
  enviando = true;
  try {
    const busca = campoBusca();
    if (!busca) throw new Error('campo de busca não achado (WhatsApp carregado?)');
    digitarEm(busca, grupo);
    await dorme(1400);
    teclaEnter(busca); // abre o primeiro resultado
    await dorme(1400);
    if (!campoMensagem()) {
      // Enter não abriu — clica no primeiro resultado da lista
      const primeiro = document.querySelector('#pane-side [role="listitem"], #pane-side [role="row"]');
      if (primeiro) { cliqueReal(primeiro); await dorme(1200); }
    }
    // trava de segurança: só envia se o chat aberto é MESMO o grupo vinculado
    if (jid) {
      const aberto = jidChatAberto();
      if (!aberto || !jid.includes(aberto.replace(/@.*/, '')) && !aberto.includes(jid.replace(/@.*/, ''))) {
        throw new Error(`chat aberto (${aberto ?? '?'}) não confere com o grupo vinculado`);
      }
    } else {
      // vínculo por nome (sem ID): confere o título do chat aberto
      const nomeAberto = (nomeChatAberto() ?? '').toLowerCase();
      if (!nomeAberto || nomeAberto !== String(grupo).toLowerCase()) {
        throw new Error(`chat aberto ("${nomeAberto || '?'}") não é "${grupo}"`);
      }
    }
    const campo = campoMensagem();
    if (!campo) throw new Error('conversa não abriu');
    colarTexto(texto, campo);
    await dorme(700);
    const btnEnviar = document.querySelector('span[data-icon="send"]')?.closest('button')
      || document.querySelector('button[aria-label="Enviar"], button[aria-label="Send"]');
    if (btnEnviar) btnEnviar.click();
    else teclaEnter(campo);
    await dorme(600);
    // manda o ID lido — vínculos "por nome" viram vínculo por ID sozinhos
    ipcRenderer.send('auto-enviado', { refId, jidDetectado: jidChatAberto() });
  } catch (err) {
    ipcRenderer.send('auto-falhou', { refId, motivo: err.message });
  } finally {
    enviando = false;
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key !== ' ' && e.key !== 'Tab') return;
  // editor novo: foco pode estar num filho do contenteditable — basta estar dentro dele
  const alvo = e.target instanceof Element ? e.target.closest('[contenteditable="true"]') : null;
  const el = document.activeElement;
  if (e.key === 'Tab') log(`Tab: alvo=${alvo ? alvo.tagName : 'null'} · active=${el ? `${el.tagName} ce=${el.isContentEditable}` : 'null'} · texto="${textoLimpo(alvo ?? el).slice(0, 40)}"`);
  if (!alvo && (!el || !el.isContentEditable)) return;
  try {
    // Tab: primeiro tenta comando com argumento; espaço: só snippet simples
    if (e.key === 'Tab' && executarComando()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (expandirSnippet()) { e.preventDefault(); e.stopImmediatePropagation(); }
  } catch (err) { log(`keydown ERRO: ${err.message}`); }
}, true);
