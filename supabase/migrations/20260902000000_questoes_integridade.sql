-- Quarentena de questão quebrada.
--
-- Motivo: questões chegam do import com o enunciado órfão — a pergunta cita um
-- texto, uma tabela ou uma figura que não foi importada junto. O aluno recebe
-- "A quantia que essa pessoa levava semanalmente para fazer a compra era" e
-- cinco valores em reais, sem a tabela de compras. Ele chuta, erra, e o erro
-- entra no desempenho dele como se fosse conteúdo que ele não sabe.
--
-- Por que DESATIVAR e não APAGAR:
--   1. `student_question_answers.question_id` é FK SEM cascade — o DELETE
--      falharia justamente nas questões mais respondidas, e forçar o cascade
--      apagaria o histórico do aluno para consertar um erro que é nosso.
--   2. `exam_questions` tem cascade: apagar a questão furaria a prova inteira,
--      inclusive as tentativas já corrigidas por ela.
--   3. Quase toda questão órfã é RECUPERÁVEL — o texto de apoio existe, está
--      na questão vizinha da mesma prova. Apagar joga fora conteúdo que o
--      script de auditoria consegue devolver.
--
-- `ativa` é o interruptor; `motivo_inativa` é o que o professor lê para saber
-- o que consertar. Nenhuma questão existente muda de estado nesta migration:
-- quem desativa é `scripts/auditar-questoes.ts --desativar`, depois de o
-- relatório ser conferido por gente.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS ativa BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS motivo_inativa TEXT;

-- Quando a régua de integridade passou por aqui pela última vez. Serve para a
-- auditoria seguinte saber o que já foi olhado e para o professor distinguir
-- "questão sã" de "questão nunca auditada".
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS auditada_em TIMESTAMPTZ;

COMMENT ON COLUMN public.questions.ativa IS
  'false = questão em quarentena (enunciado órfão, sem alternativas, gabarito impossível). Não vai para simulado, prova, flashcard nem questão do dia. Ver src/lib/questao-integridade.ts.';
COMMENT ON COLUMN public.questions.motivo_inativa IS
  'Motivo legível da quarentena, escrito por scripts/auditar-questoes.ts. NULL quando ativa = true.';

-- O índice parcial serve à leitura do aluno, que é sempre "só as ativas".
-- Parcial porque a esmagadora maioria é ativa: indexar as inativas é barato e
-- indexar tudo não pagaria.
CREATE INDEX IF NOT EXISTS idx_questions_inativas
  ON public.questions (id) WHERE ativa = false;

-- ─── Quem pode desativar ─────────────────────────────────────────────────────
-- A auditoria roda com service role (ignora RLS). Aqui só se garante que o
-- aluno continue lendo as questões e que a coluna não abra escrita nova: as
-- policies de UPDATE de `questions` já são de admin/staff/professor e valem
-- para esta coluna como para as outras, sem cláusula a mais.
--
-- Nota deliberada: NÃO se filtra `ativa` dentro da policy de SELECT. Se a
-- filtragem morasse no RLS, o professor perderia a lista do que precisa
-- consertar — e é ele quem conserta. Quem tira da tela do aluno é o app
-- (src/lib/questao-integridade.ts), que continua funcionando mesmo se esta
-- migration ainda não tiver sido aplicada em produção.
