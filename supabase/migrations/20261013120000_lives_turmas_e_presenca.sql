-- ============================================================
-- Aulas ao vivo: turmas que assistem + chamada automática por tempo na sala.
--
-- Decisão da coordenação (13/10): presente é quem ficou pelo menos 60% do
-- tempo em que a aula esteve no ar com a sala aberta. Sem código.
--
-- Como o tempo é medido: a sala do aluno chama `registrar_presenca_live()` a
-- cada 60 s. O servidor soma o tempo REAL entre dois sinais, limitado a 130 s
-- por sinal. Chamar a função cem vezes seguidas soma zero; sumir por dez
-- minutos e voltar soma no máximo 130 s. O relógio é o do banco, nunca o do
-- celular.
--
-- O que isso prova: que a sala estava aberta. Não prova atenção — está
-- documentado no CLAUDE.md e foi a escolha da coordenação.
-- ============================================================

-- ── 0. Falha de chamada: aluno se marcava presente sem código ─────────────
-- `ar_insert` aceitava `auth.uid() = student_id`, sem olhar status nem aula:
-- qualquer aluno, com o próprio login e a chave pública do app, gravava
-- "presente" em qualquer aula (confirmado por simulação de RLS em 12/10).
-- Nenhuma tela do aluno grava aqui direto: o check-in por código passa por
-- /api/attendance/checkin (service role) e a chamada automática abaixo é
-- SECURITY DEFINER. Então o ramo do aluno sai sem quebrar nada.
DROP POLICY IF EXISTS "ar_insert" ON public.attendance_records;
CREATE POLICY "ar_insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('teacher', 'admin', 'staff')));

-- ── 1. A turma do aluno ───────────────────────────────────────────────────
-- A turma de verdade é `profiles.sala` (ETEC = salas 1–6, ENEM = 7–12), mas
-- ela foi digitada de vários jeitos: "5", "05", "sala 5", "Sala 05". Tudo
-- isso vira "5". O que não é número ("Não informada", "Turma A") vira NULL.
-- Espelho em TS: `normalizarSala()` em src/lib/lives.ts.
CREATE OR REPLACE FUNCTION public.sala_normalizada(s text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE WHEN x ~ '^[0-9]+$' THEN x END
  FROM (SELECT regexp_replace(lower(btrim(coalesce(s, ''))), '^(sala\s*)?0*', '') AS x) t
$$;

-- ── 2. Colunas novas em lives ─────────────────────────────────────────────
-- turmas: salas normalizadas ('1'..'12'). Vazio = todas as turmas, inclusive
--   quem está sem sala no cadastro.
-- no_ar_desde / segundos_no_ar: cronômetro da aula, mantido pelo gatilho
--   abaixo. A duração que vale para os 60% é o tempo em que a aula esteve NO
--   AR — se o professor encerrar e reabrir, o intervalo fechado não conta.
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS turmas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS no_ar_desde timestamptz,
  ADD COLUMN IF NOT EXISTS segundos_no_ar integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.duracao_da_live(l public.lives)
RETURNS integer
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT l.segundos_no_ar
       + CASE WHEN l.no_ar_desde IS NULL THEN 0
              ELSE greatest(0, floor(extract(epoch FROM now() - l.no_ar_desde)))::int END
$$;

CREATE OR REPLACE FUNCTION public.lives_cronometro()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.segundos_no_ar := 0;
    NEW.no_ar_desde := CASE WHEN NEW.status = 'live' THEN now() END;
    RETURN NEW;
  END IF;

  -- O cronômetro só o banco mexe: quem manda segundos_no_ar no UPDATE é
  -- ignorado, para ninguém inflar a duração e derrubar a presença da turma.
  NEW.segundos_no_ar := OLD.segundos_no_ar;
  NEW.no_ar_desde := OLD.no_ar_desde;

  IF NEW.status = 'live' AND OLD.status IS DISTINCT FROM 'live' THEN
    NEW.no_ar_desde := now();
  ELSIF OLD.status = 'live' AND NEW.status IS DISTINCT FROM 'live' THEN
    NEW.segundos_no_ar := OLD.segundos_no_ar
      + greatest(0, floor(extract(epoch FROM now() - coalesce(OLD.no_ar_desde, now()))))::int;
    NEW.no_ar_desde := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lives_cronometro ON public.lives;
CREATE TRIGGER trg_lives_cronometro
  BEFORE INSERT OR UPDATE ON public.lives
  FOR EACH ROW EXECUTE FUNCTION public.lives_cronometro();

-- ── 3. Quem pode ver a aula ───────────────────────────────────────────────
-- Equipe vê tudo. Aluno vê aula de "todas as turmas" e aula da própria sala.
CREATE OR REPLACE FUNCTION public.pode_ver_live(p_turmas text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT cardinality(coalesce(p_turmas, '{}')) = 0
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role::text IN ('admin', 'staff', 'teacher')
               OR public.sala_normalizada(p.sala) = ANY (p_turmas)))
$$;

DROP POLICY IF EXISTS "Permitir leitura de aulas para usuários autenticados" ON public.lives;
DROP POLICY IF EXISTS "open_select_for_authenticated_lives" ON public.lives;
DROP POLICY IF EXISTS "Public can read all lives" ON public.lives;
DROP POLICY IF EXISTS "Aluno ve aulas da propria turma" ON public.lives;
CREATE POLICY "Aluno ve aulas da propria turma" ON public.lives
  FOR SELECT TO authenticated
  USING (public.pode_ver_live(turmas));

-- ── 4. Tempo de cada aluno na sala ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_presencas (
  live_id          uuid        NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  student_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  primeira_entrada timestamptz NOT NULL DEFAULT now(),
  ultima_vez       timestamptz NOT NULL DEFAULT now(),
  segundos         integer     NOT NULL DEFAULT 0 CHECK (segundos >= 0),
  PRIMARY KEY (live_id, student_id)
);

ALTER TABLE public.live_presencas ENABLE ROW LEVEL SECURITY;
-- O Supabase dá ALL em tabela nova para anon/authenticated por padrão. A falta
-- de policy de escrita já barra, mas o privilégio sai também: duas trancas.
REVOKE ALL ON public.live_presencas FROM anon, authenticated;
GRANT SELECT ON public.live_presencas TO authenticated;
GRANT ALL ON public.live_presencas TO service_role;

-- Só leitura pela API. Escrita apenas pela função abaixo (SECURITY DEFINER),
-- senão o aluno gravaria "fiquei 2 horas" direto na tabela.
DROP POLICY IF EXISTS "Aluno ve o proprio tempo, equipe ve tudo" ON public.live_presencas;
CREATE POLICY "Aluno ve o proprio tempo, equipe ve tudo" ON public.live_presencas
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('admin', 'staff', 'teacher')));

-- Sinal da sala. Devolve o tempo do aluno e a duração da aula para a tela
-- mostrar "você está há X min".
CREATE OR REPLACE FUNCTION public.registrar_presenca_live(p_live_id uuid)
RETURNS TABLE (segundos integer, segundos_da_aula integer, status text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_uid  uuid := auth.uid();
  v_live public.lives;
  v_eh_aluno boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem sessão.' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_live FROM public.lives WHERE id = p_live_id;
  IF NOT FOUND OR NOT public.pode_ver_live(v_live.turmas) THEN
    RAISE EXCEPTION 'Aula não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND role::text = 'student' AND arquivado_em IS NULL
  ) INTO v_eh_aluno;

  -- Só conta enquanto a aula está no ar, e só para aluno (professor olhando a
  -- prévia não entra na chamada).
  IF v_eh_aluno AND v_live.status = 'live' THEN
    INSERT INTO public.live_presencas AS lp (live_id, student_id, primeira_entrada, ultima_vez, segundos)
    VALUES (p_live_id, v_uid, now(), now(), 0)
    ON CONFLICT (live_id, student_id) DO UPDATE
      SET segundos = lp.segundos
            + least(greatest(0, floor(extract(epoch FROM now() - lp.ultima_vez)))::int, 130),
          ultima_vez = now();
  END IF;

  RETURN QUERY
    SELECT coalesce((SELECT lp.segundos FROM public.live_presencas lp
                     WHERE lp.live_id = p_live_id AND lp.student_id = v_uid), 0),
           public.duracao_da_live(v_live),
           v_live.status;
END;
$$;

-- ── 5. Quem é esperado na aula ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.alunos_esperados_da_live(p_turmas text[])
RETURNS SETOF public.profiles
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT p.* FROM public.profiles p
  WHERE p.role::text = 'student'
    AND p.arquivado_em IS NULL
    AND (cardinality(coalesce(p_turmas, '{}')) = 0
         OR public.sala_normalizada(p.sala) = ANY (p_turmas))
$$;

-- Painel do estúdio: quem entrou, quanto ficou e quem já passou dos 60%.
CREATE OR REPLACE FUNCTION public.presencas_da_live(p_live_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_live public.lives;
  v_dur  integer;
  v_min  integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND role::text IN ('admin', 'staff', 'teacher')) THEN
    RAISE EXCEPTION 'Só a equipe vê a chamada.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_live FROM public.lives WHERE id = p_live_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aula não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  v_dur := public.duracao_da_live(v_live);
  v_min := ceil(v_dur * 0.6);

  RETURN jsonb_build_object(
    'segundos_da_aula', v_dur,
    'segundos_para_presenca', v_min,
    'esperados', (SELECT count(*) FROM public.alunos_esperados_da_live(v_live.turmas)),
    'chamada_id', (SELECT cs.id FROM public.class_sessions cs
                   WHERE cs.live_id = p_live_id AND cs.session_type = 'live'
                   ORDER BY cs.created_at LIMIT 1),
    'alunos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', p.id,
               'nome', coalesce(nullif(p.full_name, ''), p.name, 'Aluno'),
               'sala', public.sala_normalizada(p.sala),
               'segundos', lp.segundos,
               'ultima_vez', lp.ultima_vez,
               'presente', v_dur > 0 AND lp.segundos >= v_min)
             ORDER BY lp.segundos DESC)
      FROM public.live_presencas lp
      JOIN public.profiles p ON p.id = lp.student_id
      WHERE lp.live_id = p_live_id), '[]'::jsonb));
END;
$$;

-- Salas que existem no cadastro, para o professor escolher.
CREATE OR REPLACE FUNCTION public.turmas_para_lives()
RETURNS TABLE (sala text, curso text, alunos bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND role::text IN ('admin', 'staff', 'teacher')) THEN
    RAISE EXCEPTION 'Só a equipe agenda aulas.' USING ERRCODE = '42501';
  END IF;

  -- Sala com 1 ou 2 alunos é erro de digitação (ex.: um aluno ETEC na sala
  -- 10), não turma. Corte em 5 para não oferecer sala fantasma.
  RETURN QUERY
    SELECT t.s, t.c, t.n FROM (
      SELECT public.sala_normalizada(p.sala) AS s,
             mode() WITHIN GROUP (ORDER BY upper(btrim(p.exam_target))) AS c,
             count(*) AS n
      FROM public.profiles p
      WHERE p.role::text = 'student' AND p.arquivado_em IS NULL
        AND public.sala_normalizada(p.sala) IS NOT NULL
      GROUP BY 1
    ) t
    WHERE t.n >= 5
    ORDER BY t.s::int;
END;
$$;

-- ── 6. Chamada ao encerrar a aula ─────────────────────────────────────────
-- Cria (ou reaproveita) a chamada da aula em class_sessions e grava presente/
-- ausente para todos os alunos esperados. Roda sozinha quando a aula passa
-- para "encerrada" e de novo se ela for reaberta e encerrada outra vez.
--
-- Nunca sobrescreve o que a secretaria marcou à mão (method <> 'app').
-- Aula com menos de 10 min no ar não gera chamada: é o professor que abriu sem
-- querer, e marcar ~855 faltas por isso seria pior do que não ter chamada.
CREATE OR REPLACE FUNCTION public.fechar_chamada_da_live(p_live_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_live    public.lives;
  v_dur     integer;
  v_min     integer;
  v_sessao  uuid;
  v_prof    uuid;
  v_inicio  timestamptz;
BEGIN
  SELECT * INTO v_live FROM public.lives WHERE id = p_live_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_dur := public.duracao_da_live(v_live);
  IF v_dur < 600 THEN RETURN NULL; END IF;
  v_min := ceil(v_dur * 0.6);

  SELECT cs.id INTO v_sessao FROM public.class_sessions cs
  WHERE cs.live_id = p_live_id AND cs.session_type = 'live'
  ORDER BY cs.created_at LIMIT 1;

  IF v_sessao IS NULL THEN
    -- class_sessions.teacher_id é NOT NULL e aponta para auth.users.
    v_prof := (SELECT u.id FROM auth.users u WHERE u.id = v_live.teacher_id);
    v_prof := coalesce(v_prof, auth.uid());
    IF v_prof IS NULL THEN RETURN NULL; END IF;

    v_inicio := coalesce(v_live.start_time, now());
    INSERT INTO public.class_sessions
      (title, description, session_date, start_time, session_type,
       teacher_id, teacher_name, live_id, class_label)
    VALUES
      -- class_sessions exige título com 3+ letras; `lives` não exige. Sem
      -- isso, uma aula chamada "Fí" travaria o botão de encerrar.
      (CASE WHEN char_length(btrim(coalesce(v_live.title, ''))) >= 3
            THEN left(btrim(v_live.title), 200) ELSE 'Aula ao vivo' END,
       'Chamada automática da aula ao vivo: presente quem ficou 60% do tempo com a sala aberta.',
       (v_inicio AT TIME ZONE 'America/Sao_Paulo')::date,
       (v_inicio AT TIME ZONE 'America/Sao_Paulo')::time,
       'live', v_prof, v_live.teacher_name, p_live_id,
       CASE WHEN cardinality(v_live.turmas) = 0 THEN NULL
            ELSE 'Salas ' || (SELECT string_agg(t, ', ' ORDER BY t::int)
                              FROM unnest(v_live.turmas) AS t) END)
    RETURNING id INTO v_sessao;
  END IF;

  INSERT INTO public.attendance_records AS ar
    (session_id, student_id, status, self_checkin, method, recorded_at)
  SELECT v_sessao, e.id,
         CASE WHEN coalesce(lp.segundos, 0) >= v_min THEN 'presente' ELSE 'ausente' END,
         false, 'app', now()
  FROM public.alunos_esperados_da_live(v_live.turmas) e
  LEFT JOIN public.live_presencas lp ON lp.live_id = p_live_id AND lp.student_id = e.id
  ON CONFLICT (session_id, student_id) DO UPDATE
    SET status = excluded.status, recorded_at = excluded.recorded_at
    WHERE ar.method = 'app';

  RETURN v_sessao;
END;
$$;

CREATE OR REPLACE FUNCTION public.lives_chamada_ao_encerrar()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM public.fechar_chamada_da_live(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_lives_chamada_ao_encerrar ON public.lives;
CREATE TRIGGER trg_lives_chamada_ao_encerrar
  AFTER UPDATE OF status ON public.lives
  FOR EACH ROW EXECUTE FUNCTION public.lives_chamada_ao_encerrar();

-- ── 7. Quem pode chamar o quê ─────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.registrar_presenca_live(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.presencas_da_live(uuid)       FROM public, anon;
REVOKE ALL ON FUNCTION public.turmas_para_lives()           FROM public, anon;
REVOKE ALL ON FUNCTION public.fechar_chamada_da_live(uuid)  FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.lives_chamada_ao_encerrar()   FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.alunos_esperados_da_live(text[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_presenca_live(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.presencas_da_live(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.turmas_para_lives()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_ver_live(text[])         TO authenticated;
GRANT EXECUTE ON FUNCTION public.sala_normalizada(text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.duracao_da_live(public.lives) TO authenticated;
