
-- 
-- SCRIPT DE CONSOLIDAÇÃO DO BANCO DE DADOS (COMPROMISSO)
-- Versão: 3.0.0 (Relacionamentos Fixos)
-- 

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS MESTRAS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    profile_type TEXT CHECK (profile_type IN ('etec', 'uni', 'teacher', 'admin')),
    institution TEXT,
    course TEXT,
    interests TEXT,
    is_financial_aid_eligible BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    name_changes_count INTEGER DEFAULT 0,
    last_access TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.trails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    teacher_id UUID REFERENCES public.profiles(id),
    teacher_name TEXT,
    status TEXT DEFAULT 'draft',
    image_url TEXT,
    target_audience TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.learning_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT,
    url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE PROGRESSO (CRÍTICA PARA A HOME)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trail_id UUID NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
    percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, trail_id)
);

-- 4. OUTRAS TABELAS
CREATE TABLE IF NOT EXISTS public.lives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES public.profiles(id),
    teacher_name TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'scheduled',
    meet_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.library_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    type TEXT,
    url TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. PERMISSÕES (MODO DEMO)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Perfis" ON public.profiles FOR ALL USING (true);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Trilhas" ON public.trails FOR ALL USING (true);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Módulos" ON public.modules FOR ALL USING (true);

ALTER TABLE public.learning_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Conteúdo" ON public.learning_contents FOR ALL USING (true);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Progresso" ON public.user_progress FOR ALL USING (true);

ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Lives" ON public.lives FOR ALL USING (true);

ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Biblioteca" ON public.library_resources FOR ALL USING (true);

-- 6. DADOS DE EXEMPLO
INSERT INTO public.trails (title, category, description, status, image_url) 
VALUES 
('Cálculo I: Limites e Derivadas', 'Matemática', 'Aprofundamento técnico em funções e limites para exames superiores.', 'active', 'https://picsum.photos/seed/math/600/400'),
('Biologia Molecular', 'Biologia', 'Estudo das células, DNA e processos genéticos.', 'active', 'https://picsum.photos/seed/bio/600/400'),
('Fundamentos de Redação Nota 1000', 'Linguagens', 'Estrutura argumentativa e repertório sociocultural.', 'active', 'https://picsum.photos/seed/text/600/400')
ON CONFLICT DO NOTHING;
