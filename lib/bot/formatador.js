// Monta o texto das respostas do bot (WhatsApp): relatório otimizado/completo, paradas, status, estoque, blocos.
// Toda resposta abre com a assinatura "AgentBerry" (cabeçalho com emoji); o corpo usa só markdown do WhatsApp:
// *negrito*, _itálico_, listas com "- " e blocos ``` para tabelas. A assinatura nunca vira o começo de uma pergunta,
// então o bot não confunde a própria mensagem com um comando.
const { dm } = require('./periodo');

const NOME = '*AgentBerry*';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brl2 = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n0 = (v) => Math.round(Number(v || 0)).toLocaleString('pt-BR');
const n1 = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const pct = (x) => (x == null || Number.isNaN(x) ? '—' : `${Math.round(x * 100)}%`);
const horas = (h) => {
  const m = Math.round(Number(h || 0) * 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};
// "há quanto tempo": minutos, horas, ou dias quando passa de 2 dias. Parada aberta há mais de 3 dias costuma ser esquecida sem encerrar.
const ha = (h) => (h >= 48 ? `${Math.round(h / 24)} dias` : horas(h));
const esquecida = (h) => (h > 72 ? ' — *atenção:* aberta há dias, confira se foi esquecida' : '');
const variacao = (atual, anterior) => {
  if (!anterior || anterior <= 0) return null;
  const v = (atual / anterior - 1) * 100;
  return `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v))}%`;
};
// R$ de um grupo (máquina, cliente, dia): "sem preço" quando TODOS os blocos dele estão sem preço, em vez de um "R$ 0" enganoso
const rs = (x) => (x.blocos > 0 && x.semPreco === x.blocos ? 'sem preço' : brl(x.valor));
const plural = (n, um, varios) => (n === 1 ? um : varios);
const nomeBloco = (b) => b.idInterno || b.numBloco || '—';
const MAX_MSG = 3500;

/** Resposta curta de uma linha, com a assinatura do agente. */
const resposta = (texto) => `${NOME} · ${texto}`;
/** Cabeçalho de uma resposta: emoji + assinatura + assunto. */
const cab = (emoji, assunto) => `${emoji} ${NOME} · ${assunto}`;

/** Quebra um texto grande em mensagens de até `max` caracteres, sempre entre linhas. */
function dividir(texto, max = MAX_MSG) {
  if (texto.length <= max) return [texto];
  const out = [];
  let atual = '';
  for (const linha of texto.split('\n')) {
    if ((atual + '\n' + linha).length > max && atual) { out.push(atual); atual = linha; }
    else atual = atual ? `${atual}\n${linha}` : linha;
  }
  if (atual) out.push(atual);
  return out;
}

/** Tabela em monospace (bloco ```); cada mensagem leva o cabeçalho de colunas e fecha o próprio bloco. */
function tabela(cabecalhoTxt, linhas, porMsg = 35) {
  const out = [];
  for (let i = 0; i < linhas.length; i += porMsg) {
    out.push('```\n' + [cabecalhoTxt, ...linhas.slice(i, i + porMsg)].join('\n') + '\n```');
  }
  return out;
}

/* ─── agrupamentos ─── */
function porMaquina(d) {
  const mapa = new Map();
  const get = (nome) => { if (!mapa.has(nome)) mapa.set(nome, { nome, m2: 0, chapas: 0, blocos: 0, valor: 0, semPreco: 0, horasOS: 0, paradaH: 0 }); return mapa.get(nome); };
  d.maquinas.forEach((m) => get(m.nome));
  d.blocos.forEach((b) => { const x = get(b.maquina); x.m2 += b.m2; x.chapas += b.chapas; x.blocos += 1; x.valor += b.valor; if (b.semPreco) x.semPreco += 1; });
  d.oss.forEach((o) => { const x = get(o.maquina); x.horasOS += o.horasNoPeriodo; x.paradaH += o.paradaH; });
  return [...mapa.values()].sort((a, b) => b.m2 - a.m2);
}
function agrupar(blocos, chave) {
  const mapa = new Map();
  for (const b of blocos) {
    const k = chave(b) || '—';
    if (!mapa.has(k)) mapa.set(k, { nome: k, m2: 0, valor: 0, blocos: 0, semPreco: 0 });
    const x = mapa.get(k); x.m2 += b.m2; x.valor += b.valor; x.blocos += 1; if (b.semPreco) x.semPreco += 1;
  }
  return [...mapa.values()].sort((a, b) => b.m2 - a.m2);
}
const semPreco = (d) => d.blocos.filter((b) => b.semPreco);

function linhaSemPreco(b) {
  return `${nomeBloco(b)} (${b.cliente || '—'} · ${b.material || '—'} · ${b.chapas} chapas · ${dm(new Date(`${b.dia}T12:00:00`))})`;
}
function avisoSemPreco(d, { completo }) {
  const lista = semPreco(d);
  if (!lista.length) return null;
  const limite = completo ? lista.length : 5;
  const linhas = lista.slice(0, limite).map((b) => `- ${linhaSemPreco(b)}`);
  const resto = lista.length - limite;
  const varios = lista.length > 1;
  return [
    `⚠️ *Atenção: ${lista.length} bloco${varios ? 's' : ''} serrado${varios ? 's' : ''} SEM PREÇO cadastrado*`,
    `O total em R$ *NÃO inclui* ${varios ? 'eles' : 'ele'}:`,
    ...linhas,
    ...(resto > 0 ? [`_… e mais ${resto}. Lista completa: relatório completo._`] : []),
  ].join('\n');
}

/* ─── relatório ─── */
function cabecalho(titulo, rotulo, extra, emoji = '📊') {
  return cab(emoji, `${titulo} — ${rotulo}${extra ? ` · ${extra}` : ''}`);
}

function blocoPrincipais({ d, k, kAnt }) {
  const l = [];
  l.push(`- *${n0(k.m2)} m²* serrados · ${n0(k.chapas)} chapas · ${n0(k.blocos)} blocos`);
  l.push(`- *${brl(k.valor)}*${k.valorM2 > 0 ? ` · ${brl2(k.valorM2)}/m²` : ''}`);
  if (k.m2Dia > 0) l.push(`- Média de ${n0(k.m2Dia)} m²/dia`);
  const maq = porMaquina(d).filter((m) => m.m2 > 0);
  if (maq.length) l.push(`- Por máquina (m²): ${maq.map((m) => `${m.nome} *${n0(m.m2)}*`).join(' · ')}`);
  if (kAnt && kAnt.m2 > 0) {
    const vm = variacao(k.m2, kAnt.m2);
    const vv = variacao(k.valor, kAnt.valor);
    l.push(`- Vs período anterior: m² ${vm}${vv ? ` · R$ ${vv}` : ''}`);
  }
  if (k.m2Estimado > 0) l.push(`- _${n0(k.m2Estimado)} m² são estimados (bloco ainda sem inspeção)_`);
  return l;
}

function vazio(rotulo) {
  return [`${cabecalho('Produção', rotulo)}\n\nNenhuma serrada finalizada neste período.`];
}

function relatorioOtimizado({ rotulo, d, k, kAnt, comando }) {
  if (!k.blocos) return vazio(rotulo);
  const partes = [cabecalho('Produção', rotulo), '', ...blocoPrincipais({ d, k, kAnt })];
  const aviso = avisoSemPreco(d, { completo: false });
  if (aviso) partes.push('', aviso);
  if (comando) partes.push('', `_Detalhes: ${comando}_`);
  return dividir(partes.join('\n'));
}

function relatorioCompleto({ rotulo, d, k, kAnt, insights }) {
  if (!k.blocos) return vazio(rotulo);
  const msgs = [];

  // 1. principais + aviso
  const p1 = [cabecalho('Relatório completo', rotulo), '', ...blocoPrincipais({ d, k, kAnt })];
  const aviso = avisoSemPreco(d, { completo: true });
  if (aviso) p1.push('', aviso);
  msgs.push(...dividir(p1.join('\n')));

  // 2. por máquina + operação
  const p2 = ['🏭 *Por máquina*'];
  for (const m of porMaquina(d)) {
    const util = k.horasPeriodo > 0 ? m.horasOS / k.horasPeriodo : 0;
    p2.push(`- *${m.nome}* — ${n0(m.m2)} m² · ${n0(m.chapas)} chapas · ${m.blocos} blocos · ${rs(m)}`);
    p2.push(`  _em serrada ${horas(m.horasOS)} (${pct(util)} do período) · paradas ${horas(m.paradaH)}_`);
  }
  p2.push('', '⚙️ *Operação*');
  p2.push(`- Utilização *${pct(k.utilizacao)}* · disponibilidade *${pct(k.disponibilidade)}*`);
  if (k.m2Hora > 0) p2.push(`- Ritmo real: ${n1(k.m2Hora)} m²/h (horímetro)`);
  p2.push(`- Serradas concluídas: ${k.osConcluidas}${k.fimCursoRetiradaH != null ? ` · retirada média após o fim de curso: ${horas(k.fimCursoRetiradaH)}` : ''}`);
  msgs.push(...dividir(p2.join('\n')));

  // 3. dia a dia (tabela em monospace, alinhada)
  const dias = agrupar(d.blocos, (b) => b.dia).sort((a, b) => a.nome.localeCompare(b.nome));
  if (dias.length > 1) {
    const valores = dias.map((x) => rs(x));
    const lv = Math.max(...valores.map((v) => v.length), 5);
    const linhas = dias.map((x, i) => `${dm(new Date(`${x.nome}T12:00:00`))}  ${n0(x.m2).padStart(7)}  ${valores[i].padStart(lv)}  ${String(x.blocos).padStart(3)}`);
    const [primeira, ...resto] = tabela(`DIA    ${'M²'.padStart(7)}  ${'VALOR'.padStart(lv)}  BLC`, linhas, 40);
    msgs.push(`📅 *Dia a dia*\n${primeira}`, ...resto);
  }

  // 4. paradas
  if (d.paradas.length) {
    const tipos = new Map();
    for (const p of d.paradas) {
      const x = tipos.get(p.tipo || '—') || { nome: p.tipo || '—', h: 0, n: 0 };
      x.h += p.h; x.n += 1; tipos.set(x.nome, x);
    }
    const lista = [...tipos.values()].sort((a, b) => b.h - a.h);
    const p4 = [`⏸️ *Paradas* — ${horas(k.horasParada)} em ${d.paradas.length} paradas${k.horasOS > 0 ? ` (${pct(k.horasParada / k.horasOS)} do tempo em serrada)` : ''}`];
    lista.slice(0, 8).forEach((x) => p4.push(`- *${x.nome}*: ${horas(x.h)} (${x.n}x)`));
    if (lista.length > 8) p4.push(`_… e mais ${lista.length - 8} ${plural(lista.length - 8, 'motivo', 'motivos')}_`);
    msgs.push(...dividir(p4.join('\n')));
  }

  // 5. clientes, materiais, classes
  const clientes = agrupar(d.blocos, (b) => b.cliente);
  const materiais = agrupar(d.blocos, (b) => b.material);
  const classes = agrupar(d.blocos, (b) => (b.classe ? `Classe ${b.classe}` : 'Sem classe')).sort((a, b) => a.nome.localeCompare(b.nome));
  const p5 = ['👥 *Clientes*'];
  clientes.slice(0, 10).forEach((x) => p5.push(`- *${x.nome}*: ${n0(x.m2)} m² · ${rs(x)}`));
  if (clientes.length > 10) p5.push(`_… e mais ${clientes.length - 10} ${plural(clientes.length - 10, 'cliente', 'clientes')}_`);
  p5.push('', '🪨 *Materiais*');
  materiais.slice(0, 8).forEach((x) => p5.push(`- *${x.nome}*: ${n0(x.m2)} m²`));
  if (materiais.length > 8) p5.push(`_… e mais ${materiais.length - 8} ${plural(materiais.length - 8, 'material', 'materiais')}_`);
  if (classes.length > 1) p5.push('', '📊 *Por classe*', `- ${classes.map((x) => `${x.nome} *${n0(x.m2)} m²*`).join(' · ')}`);
  msgs.push(...dividir(p5.join('\n')));

  // 6. qualidade
  const p6 = ['🔎 *Qualidade*'];
  p6.push(`- Inspecionados: *${k.inspecionados}* de ${k.blocos} blocos${k.semInspecao ? ` (${k.semInspecao} sem inspeção)` : ''}`);
  if (k.aprovacao != null) p6.push(`- Aprovação *${pct(k.aprovacao)}* · com ressalva ${pct(k.ressalva)} · reprovação ${pct(k.reprovacao)}`);
  if (k.pctChapasDefeito != null) p6.push(`- Chapas com defeito: ${n0(k.chapasDefeito)} (${pct(k.pctChapasDefeito)}) · quebradas: ${n0(k.chapasQuebradas)}`);
  if (k.aproveitamento != null) p6.push(`- Aproveitamento da chapa: *${pct(k.aproveitamento)}*`);
  msgs.push(...dividir(p6.join('\n')));

  // 7. insights
  if (insights && insights.length) {
    msgs.push(...dividir(['💡 *O que chama atenção*', ...insights.slice(0, 8).map((t) => `- ${t}`)].join('\n')));
  }
  return msgs;
}

/* ─── paradas ─── */
function paradasMsg({ rotulo, maquina, d, k, abertas }) {
  const l = [cabecalho('Paradas', rotulo, maquina, '⏸️')];
  if (abertas && abertas.length) {
    l.push('', '🔴 *Paradas agora*');
    abertas.forEach((p) => l.push(`- *${p.maquina || '—'}* — ${p.tipo}${p.obs ? ` (${p.obs})` : ''}, há ${ha(p.h)}${esquecida(p.h)}`));
  }
  if (!d.paradas.length) {
    l.push('', 'Nenhuma parada registrada neste período.');
    return dividir(l.join('\n'));
  }
  l.push('', `Total parado: *${horas(k.horasParada)}* em ${d.paradas.length} paradas${k.horasOS > 0 ? ` (${pct(k.horasParada / k.horasOS)} do tempo em serrada)` : ''}`);
  const tipos = new Map();
  for (const p of d.paradas) {
    const x = tipos.get(p.tipo || '—') || { nome: p.tipo || '—', h: 0, n: 0 };
    x.h += p.h; x.n += 1; tipos.set(x.nome, x);
  }
  l.push('', '*Por motivo*');
  [...tipos.values()].sort((a, b) => b.h - a.h).slice(0, 10).forEach((x) => l.push(`- ${x.nome}: ${horas(x.h)} (${x.n}x)`));
  if (!maquina) {
    const maq = new Map();
    for (const p of d.paradas) maq.set(p.maquina, (maq.get(p.maquina) || 0) + p.h);
    l.push('', '*Por máquina*');
    [...maq.entries()].sort((a, b) => b[1] - a[1]).forEach(([nome, h]) => l.push(`- ${nome}: ${horas(h)}`));
  }
  return dividir(l.join('\n'));
}

/* ─── status agora ─── */
function statusMsg({ agora, ativas, abertas, hoje, maquinas }) {
  const hh = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  const l = [cab('🕒', `Agora — ${dm(agora)} ${hh}`), ''];
  const nomes = new Set([...(maquinas || []), ...ativas.map((o) => o.maquina)]);
  for (const nome of [...nomes].sort()) {
    const os = ativas.find((o) => o.maquina === nome);
    const par = (abertas || []).find((p) => p.maquina === nome);
    if (par) l.push(`- *${nome}* — *PARADA:* ${par.tipo}${par.obs ? ` (${par.obs})` : ''}, há ${ha(par.h)}${os ? ` · OS ${os.numero}` : ''}${esquecida(par.h)}`);
    else if (os) l.push(`- *${nome}* — serrando: OS ${os.numero} · ${os.blocos || 'sem bloco'} · há ${horas(os.h)}`);
    else l.push(`- *${nome}* — _sem serrada em andamento_`);
  }
  if (hoje && hoje.blocos) {
    l.push('', `Hoje até agora: *${n0(hoje.m2)} m²* · ${hoje.semPreco === hoje.blocos ? 'sem preço' : brl(hoje.valor)} · ${hoje.blocos} blocos`);
    if (hoje.semPreco) l.push(`*Atenção:* ${hoje.semPreco} ${plural(hoje.semPreco, 'bloco', 'blocos')} sem preço (fora do total em R$).`);
  } else l.push('', 'Hoje ainda sem serrada finalizada.');
  return dividir(l.join('\n'));
}

/* ─── checagem de saúde ─── */
const dataHora = (d) => `${dm(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * d: { agora, paradas:[{maquina,tipo,obs,h}], osLongas:[{maquina,numero,h}], inspecoes:[{maquina,numero,dias}],
 *      semPreco:[bloco], cron:[{job,tipo,quando,mensagem}], backup:{tipo,texto,h,quando}|null,
 *      naoVerificados:[{nome,motivo}], verificados:[nome] }
 */
function saudeMsg(d) {
  const cabec = cab('🩺', `Checagem diária — ${dataHora(d.agora)}`);
  const grupos = [];
  if (d.paradas.length) {
    grupos.push(['⏸️ *Paradas abertas há mais de 24 h*',
      ...d.paradas.map((p) => `- *${p.maquina || '—'}* — ${p.tipo}${p.obs ? ` (${p.obs})` : ''}, há ${ha(p.h)}${esquecida(p.h)}`)]);
  }
  if (d.osLongas.length) {
    grupos.push(['🪚 *Serradas em andamento há mais de 48 h*',
      ...d.osLongas.map((o) => `- *${o.maquina}* — OS ${o.numero}, há ${ha(o.h)}`)]);
  }
  if (d.inspecoes.length) {
    const lim = 8;
    grupos.push(['🔎 *OS aguardando inspeção há mais de 5 dias*',
      ...d.inspecoes.slice(0, lim).map((o) => `- OS ${o.numero}${o.maquina ? ` (${o.maquina})` : ''} — há ${o.dias} dias`),
      ...(d.inspecoes.length > lim ? [`_… e mais ${d.inspecoes.length - lim}_`] : [])]);
  }
  if (d.semPreco.length) {
    const lim = 8;
    const n = d.semPreco.length;
    grupos.push([`💰 *${n} ${plural(n, 'bloco serrado', 'blocos serrados')} sem preço (últimos 30 dias)*`,
      ...d.semPreco.slice(0, lim).map((b) => `- ${linhaSemPreco(b)}`),
      ...(n > lim ? [`_… e mais ${n - lim}. Lista completa: relatório completo._`] : [])]);
  }
  if (d.cron.length) {
    grupos.push(['⚙️ *Rotinas automáticas do banco*',
      ...d.cron.map((c) => (c.tipo === 'falhou'
        ? `- *${c.job}* — última execução *falhou*${c.quando ? ` (${dataHora(c.quando)})` : ''}${c.mensagem ? `: ${c.mensagem}` : ''}`
        : `- *${c.job}* — sem rodar desde ${dataHora(c.quando)}`))]);
  }
  if (d.backup) {
    const b = d.backup;
    const txt = b.tipo === 'atrasado' ? `último backup há ${ha(b.h)} (${dataHora(b.quando)})`
      : b.tipo === 'falhou' ? `o último backup *falhou*: ${b.texto}` : b.texto;
    grupos.push(['💾 *Backup do banco*', `- ${txt}`]);
  }

  const l = [cabec, ''];
  if (!grupos.length) l.push('Nenhum ponto de atenção.', `_Conferido: ${d.verificados.join(', ') || 'nada'}._`);
  else {
    l.push(`*${grupos.length} ${plural(grupos.length, 'assunto precisa', 'assuntos precisam')} de atenção:*`);
    for (const g of grupos) l.push('', ...g);
  }
  if (d.naoVerificados.length) {
    l.push('', `_Não consegui conferir: ${d.naoVerificados.map((x) => `${x.nome} (${x.motivo})`).join('; ')}._`);
  }
  return { temProblema: grupos.length > 0, mensagens: dividir(l.join('\n')) };
}

/* ─── cliente: estoque e blocos ─── */
function estoqueMsg({ cliente, rows, agora }) {
  const dt = `${dm(agora)}/${agora.getFullYear()}`;
  const cabec = cab('📦', `Chapas em estoque — ${cliente}`);
  if (!rows.length) return [`${cabec}\n_Atualizado em ${dt}_\n\nNenhuma chapa em estoque no momento.`];
  const total = rows.reduce((s, r) => s + r.qtd, 0);
  const esp2 = (n) => String(Math.round(Number(n))).padStart(2, '0');
  const linhas = rows.map((r) => `${String(r.numero || '—').padEnd(11)} ${(r.interno || '—').padEnd(8)} ${(esp2(r.esp) + 'cm').padEnd(5)} ${String(r.qtd).padStart(4)}  ${r.material}`);
  const [primeira, ...resto] = tabela('BLOCO       ID-INT   ESP   QTD  MATERIAL', linhas);
  return [`${cabec}\n_Atualizado em ${dt}_\n${primeira}`, ...resto, `*Total: ${n0(total)} chapas*`];
}

function blocosMsg({ cliente, itens, agora }) {
  const dt = `${dm(agora)}/${agora.getFullYear()}`;
  const cabec = cab('⛰️', `Blocos para serrar — ${cliente}`);
  if (!itens.length) return [`${cabec}\n_Atualizado em ${dt}_\n\nNenhum bloco disponível no pátio.`];
  const m3 = itens.reduce((s, i) => s + i.m3, 0);
  const linhas = itens.map((i) => {
    const obs = i.interaCm != null ? ` (intera${i.interaCm ? ` ${i.interaCm}cm` : ''})` : '';
    return `${String(i.numero).padEnd(11)} ${String(i.interno).padEnd(8)} ${i.medidas.padEnd(15)} ${i.m3.toFixed(2).replace('.', ',').padStart(6)}  ${i.material}${obs}`;
  });
  const [primeira, ...resto] = tabela('BLOCO       ID-INT   MEDIDAS          M³     MATERIAL', linhas);
  return [`${cabec}\n_Atualizado em ${dt}_\n${primeira}`, ...resto, `*${itens.length} bloco(s) · ${n1(m3).replace('.', ',')} m³*`];
}

/* ─── ajuda, não entendi ─── */
function ajudaMsg(gatilho = 'berry') {
  return [[
    cab('💬', 'Posso responder'),
    '',
    `- *${gatilho} relatório* — completo, do mês`,
    `  _${gatilho} relatório ontem · semana · mês passado · outubro · 01/10 a 15/10_`,
    `- *${gatilho} resumo hoje* — só os números principais`,
    `- *${gatilho} paradas* — _${gatilho} paradas da hedel essa semana_`,
    `- *${gatilho} status* — o que cada máquina está fazendo agora`,
    `- *${gatilho} saúde* — pontos de atenção: paradas esquecidas, preços faltando, rotinas e backup`,
    `- *${gatilho} serrado AG Brasil* — chapas em estoque do cliente`,
    `- *${gatilho} sem serrar AG Brasil* — blocos do cliente no pátio`,
  ].join('\n')];
}
function naoEntendi(gatilho = 'berry') {
  return [resposta(`Não entendi essa. Tente: *${gatilho} relatório*, *${gatilho} paradas*, *${gatilho} status* ou *${gatilho} ajuda*.`)];
}

module.exports = {
  dividir, relatorioOtimizado, relatorioCompleto, paradasMsg, statusMsg, saudeMsg, estoqueMsg, blocosMsg, ajudaMsg, naoEntendi,
  porMaquina, brl, n0, horas, resposta, NOME,
};
