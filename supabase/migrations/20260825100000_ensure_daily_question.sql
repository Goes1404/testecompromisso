-- Questão do dia self-healing.
--
-- Não existe agendador: as 40 linhas de daily_questions foram inseridas na mão
-- e acabaram (ETEC parada desde 14/07, ENEM desde 03/08). Em vez de criar um
-- painel ou um cron, o próprio app garante a linha do dia: o primeiro aluno que
-- abrir o dashboard chama esta função, que é idempotente (UNIQUE em
-- (target_audience, scheduled_date) existe desde 20260706000000).
--
-- CURRENT_DATE é UTC de propósito: o cliente calcula "hoje" com
-- toISOString().slice(0,10), que também é UTC. Mudar um dos lados para
-- horário de Brasília quebraria a virada do dia entre 21h e 0h.

CREATE OR REPLACE FUNCTION public.ensure_daily_question(p_audience TEXT)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_aud      TEXT := CASE WHEN lower(coalesce(p_audience, '')) LIKE '%etec%'
                          THEN 'etec' ELSE 'enem' END;
  v_id       uuid;
  v_question uuid;
BEGIN
  SELECT id INTO v_id FROM daily_questions
   WHERE target_audience = v_aud AND scheduled_date = CURRENT_DATE;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- Elegível: do público (ou 'all'), sem imagem (a tela do desafio não renderiza
  -- image_url), com gabarito, e nunca usada como questão do dia deste público.
  SELECT q.id INTO v_question
    FROM questions q
   WHERE q.target_audience IN (v_aud, 'all')
     AND q.image_url IS NULL
     AND q.question_text NOT LIKE '%[IMAGEM_PENDENTE]%'
     AND q.correct_answer IS NOT NULL
     AND jsonb_typeof(q.options) = 'array'
     AND jsonb_array_length(q.options) >= 4
     AND NOT EXISTS (SELECT 1 FROM daily_questions dq
                      WHERE dq.question_id = q.id
                        AND dq.target_audience = v_aud)
   ORDER BY random()
   LIMIT 1;

  -- Pool esgotado (todas já foram usadas um dia): libera repetir o que não
  -- aparece há mais de 120 dias, em vez de deixar o dia sem questão.
  IF v_question IS NULL THEN
    SELECT q.id INTO v_question
      FROM questions q
     WHERE q.target_audience IN (v_aud, 'all')
       AND q.image_url IS NULL
       AND q.question_text NOT LIKE '%[IMAGEM_PENDENTE]%'
       AND q.correct_answer IS NOT NULL
       AND jsonb_typeof(q.options) = 'array'
       AND jsonb_array_length(q.options) >= 4
       AND NOT EXISTS (SELECT 1 FROM daily_questions dq
                        WHERE dq.question_id = q.id
                          AND dq.target_audience = v_aud
                          AND dq.scheduled_date > CURRENT_DATE - 120)
     ORDER BY random()
     LIMIT 1;
  END IF;

  IF v_question IS NULL THEN RETURN NULL; END IF;

  -- ON CONFLICT cobre a corrida de dois alunos abrindo o app no mesmo segundo.
  INSERT INTO daily_questions (question_id, target_audience, scheduled_date)
  VALUES (v_question, v_aud, CURRENT_DATE)
  ON CONFLICT (target_audience, scheduled_date) DO NOTHING;

  SELECT id INTO v_id FROM daily_questions
   WHERE target_audience = v_aud AND scheduled_date = CURRENT_DATE;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.ensure_daily_question(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_daily_question(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_daily_question(TEXT) TO service_role;

COMMENT ON FUNCTION public.ensure_daily_question(TEXT) IS
  'Garante a questao do dia do publico (etec/enem), criando se faltar. Idempotente; chamada pelo app.';
