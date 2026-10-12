-- Devolve ao professor o poder de agendar aula ao vivo.
--
-- A limpeza de 10/07 (20260710020000) apagou as policies abertas de escrita de
-- `lives` e não pôs nada no lugar — ao contrário de `scheduled_lives`, que
-- ganhou "Staff e host gerenciam lives agendadas" na mesma migration. Sem
-- policy de INSERT/UPDATE/DELETE, só o service_role escreve: todo professor
-- que clicava em "Publicar na Agenda" recebia "new row violates row-level
-- security policy for table lives", e o aluno via o estúdio sempre vazio.
-- Apagar e trocar status falhavam em silêncio (0 linhas, sem erro).
--
-- Papel sai de `profiles.role`, nunca de `auth.jwt()->>'user_role'` (o claim
-- é sempre nulo neste projeto — ver CLAUDE.md).
DROP POLICY IF EXISTS "Staff e professores gerenciam lives" ON public.lives;
CREATE POLICY "Staff e professores gerenciam lives" ON public.lives
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('admin', 'staff', 'teacher')))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role::text IN ('admin', 'staff', 'teacher')));

-- `meet_link` é a única tranca da sala do Meet. Com leitura `TO public`, a
-- chave anon (que está no bundle do navegador) listava os links sem login.
-- Todas as telas que leem `lives` ficam atrás de /dashboard, então a leitura
-- de autenticados ("Permitir leitura de aulas para usuários autenticados")
-- basta.
DROP POLICY IF EXISTS "Public can read all lives" ON public.lives;
