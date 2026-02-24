
-- 📋 SCRIPT MESTRE DE CONFIGURAÇÃO - COMPROMISSO | EDUCORI 360
-- Versão: 3.0.0 (Sincronização de Banco de Questões e Simulados)
-- Data: Agosto/2024

-- 1. TABELA DE MATÉRIAS
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABELA DE QUESTÕES (RESILIENTE)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    year INTEGER,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    correct_answer TEXT NOT NULL DEFAULT 'A',
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    teacher_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. INSERIR MATÉRIAS BASE
INSERT INTO public.subjects (name) VALUES 
('Matemática'), ('Física'), ('Química'), ('Biologia'), ('Português'), ('História'), ('Geografia'), ('Atualidades')
ON CONFLICT (name) DO NOTHING;

-- 4. FUNÇÕES PARA O MOTOR DE SIMULADO (RPC)

-- A. Contador de questões por matéria
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

-- B. Sorteador aleatório de questões (Injeção de JSON para compatibilidade Next.js)
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

-- 5. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Permissões para MATÉRIAS
DROP POLICY IF EXISTS "Leitura pública matérias" ON public.subjects;
CREATE POLICY "Leitura pública matérias" ON public.subjects FOR SELECT TO authenticated USING (true);

-- Permissões para QUESTÕES
DROP POLICY IF EXISTS "Leitura pública questões" ON public.questions;
CREATE POLICY "Leitura pública questões" ON public.questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Professores inserem questões" ON public.questions;
CREATE POLICY "Professores inserem questões" ON public.questions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Professores atualizam questões" ON public.questions;
CREATE POLICY "Professores atualizam questões" ON public.questions FOR UPDATE TO authenticated USING (true);

-- 6. LIMPEZA DE CACHE DO ESQUEMA
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.questions IS 'Repositório mestre de questões para simulados estilo ENEM/Vestibular.';
