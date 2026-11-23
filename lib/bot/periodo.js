// Entende o período citado na pergunta: hoje, ontem, semana, mês, "outubro", "01/10 a 15/10"...
// Sem período citado, quem chama usa o mês atual (decisão do dono: "berry relatório" = completo do mês).
const { norm } = require('./texto');

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const fimDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
const dmy = (d) => `${dm(d)}/${d.getFullYear()}`;
const mesmoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function periodo(ini, fim, rotulo, tipo, curto) { return { ini, fim, rotulo, tipo, curto, achou: true }; }
const faixa = (ini, fim) => (mesmoDia(ini, fim) ? dmy(ini) : `${dmy(ini)} a ${dmy(fim)}`);

/** Primeiro dia (segunda-feira) da semana de `d`. */
function segunda(d) {
  const dia = (d.getDay() + 6) % 7; // 0 = segunda
  return inicioDia(addDias(d, -dia));
}

function mesCompleto(ano, mes, agora) {
  const ini = new Date(ano, mes, 1, 0, 0, 0, 0);
  const ultimo = fimDia(new Date(ano, mes + 1, 0));
  const atual = ano === agora.getFullYear() && mes === agora.getMonth();
  const fim = atual ? agora : ultimo;
  return periodo(ini, fim, `${NOMES_MES[mes]}/${ano}${atual ? ` (até ${dm(agora)})` : ''}`, 'mes', atual ? 'mês' : `${NOMES_MES[mes].toLowerCase()} ${ano}`);
}

/** Interpreta datas "dd/mm" ou "dd/mm/aaaa". Sem ano: o ano atual, ou o anterior se a data ficaria no futuro. */
function lerData(txt, agora) {
  const m = txt.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]) - 1;
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;
  let ano = m[3] ? Number(m[3]) : agora.getFullYear();
  if (m[3] && m[3].length === 2) ano += 2000;
  let d = new Date(ano, mes, dia);
  if (d.getMonth() !== mes) return null; // 31/02 etc.
  if (!m[3] && d > fimDia(agora)) d = new Date(ano - 1, mes, dia);
  return d;
}

/**
 * Procura um período no texto. Devolve { achou: false } se não houver nenhum.
 * `texto` pode ser a frase inteira (ex.: "relatório completo 01/10 a 15/10").
 */
function interpretarPeriodo(texto, agora = new Date()) {
  const t = ` ${norm(texto)} `;

  // intervalo de datas: "01/10 a 15/10", "de 01/10 ate 15/10", "01/10 - 15/10"
  const datas = [...t.matchAll(/\b(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)\b/g)].map((x) => lerData(x[1], agora)).filter(Boolean);
  if (datas.length >= 2) {
    let [a, b] = datas;
    if (a > b) [a, b] = [b, a];
    return periodo(inicioDia(a), mesmoDia(b, agora) ? agora : fimDia(b), faixa(a, b), 'datas', faixa(a, b));
  }
  if (datas.length === 1) {
    const a = datas[0];
    return periodo(inicioDia(a), mesmoDia(a, agora) ? agora : fimDia(a), dmy(a), 'dia', dmy(a));
  }

  if (/\bontem\b/.test(t)) { const d = addDias(agora, -1); return periodo(inicioDia(d), fimDia(d), `Ontem, ${dmy(d)}`, 'dia', 'ontem'); }
  if (/\bhoje\b/.test(t)) return periodo(inicioDia(agora), agora, `Hoje, ${dmy(agora)} (até agora)`, 'dia', 'hoje');

  if (/\bsemana passada\b|\bsemana anterior\b|\bultima semana\b/.test(t)) {
    const ini = addDias(segunda(agora), -7);
    const fim = fimDia(addDias(ini, 6));
    return periodo(ini, fim, `Semana de ${dm(ini)} a ${dm(fim)}/${fim.getFullYear()}`, 'semana', 'semana passada');
  }
  if (/\bsemana\b|\bsemanal\b/.test(t)) {
    const ini = segunda(agora);
    return periodo(ini, agora, `Semana de ${dm(ini)} até ${dm(agora)} (em andamento)`, 'semana', 'semana');
  }

  const dias = t.match(/\b(?:ultimos?\s+)?(\d{1,3})\s*dias\b/);
  if (dias) {
    const n = Math.min(Number(dias[1]), 365);
    const ini = inicioDia(addDias(agora, -(n - 1)));
    return periodo(ini, agora, `Últimos ${n} dias (${dm(ini)} a ${dm(agora)})`, 'dias', `${n} dias`);
  }

  if (/\bmes passado\b|\bmes anterior\b/.test(t)) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    return mesCompleto(d.getFullYear(), d.getMonth(), agora);
  }
  const ano = (t.match(/\b(20\d{2})\b/) || [])[1];
  for (let i = 0; i < 12; i++) {
    if (new RegExp(`\\b(${MESES[i]}|${ABREV[i]})\\b`).test(t)) {
      let a = ano ? Number(ano) : agora.getFullYear();
      if (!ano && i > agora.getMonth()) a -= 1; // "dezembro" em outubro = dezembro do ano passado
      return mesCompleto(a, i, agora);
    }
  }
  if (/\bmes\b|\beste mes\b|\bmes atual\b/.test(t)) return mesCompleto(agora.getFullYear(), agora.getMonth(), agora);
  return { achou: false };
}

/** Período padrão (nada citado): o mês atual até agora. */
const periodoPadrao = (agora = new Date()) => ({ ...mesCompleto(agora.getFullYear(), agora.getMonth(), agora), padrao: true });

module.exports = { interpretarPeriodo, periodoPadrao, segunda, inicioDia, fimDia, addDias, dm, dmy };
