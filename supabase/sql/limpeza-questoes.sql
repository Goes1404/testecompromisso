-- Limpeza do banco de questões, pelo SQL Editor do Supabase.
--
-- Faz o mesmo que `npm run auditar:questoes`, sem precisar de Node nem da
-- service role key. Exige as duas migrations já aplicadas:
--   20260902000000_questoes_integridade.sql   (colunas ativa/motivo_inativa/auditada_em)
--   20260902010000_defeitos_de_questao.sql    (a régua em SQL + a view)
--
-- ⚠ RODE OS BLOCOS NA ORDEM E LEIA O RESULTADO DE CADA UM ANTES DO SEGUINTE.
--   Os blocos 1 a 3 são só leitura. Os blocos 4 e 5 escrevem. O 6 desfaz.
--   A régua é heurística sobre texto em português: quem decide sobre o
--   conteúdo do cursinho é o professor, não a expressão regular.

-- ═══ 1. O tamanho do problema ═══════════════════════════════════════════════
SELECT
  count(*)                                                        AS questoes_no_banco,
  count(*) FILTER (WHERE d.bloqueia)                              AS o_aluno_nao_responde,
  count(*) FILTER (WHERE NOT d.bloqueia)                          AS so_pedem_conferencia,
  round(100.0 * count(*) FILTER (WHERE d.bloqueia) / nullif((SELECT count(*) FROM public.questions), 0), 1)
                                                                  AS pct_quebrado
FROM public.questions q
LEFT JOIN public.questoes_com_defeito d ON d.id = q.id;

-- ═══ 2. Por tipo de defeito, com exemplos ═══════════════════════════════════
-- Leia os exemplos. É aqui que se percebe se a régua está pegando questão boa.
SELECT
  c                                             AS defeito,
  count(*)                                      AS quantas,
  (c NOT LIKE 'aviso:%')                        AS bloqueia,
  (array_agg(left(d.enunciado, 90) ORDER BY d.id))[1:5] AS exemplos
FROM public.questoes_com_defeito d
CROSS JOIN LATERAL unnest(d.defeitos) AS c
GROUP BY c
ORDER BY quantas DESC;

-- ═══ 3. As provas mais atingidas ════════════════════════════════════════════
SELECT
  e.title,
  count(*)                            AS questoes_na_prova,
  count(*) FILTER (WHERE d.bloqueia)  AS quebradas
FROM public.exam_questions eq
JOIN public.exams e     ON e.id = eq.exam_id
JOIN public.questions q ON q.id = eq.question_id
LEFT JOIN public.questoes_com_defeito d ON d.id = q.id
GROUP BY e.id, e.title
HAVING count(*) FILTER (WHERE d.bloqueia) > 0
ORDER BY quebradas DESC
LIMIT 20;

-- ═══ 4. CONSERTO: devolver o apoio às questões de bloco declarado ══════════
-- ESCREVE NO BANCO.
--
-- O defeito tem origem conhecida: o caderno diz "Texto para as questões 12 a
-- 15" e a extração devolve o texto só na 12. As irmãs ficam órfãs, mas o apoio
-- delas está ali, na mesma prova.
--
-- ⚠ A DECLARAÇÃO DO BLOCO É OBRIGATÓRIA, e essa exigência custou caro para
--   aparecer. A primeira versão herdava da vizinha imediata (±2 posições) sem
--   exigir mais nada. Simulada contra as 3.986 questões reais, ela "consertava"
--   23 órfãs — e o conserto era lixo, porque no ENEM e na FUVEST cada questão
--   tem o SEU texto e vizinhança não significa nada:
--
--     "O instante em que a água dessa piscina terminar de escoar"
--        recebia um texto sobre plaquetas artificiais;
--     "Considerando esse escurecimento das águas"
--        recebia a carta de Vieira sobre a língua sem F, L nem R.
--
--   Pior do que deixar quebrada: vira questão que PARECE inteira e mede a coisa
--   errada — e ninguém mais descobre, porque saiu do relatório.
--
-- No banco de 02/09/2026 este bloco conserta ZERO questões: só 64 das 3.986
-- declaram bloco, e nenhuma delas tem irmã órfã. Zero é o resultado certo, não
-- um sinal de que a consulta falhou. As 81 órfãs vão para a quarentena e o
-- conserto é do professor, questão a questão.
--
-- Para ver antes de escrever, troque o UPDATE por:
--   SELECT h.id, h.bloco, left(h.supporting_text, 120) FROM herdeira h;

WITH posicao AS (
  SELECT DISTINCT ON (eq.question_id) eq.question_id, eq.exam_id, eq.order_index
  FROM public.exam_questions eq
  ORDER BY eq.question_id, eq.exam_id, eq.order_index
),
-- Quem declara um bloco, e qual é a faixa. Faixa maior que 20 questões é ruído
-- de OCR, não bloco de prova.
declara_valida AS (
  SELECT d.* FROM (
    SELECT question_id, exam_id, order_index, supporting_text,
           (regexp_match(txt, 'quest(?:õ|o)es\s+(?:de\s+)?([0-9]{1,3})\s*(?:a|à|e|até|ate)\s*([0-9]{1,3})', 'i'))[1]::int AS de,
           (regexp_match(txt, 'quest(?:õ|o)es\s+(?:de\s+)?([0-9]{1,3})\s*(?:a|à|e|até|ate)\s*([0-9]{1,3})', 'i'))[2]::int AS ate
    FROM (
      SELECT p.question_id, p.exam_id, p.order_index, q.supporting_text,
             coalesce(q.supporting_text, '') || ' ' || coalesce(q.question_text, '') AS txt
      FROM public.questions q
      JOIN posicao p ON p.question_id = q.id
      WHERE btrim(coalesce(q.supporting_text, '')) <> ''
    ) t
  ) d
  WHERE d.de IS NOT NULL AND d.ate >= d.de AND d.ate - d.de <= 20
    -- quem declara o bloco tem de estar DENTRO dele, senão a numeração do
    -- caderno não bate com o order_index desta prova
    AND d.order_index BETWEEN d.de AND d.ate
),
orfas AS (
  SELECT q.id, p.exam_id, p.order_index
  FROM public.questions q
  JOIN posicao p ON p.question_id = q.id
  WHERE 'enunciado_orfao' = ANY (public.defeitos_da_questao(
          q.question_text, q.supporting_text, q.image_url, q.options, q.correct_answer))
),
herdeira AS (
  SELECT DISTINCT ON (o.id)
         o.id, dv.supporting_text,
         'questões ' || dv.de || ' a ' || dv.ate AS bloco
  FROM orfas o
  JOIN declara_valida dv
    ON  dv.exam_id      = o.exam_id
    AND dv.question_id <> o.id
    AND o.order_index BETWEEN dv.de AND dv.ate
  ORDER BY o.id, abs(dv.order_index - o.order_index)
)
UPDATE public.questions q
SET supporting_text = h.supporting_text, auditada_em = now()
FROM herdeira h
WHERE q.id = h.id
  AND public.questao_utilizavel(q.question_text, h.supporting_text, q.image_url, q.options, q.correct_answer)
RETURNING q.id, h.bloco, left(q.question_text, 70) AS enunciado;

-- ═══ 5. QUARENTENA: desativar o que sobrou quebrado ═════════════════════════
-- ESCREVE NO BANCO. Rode o bloco 4 primeiro — desativar antes de consertar
-- joga fora questão que tinha conserto.
--
-- DESATIVA, NUNCA APAGA:
--   · `student_question_answers.question_id` é FK SEM cascade — o DELETE
--     falharia justamente nas questões mais respondidas, e forçar o cascade
--     apagaria o histórico do aluno para consertar um erro que é nosso.
--   · `exam_questions` TEM cascade — apagar furaria a prova inteira, inclusive
--     as tentativas já corrigidas por ela.
WITH diagnostico AS (
  SELECT q.id,
         public.defeitos_da_questao(
           q.question_text, q.supporting_text, q.image_url, q.options, q.correct_answer
         ) AS defeitos
  FROM public.questions q
  WHERE q.ativa
)
UPDATE public.questions q
SET ativa          = false,
    motivo_inativa = public.motivo_de_bloqueio(d.defeitos),
    auditada_em    = now()
FROM diagnostico d
WHERE q.id = d.id
  AND EXISTS (SELECT 1 FROM unnest(d.defeitos) c WHERE c NOT LIKE 'aviso:%')
RETURNING q.id, q.motivo_inativa, left(q.question_text, 70) AS enunciado;

-- ═══ 6. VOLTA: reativar o que já foi consertado à mão ═══════════════════════
-- ESCREVE NO BANCO. Rode depois de o professor editar as questões da
-- quarentena. Só volta o que a régua aprova agora.
UPDATE public.questions q
SET ativa          = true,
    motivo_inativa = NULL,
    auditada_em    = now()
WHERE NOT q.ativa
  AND public.questao_utilizavel(q.question_text, q.supporting_text, q.image_url, q.options, q.correct_answer)
RETURNING q.id, left(q.question_text, 70) AS enunciado;

-- ═══ 7. DESFAZER TUDO ═══════════════════════════════════════════════════════
-- Se a limpeza pegou questão boa e você quer voltar ao estado anterior de uma
-- vez. Só desfaz a quarentena — o texto de apoio herdado no bloco 4 fica, e
-- fica de propósito: ele é conserto, não estrago.
--
-- UPDATE public.questions SET ativa = true, motivo_inativa = NULL WHERE NOT ativa;

-- ═══ 8. A fila de conserto do professor ═════════════════════════════════════
-- O que está em quarentena e por quê, para atacar na mão.
SELECT q.id,
       q.motivo_inativa,
       left(q.question_text, 100) AS enunciado,
       e.title                    AS prova,
       eq.order_index             AS numero_na_prova
FROM public.questions q
LEFT JOIN public.exam_questions eq ON eq.question_id = q.id
LEFT JOIN public.exams e           ON e.id = eq.exam_id
WHERE NOT q.ativa
ORDER BY e.title NULLS LAST, eq.order_index;
