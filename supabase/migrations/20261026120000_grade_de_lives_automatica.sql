-- Grade de sábado com abertura, encerramento e chamada automáticos (26/10).
--
-- Como o aulão roda desde 17/10: duas transmissões contínuas no YouTube (uma
-- ENEM, uma ETEC) e seis linhas em `lives` para cada uma, todas com o MESMO
-- `youtube_id` — uma por aula da grade. Ninguém virava as linhas na hora:
--
-- - em 24/10 as duas primeiras aulas foram abertas às 8h16 e nunca encerradas.
--   As outras dez ficaram "agendadas" para sempre, e os 145 alunos que entraram
--   somaram a manhã inteira (e a noite, com a aba aberta) na primeira aula;
-- - sem encerrar, `fechar_chamada_da_live()` nunca rodou: nenhuma chamada saiu;
-- - em 17/10 as aulas da Prô Jota (sem conta, `teacher_id` NULL) também ficaram
--   sem chamada: a função pegava o professor por `auth.uid()`, que é NULL quando
--   quem encerra é o sistema, e desistia.
--
-- Agora a aula da grade diz quando termina (`lives.termina_em`) e o `pg_cron`
-- vira as linhas a cada minuto (`virar_aulas_da_grade()`): abre na hora marcada,
-- encerra no fim ou quando a próxima aula do mesmo sinal começa. Encerrar já
-- dispara a chamada (gatilho `trg_lives_chamada_ao_encerrar`), então cada aula
-- ganha a sua, com os 60% medidos sobre o tempo DELA no ar.
--
-- Aula sem `termina_em` (a que o professor cria na tela) não muda nada: abre e
-- encerra pelo botão do estúdio, como antes.

-- ── 1. Fim da aula ────────────────────────────────────────────────────────
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS termina_em timestamptz;

ALTER TABLE public.lives
  DROP CONSTRAINT IF EXISTS lives_termina_depois_de_comecar;
ALTER TABLE public.lives
  ADD CONSTRAINT lives_termina_depois_de_comecar
  CHECK (termina_em IS NULL OR (start_time IS NOT NULL AND termina_em > start_time));

COMMENT ON COLUMN public.lives.termina_em IS
  'Fim da aula na grade. Preenchido = o sistema abre na hora (se tiver vídeo do YouTube) e encerra no fim. NULL = aula aberta e encerrada pelo professor.';

-- ── 1b. Aula de ensaio ────────────────────────────────────────────────────
-- Em 24/10, entre 8h03 e 8h17, cada aluno recebeu de 6 a 8 notificações: aulas
-- de teste ("enem", "Etec") criadas na produção para as turmas de verdade
-- avisaram "Nova live" e "Ao vivo agora", e o script da grade, rodado duas
-- vezes, apagou e recriou as aulas (novo "5 aulas marcadas"). Aula de ensaio
-- (`ensaio = true`) nasce já marcada como avisada — o cron e a tela pulam —, o
-- aluno não a vê (policy de leitura, migration seguinte) e ela não gera chamada.
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS ensaio boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.lives.ensaio IS
  'Aula de teste: só a equipe vê, não avisa ninguém e não gera chamada.';

CREATE OR REPLACE FUNCTION public.lives_ensaio_sem_aviso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NEW.ensaio THEN
    NEW.avisado_agendada_em := coalesce(NEW.avisado_agendada_em, now());
    NEW.avisado_ao_vivo_em  := coalesce(NEW.avisado_ao_vivo_em, now());
    NEW.avisado_sem_link_em := coalesce(NEW.avisado_sem_link_em, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lives_ensaio_sem_aviso ON public.lives;
CREATE TRIGGER trg_lives_ensaio_sem_aviso
  BEFORE INSERT OR UPDATE OF ensaio ON public.lives
  FOR EACH ROW EXECUTE FUNCTION public.lives_ensaio_sem_aviso();

-- ── 2. Chamada sem professor com conta ───────────────────────────────────
-- Sem isto, a aula da Prô Jota (sem login) nunca tem chamada quando é o
-- sistema que encerra. A chamada fica sem dono; `teacher_name` guarda o nome, e
-- as policies de class_sessions já deixam admin/staff editar.
ALTER TABLE public.class_sessions
  ALTER COLUMN teacher_id DROP NOT NULL;

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
  IF NOT FOUND OR v_live.ensaio THEN RETURN NULL; END IF;
  v_dur := public.duracao_da_live(v_live);
  IF v_dur < 600 THEN RETURN NULL; END IF;
  v_min := ceil(v_dur * 0.6);
  SELECT cs.id INTO v_sessao FROM public.class_sessions cs
  WHERE cs.live_id = p_live_id AND cs.session_type = 'live'
  ORDER BY cs.created_at LIMIT 1;
  IF v_sessao IS NULL THEN
    -- Professor da aula; senão quem encerrou; senão ninguém (encerrada pelo
    -- `pg_cron`, aula de professor sem conta). Antes, "ninguém" = sem chamada.
    v_prof := (SELECT u.id FROM auth.users u WHERE u.id = v_live.teacher_id);
    v_prof := coalesce(v_prof, auth.uid());
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

-- ── 3. O relógio da grade ─────────────────────────────────────────────────
-- "Mesmo sinal" = mesmo `youtube_id`. Uma aula está VENCIDA quando passou do
-- `termina_em` ou quando a aula seguinte do mesmo sinal já começou (grade com
-- horário sobreposto não deixa duas aulas no ar no mesmo vídeo).
--
-- Ordem: encerra primeiro, abre depois. Encerrar dispara a chamada; abrir
-- dispara o cronômetro (`trg_lives_cronometro`) — nenhum dos dois muda aqui.
--
-- Aviso de "ao vivo": só a PRIMEIRA aula do sinal toca o celular. A seguinte
-- abre com `avisado_ao_vivo_em` já marcado, porque o aluno já está na sala (que
-- passa sozinha para a próxima aula) — seis toques por manhã seria spam.
CREATE OR REPLACE FUNCTION public.virar_aulas_da_grade()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_encerradas integer;
  v_abertas    integer;
BEGIN
  -- Agendada vencida também fecha: é aula que passou sem abrir (cron parado,
  -- aula só pelo Meet que ninguém abriu). Com 0 s no ar, não gera chamada.
  WITH vencidas AS (
    SELECT l.id FROM public.lives l
    WHERE l.status IN ('live', 'scheduled')
      AND l.termina_em IS NOT NULL
      AND (l.termina_em <= now()
           OR EXISTS (SELECT 1 FROM public.lives s
                      WHERE s.youtube_id = l.youtube_id
                        AND s.id <> l.id
                        AND s.termina_em IS NOT NULL
                        AND s.start_time > l.start_time
                        AND s.start_time <= now()))
  )
  UPDATE public.lives l SET status = 'completed'
  FROM vencidas v WHERE l.id = v.id;
  GET DIAGNOSTICS v_encerradas = ROW_COUNT;

  WITH na_hora AS (
    SELECT l.id,
           EXISTS (SELECT 1 FROM public.lives p
                   WHERE p.youtube_id = l.youtube_id
                     AND p.id <> l.id
                     AND p.start_time < l.start_time
                     AND p.start_time > l.start_time - interval '12 hours'
                     AND p.avisado_ao_vivo_em IS NOT NULL) AS sinal_ja_avisado
    FROM public.lives l
    WHERE l.status = 'scheduled'
      AND l.termina_em IS NOT NULL
      AND l.youtube_id IS NOT NULL
      AND l.start_time <= now()
      AND l.termina_em > now()
      -- Cron parado e duas aulas do sinal atrasadas: abre só a mais recente.
      AND NOT EXISTS (SELECT 1 FROM public.lives s
                      WHERE s.youtube_id = l.youtube_id
                        AND s.id <> l.id
                        AND s.termina_em IS NOT NULL
                        AND s.start_time > l.start_time
                        AND s.start_time <= now())
  )
  UPDATE public.lives l
  SET status = 'live',
      avisado_ao_vivo_em = CASE WHEN h.sinal_ja_avisado
                                THEN coalesce(l.avisado_ao_vivo_em, now())
                                ELSE l.avisado_ao_vivo_em END
  FROM na_hora h WHERE l.id = h.id;
  GET DIAGNOSTICS v_abertas = ROW_COUNT;

  RETURN jsonb_build_object('encerradas', v_encerradas, 'abertas', v_abertas);
END;
$$;

REVOKE ALL ON FUNCTION public.virar_aulas_da_grade() FROM public, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_lives_youtube_id_start_time
  ON public.lives (youtube_id, start_time)
  WHERE youtube_id IS NOT NULL;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'virar-aulas-da-grade';
SELECT cron.schedule('virar-aulas-da-grade', '* * * * *', 'SELECT public.virar_aulas_da_grade();');

-- ── 4. A grade de 24/10, que ficou presa ──────────────────────────────────
-- As duas aulas abertas às 8h16 seguem "no ar" (o cronômetro passa de 50 h) e
-- as outras dez, "agendadas". Fecha tudo sem gerar chamada: o tempo de cada
-- aluno ficou somado na primeira aula, inflado pelas abas abertas depois do
-- fim, e não há como separar por aula. Chamada de 24/10, se houver, é decisão
-- da secretaria. O cronômetro para no fim da grade (12h15).
-- Sem as linhas (banco novo), nada acontece.
ALTER TABLE public.lives DISABLE TRIGGER trg_lives_cronometro;
ALTER TABLE public.lives DISABLE TRIGGER trg_lives_chamada_ao_encerrar;

UPDATE public.lives
SET status = 'completed',
    segundos_no_ar = segundos_no_ar
      + greatest(0, floor(extract(epoch FROM timestamptz '2026-10-24 15:15:00+00' - no_ar_desde)))::int,
    no_ar_desde = NULL
WHERE status = 'live'
  AND no_ar_desde IS NOT NULL
  AND id IN ('0914fbf9-1819-424e-93af-bbdacf2ddcc2', '34ecd957-eb6e-4c45-9834-10b7395f1e6e');

UPDATE public.lives
SET status = 'completed'
WHERE status = 'scheduled'
  AND start_time >= timestamptz '2026-10-24 11:00:00+00'
  AND start_time <  timestamptz '2026-10-24 15:00:00+00'
  AND youtube_id IN ('aruuw4-9hIs', 'xFe2orDQry0');

ALTER TABLE public.lives ENABLE TRIGGER trg_lives_cronometro;
ALTER TABLE public.lives ENABLE TRIGGER trg_lives_chamada_ao_encerrar;
