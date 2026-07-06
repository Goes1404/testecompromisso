-- Tabela para armazenar feedback dos alunos direcionado à equipe técnica, professores ou material
CREATE TABLE IF NOT EXISTS public.system_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'equipe_tecnica'
    CHECK (category IN ('equipe_tecnica', 'professores', 'material', 'outro')),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_feedbacks_category ON public.system_feedbacks(category);
CREATE INDEX IF NOT EXISTS idx_system_feedbacks_created_at ON public.system_feedbacks(created_at DESC);

ALTER TABLE public.system_feedbacks ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode inserir seu próprio feedback
CREATE POLICY "Users can insert their own feedback"
  ON public.system_feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver o próprio feedback enviado
CREATE POLICY "Users can view their own feedback"
  ON public.system_feedbacks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins e staff podem ver todos os feedbacks (para o painel de gestão)
CREATE POLICY "Admins and staff can view all feedback"
  ON public.system_feedbacks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

COMMENT ON TABLE public.system_feedbacks IS 'Feedback dos alunos com nota (1-5 estrelas), comentário e categoria de destino (equipe técnica, professores, material).';
