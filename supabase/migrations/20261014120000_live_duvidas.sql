-- ============================================================
-- Dúvidas na sala da aula ao vivo (tabela `live_messages`, que já existia
-- vazia e sem uso).
--
-- Depende de `public.pode_ver_live()`, criada em 20261013120000 — aplicar
-- aquela primeiro.
--
-- Desenho: a dúvida vai para o PROFESSOR, não para a sala inteira. O aluno vê
-- as próprias dúvidas e a resposta delas; a equipe vê todas.
--   1. Escala. O Realtime do Supabase aguenta 200 conexões no Free e 500 no
--      Pro; o aulão tem ~855 alunos. Um chat aberto a todos precisaria
--      empurrar cada mensagem para cada aluno. Assim, só a equipe assina o
--      Realtime; o aluno consulta as próprias dúvidas de tempos em tempos.
--   2. Menores de idade. Mural aberto entre ~855 adolescentes durante a aula
--      é frente de bullying que a plataforma não precisa abrir.
--
-- O que estava errado na tabela e sai aqui:
--   - "Leitura pública chat live": SELECT `true` para `public` — qualquer um
--     com a chave anon (que está no navegador) lia tudo, sem login.
--   - `user_name` vinha do cliente: dava para mandar dúvida com o nome de
--     outra pessoa. Agora o banco preenche a partir de `profiles`.
--   - "Update moderador chat live" usava `auth.jwt()->>'user_role'`, que é
--     sempre NULL neste projeto (ver CLAUDE.md): professor não moderava nada.
-- ============================================================

ALTER TABLE public.live_messages
  ADD COLUMN IF NOT EXISTS resposta       text,
  ADD COLUMN IF NOT EXISTS respondida_em  timestamptz,
  ADD COLUMN IF NOT EXISTS respondida_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS oculta         boolean NOT NULL DEFAULT false;

-- A tabela está vazia em produção (13/10), então os CHECKs entram validados.
ALTER TABLE public.live_messages ALTER COLUMN live_id SET NOT NULL;
ALTER TABLE public.live_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.live_messages ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.live_messages DROP CONSTRAINT IF EXISTS live_messages_conteudo_check;
ALTER TABLE public.live_messages ADD CONSTRAINT live_messages_conteudo_check
  CHECK (char_length(btrim(content)) BETWEEN 1 AND 500);
ALTER TABLE public.live_messages DROP CONSTRAINT IF EXISTS live_messages_resposta_check;
ALTER TABLE public.live_messages ADD CONSTRAINT live_messages_resposta_check
  CHECK (resposta IS NULL OR char_length(btrim(resposta)) BETWEEN 1 AND 1000);

CREATE INDEX IF NOT EXISTS idx_live_messages_live_criada ON public.live_messages (live_id, created_at);
CREATE INDEX IF NOT EXISTS idx_live_messages_live_autor  ON public.live_messages (live_id, user_id);

-- ── Quem escreve, quando, e quanto ───────────────────────────────────────
-- Limites por aluno: uma dúvida a cada 20 s e 20 por aula. Um aulão com ~855
-- alunos sem limite vira enxurrada que o professor não consegue ler.
-- Constantes espelhadas em src/lib/lives.ts (INTERVALO_ENTRE_DUVIDAS_S,
-- MAXIMO_DE_DUVIDAS_POR_AULA).
CREATE OR REPLACE FUNCTION public.live_messages_ao_inserir()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_equipe boolean;
  v_live   public.lives;
  v_nome   text;
BEGIN
  -- service_role (scripts) passa sem as regras de aluno.
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

  -- O que vem do cliente e não vale: autor, nome, hora, estado de resposta.
  NEW.user_id        := v_uid;
  NEW.user_name      := left(coalesce(v_nome, 'Aluno'), 120);
  NEW.created_at     := now();
  NEW.content        := btrim(NEW.content);
  NEW.is_question    := NOT coalesce(v_equipe, false);
  NEW.is_answered    := false;
  NEW.resposta       := NULL;
  NEW.respondida_em  := NULL;
  NEW.respondida_por := NULL;
  NEW.oculta         := false;

  IF NOT coalesce(v_equipe, false) THEN
    IF v_live.status IS DISTINCT FROM 'live' THEN
      RAISE EXCEPTION 'As dúvidas abrem quando a aula estiver no ar.' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.live_messages m
               WHERE m.live_id = NEW.live_id AND m.user_id = v_uid
                 AND m.created_at > now() - interval '20 seconds') THEN
      RAISE EXCEPTION 'Espere alguns segundos antes de mandar outra dúvida.' USING ERRCODE = 'P0001';
    END IF;
    IF (SELECT count(*) FROM public.live_messages m
        WHERE m.live_id = NEW.live_id AND m.user_id = v_uid) >= 20 THEN
      RAISE EXCEPTION 'Você chegou ao limite de 20 dúvidas nesta aula.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_messages_ao_inserir ON public.live_messages;
CREATE TRIGGER trg_live_messages_ao_inserir
  BEFORE INSERT ON public.live_messages
  FOR EACH ROW EXECUTE FUNCTION public.live_messages_ao_inserir();

-- Quem atualiza é só a equipe (RLS). Mesmo ela não reescreve a pergunta do
-- aluno nem troca o autor: só responde, marca como respondida ou oculta.
CREATE OR REPLACE FUNCTION public.live_messages_ao_atualizar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.live_id     := OLD.live_id;
  NEW.user_id     := OLD.user_id;
  NEW.user_name   := OLD.user_name;
  NEW.content     := OLD.content;
  NEW.created_at  := OLD.created_at;
  NEW.is_question := OLD.is_question;
  NEW.resposta    := nullif(btrim(NEW.resposta), '');

  IF NEW.resposta IS NOT NULL THEN
    NEW.is_answered := true;
  END IF;

  IF NEW.is_answered AND NOT OLD.is_answered THEN
    NEW.respondida_em  := now();
    NEW.respondida_por := auth.uid();
  ELSIF NOT NEW.is_answered THEN
    NEW.respondida_em  := NULL;
    NEW.respondida_por := NULL;
  ELSE
    NEW.respondida_em  := OLD.respondida_em;
    NEW.respondida_por := coalesce(OLD.respondida_por, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_messages_ao_atualizar ON public.live_messages;
CREATE TRIGGER trg_live_messages_ao_atualizar
  BEFORE UPDATE ON public.live_messages
  FOR EACH ROW EXECUTE FUNCTION public.live_messages_ao_atualizar();

-- ── RLS ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Inserção autenticada chat live" ON public.live_messages;
DROP POLICY IF EXISTS "Leitura pública chat live" ON public.live_messages;
DROP POLICY IF EXISTS "Update moderador chat live" ON public.live_messages;
DROP POLICY IF EXISTS "open_select_for_authenticated_live_messages" ON public.live_messages;
DROP POLICY IF EXISTS "open_insert_for_authenticated_live_messages" ON public.live_messages;
DROP POLICY IF EXISTS "open_update_for_authenticated_live_messages" ON public.live_messages;
DROP POLICY IF EXISTS "open_delete_for_authenticated_live_messages" ON public.live_messages;
DROP POLICY IF EXISTS "Aluno ve as proprias duvidas, equipe ve todas" ON public.live_messages;
DROP POLICY IF EXISTS "Logado manda duvida" ON public.live_messages;
DROP POLICY IF EXISTS "Equipe responde e oculta duvidas" ON public.live_messages;
DROP POLICY IF EXISTS "Equipe apaga duvidas" ON public.live_messages;

CREATE POLICY "Aluno ve as proprias duvidas, equipe ve todas" ON public.live_messages
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND NOT oculta)
    OR EXISTS (SELECT 1 FROM public.profiles
               WHERE profiles.id = auth.uid()
                 AND profiles.role::text IN ('admin', 'staff', 'teacher')));

-- O gatilho acima já força user_id = auth.uid(); a policy confere de novo.
CREATE POLICY "Logado manda duvida" ON public.live_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Equipe responde e oculta duvidas" ON public.live_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
                 WHERE profiles.id = auth.uid()
                   AND profiles.role::text IN ('admin', 'staff', 'teacher')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles
                      WHERE profiles.id = auth.uid()
                        AND profiles.role::text IN ('admin', 'staff', 'teacher')));

-- Ocultar é o caminho normal (fica o registro, se a secretaria precisar).
-- Apagar fica só para admin/staff.
CREATE POLICY "Equipe apaga duvidas" ON public.live_messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
                 WHERE profiles.id = auth.uid()
                   AND profiles.role::text IN ('admin', 'staff')));

REVOKE ALL ON public.live_messages FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.live_messages FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_messages TO authenticated;
REVOKE ALL ON FUNCTION public.live_messages_ao_inserir()   FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_messages_ao_atualizar() FROM public, anon, authenticated;
