// Relatório semanal automático: quando rodar. Lógica pura (sem relógio próprio) pra poder testar.
// agenda: { ativa, dia (0 = domingo … 6 = sábado), hora ("07:00"), destino: { jid }, ultimoEnvio (ISO) }

const JANELA_MS = 36 * 3_600_000; // se o app estava fechado na hora marcada, ainda envia até 36 h depois (uma vez só)

/** A ocorrência mais recente (dia + hora) que já passou. */
function ultimaOcorrencia(agenda, agora) {
  const [hh, mm] = String(agenda.hora || '07:00').split(':').map((x) => Number(x) || 0);
  const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hh, mm, 0, 0);
  const atras = (agora.getDay() - Number(agenda.dia) + 7) % 7;
  base.setDate(base.getDate() - atras);
  if (base > agora) base.setDate(base.getDate() - 7);
  return base;
}

function deveRodar(agenda, agora) {
  if (!agenda || !agenda.ativa || !agenda.destino || !agenda.destino.jid) return false;
  const ocorrencia = ultimaOcorrencia(agenda, agora);
  if (agora - ocorrencia > JANELA_MS) return false;
  const ultimo = agenda.ultimoEnvio ? new Date(agenda.ultimoEnvio) : null;
  return !ultimo || ultimo < ocorrencia;
}

/** Envio diário (checagem de saúde): hora marcada todo dia; se o app estava fechado, ainda envia até 12 h depois (uma vez só). */
const JANELA_DIARIA_MS = 12 * 3_600_000;

function ultimaOcorrenciaDiaria(agenda, agora) {
  const [hh, mm] = String(agenda.hora || '08:00').split(':').map((x) => Number(x) || 0);
  const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hh, mm, 0, 0);
  if (base > agora) base.setDate(base.getDate() - 1);
  return base;
}

function deveRodarDiario(agenda, agora) {
  if (!agenda || !agenda.ativa || !agenda.destino || !agenda.destino.jid) return false;
  const ocorrencia = ultimaOcorrenciaDiaria(agenda, agora);
  if (agora - ocorrencia > JANELA_DIARIA_MS) return false;
  const ultimo = agenda.ultimoEnvio ? new Date(agenda.ultimoEnvio) : null;
  return !ultimo || ultimo < ocorrencia;
}

module.exports = { ultimaOcorrencia, deveRodar, JANELA_MS, ultimaOcorrenciaDiaria, deveRodarDiario, JANELA_DIARIA_MS };
