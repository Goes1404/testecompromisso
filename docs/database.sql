
-- ==========================================================
-- SCRIPT DE CONFIGURAÇÃO INDUSTRIAL - COMPROMISSO | EDUCORI
-- Execute este script no SQL Editor do seu Supabase.
-- ==========================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS (PROFILES)
-- Garante que a tabela tenha todas as colunas pedagógicas e sociais
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'student';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_financial_aid_eligible BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ DEFAULT now();

-- 3. SEGURANÇA DE PERFIS (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Perfis visíveis por todos" ON profiles;
CREATE POLICY "Perfis visíveis por todos" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Usuários editam próprio perfil" ON profiles;
CREATE POLICY "Usuários editam próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 4. ESTRUTURA DE TRILHAS E CONTEÚDO
CREATE TABLE IF NOT EXISTS trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  description TEXT,
  teacher_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  status TEXT DEFAULT 'draft', -- draft, review, active
  image_url TEXT,
  target_audience TEXT DEFAULT 'all'
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS learning_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- video, pdf, quiz, text
  url TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0
);

-- 5. MENSAGENS DIRETAS (CHAT PRIVADO)
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver mensagens próprias" ON direct_messages;
CREATE POLICY "Ver mensagens próprias" ON direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Enviar mensagens" ON direct_messages;
CREATE POLICY "Enviar mensagens" ON direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 6. COMUNIDADE (FÓRUM)
CREATE TABLE IF NOT EXISTS forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Dúvidas',
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL
);

-- 7. PROGRESSO E BIBLIOTECA
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  percentage INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, trail_id)
);

CREATE TABLE IF NOT EXISTS library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  category TEXT,
  type TEXT,
  url TEXT,
  image_url TEXT,
  description TEXT
);

-- 8. LIVES
CREATE TABLE IF NOT EXISTS lives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  teacher_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  status TEXT DEFAULT 'scheduled',
  youtube_id TEXT
);

CREATE TABLE IF NOT EXISTS live_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  live_id UUID REFERENCES lives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  content TEXT NOT NULL,
  is_question BOOLEAN DEFAULT false,
  is_answered BOOLEAN DEFAULT false
);

-- 9. HABILITAR REALTIME (MUITO IMPORTANTE)
-- Execute estas linhas separadamente se o comando falhar no bloco
-- ALTER publication supabase_realtime ADD TABLE direct_messages;
-- ALTER publication supabase_realtime ADD TABLE forum_posts;
-- ALTER publication supabase_realtime ADD TABLE live_messages;
-- ALTER publication supabase_realtime ADD TABLE lives;

-- 10. SEED DE MENTORES (DEMO)
-- Estes usuários aparecerão na sua lista de Mentoria imediatamente
INSERT INTO profiles (id, name, email, profile_type, institution, last_access)
VALUES 
('00000000-0000-0000-0000-000000000001', 'Prof. Ricardo (Matemática)', 'ricardo@demo.com', 'teacher', 'ETEC Jorge Street', now()),
('00000000-0000-0000-0000-000000000002', 'Dra. Helena (Mentoria ETEC)', 'helena@demo.com', 'teacher', 'Polo Industrial ABC', now()),
('00000000-0000-0000-0000-000000000003', 'Coord. Márcia (Gestão)', 'marcia@demo.com', 'admin', 'Secretaria de Educação', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO library_resources (title, category, type, description) VALUES 
('Guia de Isenção ENEM 2024', 'Geral', 'PDF', 'Documentação necessária para o pedido de isenção.'),
('Manual de Redação Nota 1000', 'Linguagens', 'E-book', 'Técnicas essenciais para o vestibular.');
