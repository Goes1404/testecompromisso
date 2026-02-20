
-- COMPROMISSO | SMART EDUCATION - SQL DATABASE MIGRATION
-- Versão: 2.2.0 (Fix: image_url & persistence)

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  profile_type TEXT DEFAULT 'student',
  institution TEXT,
  course TEXT,
  interests TEXT,
  is_financial_aid_eligible BOOLEAN DEFAULT false,
  last_access TIMESTAMPTZ DEFAULT now()
);

-- 3. TRILHAS (Garantindo image_url)
CREATE TABLE IF NOT EXISTS public.trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  description TEXT,
  teacher_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  status TEXT DEFAULT 'draft',
  image_url TEXT,
  target_audience TEXT DEFAULT 'all'
);

-- Adicionar colunas caso a tabela já existisse sem elas
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE public.trails ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- 4. MENSAGENS DIRETAS (Persistência Real)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false
);

-- 5. FÓRUM E COMUNIDADE
CREATE TABLE IF NOT EXISTS public.forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Dúvidas',
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL
);

-- 6. POLÍTICAS DE SEGURANÇA (RLS) - ACESSO SIMPLIFICADO PARA APRESENTAÇÃO
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total profiles" ON public.profiles FOR ALL USING (true);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total trails" ON public.trails FOR ALL USING (true);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total messages" ON public.direct_messages FOR ALL USING (true);

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total forums" ON public.forums FOR ALL USING (true);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total posts" ON public.forum_posts FOR ALL USING (true);

-- 7. HABILITAR REALTIME (Sincronização ao vivo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
