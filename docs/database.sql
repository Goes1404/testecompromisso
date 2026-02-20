
-- SCRIPT DE SINCRONIZAÇÃO COMPROMISSO | SMART EDUCATION
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS (PROFILES)
-- Garante que a tabela tenha todas as colunas de suporte e gestão
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  profile_type TEXT DEFAULT 'student', -- student, teacher, admin
  institution TEXT,
  course TEXT,
  interests TEXT,
  is_financial_aid_eligible BOOLEAN DEFAULT false,
  last_access TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HABILITAR SEGURANÇA (RLS) PARA PERFIS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE PERFIS (LIBERAR VISUALIZAÇÃO PARA REDE)
DROP POLICY IF EXISTS "Perfis visíveis por todos" ON profiles;
CREATE POLICY "Perfis visíveis por todos" ON profiles 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuário edita próprio perfil" ON profiles;
CREATE POLICY "Usuário edita próprio perfil" ON profiles 
FOR UPDATE USING (auth.uid() = id);

-- 5. TABELA DE MENSAGENS DIRETAS (CHAT PRIVADO)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver próprias mensagens" ON direct_messages;
CREATE POLICY "Ver próprias mensagens" ON direct_messages 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Enviar mensagens" ON direct_messages;
CREATE POLICY "Enviar mensagens" ON direct_messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 6. TABELAS DE FÓRUM (COMUNIDADE)
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
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL
);

ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total fórum" ON forums FOR ALL USING (true);
CREATE POLICY "Acesso total posts" ON forum_posts FOR ALL USING (true);

-- 7. ESTRUTURA DE TRILHAS E CONTEÚDO (PROFESSOR)
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

CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.learning_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0
);

ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público trails" ON trails FOR SELECT USING (true);
CREATE POLICY "Professores total trails" ON trails FOR ALL USING (true);
CREATE POLICY "Acesso público módulos" ON modules FOR SELECT USING (true);
CREATE POLICY "Professores total módulos" ON modules FOR ALL USING (true);
CREATE POLICY "Acesso público conteúdos" ON learning_contents FOR SELECT USING (true);
CREATE POLICY "Professores total conteúdos" ON learning_contents FOR ALL USING (true);

-- 8. TRANSMISSÕES AO VIVO
CREATE TABLE IF NOT EXISTS public.lives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  teacher_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  status TEXT DEFAULT 'scheduled',
  youtube_id TEXT
);

CREATE TABLE IF NOT EXISTS public.live_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  live_id UUID REFERENCES lives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  content TEXT NOT NULL,
  is_question BOOLEAN DEFAULT false,
  is_answered BOOLEAN DEFAULT false
);

ALTER TABLE lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público lives" ON lives FOR SELECT USING (true);
CREATE POLICY "Mentor total lives" ON lives FOR ALL USING (true);
CREATE POLICY "Chat público lives" ON live_messages FOR ALL USING (true);

-- 9. TABELA DE PROGRESSO DO ALUNO
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  percentage INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, trail_id)
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Progresso próprio" ON user_progress FOR ALL USING (auth.uid() = user_id);

-- 10. HABILITAR REALTIME (ATENÇÃO: Este comando pode variar por versão do Supabase)
-- Tente rodar individualmente se falhar em bloco
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE direct_messages, forum_posts, forums, user_progress, live_messages, lives;
COMMIT;

-- 11. SEED DE MENTORES DEMO (POPULAR A REDE)
INSERT INTO public.profiles (id, name, email, profile_type, institution, last_access)
VALUES 
('00000000-0000-0000-0000-000000000001', 'Prof. Ricardo (Matemática)', 'ricardo@demo.com', 'teacher', 'ETEC Jorge Street', now()),
('00000000-0000-0000-0000-000000000002', 'Dra. Helena (Mentora ETEC)', 'helena@demo.com', 'teacher', 'Polo Industrial ABC', now())
ON CONFLICT (id) DO NOTHING;
