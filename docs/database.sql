
-- SCRIPT DE CONSOLIDAÇÃO MASTER - COMPROMISSO
-- Execute este script no SQL Editor do Supabase

-- 1. TABELA DE TRILHAS (BASE)
CREATE TABLE IF NOT EXISTS public.trails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    teacher_id UUID,
    teacher_name TEXT,
    status TEXT DEFAULT 'draft',
    image_url TEXT,
    target_audience TEXT DEFAULT 'all',
    average_rating NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE PROGRESSO (HISTÓRICO)
-- IMPORTANTE: A chave estrangeira REFERENCES public.trails(id) é o que faz a Home funcionar!
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    trail_id UUID NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
    percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, trail_id)
);

-- 3. TABELAS DE CONTEÚDO
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.learning_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'video',
    url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0
);

-- 4. BANCO DE QUESTÕES E MATÉRIAS
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id),
    teacher_id UUID,
    year INTEGER DEFAULT 2024,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. PERMISSÕES GERAIS (MODO DEMO)
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Total Trails" ON public.trails FOR ALL USING (true);
CREATE POLICY "Acesso Total Progresso" ON public.user_progress FOR ALL USING (true);
CREATE POLICY "Acesso Total Modules" ON public.modules FOR ALL USING (true);
CREATE POLICY "Acesso Total Contents" ON public.learning_contents FOR ALL USING (true);
CREATE POLICY "Acesso Total Subjects" ON public.subjects FOR ALL USING (true);
CREATE POLICY "Acesso Total Questions" ON public.questions FOR ALL USING (true);

-- 6. DADOS INICIAIS DE EXEMPLO
INSERT INTO public.subjects (name) VALUES ('Matemática'), ('Física'), ('Tecnologia'), ('Não Categorizado') ON CONFLICT DO NOTHING;

INSERT INTO public.trails (id, title, category, description, status, image_url) 
VALUES 
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Matemática para o ENEM', 'Matemática', 'Domine os conteúdos mais cobrados na prova de exatas.', 'active', 'https://picsum.photos/seed/math/600/400'),
('b2c3d4e5-f6g7-4b6c-9d0e-1f2a3b4c5d6e', 'Física Experimental', 'Física', 'Aprenda leis de Newton e eletricidade de forma prática.', 'active', 'https://picsum.photos/seed/physics/600/400'),
('c3d4e5f6-g7h8-4c7d-0e1f-2a3b4c5d6e7f', 'Fundamentos de IA', 'Tecnologia', 'Entenda como funcionam os modelos de inteligência artificial.', 'active', 'https://picsum.photos/seed/tech/600/400')
ON CONFLICT (id) DO NOTHING;
