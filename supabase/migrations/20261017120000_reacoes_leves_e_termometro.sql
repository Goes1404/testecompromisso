-- Reações mais leves, limpeza diária e termômetro da turma (17/10).
--
-- 1. Reação: uma a cada 5 s por aluno (era 2 s). Com ~1.000 alunos no aulão e
--    o banco no menor tamanho, 2 s permitia centenas de gravações por segundo.
--    O app também segura o envio na mesma janela (`INTERVALO_DA_REACAO_MS`),
--    então o pedido nem sai do celular.
-- 2. Limpeza: a reação só serve por 15 s (é o que o `chat_da_live` devolve);
--    `limpar_reacoes_antigas()` apaga as de mais de 1 dia, todo dia às 4h.
-- 3. Termômetro: para o estúdio, quantos alunos estão com a sala aberta agora
--    (sinal de presença nos últimos 150 s; o sinal vem a cada 60 s), quantas
--    reações chegaram no último minuto e quantas mensagens nos últimos 5. Só
--    a equipe.

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
  IF EXISTS (SELECT 1 FROM public.live_reacoes r
             WHERE r.user_id = v_uid AND r.live_id = p_live
               AND r.created_at > now() - interval '5 seconds') THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.live_reacoes (live_id, user_id, emoji)
  VALUES (p_live, v_uid, p_emoji)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.limpar_reacoes_antigas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.live_reacoes WHERE created_at < now() - interval '1 day';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.limpar_reacoes_antigas() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.termometro_da_live(p_live uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_live public.lives;
BEGIN
  IF NOT public.eh_equipe_da_live() THEN
    RAISE EXCEPTION 'Só a equipe vê o termômetro.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_live FROM public.lives WHERE id = p_live;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aula não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object(
    'na_sala', (SELECT count(*) FROM public.live_presencas lp
                WHERE lp.live_id = p_live AND lp.ultima_vez > now() - interval '150 seconds'),
    'passaram', (SELECT count(*) FROM public.live_presencas lp WHERE lp.live_id = p_live),
    'esperados', (SELECT count(*) FROM public.alunos_esperados_da_live(v_live.turmas)),
    'reacoes_minuto', (SELECT coalesce(jsonb_object_agg(x.emoji, x.n), '{}'::jsonb)
                       FROM (SELECT r.emoji, count(*) AS n FROM public.live_reacoes r
                             WHERE r.live_id = p_live AND r.created_at > now() - interval '60 seconds'
                             GROUP BY r.emoji) x),
    'mensagens_5min', (SELECT count(*) FROM public.live_chat c
                       WHERE c.live_id = p_live AND NOT c.equipe AND c.created_at > now() - interval '5 minutes')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.termometro_da_live(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.termometro_da_live(uuid) TO authenticated;

-- Job diário (4h de Brasília = 7h UTC):
--   SELECT cron.schedule('limpar-reacoes', '0 7 * * *', 'SELECT public.limpar_reacoes_antigas();');
