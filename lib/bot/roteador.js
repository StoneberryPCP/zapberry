// Entende a mensagem: só reage a quem começa com o gatilho (padrão "berry") e transforma a frase numa intenção.
const { norm } = require('./texto');
const { interpretarPeriodo } = require('./periodo');

/** Se a mensagem começa com o gatilho, devolve o resto; senão null. Aceita "berry", "Berry,", "@berry", "/berry". */
function extrairComando(texto, gatilho = 'berry') {
  const g = String(gatilho || 'berry').trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = String(texto ?? '').match(new RegExp(`^\\s*[/@]?${g}\\b[\\s,:;!.-]*([\\s\\S]*)$`, 'i'));
  return m ? m[1].trim() : null;
}

const PALAVRAS_LIGACAO = new Set(['em', 'o', 'a', 'os', 'as', 'que', 'tem', 'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'pro', 'pra',
  'para', 'pelo', 'pela', 'cliente', 'clientes', 'do cliente', 'me', 'mostra', 'mostre', 'manda', 'mande', 'passa', 'passe', 'qual', 'quais',
  'quanto', 'quantos', 'esta', 'estao', 'tem', 'ai', 'por', 'favor', 'um', 'uma', 'e', 'ainda', 'ja', 'agora']);

/** Tira da frase as palavras de comando e de ligação; o que sobra é o nome do cliente. */
function nomeDoCliente(texto, palavrasComando) {
  let t = ` ${norm(texto)} `;
  for (const p of palavrasComando) t = t.replace(new RegExp(`\\b${p}\\b`, 'g'), ' ');
  return t.split(' ').filter((w) => w && !PALAVRAS_LIGACAO.has(w)).join(' ').trim();
}

const tem = (t, re) => re.test(t);

/**
 * Transforma a frase (já sem o gatilho) numa intenção:
 *  { tipo: 'ajuda' | 'relatorio' | 'paradas' | 'status' | 'serrado' | 'semserrar' | 'desconhecido', ... }
 * `ctx.maquinas`: nomes de máquinas conhecidas (pra "paradas da hedel"). `ctx.agora`: relógio (teste).
 */
function interpretar(frase, ctx = {}) {
  const agora = ctx.agora || new Date();
  const t = norm(frase);
  if (!t || tem(t, /^(ajuda|help|menu|comandos?|oi|ola|\?)$/)) return { tipo: 'ajuda' };

  const periodo = interpretarPeriodo(frase, agora);
  const maquina = (ctx.maquinas || []).find((m) => new RegExp(`\\b${norm(m)}\\b`).test(t)) || null;

  // cliente: "sem serrar" tem que ser testado antes de "serrado"
  if (tem(t, /\b(sem serrar|nao serrad[oa]s?|a serrar|pra serrar|para serrar|disponive[li]s? (?:pra|para) serrar)\b/) || (tem(t, /\bblocos?\b/) && !tem(t, /\brelatorio\b/) && !tem(t, /\bserrad[oa]s?\b/))) {
    return { tipo: 'semserrar', cliente: nomeDoCliente(t, ['sem serrar', 'nao serrado', 'nao serrados', 'a serrar', 'pra serrar', 'para serrar', 'disponivel', 'disponiveis', 'blocos', 'bloco', 'patio', 'estoque']) };
  }
  if (tem(t, /\b(serrad[oa]s?|estoque|chapas?)\b/) && !tem(t, /\brelatorio\b/)) {
    return { tipo: 'serrado', cliente: nomeDoCliente(t, ['serrado', 'serrados', 'serrada', 'serradas', 'estoque', 'chapas', 'chapa', 'em estoque']) };
  }

  if (tem(t, /\brelatorios?\b/)) {
    const otimizado = tem(t, /\b(otimizado|resumo|resumido|rapido|simples|curto|principais)\b/);
    return { tipo: 'relatorio', modo: otimizado ? 'otimizado' : 'completo', periodo: periodo.achou ? periodo : null };
  }
  if (tem(t, /\b(saude|checagem|check|alertas?|pendencias?|problemas?|diagnostico|esta tudo (?:ok|certo|bem))\b/)) {
    return { tipo: 'saude' };
  }
  if (tem(t, /\b(resumo|producao|produzimos|produzido|produziu|m2|metros)\b/)) {
    return { tipo: 'relatorio', modo: 'otimizado', periodo: periodo.achou ? periodo : null };
  }
  if (tem(t, /\b(parad[oa]s?|paradas?|parou|parada|paralisa\w*)\b/)) {
    return { tipo: 'paradas', periodo: periodo.achou ? periodo : null, maquina };
  }
  if (tem(t, /\b(status|agora|situacao|andamento|rodando|serrando|como (?:esta|estao|anda|andam)|em operacao)\b/)) {
    return { tipo: 'status', maquina };
  }
  return { tipo: 'desconhecido', texto: frase };
}

module.exports = { extrairComando, interpretar, nomeDoCliente };
