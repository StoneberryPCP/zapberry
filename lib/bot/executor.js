// Executa a intenção: consulta o sistema (só leitura) e devolve as mensagens de resposta.
// Os números do relatório vêm do MESMO cálculo da Serraria 360 (lib/relatorio360.bundle.js), não de uma cópia.
const { resolverCliente } = require('./texto');
const { periodoPadrao } = require('./periodo');
const { interpretar } = require('./roteador');
const F = require('./formatador');
const S = require('./saude');

const MAX_DIAS = 366;
const enc = encodeURIComponent;

class ErroUsuario extends Error {}

const tsDe = (s) => (s ? new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`).getTime() : null);
const emCm = (v) => (v == null ? null : (Number(v) <= 3 ? Math.round(Number(v) * 100) : Math.round(Number(v))));

/**
 * `sb(caminho)`: GET no REST do sistema, devolve o JSON.   `R`: o pacote relatorio360 (carregar360, indicadores...).
 * `agora()`: relógio (teste).   `gatilho()`: palavra de chamada, pra montar as dicas.
 */
function criarExecutor({ sb, R, agora = () => new Date(), gatilho = () => 'berry', verificarBackup = null }) {
  let cacheClientes = { t: 0, lista: [] };
  let cacheMaquinas = { t: 0, lista: [] };
  const cacheRel = new Map();

  async function clientes() {
    if (Date.now() - cacheClientes.t < 5 * 60_000 && cacheClientes.lista.length) return cacheClientes.lista;
    const lista = await sb('clientes?select=id,nome&order=nome&limit=1000');
    cacheClientes = { t: Date.now(), lista };
    return lista;
  }
  async function maquinas() {
    if (Date.now() - cacheMaquinas.t < 10 * 60_000 && cacheMaquinas.lista.length) return cacheMaquinas.lista;
    const rows = await sb('serraria_maquinas?select=nome&ativo=eq.true&order=nome');
    const lista = rows.map((r) => r.nome);
    cacheMaquinas = { t: Date.now(), lista };
    return lista;
  }

  /** Dados do período (e do anterior, de mesmo tamanho). Guarda 60 s: "completo" logo depois de "resumo" não recarrega. */
  async function dadosDoPeriodo(periodo) {
    if ((periodo.fim - periodo.ini) / 86_400_000 > MAX_DIAS) throw new ErroUsuario('Período grande demais: o máximo é 1 ano.');
    const chave = `${+periodo.ini}-${+periodo.fim}`;
    const c = cacheRel.get(chave);
    if (c && Date.now() - c.t < 60_000) return c.v;
    const range = { start: periodo.ini, end: periodo.fim };
    const ant = R.periodoAnterior(range);
    const [d0, a0] = await Promise.all([R.carregar360(range, 'all'), ant ? R.carregar360(ant, 'all') : Promise.resolve(null)]);
    const v = { d0, a0 };
    if (cacheRel.size >= 8) cacheRel.delete(cacheRel.keys().next().value);
    cacheRel.set(chave, { t: Date.now(), v });
    return v;
  }

  /* ─── relatório ─── */
  async function relatorio(intent) {
    const periodo = intent.periodo || periodoPadrao(agora());
    const { d0, a0 } = await dadosDoPeriodo(periodo);
    const d = R.aplicarFiltros(d0, {});
    const k = R.indicadores(d, {});
    const kAnt = a0 ? R.indicadores(R.aplicarFiltros(a0, {}), {}) : null;
    if (intent.modo === 'completo') {
      return F.relatorioCompleto({ rotulo: periodo.rotulo, d, k, kAnt, insights: R.gerarInsights(d, k, kAnt, {}, false) });
    }
    const comando = `${gatilho()} relatório completo${periodo.padrao ? '' : ` ${periodo.curto || ''}`}`.trim();
    return F.relatorioOtimizado({ rotulo: periodo.rotulo, d, k, kAnt, comando });
  }

  /* ─── paradas ─── */
  async function paradasAbertas(filtroMaquina) {
    const abertas = await sb('serraria_paradas?select=os_id,tipo,observacao,data_hora_inicio&data_hora_fim=is.null&limit=200');
    if (!abertas.length) return [];
    const ids = [...new Set(abertas.map((p) => p.os_id))];
    const oss = await sb(`serraria_os?select=id,numero_os,maquinas:serraria_maquinas(nome)&id=in.(${ids.join(',')})`);
    const maq = new Map(oss.map((o) => [o.id, o.maquinas?.nome ?? null]));
    const t = agora().getTime();
    const vistos = new Set();
    return abertas
      .map((p) => ({ maquina: maq.get(p.os_id), tipo: p.tipo || '—', obs: p.observacao || '', h: Math.max(0, (t - tsDe(p.data_hora_inicio)) / 3_600_000) }))
      .filter((p) => (!filtroMaquina || p.maquina === filtroMaquina))
      .filter((p) => { const k = `${p.maquina}|${p.tipo}`; if (vistos.has(k)) return false; vistos.add(k); return true; }); // parada global vem repetida em cada OS
  }
  async function paradas(intent) {
    const periodo = intent.periodo || periodoPadrao(agora());
    const { d0 } = await dadosDoPeriodo(periodo);
    const f = intent.maquina ? { maquina: intent.maquina } : {};
    const d = R.aplicarFiltros(d0, f);
    const k = R.indicadores(d, f);
    return F.paradasMsg({ rotulo: periodo.rotulo, maquina: intent.maquina, d, k, abertas: await paradasAbertas(intent.maquina) });
  }

  /* ─── status agora ─── */
  async function status(intent) {
    const now = agora();
    const osRows = await sb('serraria_os?select=id,numero_os,numero_sufixo,data_hora_inicial,maquinas:serraria_maquinas(nome),serraria_os_blocos(bloco_id_interno,bloco_id_cliente,cliente_nome,material_nome)&status=eq.ativa&limit=50');
    const ativas = osRows.map((o) => {
      const bl = o.serraria_os_blocos || [];
      const b0 = bl[0];
      const resumo = b0 ? `${b0.bloco_id_interno || b0.bloco_id_cliente || 'bloco'} (${b0.cliente_nome || '—'} · ${b0.material_nome || '—'})${bl.length > 1 ? ` +${bl.length - 1}` : ''}` : '';
      return {
        maquina: o.maquinas?.nome ?? '—',
        numero: `${String(o.numero_os ?? '').padStart(4, '0')}${o.numero_sufixo ? `-${o.numero_sufixo}` : ''}`,
        blocos: resumo,
        h: Math.max(0, (now.getTime() - tsDe(o.data_hora_inicial)) / 3_600_000),
      };
    }).filter((o) => !intent.maquina || o.maquina === intent.maquina);
    const abertas = await paradasAbertas(intent.maquina);
    const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let hoje = null;
    try {
      const { d0 } = await dadosDoPeriodo({ ini: inicioHoje, fim: now });
      const k = R.indicadores(R.aplicarFiltros(d0, {}), {});
      hoje = { m2: k.m2, valor: k.valor, blocos: k.blocos, semPreco: k.blocosSemPreco };
    } catch { /* sem o resumo do dia, o resto da resposta segue */ }
    const todas = await maquinas();
    return F.statusMsg({ agora: now, ativas, abertas, hoje, maquinas: intent.maquina ? [intent.maquina] : todas });
  }

  /* ─── checagem de saúde: o que precisa de atenção (cada verificação falha sozinha, sem derrubar as outras) ─── */
  async function saude() {
    const now = agora();
    const verificados = [];
    const naoVerificados = [];
    const tentar = async (nome, fn, vazio) => {
      try { const v = await fn(); verificados.push(nome); return v; }
      catch (e) { naoVerificados.push({ nome, motivo: String(e.message || e).slice(0, 80) }); return vazio; }
    };
    const numOS = (o) => `${String(o.numero_os ?? '').padStart(4, '0')}${o.numero_sufixo ? `-${o.numero_sufixo}` : ''}`;

    const paradas = await tentar('paradas', async () => (await paradasAbertas()).filter((p) => p.h > S.LIMITES.paradaAbertaH).sort((a, b) => b.h - a.h), []);

    const osLongas = await tentar('serradas em andamento', async () => {
      const rows = await sb('serraria_os?select=numero_os,numero_sufixo,data_hora_inicial,maquinas:serraria_maquinas(nome)&status=eq.ativa&limit=50');
      return rows.map((o) => ({ maquina: o.maquinas?.nome ?? '—', numero: numOS(o), h: (now.getTime() - tsDe(o.data_hora_inicial)) / 3_600_000 }))
        .filter((o) => o.h > S.LIMITES.osAtivaH).sort((a, b) => b.h - a.h);
    }, []);

    const inspecoes = await tentar('inspeções', async () => {
      const rows = await sb('serraria_os?select=numero_os,numero_sufixo,updated_at,maquinas:serraria_maquinas(nome)&status=eq.inspecao&limit=200');
      return rows.map((o) => ({ maquina: o.maquinas?.nome ?? null, numero: numOS(o), dias: Math.floor((now.getTime() - tsDe(o.updated_at)) / 86_400_000) }))
        .filter((o) => o.dias > S.LIMITES.inspecaoDias).sort((a, b) => b.dias - a.dias);
    }, []);

    const semPreco = await tentar('preços dos blocos', async () => {
      const ini = new Date(now.getTime() - S.LIMITES.semPrecoDias * 86_400_000);
      const { d0 } = await dadosDoPeriodo({ ini, fim: now });
      return R.aplicarFiltros(d0, {}).blocos.filter((b) => b.semPreco).sort((a, b) => String(b.dia).localeCompare(String(a.dia)));
    }, []);

    const cron = await tentar('rotinas automáticas', async () => {
      let rows;
      try { rows = await sb('rpc/saude_cron'); }
      catch (e) { throw new Error('função saude_cron ainda não criada no banco'); }
      return S.avaliarCron(rows, now);
    }, []);

    let backup = null;
    if (verificarBackup) {
      try {
        const r = S.avaliarBackup(await verificarBackup(), now);
        if (r.naoVerificado) naoVerificados.push({ nome: 'backup', motivo: r.naoVerificado });
        else { verificados.push('backup'); backup = r.problema; }
      } catch (e) { naoVerificados.push({ nome: 'backup', motivo: String(e.message || e).slice(0, 80) }); }
    }
    return F.saudeMsg({ agora: now, paradas, osLongas, inspecoes, semPreco, cron, backup, naoVerificados, verificados });
  }

  /* ─── cliente: serrado (estoque) e sem serrar (blocos) ─── */
  async function acharCliente(nome, base) {
    const g = gatilho();
    if (!nome) return { msgs: [F.resposta(`De qual cliente? Ex.: *${g} ${base} AG Brasil*`)] };
    const r = resolverCliente(nome, await clientes());
    if (r.vazio) return { msgs: [F.resposta(`Não achei nenhum cliente parecido com "${nome}".`)] };
    if (r.candidatos) return { msgs: [`${F.resposta('Qual destes?')}\n${r.candidatos.map((c) => `- ${g} ${base} ${c.nome}`).join('\n')}`] };
    return { cliente: r.cliente };
  }

  async function serrado(intent) {
    const a = await acharCliente(intent.cliente, 'serrado');
    if (!a.cliente) return a.msgs;
    const rows = await sb(`estoque_chapas?select=cliente_nome,material_nome,id_interno,numero_bloco,espessura,disponivel&cliente_nome=ilike.${enc(a.cliente.nome)}&order=material_nome&limit=2000`);
    const linhas = rows.filter((r) => Number(r.disponivel) > 0).map((r) => ({
      material: r.material_nome, interno: r.id_interno, numero: r.numero_bloco || '—', esp: Number(r.espessura), qtd: Number(r.disponivel),
    }));
    return F.estoqueMsg({ cliente: a.cliente.nome, rows: linhas, agora: agora() });
  }

  // Mesma regra da aba Blocos do ZapBerry: sai da lista quem já saiu do pátio, é legado, está na serraria agora
  // ou já foi serrado por completo (OS finalizada sem sobra intera). Intera com sobra aparece marcada.
  async function semSerrar(intent) {
    const a = await acharCliente(intent.cliente, 'sem serrar');
    if (!a.cliente) return a.msgs;
    const rows = await sb(
      'blocos_patio?select=id_interno,numero_bloco,c,a,l,finalizado,clientes!inner(nome),materiais(nome)'
      + `&clientes.nome=ilike.${enc(a.cliente.nome)}&finalizado=neq.SA%C3%8DDA`
      + '&serrado_legado=not.is.true&id_interno=not.is.null&order=created_at.desc&limit=300',
    );
    const ids = rows.map((r) => r.id_interno).filter(Boolean);
    const emProcesso = new Set();
    const ultima = new Map();
    if (ids.length) {
      const s = await sb(
        'serraria_os_blocos?select=bloco_id_interno,sobra_intera,sobra_intera_cm,serraria_os!inner(status,data_hora_final,created_at)'
        + `&bloco_id_interno=in.(${ids.map((i) => `"${i}"`).join(',')})`
        + '&serraria_os.status=in.(ativa,inspecao,liberado,pcp,finalizada)',
      );
      for (const x of s) {
        const st = x.serraria_os?.status;
        if (['ativa', 'inspecao', 'liberado', 'pcp'].includes(st)) emProcesso.add(x.bloco_id_interno);
        else if (st === 'finalizada') {
          const key = x.serraria_os?.data_hora_final ?? x.serraria_os?.created_at ?? '';
          const cur = ultima.get(x.bloco_id_interno);
          if (!cur || key > cur.key) ultima.set(x.bloco_id_interno, { key, sobra: !!x.sobra_intera, cm: emCm(x.sobra_intera_cm) });
        }
      }
    }
    const itens = rows
      .filter((r) => !emProcesso.has(r.id_interno))
      .filter((r) => !ultima.has(r.id_interno) || ultima.get(r.id_interno).sobra)
      .map((r) => ({
        interno: r.id_interno || '—', numero: r.numero_bloco || '—', material: r.materiais?.nome || '—',
        m3: (Number(r.c) * Number(r.a) * Number(r.l)) || 0,
        medidas: `${Number(r.c).toFixed(2)}×${Number(r.a).toFixed(2)}×${Number(r.l).toFixed(2)}`,
        interaCm: ultima.get(r.id_interno)?.sobra ? (ultima.get(r.id_interno).cm ?? 0) : null,
      }));
    return F.blocosMsg({ cliente: a.cliente.nome, itens, agora: agora() });
  }

  /** Entrada principal: frase já sem o gatilho → lista de mensagens de resposta. */
  async function responder(frase) {
    const intent = interpretar(frase, { agora: agora(), maquinas: await maquinas().catch(() => []) });
    let mensagens;
    try {
      if (intent.tipo === 'ajuda') mensagens = F.ajudaMsg(gatilho());
      else if (intent.tipo === 'relatorio') mensagens = await relatorio(intent);
      else if (intent.tipo === 'paradas') mensagens = await paradas(intent);
      else if (intent.tipo === 'status') mensagens = await status(intent);
      else if (intent.tipo === 'saude') mensagens = (await saude()).mensagens;
      else if (intent.tipo === 'serrado') mensagens = await serrado(intent);
      else if (intent.tipo === 'semserrar') mensagens = await semSerrar(intent);
      else mensagens = F.naoEntendi(gatilho());
    } catch (e) {
      mensagens = [F.resposta(e instanceof ErroUsuario ? e.message : `Não consegui consultar o sistema agora (${e.message}). Tente de novo em instantes.`)];
      return { intent, mensagens, erro: e instanceof ErroUsuario ? null : e.message };
    }
    return { intent, mensagens, erro: null };
  }

  return { responder, relatorio, saude, clientes, maquinas, dadosDoPeriodo };
}

module.exports = { criarExecutor, ErroUsuario };
