
-- SCRIPT DE INFRAESTRUTURA COMPROMISSO SMART EDUCATION
-- Versão: 2.1.0 (Industrial)

-- 1. TABELA DE PERFIS (Extensão do Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    username TEXT UNIQUE,
    profile_type TEXT DEFAULT 'student', -- student, teacher, admin
    institution TEXT, -- ETEC, CPOP, etc.
    course TEXT,
    interests TEXT,
    favorite_subject TEXT,
    last_access TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active', -- active, suspended
    name_changes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. BANCO DE QUESTÕES E MATÉRIAS
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Formato: [{"key": "A", "text": "..."}, ...]
    correct_answer TEXT NOT NULL,
    year INTEGER DEFAULT 2024,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. GESTÃO DE TURMAS (COHORTS)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    coordinator_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar FK de turma no perfil se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='class_id') THEN
        ALTER TABLE public.profiles ADD COLUMN class_id UUID REFERENCES public.classes(id);
    END IF;
END $$;

-- 4. COMUNIDADE E FÓRUNS
CREATE TABLE IF NOT EXISTS public.forums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Geral',
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    is_teacher_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(forum_id, user_id)
);

-- 5. ACERVO E BIBLIOTECA
CREATE TABLE IF NOT EXISTS public.library_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    type TEXT, -- PDF, Video, Link
    url TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TRILHAS DE ESTUDO (LMS)
CREATE TABLE IF NOT EXISTS public.trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    teacher_id UUID REFERENCES auth.users(id),
    teacher_name TEXT,
    status TEXT DEFAULT 'draft', -- draft, review, published
    image_url TEXT,
    target_audience TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- video, quiz, pdf, text
    url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, trail_id)
);

-- 7. DOCUMENTAÇÃO E AUDITORIA
CREATE TABLE IF NOT EXISTS public.student_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, -- rg, cpf, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.simulation_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    subject_id UUID REFERENCES public.subjects(id),
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'low', -- low, medium, high
    target_group TEXT DEFAULT 'all', -- all, etec, enem, class_id
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    meet_link TEXT,
    teacher_id UUID REFERENCES auth.users(id),
    teacher_name TEXT,
    status TEXT DEFAULT 'scheduled', -- scheduled, live, finished
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id),
    receiver_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. FUNÇÕES INTELIGENTES (RPC)

-- Função para Simulados Aleatórios
CREATE OR REPLACE FUNCTION public.get_random_questions_for_subject(p_subject_id UUID, p_limit INT)
RETURNS TABLE (
    id UUID,
    question_text TEXT,
    options JSONB,
    correct_answer TEXT,
    year INTEGER,
    subjects JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id, 
        q.question_text, 
        q.options, 
        q.correct_answer, 
        q.year,
        jsonb_build_object('name', s.name)
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    WHERE q.subject_id = p_subject_id
    ORDER BY random()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para Analytics de Matérias
CREATE OR REPLACE FUNCTION public.get_subjects_with_question_count()
RETURNS TABLE (
    id UUID,
    name TEXT,
    question_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, 
        s.name, 
        COUNT(q.id) as question_count
    FROM subjects s
    LEFT JOIN questions q ON s.id = q.subject_id
    GROUP BY s.id, s.name
    ORDER BY s.name ASC;
END;
$$ LANGUAGE plpgsql;

-- 9. POLÍTICAS DE SEGURANÇA (RLS) - ACESSO TOTAL PARA DEMO
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Perfis" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Questões" ON public.questions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Matérias" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Fóruns" ON public.forums FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Posts" ON public.forum_posts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Avisos" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Trilhas" ON public.trails FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Módulos" ON public.modules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.learning_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Conteúdos" ON public.learning_contents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Progresso" ON public.user_progress FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Lives" ON public.lives FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Chat" ON public.direct_messages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.simulation_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Simulados" ON public.simulation_attempts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Checklist" ON public.student_checklists FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Público Biblioteca" ON public.library_resources FOR ALL USING (true) WITH CHECK (true);

-- Dados Iniciais Sugeridos
INSERT INTO public.subjects (name) VALUES 
('Matemática'), ('Física'), ('Química'), ('Biologia'), 
('Linguagens'), ('História'), ('Geografia'), ('Redação'), ('Não Categorizado')
ON CONFLICT (name) DO NOTHING;
