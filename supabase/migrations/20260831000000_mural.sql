-- Mural: anúncios e pedidos de trabalho.
--
-- Hoje o professor manda a atividade do sábado no WhatsApp da turma. Quem entrou
-- depois não acha, quem apagou a conversa perdeu, e o enunciado com seis questões
-- chega picotado em três mensagens. `announcements` não resolve: ela é um recado
-- curto (título + mensagem + prioridade), sem lista de questões, sem prazo de
-- entrega, sem cartaz. Daí uma tabela própria em vez de mais colunas lá.
--
-- Duas decisões moldam o desenho:
--
-- 1. **Um tipo de linha, dois tipos de card.** `anuncio` (campanha, cartaz,
--    recado) e `trabalho` (pesquisa/atividade com prazo) dividem autor, imagem e
--    destaque; só mudam a ênfase na tela. Duas tabelas dariam duas telas, duas
--    policies e dois lugares para esquecer de filtrar por `ativo`.
--
-- 2. **As questões são uma lista, não um parágrafo.** `questoes` é JSONB de
--    strings porque o aluno responde item a item — e é o que permite marcar
--    progresso por questão na tela sem parsear texto solto atrás de "1." e "2.".
--
-- O aluno não entrega arquivo aqui: a entrega é presencial, no sábado. O que a
-- plataforma guarda é só o "já fiz" (`mural_conclusoes`), para o aluno se
-- organizar e o professor ver quantos vão chegar com a pesquisa pronta.

CREATE TABLE IF NOT EXISTS public.mural_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT NOT NULL DEFAULT 'anuncio' CHECK (tipo IN ('anuncio', 'trabalho')),
  titulo      TEXT NOT NULL CHECK (length(btrim(titulo)) BETWEEN 3 AND 160),
  tema        TEXT,
  descricao   TEXT NOT NULL CHECK (length(btrim(descricao)) >= 3),
  questoes    JSONB NOT NULL DEFAULT '[]'::jsonb,
  instrucoes  TEXT,
  entrega_em  DATE,
  imagem_url  TEXT,
  destaque    BOOLEAN NOT NULL DEFAULT false,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  autor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mural_posts_questoes_e_lista CHECK (jsonb_typeof(questoes) = 'array')
);

COMMENT ON TABLE public.mural_posts IS
  'Mural da escola: anuncios (cartazes, campanhas) e pedidos de trabalho (atividades com prazo). Publica professor/secretaria/admin; le a escola inteira.';
COMMENT ON COLUMN public.mural_posts.questoes IS
  'Lista JSONB de enunciados. Vazia em anuncio; e o corpo do pedido de trabalho.';
COMMENT ON COLUMN public.mural_posts.entrega_em IS
  'Data de entrega presencial. NULL em anuncio. Depois dela o card marca "prazo encerrado" mas NAO some — o aluno atrasado ainda precisa ler o enunciado.';
COMMENT ON COLUMN public.mural_posts.autor_nome IS
  'Nome congelado na publicacao: o card continua assinado se o professor sair da escola.';

CREATE INDEX IF NOT EXISTS mural_posts_vitrine_idx
  ON public.mural_posts (ativo, destaque DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS mural_posts_autor_idx ON public.mural_posts (autor_id);

-- ── "Já fiz" do aluno ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mural_conclusoes (
  post_id      UUID NOT NULL REFERENCES public.mural_posts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concluido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

COMMENT ON TABLE public.mural_conclusoes IS
  'Aluno marcou que fez o trabalho. Autodeclaracao, nao entrega: a correcao acontece na aula presencial.';

CREATE INDEX IF NOT EXISTS mural_conclusoes_post_idx ON public.mural_conclusoes (post_id);

-- ── updated_at ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mural_posts_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mural_posts_touch ON public.mural_posts;
CREATE TRIGGER trg_mural_posts_touch
  BEFORE UPDATE ON public.mural_posts
  FOR EACH ROW EXECUTE FUNCTION public.mural_posts_touch();

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Papel sai SEMPRE de `profiles.role`, nunca de `auth.jwt()->>'user_role'`:
-- este projeto nao tem custom access token hook, entao aquele claim e `null`
-- para todo mundo e a policy negaria em silencio.
ALTER TABLE public.mural_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_conclusoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pode_publicar_no_mural()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('teacher', 'admin', 'staff')
  );
$$;

REVOKE ALL ON FUNCTION public.pode_publicar_no_mural() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_publicar_no_mural() TO authenticated;

-- Aluno ve o que esta no ar; quem publica ve tambem os arquivados, para
-- reaproveitar o enunciado na turma seguinte sem redigitar.
DROP POLICY IF EXISTS mural_posts_select ON public.mural_posts;
CREATE POLICY mural_posts_select ON public.mural_posts
  FOR SELECT TO authenticated
  USING (ativo OR autor_id = auth.uid() OR public.pode_publicar_no_mural());

DROP POLICY IF EXISTS mural_posts_insert ON public.mural_posts;
CREATE POLICY mural_posts_insert ON public.mural_posts
  FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND public.pode_publicar_no_mural());

-- Professor mexe no que publicou; admin e secretaria moderam tudo — precisa
-- existir alguem capaz de tirar do ar um cartaz errado fora do horario de quem
-- postou.
DROP POLICY IF EXISTS mural_posts_update ON public.mural_posts;
CREATE POLICY mural_posts_update ON public.mural_posts
  FOR UPDATE TO authenticated
  USING (
    autor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin', 'staff'))
  )
  WITH CHECK (
    autor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS mural_posts_delete ON public.mural_posts;
CREATE POLICY mural_posts_delete ON public.mural_posts
  FOR DELETE TO authenticated
  USING (
    autor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin', 'staff'))
  );

-- O aluno so escreve o proprio "ja fiz". Professor/secretaria/admin leem todos
-- para saber quantos chegam com a pesquisa pronta.
DROP POLICY IF EXISTS mural_conclusoes_select ON public.mural_conclusoes;
CREATE POLICY mural_conclusoes_select ON public.mural_conclusoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.pode_publicar_no_mural());

DROP POLICY IF EXISTS mural_conclusoes_insert ON public.mural_conclusoes;
CREATE POLICY mural_conclusoes_insert ON public.mural_conclusoes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS mural_conclusoes_delete ON public.mural_conclusoes;
CREATE POLICY mural_conclusoes_delete ON public.mural_conclusoes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── Bucket das imagens (o cartaz que chega pronto) ─────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('mural', 'mural', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "mural_public_read" ON storage.objects;
CREATE POLICY "mural_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'mural');

DROP POLICY IF EXISTS "mural_staff_insert" ON storage.objects;
CREATE POLICY "mural_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mural' AND public.pode_publicar_no_mural());

DROP POLICY IF EXISTS "mural_staff_update" ON storage.objects;
CREATE POLICY "mural_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'mural' AND public.pode_publicar_no_mural());

DROP POLICY IF EXISTS "mural_staff_delete" ON storage.objects;
CREATE POLICY "mural_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'mural' AND public.pode_publicar_no_mural());
