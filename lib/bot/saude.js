// Checagem de saúde do sistema: regras puras (sem rede, sem relógio próprio) para poderem ser testadas.
// Cada função recebe os dados já lidos e devolve só o que precisa de atenção.
const H = 3_600_000;

const LIMITES = {
  paradaAbertaH: 24,       // parada sem fim há mais que isso
  osAtivaH: 48,            // serrada "em andamento" há mais que isso
  inspecaoDias: 5,         // OS parada na inspeção há mais que isso
  semPrecoDias: 30,        // janela para olhar bloco serrado sem preço
  backupH: 30,             // backup diário atrasado
};

/** Quantas horas sem rodar já é motivo de alerta, conforme a agenda do cron (pg_cron). null = não sei avaliar. */
function cronToleranciaH(schedule) {
  const s = String(schedule || '').trim().split(/\s+/);
  if (s.length !== 5) return null; // formato "30 seconds" etc.
  const [m, h, dom, mon, dow] = s;
  if (m === '*' && h === '*') return 1;
  const passo = m.match(/^\*\/(\d+)$/);
  if (passo && h === '*') return Math.max(1, (Number(passo[1]) * 10) / 60);
  if (/^\d+$/.test(m) && h === '*' && dom === '*' && mon === '*' && dow === '*') return 3;
  if (/^\d+$/.test(m) && /^\d+$/.test(h) && dom === '*' && mon === '*') {
    if (dow === '*') return 30;                    // todo dia
    return /[,-]/.test(dow) ? 80 : 8 * 24;         // vários dias na semana (cobre fim de semana) / uma vez por semana
  }
  return null;
}

/** rows: [{jobname, schedule, active, ultima_execucao, ultimo_status, ultima_mensagem}] → itens com problema. */
function avaliarCron(rows, agora) {
  const itens = [];
  for (const j of rows || []) {
    if (!j.active) continue;
    const quando = j.ultima_execucao ? new Date(j.ultima_execucao) : null;
    if (j.ultimo_status === 'failed') {
      itens.push({ job: j.jobname, tipo: 'falhou', quando, mensagem: String(j.ultima_mensagem || '').slice(0, 120) });
      continue;
    }
    const tol = cronToleranciaH(j.schedule);
    if (tol == null || !quando) continue;
    if ((agora - quando) / H > tol) itens.push({ job: j.jobname, tipo: 'atrasado', quando, schedule: j.schedule });
  }
  return itens;
}

/**
 * info: { existe, statusTxt, ultimoEm (Date|null) } lido da pasta de backup deste computador.
 * Devolve { problema: {...} | null, naoVerificado: motivo | null }.
 */
function avaliarBackup(info, agora) {
  if (!info || !info.existe) return { problema: null, naoVerificado: 'pasta de backup não encontrada neste computador' };
  const st = String(info.statusTxt || '').trim();
  if (st && !/^OK\b/i.test(st)) return { problema: { tipo: 'falhou', texto: st.slice(0, 160), quando: info.ultimoEm }, naoVerificado: null };
  if (!info.ultimoEm) return { problema: { tipo: 'nenhum', texto: 'nenhum backup encontrado na pasta', quando: null }, naoVerificado: null };
  const h = (agora - info.ultimoEm) / H;
  if (h > LIMITES.backupH) return { problema: { tipo: 'atrasado', h, quando: info.ultimoEm }, naoVerificado: null };
  return { problema: null, naoVerificado: null };
}

module.exports = { LIMITES, cronToleranciaH, avaliarCron, avaliarBackup };
