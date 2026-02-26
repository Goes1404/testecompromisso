
-- ==========================================================
-- ESTRUTURA DEFINITIVA - COMPROMISSO SMART EDUCATION
-- Versão: 3.0.0 (Consolidação de Gestão e Auditoria)
-- ==========================================================

-- 1. TABELA DE PERFIS (Profiles)
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

-- 2. TABELA DE TURMAS (Classes/Cohorts)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    coordinator_id UUID REFERENCES public.profiles(id),
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

-- 7. TABELA DE CHECKLIST DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.student_checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
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

-- 9. TABELA DE COMUNICADOS (Announcements)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'low', -- low, medium, high
    author_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. TABELA DE LOGS DE ATIVIDADE (Auditoria)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. TABELA DE BIBLIOTECA (Library Resources)
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

-- 12. TABELA DE LIVES
CREATE TABLE IF NOT EXISTS public.lives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    meet_link TEXT,
    teacher_id UUID REFERENCES public.profiles(id),
    teacher_name TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 13. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Demo" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.classes FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.trails FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.modules FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.learning_contents FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.user_progress FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.student_checklists FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.direct_messages FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.announcements FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.activity_logs FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.library_resources FOR ALL USING (true);
CREATE POLICY "Acesso Demo" ON public.lives FOR ALL USING (true);

-- 14. FUNÇÕES RPC PARA SIMULADOS
CREATE OR REPLACE FUNCTION get_subjects_with_question_count()
RETURNS TABLE (id UUID, name TEXT, question_count BIGINT) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, COUNT(q.id) as question_count
    FROM public.subjects s
    LEFT JOIN public.questions q ON q.subject_id = s.id
    GROUP BY s.id, s.name
    ORDER BY s.name ASC;
END;
$$;

-- 15. TRIGGER: CRIAÇÃO AUTOMÁTICA DE PERFIL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, profile_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
