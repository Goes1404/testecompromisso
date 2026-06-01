-- Garante que cada aluno tem no máximo 1 attempt por prova
-- Necessário para o UPSERT de resultados de simulados importados
ALTER TABLE public.exam_attempts
  ADD CONSTRAINT IF NOT EXISTS exam_attempts_user_exam_unique
  UNIQUE (user_id, exam_id);
