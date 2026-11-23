// Utilitários de texto do bot: tirar acento, comparar nomes com tolerância a erro de digitação.

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9\s/.-]/g, ' ').replace(/\s+/g, ' ').trim();

function distancia(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Nota de 0 a 1: o quanto `consulta` parece o `nome` (ignora acento e maiúscula). */
function nota(consulta, nome) {
  const q = norm(consulta);
  const n = norm(nome);
  if (!q || !n) return 0;
  if (q === n) return 1;
  if (n.startsWith(q)) return 0.95;
  const tokensN = n.split(' ');
  const tokensQ = q.split(' ');
  // todas as palavras digitadas aparecem no nome (em qualquer ordem, ou como começo de palavra)
  if (tokensQ.every((t) => tokensN.some((x) => x === t || x.startsWith(t)))) return 0.9;
  if (n.includes(q)) return 0.85;
  // erro de digitação: compara com o nome inteiro e com cada palavra
  const cheio = 1 - distancia(q, n) / Math.max(q.length, n.length);
  const melhorPalavra = Math.max(0, ...tokensN.map((x) => (q.length >= 4 ? 1 - distancia(q, x) / Math.max(q.length, x.length) : 0))) * 0.9;
  return Math.max(cheio, melhorPalavra);
}

/**
 * Acha o cliente pelo nome digitado.
 * Devolve { cliente } quando há um vencedor claro; { candidatos } quando ficou ambíguo; { vazio: true } quando nada se parece.
 */
function resolverCliente(consulta, lista, { max = 5 } = {}) {
  const pont = lista
    .map((c) => ({ ...c, nota: nota(consulta, c.nome) }))
    .filter((c) => c.nota >= 0.6)
    .sort((a, b) => b.nota - a.nota || a.nome.localeCompare(b.nome));
  if (!pont.length) return { vazio: true };
  const [a, b] = pont;
  if (a.nota >= 0.99 || (a.nota >= 0.8 && (!b || a.nota - b.nota >= 0.07))) return { cliente: a };
  return { candidatos: pont.slice(0, max) };
}

module.exports = { semAcento, norm, distancia, nota, resolverCliente };
