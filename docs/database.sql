
-- ==========================================================
-- ESTRUTURA PARA BANCO DE QUESTÕES E SIMULADOS
-- Copie e cole no SQL Editor do seu Supabase e clique em RUN
-- ==========================================================

-- 1. TABELA DE MATÉRIAS (Disciplinas)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABELA DE QUESTÕES (Repositório Central)
-- O campo 'options' deve ser JSONB para suportar o formato:
-- [{"letter": "A", "text": "..."}, {"letter": "B", "text": "..."}]
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 2024,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    correct_answer TEXT NOT NULL, -- Ex: 'A', 'B', 'C', 'D' ou 'E'
    options JSONB NOT NULL,
    teacher_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. INSERIR MATÉRIAS PADRÃO
INSERT INTO public.subjects (name) 
VALUES 
    ('Matemática'), 
    ('Física'), 
    ('Química'), 
    ('Biologia'), 
    ('Linguagens'), 
    ('História'), 
    ('Geografia')
ON CONFLICT (name) DO NOTHING;

-- 4. FUNÇÃO PARA CONTAR QUESTÕES POR MATÉRIA (Usada no Dashboard)
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

-- 5. FUNÇÃO PARA SORTEAR QUESTÕES ALEATÓRIAS (Usada no Simulado)
CREATE OR REPLACE FUNCTION get_random_questions_for_subject(p_subject_id UUID, p_limit INTEGER)
RETURNS SETOF public.questions AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.questions
    WHERE subject_id = p_subject_id
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 6. CONFIGURAR SEGURANÇA (RLS)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Políticas para Subjects
DROP POLICY IF EXISTS "Acesso Leitura Matérias" ON public.subjects;
CREATE POLICY "Acesso Leitura Matérias" ON public.subjects FOR SELECT USING (true);

-- Políticas para Questions
DROP POLICY IF EXISTS "Leitura de Questões para Todos" ON public.questions;
CREATE POLICY "Leitura de Questões para Todos" ON public.questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professores Inserem Questões" ON public.questions;
CREATE POLICY "Professores Inserem Questões" ON public.questions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Professores Editam suas Questões" ON public.questions;
CREATE POLICY "Professores Editam suas Questões" ON public.questions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Professores Deletam suas Questões" ON public.questions;
CREATE POLICY "Professores Deletam suas Questões" ON public.questions FOR DELETE USING (true);

-- 7. NOTIFICAR CACHE (Resolve erro de coluna não encontrada)
NOTIFY pgrst, 'reload schema';
