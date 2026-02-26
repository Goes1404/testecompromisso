
-- =========================================================
-- SCRIPT MESTRE - COMPROMISSO | SMART EDUCATION
-- Data: 2024-05-20
-- Descrição: Configuração de tabelas, RPCs e dados iniciais.
-- =========================================================

-- 1. TABELA DE PERFIS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    email TEXT,
    profile_type TEXT DEFAULT 'student' CHECK (profile_type IN ('etec', 'uni', 'teacher', 'admin', 'student')),
    institution TEXT,
    course TEXT,
    interests TEXT,
    is_financial_aid_eligible BOOLEAN DEFAULT FALSE,
    last_access TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name_changes_count INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE TRILHAS (TRAILS)
CREATE TABLE IF NOT EXISTS public.trails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    teacher_id UUID REFERENCES public.profiles(id),
    teacher_name TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'active', 'published', 'inactive')),
    image_url TEXT,
    target_audience TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE MÓDULOS (MODULES)
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE CONTEÚDOS (LEARNING_CONTENTS)
CREATE TABLE IF NOT EXISTS public.learning_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'video' CHECK (type IN ('video', 'pdf', 'quiz', 'text', 'file')),
    url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE PROGRESSO (USER_PROGRESS)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, trail_id)
);

-- 6. BANCO DE QUESTÕES (SUBJECTS & QUESTIONS)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Formato: [{"key": "A", "text": "..."}, ...]
    correct_answer TEXT NOT NULL,
    year INTEGER,
    teacher_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. LIVES E MENTORIA
CREATE TABLE IF NOT EXISTS public.lives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    teacher_id UUID REFERENCES public.profiles(id),
    teacher_name TEXT,
    meet_link TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. BIBLIOTECA DIGITAL
CREATE TABLE IF NOT EXISTS public.library_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    type TEXT,
    url TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. FÓRUM E CHAT
CREATE TABLE IF NOT EXISTS public.forums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    author_id UUID REFERENCES public.profiles(id),
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    author_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================
-- FUNÇÕES INTELIGENTES (RPCs)
-- =========================================================

-- Função para listar matérias com contagem de questões
CREATE OR REPLACE FUNCTION get_subjects_with_question_count()
RETURNS TABLE (id UUID, name TEXT, question_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, COUNT(q.id) as question_count
    FROM public.subjects s
    LEFT JOIN public.questions q ON q.subject_id = s.id
    GROUP BY s.id, s.name
    ORDER BY s.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar questões aleatórias para simulado
CREATE OR REPLACE FUNCTION get_random_questions_for_subject(p_subject_id UUID, p_limit INTEGER)
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
        jsonb_build_object('name', s.name) as subjects
    FROM public.questions q
    JOIN public.subjects s ON q.subject_id = s.id
    WHERE q.subject_id = p_subject_id
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- DADOS DE EXEMPLO (OPCIONAL - PARA TESTES)
-- =========================================================

INSERT INTO public.subjects (name) VALUES 
('Matemática'), ('Física'), ('Linguagens'), ('Não Categorizado')
ON CONFLICT DO NOTHING;

INSERT INTO public.trails (title, category, description, status, image_url) VALUES
('Fundamentos de Redação ENEM', 'Linguagens', 'Aprenda a estruturar seu texto para a nota 1000.', 'active', 'https://picsum.photos/seed/redacao/800/600'),
('Matemática Básica Industrial', 'Matemática', 'O guia definitivo de cálculo para o dia a dia.', 'active', 'https://picsum.photos/seed/math/800/600'),
('Física: Mecânica Clássica', 'Física', 'Dominando as leis de Newton.', 'active', 'https://picsum.photos/seed/physics/800/600')
ON CONFLICT DO NOTHING;

-- =========================================================
-- PERMISSÕES (RLS) - ACESSO TOTAL PARA DEMO
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Total Demo" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.trails FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.user_progress FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.questions FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.lives FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.subjects FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.modules FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.learning_contents FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.forums FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.forum_posts FOR ALL USING (true);
CREATE POLICY "Acesso Total Demo" ON public.library_resources FOR ALL USING (true);
