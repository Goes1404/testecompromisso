-- Aula separada por FOCO (ENEM / ETEC), não só por sala (17/10).
--
-- `lives.turmas` passa a aceitar, além dos números de sala, os focos 'ENEM' e
-- 'ETEC'. Aula com turmas = '{ETEC}' vale para todo aluno com
-- `profiles.exam_target` ETEC, tenha ou não sala no cadastro — em 17/10, 222
-- alunos ativos estavam sem sala e não viam nenhuma aula separada por turma.
--
-- Tudo que decide quem vê e quem entra na chamada passa por estas duas funções
-- (RLS de `lives`, chat, dúvidas, presença e `fechar_chamada_da_live`), então só
-- elas mudam. Sala continua funcionando como antes.

CREATE OR REPLACE FUNCTION public.foco_normalizado(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path TO ''
AS $$
  SELECT CASE upper(btrim(coalesce(s, '')))
           WHEN 'ENEM' THEN 'ENEM'
           WHEN 'ETEC' THEN 'ETEC'
         END
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_live(p_turmas text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT cardinality(coalesce(p_turmas, '{}')) = 0
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role::text IN ('admin', 'staff', 'teacher')
               OR public.sala_normalizada(p.sala) = ANY (p_turmas)
               OR public.foco_normalizado(p.exam_target) = ANY (p_turmas)))
$$;

CREATE OR REPLACE FUNCTION public.alunos_esperados_da_live(p_turmas text[])
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT p.* FROM public.profiles p
  WHERE p.role::text = 'student'
    AND p.arquivado_em IS NULL
    AND (cardinality(coalesce(p_turmas, '{}')) = 0
         OR public.sala_normalizada(p.sala) = ANY (p_turmas)
         OR public.foco_normalizado(p.exam_target) = ANY (p_turmas))
$$;

-- O rótulo da chamada fazia `t::int` em cada item de `turmas`: com 'ETEC' na
-- lista, encerrar a aula daria erro de conversão e a chamada não sairia.
CREATE OR REPLACE FUNCTION public.fechar_chamada_da_live(p_live_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
    v_prof := (SELECT u.id FROM auth.users u WHERE u.id = v_live.teacher_id);
    v_prof := coalesce(v_prof, auth.uid());
    IF v_prof IS NULL THEN RETURN NULL; END IF;
    v_inicio := coalesce(v_live.start_time, now());
    INSERT INTO public.class_sessions
      (title, description, session_date, start_time, session_type,
       teacher_id, teacher_name, live_id, class_label)
    VALUES
      (CASE WHEN char_length(btrim(coalesce(v_live.title, ''))) >= 3
            THEN left(btrim(v_live.title), 200) ELSE 'Aula ao vivo' END,
       'Chamada automática da aula ao vivo: presente quem ficou 60% do tempo com a sala aberta.',
       (v_inicio AT TIME ZONE 'America/Sao_Paulo')::date,
       (v_inicio AT TIME ZONE 'America/Sao_Paulo')::time,
       'live', v_prof, v_live.teacher_name, p_live_id,
       CASE WHEN cardinality(v_live.turmas) = 0 THEN NULL
            ELSE concat_ws(' · ',
              (SELECT 'Foco ' || string_agg(t, ' e ' ORDER BY t)
                 FROM unnest(v_live.turmas) AS t WHERE t !~ '^[0-9]+$'),
              (SELECT 'Salas ' || string_agg(t, ', ' ORDER BY t::int)
                 FROM unnest(v_live.turmas) AS t WHERE t ~ '^[0-9]+$'))
       END)
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
$function$;
