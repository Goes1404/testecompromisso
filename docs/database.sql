
-- =====================================================================
-- COMPROMISSO | SMART EDUCATION
-- SCRIPT OFICIAL DE CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE)
-- Versão: 3.0.0 (Consolidação Master)
-- =====================================================================

-- 1. TABELA DE MATÉRIAS (Disciplinas Base)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABELA DE QUESTÕES (Banco de Dados Industrial)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    year INTEGER,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES auth.users(id),
    correct_answer TEXT, -- Gabarito (A, B, C, D ou E)
    options JSONB,       -- Lista de alternativas em formato JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABELA DE TRILHAS (Learning Journeys)
CREATE TABLE IF NOT EXISTS public.trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Geral',
    description TEXT,
    teacher_id UUID REFERENCES auth.users(id),
    teacher_name TEXT,
    status TEXT DEFAULT 'draft', -- draft, active, published
    image_url TEXT,
    target_audience TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. TABELA DE PROGRESSO DO USUÁRIO (O Coração do Dashboard)
-- Importante: Foreign Key para 'trails' deve estar correta para os Joins
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, trail_id)
);

-- 5. TABELA DE PERFIS (Dados Estendidos do Usuário)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    profile_type TEXT CHECK (profile_type IN ('etec', 'uni', 'teacher', 'admin')),
    institution TEXT,
    course TEXT,
    is_financial_aid_eligible BOOLEAN DEFAULT false,
    name_changes_count INTEGER DEFAULT 0,
    avatar_url TEXT,
    last_access TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. INSERIR DADOS BASE (Não duplica se já existirem)
INSERT INTO public.subjects (name) VALUES 
('Matemática'), ('Física'), ('Química'), ('Biologia'), ('Português'), ('História'), ('Geografia'), ('Tecnologia')
ON CONFLICT (name) DO NOTHING;

-- 7. FUNÇÕES INTELIGENTES (RPC)

-- Função: Buscar matérias com contagem de questões
CREATE OR REPLACE FUNCTION get_subjects_with_question_count()
RETURNS TABLE (id UUID, name TEXT, question_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, COUNT(q.id) as question_count
    FROM public.subjects s
    LEFT JOIN public.questions q ON s.id = q.subject_id
    GROUP BY s.id, s.name
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- Função: Sortear questões aleatórias para simulado
CREATE OR REPLACE FUNCTION get_random_questions_for_subject(p_subject_id UUID, p_limit INTEGER)
RETURNS TABLE (
    id UUID, 
    question_text TEXT, 
    year INTEGER, 
    correct_answer TEXT, 
    options JSONB,
    subjects JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id, 
        q.question_text, 
        q.year, 
        q.correct_answer, 
        q.options,
        json_build_object('name', s.name)::jsonb as subjects
    FROM public.questions q
    JOIN public.subjects s ON q.subject_id = s.id
    WHERE q.subject_id = p_subject_id
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 8. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Subjects: Leitura pública para autenticados
CREATE POLICY "Leitura de matérias" ON public.subjects FOR SELECT TO authenticated USING (true);

-- Questions: Leitura para alunos, total para professores
CREATE POLICY "Leitura de questões" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestão de questões" ON public.questions FOR ALL TO authenticated USING (true);

-- Trails: Leitura para trilhas ativas
CREATE POLICY "Leitura de trilhas" ON public.trails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestão de trilhas" ON public.trails FOR ALL TO authenticated USING (true);

-- User Progress: Apenas o próprio usuário acessa seu progresso
CREATE POLICY "Acesso total progresso" ON public.user_progress FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Profiles: Acesso ao próprio perfil
CREATE POLICY "Acesso ao próprio perfil" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id);

-- NOTIFICAR MUDANÇA DE ESQUEMA (Limpeza de Cache PostgREST)
NOTIFY pgrst, 'reload schema';
