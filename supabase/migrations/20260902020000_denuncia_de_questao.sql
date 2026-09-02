-- "Questão incompleta": o aluno avisa, e o aviso vale.
--
-- A régua de `questao-integridade.ts` pega o defeito que tem forma no texto.
-- O que ela não pega é a questão cujo apoio existe mas está errado, a que
-- perdeu a figura sem citar figura, a que veio com o gabarito trocado. Quem vê
-- isso é quem está tentando responder — e até agora não tinha como dizer.
--
-- Duas consequências para um clique, e a diferença entre elas é o ponto:
--   1. IMEDIATA e individual: aquela questão não volta a aparecer PARA ELE.
--      Custo de errar: uma questão a menos no banco de um aluno. Baixo.
--   2. COLETIVA e represada: só ao TERCEIRO aviso a questão sai do ar para
--      todo mundo. Custo de errar: a turma perde uma questão boa. Alto — por
--      isso precisa de três pessoas independentes concordando.
--
-- ⚠ O aviso coletivo DESATIVA, não apaga. É a mesma quarentena da migration
--   20260902000000, e pelo mesmo motivo: `student_question_answers.question_id`
--   é FK sem cascade (o DELETE falharia justamente nas mais respondidas) e
--   `exam_questions` tem cascade (apagar furaria a prova e as tentativas já
--   corrigidas). E há o motivo novo: três alunos apertando o botão não são
--   prova de que a questão está quebrada — podem ser três alunos que não
--   souberam responder. Desativar deixa o professor conferir e reverter; o
--   `motivo_inativa` diz que veio de aviso de aluno, não da régua.

CREATE TABLE IF NOT EXISTS public.questao_denuncias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Um aviso por aluno por questão. Sem isto, um aluno sozinho derrubaria
  -- qualquer questão apertando o botão três vezes.
  UNIQUE (question_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_denuncias_por_aluno   ON public.questao_denuncias (student_id);
CREATE INDEX IF NOT EXISTS idx_denuncias_por_questao ON public.questao_denuncias (question_id);

COMMENT ON TABLE public.questao_denuncias IS
  'Avisos de "questão incompleta" dados por alunos no simulado. Um por aluno por questão. Ao terceiro, a questão entra em quarentena (questions.ativa = false).';

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.questao_denuncias ENABLE ROW LEVEL SECURITY;

-- O aluno lê os PRÓPRIOS avisos — é o que a tela usa para não mostrar de novo
-- a questão que ele já marcou.
DROP POLICY IF EXISTS "aluno le proprios avisos" ON public.questao_denuncias;
CREATE POLICY "aluno le proprios avisos" ON public.questao_denuncias
  FOR SELECT USING (auth.uid() = student_id);

-- Professor, admin e secretaria leem tudo: é deles a decisão sobre o conteúdo.
-- Papel sai de `profiles.role`, NUNCA de `auth.jwt()->>'user_role'` — esse claim
-- é null para os 1622 usuários (não há custom access token hook configurado), e
-- toda policy que gateia por ele nunca concede acesso nenhum.
DROP POLICY IF EXISTS "staff le todos os avisos" ON public.questao_denuncias;
CREATE POLICY "staff le todos os avisos" ON public.questao_denuncias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'teacher', 'staff')
    )
  );

-- Ninguém insere direto: o caminho é a função abaixo. Assim o `student_id` sai
-- sempre de `auth.uid()` no servidor e não do corpo da requisição, e a contagem
-- que desativa a questão não pode ser forjada pelo cliente.
GRANT SELECT ON public.questao_denuncias TO authenticated;

-- ─── A função ────────────────────────────────────────────────────────────────
/**
 * Quantos avisos independentes derrubam uma questão para todo mundo.
 *
 * Três, e não dois. "Mais de 2" no pedido; três também é o menor número que
 * não cabe em dois amigos combinando, e o suficiente para o professor ter o
 * que conferir. Está aqui em cima, sozinho, porque é a régua que vai ser
 * ajustada quando os primeiros dados chegarem.
 */
CREATE OR REPLACE FUNCTION public.limite_de_avisos()
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT 3 $$;

CREATE OR REPLACE FUNCTION public.avisar_questao_incompleta(p_question_id UUID)
RETURNS TABLE (avisos int, desativada boolean)
LANGUAGE plpgsql
SECURITY DEFINER            -- precisa escrever em `questions`, que o aluno não pode
SET search_path = ''
AS $$
DECLARE
  v_aluno   UUID := auth.uid();
  v_total   int;
  v_limite  int := public.limite_de_avisos();
  v_ja      boolean;
BEGIN
  IF v_aluno IS NULL THEN
    RAISE EXCEPTION 'sessão ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.questions q WHERE q.id = p_question_id) THEN
    RAISE EXCEPTION 'questão inexistente';
  END IF;

  -- Idempotente: apertar duas vezes (ou em dois aparelhos) não conta duas.
  INSERT INTO public.questao_denuncias (question_id, student_id)
  VALUES (p_question_id, v_aluno)
  ON CONFLICT (question_id, student_id) DO NOTHING;

  SELECT count(*) INTO v_total
  FROM public.questao_denuncias d
  WHERE d.question_id = p_question_id;

  SELECT NOT q.ativa INTO v_ja FROM public.questions q WHERE q.id = p_question_id;

  IF v_total >= v_limite AND NOT v_ja THEN
    UPDATE public.questions q
    SET ativa          = false,
        -- Diz que veio de aluno, não da régua: é o que o professor precisa
        -- saber para decidir se reverte.
        motivo_inativa = v_total || ' alunos avisaram que esta questão está incompleta.',
        auditada_em    = now()
    WHERE q.id = p_question_id;
    v_ja := true;
  END IF;

  RETURN QUERY SELECT v_total, coalesce(v_ja, false);
END;
$$;

-- SECURITY DEFINER + `auth.uid()` por dentro: o aluno não consegue avisar em
-- nome de outro (não há parâmetro de id no corpo). É a mesma regra do
-- CLAUDE.md sobre IDOR — nunca confiar no id que o cliente manda.
REVOKE ALL ON FUNCTION public.avisar_questao_incompleta(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.avisar_questao_incompleta(UUID) TO authenticated;

COMMENT ON FUNCTION public.avisar_questao_incompleta(UUID) IS
  'Registra o aviso de "questão incompleta" do aluno autenticado e, ao atingir limite_de_avisos(), põe a questão em quarentena. Devolve (avisos, desativada).';

-- ─── Fila do professor ───────────────────────────────────────────────────────
-- Quantos avisos cada questão tem, para o banco de questões mostrar ao lado do
-- selo de defeito. Sem os ids dos alunos: o professor precisa do número para
-- decidir, não de quem apertou.
CREATE OR REPLACE VIEW public.questoes_avisadas AS
SELECT d.question_id,
       count(*)::int   AS avisos,
       max(d.criada_em) AS ultimo_aviso
FROM public.questao_denuncias d
GROUP BY d.question_id;

ALTER VIEW public.questoes_avisadas SET (security_invoker = true);
GRANT SELECT ON public.questoes_avisadas TO authenticated;
