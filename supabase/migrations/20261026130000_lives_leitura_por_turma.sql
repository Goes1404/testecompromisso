-- Leitura de `lives` volta a respeitar a turma (26/10).
--
-- `20261023000000_harden_and_index_lives.sql` apagou TODAS as policies de
-- `lives` e recriou a leitura como `USING (true)`. Com isso caiu a policy
-- "Aluno ve aulas da propria turma" (`pode_ver_live(turmas)`, de
-- 20261013120000/20261017090000): desde 23/10 o aluno ENEM vê as aulas ETEC na
-- lista e vice-versa — em 24/10, as duas salas apareciam para todo mundo.
--
-- Presença, chat, dúvidas e reações já conferem `pode_ver_live()` por conta
-- própria; só a listagem (SELECT direto na tabela) ficou aberta. As policies de
-- escrita da 20261023 continuam como estão.
--
-- Aula de ensaio (`lives.ensaio`, migration anterior) só a equipe vê.

DROP POLICY IF EXISTS "Autenticados leem lives" ON public.lives;
DROP POLICY IF EXISTS "Aluno ve aulas da propria turma" ON public.lives;
CREATE POLICY "Aluno ve aulas da propria turma" ON public.lives
  FOR SELECT TO authenticated
  USING (
    public.pode_ver_live(turmas)
    AND (NOT ensaio OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('admin', 'staff', 'teacher')))
  );
