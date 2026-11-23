// Quem pode perguntar: grupos liberados (qualquer participante) e números liberados (em qualquer conversa).
// Mensagens de quem não está liberado são ignoradas em silêncio (o bot não revela que existe).

const soDigitos = (s) => String(s ?? '').replace(/\D/g, '');
const ultimos8 = (s) => { const d = soDigitos(s); return d.length >= 8 ? d.slice(-8) : ''; };

/** Número digitado na tela → só dígitos, com 55 na frente quando vier sem o código do país (10 ou 11 dígitos). */
function normalizarTelefone(txt) {
  const d = soDigitos(txt);
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

/**
 * `bot`: { ativo, aceitarMinhas, grupos: [{jid}], numeros: [{tel, ids: []}] }
 * `p`: { chatId, isGroup, fromMe, autor, tel }  — `autor` é o id de quem mandou (pode ser @lid), `tel` o telefone, se o WhatsApp revelou.
 */
function autorizado(bot, p) {
  if (!bot || !bot.ativo) return false;
  const grupoLiberado = p.isGroup && (bot.grupos || []).some((g) => g.jid === p.chatId);
  // Mensagem da própria conta que roda o bot: só vale se a pessoa ligou essa opção e for num grupo liberado
  if (p.fromMe) return !!bot.aceitarMinhas && grupoLiberado;
  if (grupoLiberado) return true;
  const t8 = ultimos8(p.tel);
  return (bot.numeros || []).some((n) => (n.ids || []).includes(p.autor) || (t8 && ultimos8(n.tel) === t8));
}

module.exports = { autorizado, soDigitos, ultimos8, normalizarTelefone };
