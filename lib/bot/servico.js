// Serviço do bot Berry no ZapBerry: escuta as mensagens da conta escolhida, confere quem pode perguntar, responde
// e dispara o relatório semanal. Só LÊ o sistema; nada é gravado no banco.
const fs = require('fs');
const path = require('path');
const { extrairComando } = require('./roteador');
const { criarExecutor } = require('./executor');
const { autorizado, normalizarTelefone, soDigitos } = require('./autorizacao');
const os = require('os');
const { deveRodar, deveRodarDiario } = require('./agenda');
const { interpretarPeriodo } = require('./periodo');

const PREFIXO = '__BERRYBOT__';
const IDADE_MAX_S = 120;          // mensagem mais velha que isso (sincronização do WhatsApp ao abrir) é ignorada
const LIMITE_POR_MIN = 8;         // respostas por minuto, por conversa
const PASTA_BACKUP_PADRAO = path.join(os.homedir(), 'Desktop', 'Estudo', 'SISTEMA UNIFICADO', 'BACKUP-BANCO');
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizarConfig(raw, contas, ativaId) {
  const b = raw || {};
  const ag = b.agenda || {};
  const sa = b.saude || {};
  const contaId = contas.some((c) => c.id === b.contaId) ? b.contaId : (contas.find((c) => c.id === ativaId) || contas[0] || {}).id ?? null;
  const gatilho = String(b.gatilho || 'berry').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'berry';
  return {
    ativo: !!b.ativo,
    contaId,
    gatilho,
    aceitarMinhas: b.aceitarMinhas !== false, // padrão ligado: o bot roda no número de alguém da equipe
    grupos: (Array.isArray(b.grupos) ? b.grupos : []).filter((g) => g && /@g\.us$/.test(g.jid || '')).map((g) => ({ jid: g.jid, nome: String(g.nome || g.jid).slice(0, 80) })),
    numeros: (Array.isArray(b.numeros) ? b.numeros : []).map((n) => ({
      nome: String(n.nome || '').slice(0, 60),
      tel: soDigitos(n.tel),
      ids: Array.isArray(n.ids) ? n.ids.filter((x) => typeof x === 'string').slice(0, 5) : [],
    })).filter((n) => n.tel || n.ids.length),
    agenda: {
      ativa: !!ag.ativa,
      dia: Number.isInteger(Number(ag.dia)) && Number(ag.dia) >= 0 && Number(ag.dia) <= 6 ? Number(ag.dia) : 1,
      hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(ag.hora || '') ? ag.hora : '07:00',
      destino: ag.destino && /@g\.us$|@c\.us$|@lid$/.test(ag.destino.jid || '') ?{ jid: ag.destino.jid, nome: String(ag.destino.nome || ag.destino.jid).slice(0, 80) } : null,
      ultimoEnvio: ag.ultimoEnvio || null,
    },
    saude: {
      ativa: !!sa.ativa,
      hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(sa.hora || '') ? sa.hora : '08:00',
      destino: sa.destino && /@g\.us$|@c\.us$|@lid$/.test(sa.destino.jid || '') ? { jid: sa.destino.jid, nome: String(sa.destino.nome || sa.destino.jid).slice(0, 80) } : null,
      soComProblema: sa.soComProblema !== false, // padrão: só manda mensagem quando há algo a olhar
      pastaBackup: typeof sa.pastaBackup === 'string' ? sa.pastaBackup.trim().slice(0, 300) : PASTA_BACKUP_PADRAO,
      ultimoEnvio: sa.ultimoEnvio || null,
    },
  };
}

/** Lê a pasta de backup deste computador: arquivo ULTIMO_STATUS.txt e o arquivo mais novo dentro de dumps/. */
function lerBackup(pasta) {
  const info = { existe: false, statusTxt: '', ultimoEm: null };
  try {
    if (!pasta || !fs.statSync(pasta).isDirectory()) return info;
  } catch { return info; }
  info.existe = true;
  try { info.statusTxt = fs.readFileSync(path.join(pasta, 'ULTIMO_STATUS.txt'), 'utf8').split(/\r?\n/)[0]; } catch { /* sem status */ }
  const varrer = (dir, nivel) => {
    let mais = null;
    let itens = [];
    try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const it of itens) {
      const p = path.join(dir, it.name);
      let t = null;
      if (it.isDirectory()) { if (nivel < 3) t = varrer(p, nivel + 1); }
      else { try { t = fs.statSync(p).mtime; } catch { /* some */ } }
      if (t && (!mais || t > mais)) mais = t;
    }
    return mais;
  };
  info.ultimoEm = varrer(path.join(pasta, 'dumps'), 0);
  return info;
}

function criarServico({ getCfg, salvar, getView, sbGet, getToken, relatorio, dirDados, injetarWaJs }) {
  const vistos = new Set();
  const remetentes = [];
  const logs = [];
  const respostas = new Map();
  const escutando = new Set();
  let fila = Promise.resolve();
  let exec = null;
  let timers = [];

  const cfgBot = () => {
    const c = getCfg();
    c.bot = normalizarConfig(c.bot, c.contas || [], c.ativa);
    return c.bot;
  };
  const executor = () => {
    if (!exec) {
      const b = getCfg().berry;
      relatorio.configurarSupabase(b.url, b.key, getToken); // o relatório usa o token do login (renovado a cada consulta)
      exec = criarExecutor({ sb: sbGet, R: relatorio, gatilho: () => cfgBot().gatilho, verificarBackup: async () => lerBackup(cfgBot().saude.pastaBackup) });
    }
    return exec;
  };

  function registrar(e) {
    const linha = { quando: new Date().toISOString(), ...e };
    logs.unshift(linha);
    if (logs.length > 100) logs.pop();
    try { fs.appendFileSync(path.join(dirDados, 'bot-log.jsonl'), JSON.stringify(linha) + '\n'); } catch { /* ignora */ }
  }

  /* ─── escuta ─── */
  function scriptEscuta(gatilho) {
    return `(async () => {
      window.__berryGatilho = ${JSON.stringify(gatilho)};
      if (window.__berryBot) return 'ja';
      if (typeof WPP === 'undefined' || !WPP.isReady) return 'sem-wpp';
      window.__berryBot = true;
      const sid = (w) => (w && (w._serialized || (typeof w === 'string' ? w : null))) || null;
      WPP.on('chat.new_message', async (msg) => {
        try {
          const texto = typeof msg.body === 'string' ? msg.body : (typeof msg.caption === 'string' ? msg.caption : '');
          if (!texto) return;
          // só sai da página a mensagem que COMEÇA com o gatilho: o resto das conversas nunca é lido pelo bot
          const g = String(window.__berryGatilho || 'berry').toLowerCase();
          if (!texto.trim().toLowerCase().replace(/^[\\/@]/, '').startsWith(g)) return;
          const fromMe = !!(msg.id && msg.id.fromMe);
          const from = sid(msg.from), to = sid(msg.to);
          const chatId = fromMe ? to : from;
          const isGroup = !!chatId && chatId.endsWith('@g.us');
          const autor = fromMe ? 'eu' : (isGroup ? (sid(msg.author) || sid(msg.senderObj && msg.senderObj.id)) : from);
          let tel = null;
          try {
            if (autor && autor !== 'eu') {
              if (autor.endsWith('@lid')) {
                const w = WPP.contact && WPP.contact.getPhoneNumber ? await WPP.contact.getPhoneNumber(autor) : null;
                tel = w ? String(sid(w) || w).split('@')[0] : null;
              } else tel = autor.split('@')[0];
            }
          } catch (e) { /* sem telefone: autoriza pelo id */ }
          console.log('${PREFIXO}' + JSON.stringify({
            id: sid(msg.id) || String((msg.id && msg.id.id) || ''), chatId, isGroup, fromMe, autor, tel,
            nome: msg.notifyName || (msg.senderObj && (msg.senderObj.pushname || msg.senderObj.name)) || '',
            texto: texto.slice(0, 500), t: msg.t || 0,
          }));
        } catch (e) { /* mensagem estranha: ignora */ }
      });
      return 'ok';
    })()`;
  }

  async function garantirEscuta() {
    const bot = cfgBot();
    if (!bot.ativo || bot.contaId == null) return;
    const view = getView(bot.contaId);
    if (!view) return;
    try {
      await injetarWaJs(view.webContents);
      const r = await view.webContents.executeJavaScript(scriptEscuta(bot.gatilho), true);
      if (r === 'ok') { escutando.add(bot.contaId); registrar({ tipo: 'sistema', msg: `Escuta instalada na conta ${bot.contaId}` }); }
      else if (r === 'sem-wpp') escutando.delete(bot.contaId);
      if (r === 'ok' || r === 'ja') resolverIds().catch(() => {});
    } catch { escutando.delete(bot.contaId); }
  }

  /** Liga o serviço a uma conta (BrowserView): chamado quando a view é criada. */
  function anexar(contaId, wc) {
    wc.on('console-message', (...args) => {
      const msg = typeof args[2] === 'string' ? args[2] : (args[0] && args[0].message) || '';
      if (!msg.startsWith(PREFIXO)) return;
      let p;
      try { p = JSON.parse(msg.slice(PREFIXO.length)); } catch { return; }
      const bot = cfgBot();
      if (!bot.ativo || contaId !== bot.contaId) return;
      fila = fila.then(() => processar(contaId, p)).catch((e) => registrar({ tipo: 'erro', msg: String(e && e.message || e) }));
    });
    wc.on('did-start-navigation', () => escutando.delete(contaId)); // página recarregou: a escuta some, o ciclo reinstala
  }

  /* ─── envio ─── */
  async function enviarTexto(contaId, chatId, texto, citar) {
    const view = getView(contaId);
    if (!view) return { ok: false, motivo: 'conta não encontrada' };
    await injetarWaJs(view.webContents);
    const script = `(async () => {
      const CHAT = ${JSON.stringify(chatId)}, TEXTO = ${JSON.stringify(texto)}, CITA = ${JSON.stringify(citar || null)};
      if (typeof WPP === 'undefined' || !WPP.isReady) return { ok: false, motivo: 'WhatsApp ainda não carregou' };
      try { await WPP.chat.markIsComposing(CHAT, 1500); } catch (e) { /* só visual */ }
      // conversa privada que ainda não existe (relatório semanal pro privado): cria; grupo nunca é criado
      const CRIAR = !CHAT.endsWith('@g.us');
      let r;
      try {
        r = CITA ? await WPP.chat.sendTextMessage(CHAT, TEXTO, { createChat: CRIAR, quotedMsg: CITA })
                 : await WPP.chat.sendTextMessage(CHAT, TEXTO, { createChat: CRIAR });
      } catch (e) {
        try { r = await WPP.chat.sendTextMessage(CHAT, TEXTO, { createChat: CRIAR }); }
        catch (e2) { return { ok: false, motivo: String((e2 && e2.message) || e2) }; }
      }
      return { ok: true, id: r && r.id ? String(r.id) : null };
    })()`;
    try {
      return await Promise.race([
        view.webContents.executeJavaScript(script, true),
        new Promise((res) => setTimeout(() => res({ ok: false, motivo: 'tempo esgotado' }), 30_000)),
      ]);
    } catch (e) { return { ok: false, motivo: String((e && e.message) || e) }; }
  }

  async function enviarMensagens(contaId, chatId, mensagens, citar) {
    let ok = 0;
    for (let i = 0; i < mensagens.length; i++) {
      const r = await enviarTexto(contaId, chatId, mensagens[i], i === 0 ? citar : null);
      if (r.ok) ok++; else registrar({ tipo: 'erro', msg: `Falha ao enviar: ${r.motivo}` });
      if (i < mensagens.length - 1) await dorme(1100);
    }
    return ok;
  }

  /* ─── pergunta recebida ─── */
  function lembrarRemetente(p) {
    if (p.fromMe || !p.autor) return;
    const i = remetentes.findIndex((r) => r.autor === p.autor);
    const item = { autor: p.autor, tel: p.tel || null, nome: p.nome || '', chatId: p.chatId, grupo: !!p.isGroup, quando: new Date().toISOString() };
    if (i >= 0) remetentes.splice(i, 1);
    remetentes.unshift(item);
    if (remetentes.length > 30) remetentes.pop();
  }
  function dentroDoLimite(chatId) {
    const t = Date.now();
    const lista = (respostas.get(chatId) || []).filter((x) => t - x < 60_000);
    if (lista.length >= LIMITE_POR_MIN) { respostas.set(chatId, lista); return false; }
    lista.push(t); respostas.set(chatId, lista);
    return true;
  }

  async function processar(contaId, p) {
    const bot = cfgBot();
    if (!p || !p.id || vistos.has(p.id)) return;
    vistos.add(p.id);
    if (vistos.size > 1000) vistos.delete(vistos.values().next().value);
    const cmd = extrairComando(p.texto, bot.gatilho);
    if (cmd === null) return;
    if (p.t && Date.now() / 1000 - p.t > IDADE_MAX_S) return;
    lembrarRemetente(p);
    const quem = p.nome || p.tel || p.autor;
    // sem telefone na mensagem e há número digitado ainda sem ID: tenta vincular agora e confere de novo
    if (!autorizado(bot, p) && !p.tel && !p.fromMe && bot.numeros.some((n) => n.tel && !(n.ids || []).length)) await resolverIds({ forcar: true });
    if (!autorizado(bot, p)) { registrar({ tipo: 'negado', de: quem, texto: p.texto.slice(0, 120) }); return; }
    if (!dentroDoLimite(p.chatId)) { registrar({ tipo: 'limite', de: quem }); return; }
    const t0 = Date.now();
    const r = await executor().responder(cmd);
    const enviadas = await enviarMensagens(contaId, p.chatId, r.mensagens, p.id);
    registrar({ tipo: 'pergunta', de: quem, grupo: p.isGroup, texto: p.texto.slice(0, 200), intencao: r.intent.tipo, mensagens: r.mensagens.length, enviadas, ms: Date.now() - t0, erro: r.erro || null });
  }

  /* ─── relatório semanal automático ─── */
  async function rodarSemanal(agora = new Date()) {
    const bot = cfgBot();
    if (!bot.agenda.destino) throw new Error('Escolha o grupo de destino do relatório semanal.');
    const periodo = interpretarPeriodo('semana passada', agora);
    const mensagens = await executor().relatorio({ tipo: 'relatorio', modo: 'completo', periodo });
    const enviadas = await enviarMensagens(bot.contaId, bot.agenda.destino.jid, mensagens, null);
    registrar({ tipo: 'semanal', destino: bot.agenda.destino.nome, mensagens: mensagens.length, enviadas });
    return { mensagens: mensagens.length, enviadas };
  }

  /* ─── checagem diária de saúde ─── */
  /** `enviar`: manda pro destino configurado. `forcar`: manda mesmo sem problemas (botão "enviar agora"). */
  async function rodarSaude({ enviar = true, forcar = false } = {}) {
    const bot = cfgBot();
    const r = await executor().saude();
    if (!enviar) return { temProblema: r.temProblema, mensagens: r.mensagens, enviadas: 0 };
    if (!bot.saude.destino) throw new Error('Escolha o destino da checagem diária.');
    if (!r.temProblema && bot.saude.soComProblema && !forcar) {
      registrar({ tipo: 'saude', destino: bot.saude.destino.nome, msg: 'tudo certo, nada enviado' });
      return { temProblema: false, mensagens: r.mensagens, enviadas: 0 };
    }
    const enviadas = await enviarMensagens(bot.contaId, bot.saude.destino.jid, r.mensagens, null);
    registrar({ tipo: 'saude', destino: bot.saude.destino.nome, msg: r.temProblema ? 'pontos de atenção enviados' : 'tudo certo, enviado', mensagens: r.mensagens.length, enviadas });
    return { temProblema: r.temProblema, mensagens: r.mensagens, enviadas };
  }

  async function tick() {
    const bot = cfgBot();
    if (!bot.ativo) return;
    const agora = new Date();
    if (deveRodar(bot.agenda, agora)) {
      bot.agenda.ultimoEnvio = agora.toISOString(); // marca antes: se falhar, não fica tentando de minuto em minuto
      salvar();
      try { await rodarSemanal(); } catch (e) { registrar({ tipo: 'erro', msg: `Relatório semanal: ${e.message}` }); }
    }
    if (deveRodarDiario(bot.saude, agora)) {
      bot.saude.ultimoEnvio = agora.toISOString();
      salvar();
      try { await rodarSaude(); } catch (e) { registrar({ tipo: 'erro', msg: `Checagem diária: ${e.message}` }); }
    }
  }

  /* ─── API para a tela ─── */
  /** Lista conversas da conta direto da página do WhatsApp: 'grupos' ou 'contatos' (conversas privadas, com o ID e o telefone). */
  async function listarConversas(contaId, tipo) {
    const view = getView(contaId);
    if (!view) return { erro: 'Conta não encontrada.' };
    await injetarWaJs(view.webContents);
    try {
      return await view.webContents.executeJavaScript(`(async () => {
        const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
        for (let i = 0; i < 25; i++) { if (typeof WPP !== 'undefined' && WPP.isReady) break; await dorme(400); }
        if (typeof WPP === 'undefined' || !WPP.isReady) return { erro: 'O WhatsApp ainda não carregou nesta conta. Abra a conta, espere as conversas aparecerem e tente de novo.' };
        const sid = (w) => (w && (w._serialized || (typeof w === 'string' ? w : null))) || null;
        const grupo = ${tipo === 'grupos'};
        let chats = [];
        for (let i = 0; i < 15; i++) {
          chats = await (grupo ? WPP.chat.list({ onlyGroups: true }) : WPP.chat.list({ onlyUsers: true }));
          if (chats.length) break;
          await dorme(600);
        }
        const nomeDe = (c) => String(c.name || c.formattedTitle || (c.groupMetadata && c.groupMetadata.subject) || (c.contact && (c.contact.name || c.contact.pushname)) || '').trim();
        const saida = [];
        for (const c of chats) {
          const jid = sid(c.id);
          if (!jid) continue;
          if (grupo) { if (!jid.endsWith('@g.us')) continue; saida.push({ jid, nome: nomeDe(c) }); continue; }
          if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.includes('status@')) continue;
          let tel = jid.endsWith('@c.us') ? jid.split('@')[0] : null;
          if (!tel && jid.endsWith('@lid')) {
            try { const w = WPP.contact.getPhoneNumber ? await WPP.contact.getPhoneNumber(jid) : null; tel = w ? String(sid(w) || w).split('@')[0] : null; } catch (e) { /* sem telefone */ }
          }
          saida.push({ jid, nome: nomeDe(c), tel });
        }
        const lista = saida.filter((x) => x.nome || x.tel).map((x) => ({ ...x, nome: x.nome || (x.tel ? '+' + x.tel : x.jid) }));
        lista.sort((a, b) => a.nome.localeCompare(b.nome));
        return grupo ? { grupos: lista } : { contatos: lista.slice(0, 600) };
      })()`, true);
    } catch (e) { return { erro: String((e && e.message) || e) }; }
  }
  const listarGrupos = (contaId) => listarConversas(contaId, 'grupos');
  const listarContatos = (contaId) => listarConversas(contaId, 'contatos');

  /* ─── número digitado → ID (@lid) do WhatsApp ───
     Quem escreve nos grupos chega só com o ID (@lid); o telefone nem sempre vem. Então, ao liberar um número
     digitado, pergunto ao WhatsApp qual é o ID dele e guardo junto: a pessoa já fica liberada antes de escrever. */
  const tentouEm = new Map();   // tel -> instante da última tentativa (não insistir a cada ciclo)
  let resolvendo = null;

  function variantesTel(tel) {
    const v = [tel];
    // celular BR: o WhatsApp antigo guarda sem o 9 depois do DDD (55 + DDD + 9 + 8 dígitos)
    if (/^55\d{2}9\d{8}$/.test(tel)) v.push(tel.slice(0, 4) + tel.slice(5));
    return v;
  }

  async function resolverIds({ forcar = false } = {}) {
    if (resolvendo) return resolvendo;
    const bot = cfgBot();
    const agora = Date.now();
    const pendentes = bot.numeros.filter((n) => n.tel && !(n.ids || []).length && (forcar || agora - (tentouEm.get(n.tel) || 0) > 5 * 60_000));
    if (!pendentes.length || bot.contaId == null) return 0;
    const view = getView(bot.contaId);
    if (!view) return 0;
    resolvendo = (async () => {
      try {
        await injetarWaJs(view.webContents);
        pendentes.forEach((n) => tentouEm.set(n.tel, Date.now()));
        const entrada = pendentes.map((n) => ({ tel: n.tel, v: variantesTel(n.tel) }));
        const r = await view.webContents.executeJavaScript(`(async () => {
          if (typeof WPP === 'undefined' || !WPP.isReady) return null;
          const sid = (w) => (w && (w._serialized || (typeof w === 'string' ? w : null))) || null;
          const saida = {};
          for (const it of ${JSON.stringify(entrada)}) {
            const ids = [];
            for (const t of it.v) {
              const wid = t + '@c.us';
              try { if (WPP.contact.getCurrentLid) { const l = sid(await WPP.contact.getCurrentLid(wid)); if (l) ids.push(l); } } catch (e) { /* tenta o servidor */ }
              if (!ids.length) {
                try { const q = await WPP.contact.queryExists(wid); if (q) { if (q.lid) ids.push(sid(q.lid)); if (q.wid) ids.push(sid(q.wid)); } } catch (e) { /* número sem WhatsApp */ }
              }
              if (ids.length) break;
            }
            saida[it.tel] = [...new Set(ids.filter(Boolean))];
          }
          return saida;
        })()`, true);
        if (!r) return 0;
        let n = 0;
        for (const num of bot.numeros) {
          const achados = r[num.tel];
          if (achados && achados.length) { num.ids = [...new Set([...(num.ids || []), ...achados])]; n++; }
        }
        if (n) { salvar(); registrar({ tipo: 'sistema', msg: `ID do WhatsApp vinculado a ${n} número(s) liberado(s)` }); }
        return n;
      } catch { return 0; } finally { resolvendo = null; }
    })();
    return resolvendo;
  }

  async function testar(texto) {
    const bot = cfgBot();
    const cmd = extrairComando(texto, bot.gatilho);
    return executor().responder(cmd === null ? texto : cmd);
  }

  function definirConfig(novo) {
    const c = getCfg();
    const atual = cfgBot();
    const proximo = normalizarConfig({
      ...novo,
      agenda: { ...(novo && novo.agenda), ultimoEnvio: atual.agenda.ultimoEnvio },
      saude: { ...(novo && novo.saude), ultimoEnvio: atual.saude.ultimoEnvio },
    }, c.contas || [], c.ativa);
    // mexeu na agenda (ligou, trocou dia/hora/destino): não dispara um envio atrasado da ocorrência que já passou
    const a = atual.agenda, n = proximo.agenda;
    if (a.ativa !== n.ativa || a.dia !== n.dia || a.hora !== n.hora || (a.destino && a.destino.jid) !== (n.destino && n.destino.jid)) n.ultimoEnvio = new Date().toISOString();
    const sa = atual.saude, sn = proximo.saude;
    if (sa.ativa !== sn.ativa || sa.hora !== sn.hora || (sa.destino && sa.destino.jid) !== (sn.destino && sn.destino.jid)) sn.ultimoEnvio = new Date().toISOString();
    c.bot = proximo;
    salvar();
    escutando.delete(proximo.contaId);
    garantirEscuta();
    resolverIds({ forcar: true }).catch(() => {}); // vincula o ID dos números recém-liberados
    return proximo;
  }

  function adicionarNumero({ nome, tel, ids }) {
    const bot = cfgBot();
    const t = normalizarTelefone(tel);
    const existente = bot.numeros.find((n) => (t && n.tel === t) || (ids || []).some((i) => n.ids.includes(i)));
    if (existente) {
      existente.ids = [...new Set([...(existente.ids || []), ...(ids || [])])];
      if (t && !existente.tel) existente.tel = t;
      if (nome && !existente.nome) existente.nome = nome;
    } else bot.numeros.push({ nome: nome || '', tel: t, ids: ids || [] });
    salvar();
    return bot;
  }

  function iniciar() {
    pararTimers();
    timers = [setInterval(() => garantirEscuta(), 20_000), setInterval(() => tick(), 60_000)];
    setTimeout(() => garantirEscuta(), 6_000);
  }
  function pararTimers() { timers.forEach(clearInterval); timers = []; }

  return {
    iniciar, parar: pararTimers, anexar, testar, listarGrupos, listarContatos, definirConfig, adicionarNumero,
    vincularIds: () => resolverIds({ forcar: true }),
    getConfig: () => cfgBot(),
    remetentes: () => remetentes.slice(),
    log: () => logs.slice(),
    status: () => ({ ativo: cfgBot().ativo, escutando: escutando.has(cfgBot().contaId) }),
    semanalAgora: () => rodarSemanal(),
    saudeAgora: (opcoes) => rodarSaude(opcoes),
  };
}

module.exports = { criarServico, normalizarConfig, lerBackup };
