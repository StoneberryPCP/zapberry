-- ═══════════════════════════════════════════════════════════════════════════
-- ZAPBERRY — vínculo cliente ↔ grupo do WhatsApp + registro de avisos enviados
-- Rodar no Supabase SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- Cada cliente aponta pro grupo dele no WhatsApp (jid = id real do grupo,
-- lido pelo ZapBerry ao vincular; nome_grupo = como aparece na busca).
CREATE TABLE IF NOT EXISTS public.zapberry_grupos (
  cliente_id uuid PRIMARY KEY REFERENCES public.clientes(id) ON DELETE CASCADE,
  jid text NOT NULL,
  nome_grupo text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- O que já foi avisado (anti-duplicata). ref = "<bloco_id>:<espessura>" pra serrada;
-- depois carregamento usa "carr:<ordem_id>".
CREATE TABLE IF NOT EXISTS public.zapberry_avisos (
  id bigserial PRIMARY KEY,
  tipo text NOT NULL DEFAULT 'serrada',
  ref text NOT NULL UNIQUE,
  cliente_id uuid,
  grupo_jid text,
  quantidade numeric,
  enviado_em timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zapberry_avisos_tipo ON public.zapberry_avisos(tipo);

-- ─── SEED: tudo que JÁ foi serrado até hoje entra como "já avisado" ─────────
-- (esses você já avisou manualmente — a fila do ZapBerry só traz os novos).
-- ref = "<bloco_id>:<espessura sem zeros>" (2.00 → 2), igual ao app.
INSERT INTO public.zapberry_avisos (tipo, ref, cliente_id, quantidade)
SELECT 'serrada',
       e.bloco_id::text || ':' || (e.espessura::float8)::text,
       bp.cliente_id,
       e.quantidade
FROM public.serraria_os_espessuras e
JOIN public.serraria_os_blocos b ON b.id = e.bloco_id
JOIN public.serraria_os os ON os.id = b.os_id
LEFT JOIN public.blocos_patio bp ON bp.id_interno = b.bloco_id_interno
WHERE os.status IN ('inspecao','liberado','pcp','finalizada')
ON CONFLICT (ref) DO NOTHING;

-- Verificação:
-- SELECT * FROM zapberry_grupos; SELECT count(*) FROM zapberry_avisos;
