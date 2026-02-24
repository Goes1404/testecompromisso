
-- ==========================================================
-- COMPROMISSO | SMART EDUCATION - MASTER DATABASE SCHEMA
-- Versão: 2.1.0 (Industrial & Non-Destructive)
-- Este script configura toda a estrutura necessária para o 
-- funcionamento do Banco de Questões, Simulados, Chat e Trilhas.
-- ==========================================================

-- 1. TABELA DE MATÉRIAS (Subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABELA DE QUESTÕES (Questions)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    year INTEGER,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    correct_answer TEXT NOT NULL, -- A, B, C, D ou E
    options JSONB NOT NULL,        -- Array de objetos {letter, text}
    teacher_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABELA DE PERFIS (Profiles)
-- Caso não exista ou precise de colunas novas
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_financial_aid_eligible BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS name_changes_count INTEGER DEFAULT 0;

-- 4. SEED DE MATÉRIAS BASE
INSERT INTO public.subjects (name) VALUES 
('Matemática'), ('Física'), ('Química'), ('Biologia'), ('Português'), ('História'), ('Geografia'), ('Linguagens')
ON CONFLICT (name) DO NOTHING;

-- 5. FUNÇÕES RPC PARA SIMULADOS (Server-Side Logic)

-- 5.1. Contador de questões por matéria
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

-- 5.2. Sorteio de questões aleatórias (O coração do Simulado)
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

-- 6. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Permissões para Subjects
DROP POLICY IF EXISTS "Acesso leitura authenticated" ON public.subjects;
CREATE POLICY "Acesso leitura authenticated" ON public.subjects FOR SELECT TO authenticated USING (true);

-- Permissões para Questions
DROP POLICY IF EXISTS "Professores inserem questões" ON public.questions;
CREATE POLICY "Professores inserem questões" ON public.questions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Leitura de questões para simulados" ON public.questions;
CREATE POLICY "Leitura de questões para simulados" ON public.questions FOR SELECT TO authenticated USING (true);

-- 7. REFRESH DE CACHE (Importante para evitar o erro de cache de esquema)
NOTIFY pgrst, 'reload schema';
