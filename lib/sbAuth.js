// Login do ZapBerry no Supabase do sistema Stoneberry.
// O banco só aceita quem está logado (RLS): o ZapBerry entra como um usuário próprio, "ZapBerry (sistema)", criado no Supabase
// Auth e cadastrado em `usuarios`. A SENHA fica criptografada pelo Windows (Electron safeStorage / DPAPI) no whatsapx.json e só
// funciona neste usuário deste computador; o token de acesso vive só em memória e é renovado sozinho.

const EMAIL_PADRAO = 'zapberry@equipe.stoneberry.space';

function erroSemLogin() {
  const e = new Error('ZapBerry sem login no sistema: abra a janela 🍓 e conecte.');
  e.semLogin = true;
  return e;
}

/**
 * @param {object} p
 * @param {() => any} p.getCfg      devolve o cfg do app (usa cfg.berry = {url, key, login})
 * @param {() => void} p.salvar     grava o cfg em disco
 * @param {{disponivel:()=>boolean, encrypt:(s:string)=>string, decrypt:(s:string)=>string}} p.cifra
 */
function criarAuth({ getCfg, salvar, cifra, fetchFn = (...a) => globalThis.fetch(...a), agora = () => Date.now() }) {
  let sessao = null;     // { access, refresh, expiraEm }
  let andamento = null;  // login/renovação em curso (evita dois logins ao mesmo tempo)

  const berry = () => getCfg().berry;
  const login = () => { const l = berry().login; return l && l.email && l.senhaEnc ? l : null; };
  const base = () => String(berry().url).replace(/\/+$/, '');

  async function pedir(grant, corpo) {
    const r = await fetchFn(`${base()}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST',
      headers: { apikey: berry().key, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(j.error_description || j.msg || j.message || `Login recusado (${r.status})`);
      e.status = r.status;
      throw e;
    }
    sessao = { access: j.access_token, refresh: j.refresh_token, expiraEm: agora() + (Number(j.expires_in) || 3600) * 1000 };
  }

  async function entrar() {
    const l = login();
    if (!l) throw erroSemLogin();
    let senha;
    try { senha = cifra.decrypt(l.senhaEnc); } catch { throw new Error('A senha guardada não pôde ser lida neste computador. Conecte de novo na janela 🍓.'); }
    await pedir('password', { email: l.email, password: senha });
  }

  async function renovar() {
    if (sessao && sessao.refresh) {
      try { await pedir('refresh_token', { refresh_token: sessao.refresh }); return; }
      catch (e) { if (!e.status) throw e; /* sem rede: não adianta tentar a senha; recusado: tenta pela senha */ }
    }
    await entrar();
  }

  /** Access token válido (renova sozinho perto de vencer). `forcar` ignora o cache (usar depois de um 401). */
  async function token({ forcar = false } = {}) {
    if (!forcar && sessao && sessao.expiraEm - agora() > 60_000) return sessao.access;
    if (!login()) throw erroSemLogin();
    if (!andamento) andamento = (sessao ? renovar() : entrar()).finally(() => { andamento = null; });
    await andamento;
    return sessao.access;
  }

  function status() {
    const l = login();
    return { configurado: !!l, email: l ? l.email : null, conectado: !!(sessao && sessao.expiraEm > agora()) };
  }

  /** Guarda e-mail + senha (criptografada) e confere entrando de verdade. Se falhar, volta ao que estava. */
  async function definirLogin(email, senha) {
    if (!email || !senha) throw new Error('Informe o e-mail e a senha.');
    if (!cifra.disponivel()) throw new Error('A criptografia do Windows não está disponível neste computador: não dá para guardar a senha com segurança.');
    const anterior = berry().login || null;
    const sessaoAnterior = sessao;
    berry().login = { email: String(email).trim().toLowerCase(), senhaEnc: cifra.encrypt(String(senha)) };
    sessao = null;
    try {
      await entrar();
      salvar();
      return status();
    } catch (e) {
      berry().login = anterior;
      sessao = sessaoAnterior;
      throw e;
    }
  }

  function sair() {
    berry().login = null;
    sessao = null;
    salvar();
    return status();
  }

  return { token, status, definirLogin, sair };
}

/** fetch no PostgREST com o token do login; se vier 401 tenta UMA vez com token novo. */
function criarRest({ auth, getCfg, fetchFn = (...a) => globalThis.fetch(...a) }) {
  return async function rest(pathQS, opts = {}) {
    const cfg = getCfg().berry;
    const chamar = async (forcar) => {
      const tk = await auth.token({ forcar });
      return fetchFn(`${cfg.url}/rest/v1/${pathQS}`, {
        ...opts,
        headers: {
          apikey: cfg.key, Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json', Prefer: 'return=minimal', ...(opts.headers ?? {}),
        },
      });
    };
    let r = await chamar(false);
    if (r.status === 401) r = await chamar(true);
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    return r.status === 204 ? null : r.json().catch(() => null);
  };
}

/** Criptografia real (Windows DPAPI via Electron). */
function cifraElectron(safeStorage) {
  return {
    disponivel: () => safeStorage.isEncryptionAvailable(),
    encrypt: (s) => safeStorage.encryptString(s).toString('base64'),
    decrypt: (b64) => safeStorage.decryptString(Buffer.from(b64, 'base64')),
  };
}

module.exports = { criarAuth, criarRest, cifraElectron, EMAIL_PADRAO };
