-- Chat ao vivo da aula, dentro da plataforma (13/10).
--
-- Por que um chat nosso e não o do YouTube: no navegador do celular o YouTube
-- não deixa embutir o chat dele, e a maioria dos alunos assiste pelo celular.
-- O aluno saía da plataforma para comentar e a presença parava de contar.
--
-- Decisões:
-- 1. LEITURA POR CONSULTA, NÃO POR REALTIME. O Realtime do plano grátis aguenta
--    200 conexões; um aulão tem centenas de alunos. A sala chama
--    `chat_da_live(live, desde)` a cada poucos segundos e recebe só o que mudou
--    desde a última versão — uma consulta indexada e pequena.
-- 2. `versao` vem de uma sequência e muda em TODA alteração (enviar, ocultar,
--    reexibir). É ela que faz a ocultação chegar a quem já tinha a mensagem na
--    tela: o aluno recebe a linha de novo, sem texto, e ela some.
-- 3. O aluno NÃO lê a tabela direto (sem policy de SELECT para ele). Tudo passa
--    pela função, que entrega a mensagem oculta sem texto. Com RLS escondendo a
--    linha, a mensagem ocultada nunca sairia da tela de quem já a tinha.
-- 4. O banco decide autor, nome, hora e "é da equipe" (gatilho). Do cliente só
--    vale `live_id` e `texto`.
-- 5. Aluno: só com a aula no ar, 1 mensagem a cada 10 s, até 300 caracteres,
--    150 por aula, e não pode estar silenciado. Equipe: sem limite.
-- 6. Moderação: a equipe oculta/reexibe mensagem e silencia/libera aluno na
--    aula. Nada é apagado por quem modera (fica o histórico para a
--    coordenação); só admin/staff apagam.

CREATE SEQUENCE IF NOT EXISTS public.live_chat_versao_seq;

CREATE TABLE IF NOT EXISTS public.live_chat (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  live_id     uuid        NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name   text        NOT NULL,
  equipe      boolean     NOT NULL DEFAULT false,
  texto       text        NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 300),
  oculta      boolean     NOT NULL DEFAULT false,
  oculta_por  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  oculta_em   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  versao      bigint      NOT NULL DEFAULT nextval('public.live_chat_versao_seq')
);

CREATE INDEX IF NOT EXISTS idx_live_chat_live_versao ON public.live_chat (live_id, versao);
CREATE INDEX IF NOT EXISTS idx_live_chat_live_autor  ON public.live_chat (live_id, user_id, created_at);

CREATE TABLE IF NOT EXISTS public.live_chat_silenciados (
  live_id         uuid        NOT NULL REFERENCES public.lives(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  silenciado_por  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  silenciado_em   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (live_id, user_id)
);

-- ── papel ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.eh_equipe_da_live()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid()
                   AND p.role::text IN ('admin', 'staff', 'teacher'));
$$;

-- ── enviar ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.live_chat_ao_inserir()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_equipe boolean;
  v_nome   text;
  v_live   public.lives;
BEGIN
  IF v_uid IS NULL THEN
    IF nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' = 'service_role' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sem sessão.' USING ERRCODE = '28000';
  END IF;

  SELECT p.role::text IN ('admin', 'staff', 'teacher'),
         coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.name), ''), 'Aluno')
    INTO v_equipe, v_nome
  FROM public.profiles p WHERE p.id = v_uid;

  SELECT * INTO v_live FROM public.lives WHERE id = NEW.live_id;
  IF NOT FOUND OR NOT public.pode_ver_live(v_live.turmas) THEN
    RAISE EXCEPTION 'Aula não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  NEW.user_id    := v_uid;
  NEW.user_name  := left(coalesce(v_nome, 'Aluno'), 120);
  NEW.equipe     := coalesce(v_equipe, false);
  NEW.texto      := btrim(NEW.texto);
  NEW.oculta     := false;
  NEW.oculta_por := NULL;
  NEW.oculta_em  := NULL;
  NEW.created_at := now();
  NEW.versao     := nextval('public.live_chat_versao_seq');

  IF NOT NEW.equipe THEN
    IF v_live.status IS DISTINCT FROM 'live' THEN
      RAISE EXCEPTION 'O chat abre quando a aula estiver no ar.' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.live_chat_silenciados s
               WHERE s.live_id = NEW.live_id AND s.user_id = v_uid) THEN
      RAISE EXCEPTION 'O professor pausou suas mensagens nesta aula.' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.live_chat m
               WHERE m.live_id = NEW.live_id AND m.user_id = v_uid
                 AND m.created_at > now() - interval '10 seconds') THEN
      RAISE EXCEPTION 'Espere alguns segundos antes de mandar outra mensagem.' USING ERRCODE = 'P0001';
    END IF;
    IF (SELECT count(*) FROM public.live_chat m
        WHERE m.live_id = NEW.live_id AND m.user_id = v_uid) >= 150 THEN
      RAISE EXCEPTION 'Você chegou ao limite de mensagens desta aula.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_chat_ao_inserir ON public.live_chat;
CREATE TRIGGER trg_live_chat_ao_inserir
  BEFORE INSERT ON public.live_chat
  FOR EACH ROW EXECUTE FUNCTION public.live_chat_ao_inserir();

-- ── moderar: só `oculta` muda, e toda mudança ganha versão nova ──────────
CREATE OR REPLACE FUNCTION public.live_chat_ao_atualizar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.id         := OLD.id;
  NEW.live_id    := OLD.live_id;
  NEW.user_id    := OLD.user_id;
  NEW.user_name  := OLD.user_name;
  NEW.equipe     := OLD.equipe;
  NEW.texto      := OLD.texto;
  NEW.created_at := OLD.created_at;
  IF NEW.oculta IS DISTINCT FROM OLD.oculta THEN
    NEW.oculta_por := CASE WHEN NEW.oculta THEN auth.uid() END;
    NEW.oculta_em  := CASE WHEN NEW.oculta THEN now() END;
  ELSE
    NEW.oculta_por := OLD.oculta_por;
    NEW.oculta_em  := OLD.oculta_em;
  END IF;
  NEW.versao := nextval('public.live_chat_versao_seq');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_chat_ao_atualizar ON public.live_chat;
CREATE TRIGGER trg_live_chat_ao_atualizar
  BEFORE UPDATE ON public.live_chat
  FOR EACH ROW EXECUTE FUNCTION public.live_chat_ao_atualizar();

-- ── ler: só o que mudou desde `p_desde` ──────────────────────────────────
-- Primeira leitura (p_desde = 0): as últimas 80 mensagens. Depois: tudo com
-- versão maior, até 200 por chamada. Oculta vai sem texto para quem não é da
-- equipe (é o "apague da sua tela").
CREATE OR REPLACE FUNCTION public.chat_da_live(p_live uuid, p_desde bigint DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
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
      ELSE '[]'::jsonb END
  );
END;
$$;

-- ── policies ─────────────────────────────────────────────────────────────
ALTER TABLE public.live_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_silenciados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipe le o chat" ON public.live_chat;
DROP POLICY IF EXISTS "Logado manda mensagem no chat" ON public.live_chat;
DROP POLICY IF EXISTS "Equipe modera o chat" ON public.live_chat;
DROP POLICY IF EXISTS "Coordenacao apaga do chat" ON public.live_chat;

CREATE POLICY "Equipe le o chat" ON public.live_chat
  FOR SELECT TO authenticated USING (public.eh_equipe_da_live());
CREATE POLICY "Logado manda mensagem no chat" ON public.live_chat
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Equipe modera o chat" ON public.live_chat
  FOR UPDATE TO authenticated
  USING (public.eh_equipe_da_live()) WITH CHECK (public.eh_equipe_da_live());
CREATE POLICY "Coordenacao apaga do chat" ON public.live_chat
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'staff')));

DROP POLICY IF EXISTS "Equipe gerencia silenciados" ON public.live_chat_silenciados;
CREATE POLICY "Equipe gerencia silenciados" ON public.live_chat_silenciados
  FOR ALL TO authenticated
  USING (public.eh_equipe_da_live())
  WITH CHECK (public.eh_equipe_da_live() AND silenciado_por = auth.uid());

REVOKE ALL ON public.live_chat, public.live_chat_silenciados FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.live_chat, public.live_chat_silenciados FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_chat, public.live_chat_silenciados TO authenticated;
GRANT USAGE ON SEQUENCE public.live_chat_versao_seq TO authenticated;

REVOKE ALL ON FUNCTION public.live_chat_ao_inserir()   FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_chat_ao_atualizar() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.chat_da_live(uuid, bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chat_da_live(uuid, bigint) TO authenticated;
REVOKE ALL ON FUNCTION public.eh_equipe_da_live() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.eh_equipe_da_live() TO authenticated;
