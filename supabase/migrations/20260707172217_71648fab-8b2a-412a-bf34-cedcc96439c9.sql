
-- 1) Deduplicar respostas WhatsApp existentes (mantém a mais recente por telefone+enquete)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY enquete_id, regexp_replace(COALESCE(telefone,''), '\D', '', 'g')
           ORDER BY created_at DESC, id DESC
         ) AS rn
    FROM public.respostas
   WHERE origem = 'whatsapp_ia'
     AND telefone IS NOT NULL
     AND btrim(telefone) <> ''
)
DELETE FROM public.respostas r
 USING ranked
 WHERE r.id = ranked.id AND ranked.rn > 1;

-- 2) Índice único parcial: 1 telefone = 1 resposta por enquete no canal WhatsApp
CREATE UNIQUE INDEX IF NOT EXISTS respostas_whatsapp_uniq_telefone_enquete
  ON public.respostas (enquete_id, regexp_replace(COALESCE(telefone,''), '\D', '', 'g'))
  WHERE origem = 'whatsapp_ia'
    AND telefone IS NOT NULL
    AND btrim(telefone) <> '';
