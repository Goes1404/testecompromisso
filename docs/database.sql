
-- =========================================================
-- COMPROMISSO | SMART EDUCATION
-- SCHEMA COMPLETO DO BANCO DE DADOS (SUPABASE)
-- Data: 2024-05-20
-- =========================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    profile_type TEXT CHECK (profile_type IN ('etec', 'uni', 'teacher', 'admin', 'student')),
    institution TEXT,
    course TEXT,
    interests TEXT,
    avatar_url TEXT,
    is_financial_aid_eligible BOOLEAN DEFAULT FALSE,
    name_changes_count INTEGER DEFAULT 0,
    last_access TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE TRILHAS (Trails)
CREATE TABLE IF NOT EXISTS public.trails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    image_url TEXT,
    teacher_id UUID REFERENCES public.profiles(id),
    teacher_name TEXT,
    status TEXT DEFAULT 'draft', -- draft, review, published, active
    target_audience TEXT DEFAULT 'all', -- all, etec, uni
    average_rating NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABELA DE MÓDULOS (Modules)
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE CONTEÚDOS (Learning Contents)
CREATE TABLE IF NOT EXISTS public.learning_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT, -- video, quiz, pdf, text, file
    url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE PROGRESSO (User Progress)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    trail_id UUID REFERENCES public.trails(id) ON DELETE CASCADE,
    percentage INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, trail_id)
);

-- 7. TABELA DE CHECKLIST DE DOCUMENTOS (Gestão de Ingressos)
CREATE TABLE IF NOT EXISTS public.student_checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, -- ex: rg, cpf, hs_transcript
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, item_id)
);

-- 8. TABELA DE MENSAGENS DIRETAS (Direct Messages)
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. TABELA DE BIBLIOTECA (Library Resources)
CREATE TABLE IF NOT EXISTS public.library_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    type TEXT, -- PDF, Video, E-book, Artigo
    url TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. TABELA DE LIVES (Aulas ao Vivo)
CREATE TABLE IF NOT EXISTS public.lives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    meet_link TEXT,
    teacher_id UUID REFERENCES public.profiles(id),
    teacher_name TEXT,
    status TEXT DEFAULT 'scheduled', -- live, scheduled, finished
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. TABELA DE FÓRUNS
CREATE TABLE IF NOT EXISTS public.forums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Geral',
    author_id UUID REFERENCES public.profiles(id),
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. TABELA DE POSTS DOS FÓRUNS
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    author_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 13. SEGURANÇA (Modo Demo - Permissivo)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.trails FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.modules FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.learning_contents FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.user_progress FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.student_checklists FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.direct_messages FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.library_resources FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.lives FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.forums FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.forum_posts FOR ALL USING (true);
