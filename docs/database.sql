
-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS (PROFILES) - Já deve existir, vamos garantir as colunas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'student';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_financial_aid_eligible BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ DEFAULT now();

-- 3. ESTRUTURA DE TRILHAS E CONTEÚDO PEDAGÓGICO
CREATE TABLE IF NOT EXISTS trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS learning_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- video, pdf, quiz, text
  url TEXT,
  description TEXT,
  order_index INTEGER DEFAULT 0
);

-- 4. COMUNIDADE (FÓRUM)
CREATE TABLE IF NOT EXISTS forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Dúvidas',
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL
);

-- 5. BIBLIOTECA DIGITAL
CREATE TABLE IF NOT EXISTS library_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  category TEXT,
  type TEXT, -- PDF, Video, E-book
  url TEXT,
  image_url TEXT,
  description TEXT
);

-- 6. TRANSMISSÕES AO VIVO (LIVES)
CREATE TABLE IF NOT EXISTS lives (
  id PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  teacher_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, finished
  youtube_id TEXT
);

CREATE TABLE IF NOT EXISTS live_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT now(),
  live_id UUID REFERENCES lives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  content TEXT NOT NULL,
  is_question BOOLEAN DEFAULT false,
  is_answered BOOLEAN DEFAULT false
);

-- 7. PROGRESSO DO ALUNO
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES trails(id) ON DELETE CASCADE,
  percentage INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, trail_id)
);

-- 8. POLÍTICAS DE ACESSO (RLS) - Simplificado para demonstração
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público trails" ON trails FOR SELECT USING (true);
CREATE POLICY "Professores editam trails" ON trails FOR ALL USING (true);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público módulos" ON modules FOR SELECT USING (true);
CREATE POLICY "Professores editam módulos" ON modules FOR ALL USING (true);

ALTER TABLE learning_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público conteúdos" ON learning_contents FOR SELECT USING (true);
CREATE POLICY "Professores editam conteúdos" ON learning_contents FOR ALL USING (true);

ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fórum" ON forums FOR ALL USING (true);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total posts" ON forum_posts FOR ALL USING (true);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem seu progresso" ON user_progress FOR ALL USING (true);

-- 9. SEED DE DADOS (OPCIONAL - BIBLIOTECA INICIAL)
INSERT INTO library_resources (title, category, type, description) VALUES 
('Manual do Candidato ENEM 2024', 'Geral', 'PDF', 'Guia completo com datas e regras.'),
('Fundamentos de Redação Nota 1000', 'Linguagens', 'E-book', 'Técnicas de argumentação e coesão.');
