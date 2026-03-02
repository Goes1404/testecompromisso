
-- SCRIPT DE CONFIGURAÇÃO DO ECOSSISTEMA COMPROMISSO
-- Execute este script no SQL Editor do seu projeto Supabase.

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS DE GESTÃO
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  coordinator_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PERFIS DE USUÁRIOS (ESTENDIDO)
-- Se a tabela já existir, este comando apenas adiciona as colunas faltantes.
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id),
ADD COLUMN IF NOT EXISTS name_changes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT,
ADD COLUMN IF NOT EXISTS is_financial_aid_eligible BOOLEAN DEFAULT false;

-- 4. TRILHAS E CONTEÚDOS
CREATE TABLE IF NOT EXISTS trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  teacher_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  status TEXT DEFAULT 'draft', -- draft, review, published, inactive
  image_url TEXT,
  target_audience TEXT DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- video, quiz, pdf, text, file
  url TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PROGRESSO E CHECKLISTS
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  percentage INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, trail_id)
);

CREATE TABLE IF NOT EXISTS student_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, item_id)
);

-- 6. COMUNICAÇÃO E AUDITORIA
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users(id),
  receiver_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'low', -- low, medium, high
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. BIBLIOTECA E LIVES
CREATE TABLE IF NOT EXISTS library_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  type TEXT, -- PDF, Video, Artigo, E-book
  url TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS lives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  meet_link TEXT,
  teacher_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, finished
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. SISTEMA DE SIMULADOS
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array de objetos {letter, text}
  correct_answer TEXT NOT NULL,
  year INTEGER,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS simulation_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. FUNÇÕES RPC (MOTORES DE BUSCA)
CREATE OR REPLACE FUNCTION get_subjects_with_question_count()
RETURNS TABLE (
  id UUID,
  name TEXT,
  question_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, COUNT(q.id) as question_count
  FROM subjects s
  LEFT JOIN questions q ON s.id = q.subject_id
  GROUP BY s.id, s.name
  ORDER BY s.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_random_questions_for_subject(p_subject_id UUID, p_limit INTEGER)
RETURNS SETOF questions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM questions
  WHERE subject_id = p_subject_id
  ORDER BY random()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. POLÍTICAS DE ACESSO TOTAL (MODO DEMO)
-- Nota: Em produção real, estas regras devem ser restritas.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Profiles" ON profiles FOR ALL USING (true);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Classes" ON classes FOR ALL USING (true);

ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Trails" ON trails FOR ALL USING (true);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Modules" ON modules FOR ALL USING (true);

ALTER TABLE learning_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Contents" ON learning_contents FOR ALL USING (true);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Progress" ON user_progress FOR ALL USING (true);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Logs" ON activity_logs FOR ALL USING (true);

-- 11. DADOS INICIAIS (SUBJECTS)
INSERT INTO subjects (name) VALUES 
('Matemática'), ('Física'), ('Química'), ('Biologia'), 
('Linguagens'), ('História'), ('Geografia'), ('Redação')
ON CONFLICT DO NOTHING;
