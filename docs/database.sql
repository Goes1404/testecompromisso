
-- COMPROMISSO | SMART EDUCATION - SQL DATABASE MIGRATION
-- Versão: 2.1.0 (Industrial Master)

-- 1. EXTENSÕES E CONFIGURAÇÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PERFIS DE USUÁRIOS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  profile_type TEXT DEFAULT 'student', -- student, teacher, admin, etec, uni
  institution TEXT,
  course TEXT,
  interests TEXT,
  is_financial_aid_eligible BOOLEAN DEFAULT false,
  last_access TIMESTAMPTZ DEFAULT now()
);

-- 3. TRILHAS E CONTEÚDO PEDAGÓGICO
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
  target_audience TEXT DEFAULT 'all',
  average_rating NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.learning_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- video, pdf, quiz, text
  url TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0
);

-- 4. COMUNIDADE (FÓRUM)
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

-- 5. BIBLIOTECA DIGITAL
CREATE TABLE IF NOT EXISTS public.library_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  category TEXT,
  type TEXT,
  url TEXT,
  image_url TEXT,
  description TEXT
);

-- 6. TRANSMISSÕES AO VIVO (LIVES)
CREATE TABLE IF NOT EXISTS public.lives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  teacher_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, finished
  youtube_id TEXT
);

CREATE TABLE IF NOT EXISTS public.live_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  live_id UUID REFERENCES public.lives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  content TEXT NOT NULL,
  is_question BOOLEAN DEFAULT false,
  is_answered BOOLEAN DEFAULT false
);

-- 7. MENSAGENS DIRETAS (CHAT PRIVADO)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false
);

-- 8. PROGRESSO DO ESTUDANTE
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
  percentage INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, trail_id)
);

-- 9. POLÍTICAS DE SEGURANÇA (RLS) - ACESSO TOTAL PARA DEMO
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso profiles" ON public.profiles FOR ALL USING (true);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso trails" ON public.trails FOR ALL USING (true);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso modules" ON public.modules FOR ALL USING (true);

ALTER TABLE public.learning_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso contents" ON public.learning_contents FOR ALL USING (true);

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso forums" ON public.forums FOR ALL USING (true);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso forum_posts" ON public.forum_posts FOR ALL USING (true);

ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso lives" ON public.lives FOR ALL USING (true);

ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso live_messages" ON public.live_messages FOR ALL USING (true);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso direct_messages" ON public.direct_messages FOR ALL USING (true);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso user_progress" ON public.user_progress FOR ALL USING (true);

ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso library" ON public.library_resources FOR ALL USING (true);

-- 10. HABILITAR SUPABASE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lives;

-- 11. DADOS DE TESTE (POPULAR A REDE)
INSERT INTO public.profiles (id, name, email, profile_type, institution, last_access)
VALUES 
('00000000-0000-0000-0000-000000000001', 'Prof. Ricardo (Matemática)', 'ricardo@demo.com', 'teacher', 'ETEC Jorge Street', now()),
('00000000-0000-0000-0000-000000000002', 'Dra. Helena (Mentoria ETEC)', 'helena@demo.com', 'teacher', 'Polo Industrial ABC', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.library_resources (title, category, type, description) VALUES 
('Manual do Candidato ENEM 2024', 'Geral', 'PDF', 'Guia completo com das e regras oficiais.'),
('Fundamentos de Redação Nota 1000', 'Linguagens', 'E-book', 'Técnicas de argumentação e coesão.');
