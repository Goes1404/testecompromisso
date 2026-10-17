-- Chat da aula: mensagem fixada e reações rápidas (17/10).
--
-- Fixada: a equipe prende uma mensagem no topo do chat ("Questão 3 da
-- lista"). Guardada em `lives.chat_fixado` (cópia do texto, autor e hora), e
-- não como marca na mensagem: assim ela chega ao aluno junto com o resto da
-- resposta do `chat_da_live`, sem consulta nova.
--
-- Reações (👍 ❤️ 😂 🔥 👏): sobem flutuando no chat de todo mundo, como no
-- YouTube, para o aluno concordar sem mandar "kkkk" ou "sim" — mensagem curta
-- que só enche o chat. Vão para `live_reacoes` por `reagir_na_live()` (uma a
-- cada 2 s por aluno; o excesso é ignorado em silêncio) e voltam no
-- `chat_da_live` como "as dos últimos 15 s": o aluno anima só as que ainda não
-- viu (pelo id). Sem Realtime, pelo mesmo motivo do chat (200 conexões).
--
-- `chat_da_live` devolve JSON: as chaves novas ("fixada", "reacoes") não
-- quebram o app que ainda não as conhece.

ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS chat_fixado jsonb;

CREATE TABLE IF NOT EXISTS public.live_reacoes (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  live_id    uuid NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '🔥', '👏')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_reacoes_live_id_idx ON public.live_reacoes (live_id, id DESC);
CREATE INDEX IF NOT EXISTS live_reacoes_user_idx ON public.live_reacoes (user_id, live_id, created_at DESC);
-- Ninguém lê nem grava direto: só pelas funções abaixo.
ALTER TABLE public.live_reacoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reagir_na_live(p_live uuid, p_emoji text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_live public.lives;
  v_id   bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem sessão.' USING ERRCODE = '28000';
  END IF;
  IF p_emoji NOT IN ('👍', '❤️', '😂', '🔥', '👏') THEN
    RAISE EXCEPTION 'Reação inválida.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_live FROM public.lives WHERE id = p_live;
  IF NOT FOUND OR NOT public.pode_ver_live(v_live.turmas) THEN
    RAISE EXCEPTION 'Aula não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  IF v_live.status IS DISTINCT FROM 'live' THEN
    RETURN NULL;
  END IF;
  -- Uma a cada 2 s: dedo segurando o botão não vira enxurrada no banco.
  IF EXISTS (SELECT 1 FROM public.live_reacoes r
             WHERE r.user_id = v_uid AND r.live_id = p_live
               AND r.created_at > now() - interval '2 seconds') THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.live_reacoes (live_id, user_id, emoji)
  VALUES (p_live, v_uid, p_emoji)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reagir_na_live(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reagir_na_live(uuid, text) TO authenticated;

-- Fixar (ou soltar, com p_mensagem nulo) uma mensagem no topo. Só a equipe.
CREATE OR REPLACE FUNCTION public.fixar_no_chat(p_live uuid, p_mensagem bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_fixado jsonb;
BEGIN
  IF NOT public.eh_equipe_da_live() THEN
    RAISE EXCEPTION 'Só a equipe fixa mensagem.' USING ERRCODE = '42501';
  END IF;
  IF p_mensagem IS NOT NULL THEN
    SELECT jsonb_build_object('id', c.id, 'texto', c.texto, 'autor', c.user_name, 'equipe', c.equipe, 'em', now())
      INTO v_fixado
    FROM public.live_chat c
    WHERE c.id = p_mensagem AND c.live_id = p_live AND NOT c.oculta;
    IF v_fixado IS NULL THEN
      RAISE EXCEPTION 'Mensagem não encontrada.' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  UPDATE public.lives SET chat_fixado = v_fixado WHERE id = p_live;
  RETURN v_fixado;
END;
$$;
REVOKE ALL ON FUNCTION public.fixar_no_chat(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fixar_no_chat(uuid, bigint) TO authenticated;

-- Igual à versão de 20261015120000, mais "fixada" e "reacoes".
CREATE OR REPLACE FUNCTION public.chat_da_live(p_live uuid, p_desde bigint DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_equipe boolean := public.eh_equipe_da_live();
  v_live   public.lives;
  v_msgs   jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem sessão.' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO v_live FROM public.lives WHERE id = p_live;
  IF NOT FOUND OR NOT public.pode_ver_live(v_live.turmas) THEN
    RAISE EXCEPTION 'Aula não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(jsonb_agg(m ORDER BY m.versao), '[]'::jsonb) INTO v_msgs
  FROM (
    SELECT c.id, c.versao, c.user_id, c.user_name, c.equipe, c.oculta, c.created_at,
           CASE WHEN c.oculta AND NOT v_equipe THEN NULL ELSE c.texto END AS texto
    FROM public.live_chat c
    WHERE c.live_id = p_live
      AND c.versao > coalesce(p_desde, 0)
      AND (coalesce(p_desde, 0) > 0 OR NOT c.oculta OR v_equipe)
    ORDER BY c.versao DESC
    LIMIT CASE WHEN coalesce(p_desde, 0) = 0 THEN 80 ELSE 200 END
  ) m;

  RETURN jsonb_build_object(
    'mensagens', v_msgs,
    'status', v_live.status,
    'silenciado', EXISTS (SELECT 1 FROM public.live_chat_silenciados s
                          WHERE s.live_id = p_live AND s.user_id = v_uid),
    'silenciados', CASE WHEN v_equipe THEN
        (SELECT coalesce(jsonb_agg(s.user_id), '[]'::jsonb)
         FROM public.live_chat_silenciados s WHERE s.live_id = p_live)
      ELSE '[]'::jsonb END,
    'fixada', v_live.chat_fixado,
    'reacoes', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'emoji', r.emoji) ORDER BY r.id), '[]'::jsonb)
                FROM (SELECT r.id, r.emoji FROM public.live_reacoes r
                      WHERE r.live_id = p_live AND r.created_at > now() - interval '15 seconds'
                      ORDER BY r.id DESC LIMIT 40) r)
  );
END;
$function$;
