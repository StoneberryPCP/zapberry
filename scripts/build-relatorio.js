// Empacota o cálculo da Serraria 360 (src/relatorios/serraria360/dados.ts do Sistema Unificado) em lib/relatorio360.bundle.js.
// Assim o bot dá EXATAMENTE os mesmos números da tela: não existe uma segunda cópia da regra (ficha mãe, horímetro, preços).
// Rodar de novo sempre que o cálculo do relatório mudar no Sistema Unificado:   npm run build:relatorio
const path = require('path');
const { createRequire } = require('module');

const SISTEMA = process.env.SISTEMA_UNIFICADO || 'C:/Users/stone/Downloads/carga - Copia/SISTEMA UNIFICADO';
const esbuild = createRequire(path.join(SISTEMA, 'package.json'))('esbuild');

// O dados.ts importa o cliente Supabase do app (com import.meta.env e modo só-leitura). Aqui entra um cliente PostgREST puro,
// configurado em tempo de execução por configurarSupabase(url, chave).
const SHIM = `
import { PostgrestClient } from '@supabase/postgrest-js';
let cliente = null;
export function configurarSupabase(url, chave, obterToken) {
  // O banco só aceita quem está logado: o Authorization leva o token do login do ZapBerry, pedido a cada consulta (ele se renova sozinho).
  cliente = new PostgrestClient(url.replace(/\\/+$/, '') + '/rest/v1', {
    headers: { apikey: chave },
    fetch: async (entrada, init = {}) => {
      const h = new Headers(init.headers || {});
      let t = null;
      if (obterToken) { try { t = await obterToken(); } catch { t = null; } }
      h.set('Authorization', 'Bearer ' + (t || chave));
      return globalThis.fetch(entrada, { ...init, headers: h });
    },
  });
}
export const supabase = { from: (tabela) => cliente.from(tabela) };
`;

const trocaSupabase = {
  name: 'troca-supabase',
  setup(b) {
    b.onResolve({ filter: /^shim-supabase$/ }, () => ({ path: 'shim-supabase', namespace: 'shim' }));
    b.onResolve({ filter: /lib\/supabase$/ }, (a) => (a.importer.includes('serraria360') ? { path: 'shim-supabase', namespace: 'shim' } : null));
    b.onLoad({ filter: /.*/, namespace: 'shim' }, () => ({ contents: SHIM, resolveDir: SISTEMA, loader: 'js' }));
  },
};

esbuild.build({
  stdin: {
    contents: `
      export { carregar360, aplicarFiltros, indicadores, gerarInsights, periodoAnterior, fmtHoras } from './src/relatorios/serraria360/dados';
      export { configurarSupabase } from 'shim-supabase';
    `,
    resolveDir: SISTEMA,
    loader: 'ts',
    sourcefile: 'entrada-relatorio.ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(__dirname, '..', 'lib', 'relatorio360.bundle.js'),
  plugins: [trocaSupabase],
  banner: { js: '/* GERADO por scripts/build-relatorio.js a partir do Sistema Unificado. Não editar. */' },
  logLevel: 'info',
}).catch(() => process.exit(1));
