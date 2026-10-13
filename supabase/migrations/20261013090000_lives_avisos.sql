-- Memória do aviso de live, no mesmo molde de `mural_posts.avisado_em`.
--
-- Uma live gera dois avisos para todos os alunos: quando é agendada ("tem aula
-- quinta às 19h") e quando o professor liga o sinal ("entrou no ar, clique para
-- entrar"). Sem marca, o professor que liga e desliga o sinal para testar o
-- Meet dispararia um push novo a cada clique para os ~855 alunos.
--
-- A rota `/api/push/notify` (branch `live`) faz `UPDATE ... WHERE <coluna> IS
-- NULL RETURNING` antes de enviar — quem não conseguiu marcar não envia, então
-- dois cliques simultâneos também não viram dois pushes.
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS avisado_agendada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avisado_ao_vivo_em TIMESTAMPTZ;

COMMENT ON COLUMN public.lives.avisado_agendada_em IS
  'Quando os alunos foram avisados do agendamento desta live. NULL = ninguem foi avisado ainda.';
COMMENT ON COLUMN public.lives.avisado_ao_vivo_em IS
  'Quando os alunos foram avisados de que a live entrou no ar. NULL = ninguem foi avisado ainda.';
