-- Redação passa a saber de qual banca é cada nota.
--
-- Até aqui toda redação era ENEM: cinco competências de 0 a 200, nota pela
-- soma, 0–1000. Com o modo FUVEST (três eixos, nota 0–50 pela média), o mesmo
-- número na coluna `score` passa a ter dois significados possíveis, e sem esta
-- coluna não há como distinguir um 45 da FUVEST (nota alta, 90% do teto) de um
-- 45 do ENEM (nota de anulação parcial).
--
-- DEFAULT 'enem' resolve o histórico sem backfill: tudo que existe hoje é ENEM
-- de fato, então a coluna já nasce correta nas 1.000+ linhas existentes.

ALTER TABLE public.essay_submissions
  ADD COLUMN IF NOT EXISTS banca TEXT NOT NULL DEFAULT 'enem';

ALTER TABLE public.essay_submissions
  DROP CONSTRAINT IF EXISTS essay_submissions_banca_check;

ALTER TABLE public.essay_submissions
  ADD CONSTRAINT essay_submissions_banca_check
  CHECK (banca IN ('enem', 'fuvest'));

COMMENT ON COLUMN public.essay_submissions.banca IS
  'Banca que corrigiu: enem (5 competências, 0-1000) ou fuvest (3 eixos, 0-50). Define como ler score e competencies.';

-- O CHECK de `score` continua sendo 0..1000 de propósito.
--
-- A escala da FUVEST (0–50) cabe inteira dentro dele, e a coluna `banca` diz
-- como interpretar o número. Um CHECK condicional por banca seria mais
-- expressivo, mas foi exatamente um CHECK de escala errado que barrou TODA
-- redação real por dois meses (ver 20260811030000): o aluno via a correção na
-- tela e o INSERT falhava em silêncio. A escala é garantida no código, onde
-- errar é barato de corrigir; aqui, não é.

-- Os gráficos de evolução e a média do boletim leem sempre por aluno + banca,
-- em ordem de data.
CREATE INDEX IF NOT EXISTS idx_essay_submissions_user_banca
  ON public.essay_submissions (user_id, banca, created_at DESC);

-- O tema da semana pode ser segmentado por banca. `essay_weekly_themes` nasceu
-- fora de migration (só aparece no pull do schema remoto), então o CHECK é
-- recriado a partir do nome real da constraint, se ela existir.
DO $$
DECLARE
  nome_constraint TEXT;
BEGIN
  IF to_regclass('public.essay_weekly_themes') IS NULL THEN
    RAISE NOTICE 'essay_weekly_themes nao existe neste banco; nada a fazer.';
    RETURN;
  END IF;

  SELECT con.conname INTO nome_constraint
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public'
     AND rel.relname = 'essay_weekly_themes'
     AND con.contype = 'c'
     AND pg_get_constraintdef(con.oid) ILIKE '%target%';

  IF nome_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.essay_weekly_themes DROP CONSTRAINT %I', nome_constraint);
  END IF;

  ALTER TABLE public.essay_weekly_themes
    ADD CONSTRAINT essay_weekly_themes_target_check
    CHECK (target IN ('all', 'enem', 'etec', 'fuvest'));
END $$;
