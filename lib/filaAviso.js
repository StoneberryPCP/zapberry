// Fila de envio em massa do "Aviso geral": pausa aleatória entre envios, pausa maior a cada lote,
// pausar/continuar/cancelar e parada automática depois de falhas seguidas.
// Lógica pura (sem Electron): quem envia e como dormir entram por parâmetro, então dá pra testar sem WhatsApp.

const RITMO_PADRAO = { minSeg: 10, maxSeg: 20, loteTam: 20, loteSeg: 300, falhasMax: 3 };

const sorteio = (min, max, rand = Math.random) => Math.round(min + rand() * (max - min));

/** Escolhe uma saudação da lista sem repetir a anterior (quando há mais de uma). */
function escolherSaudacao(lista, anterior, rand = Math.random) {
  const opcoes = (lista ?? []).map((s) => String(s).trim()).filter(Boolean);
  if (!opcoes.length) return '';
  const candidatas = opcoes.length > 1 ? opcoes.filter((s) => s !== anterior) : opcoes;
  return candidatas[Math.min(candidatas.length - 1, Math.floor(rand() * candidatas.length))];
}

/** Tempo total estimado em segundos: pausas médias + pausas de lote + ~4 s por envio. */
function estimarSegundos(n, ritmo = {}) {
  const r = { ...RITMO_PADRAO, ...ritmo };
  if (n <= 0) return 0;
  const media = (r.minSeg + r.maxSeg) / 2;
  const lotes = Math.floor((n - 1) / r.loteTam);
  return Math.round((n - 1 - lotes) * media + lotes * r.loteSeg + n * 4);
}

function criarFila({ itens, enviar, saudacoes = [], ritmo = {}, dormir, rand = Math.random, aoEvento = () => {} }) {
  const r = { ...RITMO_PADRAO, ...ritmo };
  const dormirMs = dormir ?? ((ms) => new Promise((res) => setTimeout(res, ms)));
  let pausado = false;
  let cancelado = false;
  let rodando = false;
  const resultados = [];

  // dorme em fatias de 250 ms pra reagir logo a "cancelar"
  const dormirAte = async (ms) => {
    let resta = ms;
    while (resta > 0 && !cancelado) {
      const fatia = Math.min(250, resta);
      await dormirMs(fatia);
      resta -= fatia;
    }
  };
  const esperarPausa = async () => { while (pausado && !cancelado) await dormirMs(250); };

  async function iniciar() {
    if (rodando) throw new Error('fila já em andamento');
    rodando = true;
    let falhasSeguidas = 0;
    let saudacaoAnterior = null;
    let motivo = 'concluido';
    aoEvento({ tipo: 'inicio', total: itens.length });

    for (let i = 0; i < itens.length; i++) {
      await esperarPausa();
      if (cancelado) { motivo = 'cancelado'; break; }
      const item = itens[i];
      const saudacao = escolherSaudacao(saudacoes, saudacaoAnterior, rand);
      aoEvento({ tipo: 'enviando', indice: i, total: itens.length, item });

      let res;
      try { res = await enviar(item, { saudacao, indice: i }); }
      catch (e) { res = { ok: false, motivo: String(e?.message ?? e) }; }
      saudacaoAnterior = saudacao;

      const reg = { clienteId: item.clienteId, grupo: item.grupoNome, saudacao, ok: !!res?.ok, motivo: res?.motivo ?? null };
      resultados.push(reg);
      falhasSeguidas = reg.ok ? 0 : falhasSeguidas + 1;
      aoEvento({ tipo: 'resultado', indice: i, total: itens.length, resultado: reg });

      if (falhasSeguidas >= r.falhasMax) { motivo = 'falhas'; break; }
      if (i < itens.length - 1) {
        const fimDeLote = (i + 1) % r.loteTam === 0;
        const seg = fimDeLote ? sorteio(r.loteSeg * 0.8, r.loteSeg * 1.2, rand) : sorteio(r.minSeg, r.maxSeg, rand);
        aoEvento({ tipo: 'espera', segundos: seg, fimDeLote });
        await dormirAte(seg * 1000);
      }
    }
    if (cancelado) motivo = 'cancelado';
    rodando = false;
    aoEvento({ tipo: 'fim', motivo });
    return { resultados, motivo };
  }

  return {
    iniciar,
    pausar: () => { pausado = true; },
    continuar: () => { pausado = false; },
    cancelar: () => { cancelado = true; pausado = false; },
    estado: () => ({ pausado, cancelado, rodando, resultados }),
  };
}

module.exports = { criarFila, escolherSaudacao, estimarSegundos, RITMO_PADRAO };
