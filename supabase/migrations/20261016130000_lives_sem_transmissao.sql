-- Desfaz 20261016120000_lives_transmissao (14/10): a transmissão de tela pela
-- própria plataforma saiu. A aula é pelo YouTube (player embutido) ou pelo
-- Meet (os alunos recebem o link). As colunas nunca chegaram a ser usadas.
ALTER TABLE public.lives
  DROP COLUMN IF EXISTS transmissao_sessao,
  DROP COLUMN IF EXISTS transmissao_faixas,
  DROP COLUMN IF EXISTS transmissao_desde;
