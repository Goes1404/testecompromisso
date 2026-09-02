-- A régua de integridade de questão, em SQL.
--
-- Gêmea de `src/lib/questao-integridade.ts`. Existe porque a limpeza do banco
-- precisa rodar de dentro do SQL Editor do Supabase, sem Node, sem service role
-- key na mão de ninguém e sem baixar o repositório.
--
-- ⚠ As duas implementações têm de andar juntas. Se você mudar a régua de um
--   lado, mude do outro: é a tela do aluno de um lado e a quarentena do banco do
--   outro, e um filtro de tela que não bate com o relatório faz o professor
--   procurar por uma questão que o aluno vê e ele não encontra.
--   A prova da versão TypeScript é `npx tsx scripts/test-questoes.ts`.

-- ─── Alternativas normalizadas ───────────────────────────────────────────────
-- `options` chega em três formatos históricos: [{key,text}] (import novo),
-- [{letter,text}] (import ENEM antigo) e ["texto", …] (cadastro manual do
-- professor). Ainda há linhas em que o JSON inteiro foi gravado como STRING.
-- Todos viram a mesma lista {key,text} aqui, como as telas já fazem.
CREATE OR REPLACE FUNCTION public.alternativas_da_questao(p_options jsonb)
RETURNS TABLE (ordem int, chave text, texto text)
LANGUAGE plpgsql IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v jsonb := coalesce(p_options, '[]'::jsonb);
BEGIN
  IF jsonb_typeof(v) = 'string' THEN
    BEGIN
      v := (v #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      v := '[]'::jsonb;
    END;
  END IF;
  IF v IS NULL OR jsonb_typeof(v) <> 'array' THEN
    v := '[]'::jsonb;
  END IF;

  RETURN QUERY
  SELECT
    t.ord::int,
    CASE
      WHEN jsonb_typeof(t.e) = 'string' THEN chr(96 + t.ord::int)
      ELSE lower(btrim(coalesce(nullif(t.e ->> 'key', ''), nullif(t.e ->> 'letter', ''), chr(96 + t.ord::int))))
    END,
    CASE
      WHEN jsonb_typeof(t.e) = 'string' THEN t.e #>> '{}'
      ELSE coalesce(t.e ->> 'text', t.e ->> 'texto', '')
    END
  FROM jsonb_array_elements(v) WITH ORDINALITY AS t(e, ord);
END;
$$;

-- ─── Enunciado como o aluno lê ───────────────────────────────────────────────
-- Sem o marcador de figura (a tela o apaga antes de exibir) e com os espaços
-- colapsados.
CREATE OR REPLACE FUNCTION public.enunciado_visivel(p_texto text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT btrim(regexp_replace(replace(coalesce(p_texto, ''), '[IMAGEM_PENDENTE]', ' '), '\s+', ' ', 'g'));
$$;

-- ─── O diagnóstico ───────────────────────────────────────────────────────────
-- Devolve os códigos de defeito. Os que começam com nada são bloqueadores; os
-- que só avisam vêm prefixados por `aviso:` — assim uma consulta distingue
-- "tira da tela" de "o professor confere" com um `NOT LIKE 'aviso:%'`.
CREATE OR REPLACE FUNCTION public.defeitos_da_questao(
  p_question_text   text,
  p_supporting_text text,
  p_image_url       text,
  p_options         jsonb,
  p_correct_answer  text
)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  d           text[] := '{}';
  enunciado   text;
  baixo       text;   -- enunciado em minúsculas, para as expressões regulares
  sem_fixas   text;   -- sem "tabela periódica", "figura de linguagem" e afins
  abertura    text;   -- primeira oração
  inicial     text;
  tem_apoio   boolean;
  tem_imagem  boolean;
  traz_dado   boolean;
  n_alt       int;
  textos      text[];
  chaves      text[];
  gab         text;
  pede_texto  boolean;
  pede_visual boolean;
  aponta_fora boolean;
BEGIN
  enunciado  := public.enunciado_visivel(p_question_text);
  tem_apoio  := btrim(coalesce(p_supporting_text, '')) <> '';
  tem_imagem := btrim(coalesce(p_image_url, ''))       <> '';

  -- ── Enunciado ──
  IF length(enunciado) < 15 THEN
    d := array_append(d, 'enunciado_vazio');
  ELSE
    baixo := lower(enunciado);

    -- Começa no meio da frase: minúscula ou conjunção na abertura. Sintoma de
    -- corte na extração — o pedaço de cima ficou para trás.
    inicial := left(enunciado, 1);
    IF baixo ~ '^(e|ou|mas|porém|porem|que|pois|logo|então|entao|assim)\y'
       OR (inicial ~ '[[:alpha:]]' AND inicial = lower(inicial) AND lower(inicial) <> upper(inicial))
    -- Termina sem fechar a ideia. A régua é estreita de propósito: quase todo
    -- fim de enunciado do ENEM PARECE cortado, porque a frase fecha na
    -- alternativa ("…o valor pago foi de", "…conclui-se que", "…é igual a").
    -- Sobra o que nenhuma alternativa completa: vírgula pendurada e conjunção
    -- coordenativa no fim.
       OR baixo ~ '(,|;|\y(e|ou|mas|porém|porem|pois|porque|nem))\s*$'
    THEN
      d := array_append(d, 'enunciado_truncado');
    END IF;

    -- Expressões em que a palavra de apoio NÃO aponta para lugar nenhum:
    -- "tabela periódica" é conteúdo de Química, "figura de linguagem" é de
    -- Português. Sem tirá-las, meia prova de ciências e gramática cairia aqui.
    sem_fixas := regexp_replace(
      baixo,
      '\y(tabela\s+peri[óo]dica|figuras?\s+de\s+linguagem|text[oa]s?\s+(constitucional|legal|b[íi]blico|liter[áa]rio|argumentativo|dissertativo|narrativo|cient[íi]fico)|mapas?\s+ment(al|ais)|imagem\s+corporal|gr[áa]fico\s+de\s+fun[çc][ãa]o)\y',
      ' ', 'g');

    abertura := coalesce(substring(sem_fixas from '^[^.!?;]*'), sem_fixas);

    -- O enunciado traz o próprio dado? "Observe a sequência abaixo: 2, 4, 8, 16"
    -- tem dêitico e está inteira — o "abaixo" aponta para o que vem depois dos
    -- dois-pontos, no mesmo campo.
    traz_dado := position(':' in enunciado) > 0
      AND length(btrim(substring(enunciado from position(':' in enunciado) + 1))) >= 10;

    pede_texto := sem_fixas ~ '\y(text[oa]s?|téxt[oa]s?|trechos?|fragmentos?|excertos?|passagens?|poemas?|sonetos?|cr[ôo]nicas?|reportagens?|not[íi]cias?|manchetes?|di[áa]logos?|entrevistas?|cita[çc][ãa]o|enunciado|tabelas?)\y';

    pede_visual := sem_fixas ~ '\y(figuras?|imagens?|fotografias?|gr[áa]ficos?|mapas?|charges?|tirinhas?|quadrinhos?|esquemas?|ilustra[çc][õo]es|ilustra[çc][ãa]o|diagramas?|infogr[áa]ficos?|cartazes?|cartaz)\y';

    -- Demonstrativo sem antecedente. É o que denuncia o caso que originou a
    -- régua ("A quantia que ESSA PESSOA levava…"), onde nenhuma palavra de
    -- apoio aparece. Só vale na PRIMEIRA oração: "Uma pessoa comprou 3 kg. Essa
    -- pessoa gastou…" tem o antecedente dentro do próprio enunciado.
    aponta_fora := pede_texto OR pede_visual OR abertura ~ '\y(ess[ea]s?|est[ea]s?|aquel[ea]s?|ness[ea]s?|nest[ea]s?|naquel[ea]s?|dess[ea]s?|dest[ea]s?|daquel[ea]s?|referid[oa]s?|mencionad[oa]s?|citad[oa]s?|apresentad[oa]s?|acima|abaixo|ao lado|a seguir|anterior(es)?|supracitad[oa]s?)\y';

    IF aponta_fora AND NOT tem_apoio AND NOT tem_imagem AND NOT traz_dado THEN
      d := array_append(d, 'enunciado_orfao');
    ELSIF pede_visual AND NOT tem_imagem AND NOT traz_dado THEN
      -- Tem texto de apoio mas fala de gráfico/figura. Às vezes a tabela está
      -- reproduzida em texto e está tudo certo — por isso avisa, não bloqueia.
      d := array_append(d, 'aviso:apoio_visual_ausente');
    END IF;
  END IF;

  -- O marcador significa "aqui havia uma figura". A tela o apaga antes de
  -- exibir, então sem imagem o aluno recebe a questão com o buraco silencioso.
  IF coalesce(p_question_text, '') LIKE '%[IMAGEM_PENDENTE]%' AND NOT tem_imagem THEN
    d := array_append(d, 'imagem_pendente');
  END IF;

  -- ── Alternativas ──
  SELECT array_agg(a.texto ORDER BY a.ordem), array_agg(a.chave ORDER BY a.ordem)
    INTO textos, chaves
    FROM public.alternativas_da_questao(p_options) a;
  n_alt := coalesce(array_length(textos, 1), 0);

  -- Quatro e não cinco: a ETEC tem cinco, mas há questão de professor
  -- cadastrada com quatro, e ela é respondível.
  IF n_alt < 4 THEN
    d := array_append(d, 'alternativas_de_menos');
  ELSE
    IF EXISTS (SELECT 1 FROM unnest(textos) t WHERE btrim(coalesce(t, '')) = '') THEN
      d := array_append(d, 'alternativa_vazia');
    END IF;
    IF (SELECT count(DISTINCT lower(btrim(regexp_replace(t, '\s+', ' ', 'g')))) FROM unnest(textos) t) < n_alt THEN
      d := array_append(d, 'alternativas_repetidas');
    END IF;
  END IF;

  -- ── Gabarito ──
  -- Nulo é legítimo em prova antiga: o gabarito mora em `exams.answer_key`
  -- (migration 20260520100000). Por isso avisa e não bloqueia.
  gab := lower(btrim(coalesce(p_correct_answer, '')));
  IF gab = '' THEN
    d := array_append(d, 'aviso:gabarito_ausente');
  ELSIF n_alt > 0
    AND NOT (gab = ANY (chaves))
    AND NOT EXISTS (SELECT 1 FROM unnest(textos) t WHERE lower(btrim(regexp_replace(t, '\s+', ' ', 'g'))) = gab)
  THEN
    d := array_append(d, 'gabarito_fora_das_alternativas');
  END IF;

  RETURN d;
END;
$$;

-- Atalho: a questão pode ir para a tela do aluno?
CREATE OR REPLACE FUNCTION public.questao_utilizavel(
  p_question_text   text,
  p_supporting_text text,
  p_image_url       text,
  p_options         jsonb,
  p_correct_answer  text
)
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM unnest(public.defeitos_da_questao(
      p_question_text, p_supporting_text, p_image_url, p_options, p_correct_answer
    )) AS c
    WHERE c NOT LIKE 'aviso:%'
  );
$$;

-- ─── Motivo legível ─────────────────────────────────────────────────────────
-- O texto que vai para `questions.motivo_inativa` e que o professor lê na lista.
-- Mesmas frases de `motivoDeBloqueio()` no TypeScript.
CREATE OR REPLACE FUNCTION public.motivo_de_bloqueio(p_defeitos text[])
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT nullif(string_agg(
    CASE c
      WHEN 'enunciado_vazio'    THEN 'A questão não tem enunciado.'
      WHEN 'enunciado_truncado' THEN 'O enunciado começa ou termina no meio da frase — foi cortado na importação.'
      WHEN 'enunciado_orfao'    THEN 'O enunciado se refere a um apoio (texto, tabela ou figura) que não foi importado.'
      WHEN 'imagem_pendente'    THEN 'Enunciado marcado com [IMAGEM_PENDENTE] e sem imagem anexada.'
      WHEN 'alternativas_de_menos'  THEN 'A questão tem alternativas de menos; o mínimo é 4.'
      WHEN 'alternativa_vazia'      THEN 'Há alternativa sem texto.'
      WHEN 'alternativas_repetidas' THEN 'Há alternativas idênticas — a questão tem mais de uma resposta certa ou perdeu uma opção.'
      WHEN 'gabarito_fora_das_alternativas' THEN 'O gabarito não corresponde a nenhuma alternativa — acertar é impossível.'
      ELSE c
    END, ' ' ORDER BY c), '')
  FROM unnest(coalesce(p_defeitos, '{}'::text[])) AS c
  WHERE c NOT LIKE 'aviso:%';
$$;

-- ─── A fila de conserto ──────────────────────────────────────────────────────
-- Uma linha por questão com qualquer defeito. `bloqueia` separa o que o aluno
-- não consegue responder do que só pede conferência do professor.
CREATE OR REPLACE VIEW public.questoes_com_defeito AS
SELECT
  q.id,
  (SELECT bool_or(c NOT LIKE 'aviso:%') FROM unnest(dq.defeitos) c) AS bloqueia,
  dq.defeitos,
  public.enunciado_visivel(q.question_text) AS enunciado,
  (btrim(coalesce(q.supporting_text, '')) <> '') AS tem_apoio,
  (btrim(coalesce(q.image_url, '')) <> '')       AS tem_imagem,
  q.subject_id,
  q.exam_board,
  q.target_audience
FROM public.questions q
CROSS JOIN LATERAL (
  SELECT public.defeitos_da_questao(
    q.question_text, q.supporting_text, q.image_url, q.options, q.correct_answer
  ) AS defeitos
) dq
WHERE array_length(dq.defeitos, 1) > 0;

-- A view roda como quem consulta (SECURITY INVOKER, o padrão do PG 15+): ela
-- não pode virar um jeito de ler `questions` por fora da RLS.
ALTER VIEW public.questoes_com_defeito SET (security_invoker = true);

COMMENT ON VIEW public.questoes_com_defeito IS
  'Fila de conserto do banco de questões. Gêmea de src/lib/questao-integridade.ts — mudou uma, mude a outra.';
