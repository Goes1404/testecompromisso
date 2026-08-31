-- Marca de "todo mundo já foi avisado deste post".
--
-- Sem ela o botão "avisar todo mundo" não tem memória: dois cliques viram dois
-- banners e dois pushes para os mesmos ~855 alunos, e o segundo não avisa nada
-- que o primeiro já não tenha avisado. Com a data gravada o botão troca de
-- rótulo e sai do caminho.
--
-- É `TIMESTAMPTZ` e não `BOOLEAN` porque a tela mostra *quando* — "avisado em
-- 31/08" responde à pergunta que o professor realmente faz ao olhar o card, que
-- é se o aviso saiu antes ou depois de ele ter corrigido o enunciado.
ALTER TABLE public.mural_posts
  ADD COLUMN IF NOT EXISTS avisado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.mural_posts.avisado_em IS
  'Quando o comunicado global (banner + push) foi disparado para este post. NULL = ninguem foi avisado ainda.';
