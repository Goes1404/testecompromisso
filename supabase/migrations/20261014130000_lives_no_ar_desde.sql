-- Quando a aula entrou no ar de verdade.
--
-- A agenda do aluno decidia se uma aula "no ar" ainda vale olhando só para
-- `start_time`, o horário AGENDADO. Em 13/10 uma aula de teste foi salva com o
-- ano 2007 no lugar de 2026; o professor abriu a sala, os alunos receberam o
-- push de "ao vivo agora"… e a aula não aparecia na lista de ninguém, porque
-- pela data agendada ela tinha começado 19 anos antes.
--
-- Para quem está no ar, o que importa é desde quando está no ar. O professor
-- grava esta coluna ao abrir a sala (`teacher/live/[id]`); `estaNaAgenda()`
-- usa ela e só cai no `start_time` para linhas antigas, sem o valor.
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS no_ar_desde TIMESTAMPTZ;

COMMENT ON COLUMN public.lives.no_ar_desde IS
  'Quando o professor colocou a aula no ar pela última vez. NULL = nunca entrou no ar (ou linha anterior a esta coluna).';
