-- Aula ao vivo para alto volume: a leitura dos alunos continua simples, mas
-- criação/edição/exclusão ficam restritas a professor dono ou staff.
-- Também remove policies abertas que reapareceram em snapshots antigos.

ALTER TABLE public.lives ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lives'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lives', policy_name);
  END LOOP;
END
$$;

REVOKE ALL ON TABLE public.lives FROM anon;
REVOKE ALL ON TABLE public.lives FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lives TO authenticated;

CREATE POLICY "Autenticados leem lives"
ON public.lives
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Professor ou staff cria live"
ON public.lives
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('teacher', 'admin', 'staff')
  )
  AND (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('admin', 'staff')
    )
  )
);

CREATE POLICY "Professor dono ou staff atualiza live"
ON public.lives
FOR UPDATE
TO authenticated
USING (
  teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('admin', 'staff')
  )
)
WITH CHECK (
  teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('admin', 'staff')
  )
);

CREATE POLICY "Professor dono ou staff exclui live"
ON public.lives
FOR DELETE
TO authenticated
USING (
  teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('admin', 'staff')
  )
);

CREATE INDEX IF NOT EXISTS idx_lives_status_start_time
ON public.lives (status, start_time DESC);

ANALYZE public.lives;
