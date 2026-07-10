-- ============================================================
-- Migration: 20260710000000_report_card_approval_workflow.sql
-- Boletins Pendentes: adiciona workflow de importação em massa +
-- aprovação para report_card_entries (ETEC) e report_card_entries_enem
-- (ENEM). As duas tabelas já existiam no banco (criadas fora do
-- histórico de migrations); aqui usamos CREATE TABLE IF NOT EXISTS
-- com o schema completo (idempotente para bancos novos) e ALTER
-- TABLE ADD COLUMN IF NOT EXISTS para o banco de produção existente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.report_card_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track text CHECK (track IN ('enem', 'etec')),
  semester integer NOT NULL,
  classificatoria_score numeric,
  classificatoria_max numeric,
  simulado_score numeric,
  simulado_max numeric,
  redacao_score numeric,
  redacao_max numeric,
  absences_1sem integer,
  absences_2sem integer,
  sala text,
  turno text,
  colegio text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_card_entries_enem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester integer NOT NULL,
  classificatoria_score numeric,
  classificatoria_max numeric,
  simulado_1_score numeric,
  simulado_2_score numeric,
  simulado_3_score numeric,
  simulado_max numeric,
  lingua_portuguesa numeric,
  matematica numeric,
  historia numeric,
  geografia numeric,
  biologia numeric,
  quimica numeric,
  fisica numeric,
  filosofia numeric,
  sociologia numeric,
  ingles numeric,
  redacao_score numeric,
  redacao_max numeric,
  absences_1sem integer,
  absences_2sem integer,
  early_departures_1sem integer,
  early_departures_2sem integer,
  sala text,
  turno text,
  colegio text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Workflow de aprovação (linhas pré-existentes assumem 'approved' para não
-- sumir do boletim do aluno que já era visível antes desta migration).
ALTER TABLE public.report_card_entries
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS imported_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.report_card_entries
  DROP CONSTRAINT IF EXISTS report_card_entries_status_check;
ALTER TABLE public.report_card_entries
  ADD CONSTRAINT report_card_entries_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.report_card_entries_enem
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS imported_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.report_card_entries_enem
  DROP CONSTRAINT IF EXISTS report_card_entries_enem_status_check;
ALTER TABLE public.report_card_entries_enem
  ADD CONSTRAINT report_card_entries_enem_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_report_card_entries_status ON public.report_card_entries(status);
CREATE INDEX IF NOT EXISTS idx_report_card_entries_student ON public.report_card_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_report_card_entries_enem_status ON public.report_card_entries_enem(status);
CREATE INDEX IF NOT EXISTS idx_report_card_entries_enem_student ON public.report_card_entries_enem(student_id);

-- RLS: aluno só lê as próprias entradas já aprovadas. Toda escrita
-- (import + aprovação/rejeição) acontece via API server-side com
-- SUPABASE_SERVICE_ROLE_KEY + requireAdminUser(), que ignora RLS.
ALTER TABLE public.report_card_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_entries_enem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aluno le proprio boletim aprovado" ON public.report_card_entries;
CREATE POLICY "Aluno le proprio boletim aprovado"
  ON public.report_card_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id AND status = 'approved');

DROP POLICY IF EXISTS "Aluno le proprio boletim aprovado" ON public.report_card_entries_enem;
CREATE POLICY "Aluno le proprio boletim aprovado"
  ON public.report_card_entries_enem
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id AND status = 'approved');

COMMENT ON COLUMN public.report_card_entries.status IS 'pending = aguardando revisao da secretaria/admin; approved = visivel para o aluno; rejected = descartado na importacao.';
COMMENT ON COLUMN public.report_card_entries_enem.status IS 'pending = aguardando revisao da secretaria/admin; approved = visivel para o aluno; rejected = descartado na importacao.';
