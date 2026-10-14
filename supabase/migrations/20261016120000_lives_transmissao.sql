-- Transmissão pela própria plataforma (14/10).
--
-- O professor transmite a tela (e, se quiser, câmera e microfone) direto do
-- estúdio, sem YouTube, Meet ou Teams. O vídeo passa pelo Cloudflare Realtime
-- (SFU WebRTC): o navegador do professor manda as faixas para uma sessão lá, e
-- cada aluno abre a própria sessão puxando essas faixas. Atraso < 1 s.
--
-- Estas colunas dizem à sala do aluno ONDE está a transmissão:
-- - `transmissao_sessao`: a sessão do professor no Cloudflare (NULL = ninguém
--   transmitindo pela plataforma; a sala cai no YouTube ou na tela de espera);
-- - `transmissao_faixas`: as faixas publicadas, `[{ "nome": "tela", "tipo":
--   "video" }, …]` — o aluno pede exatamente essas;
-- - `transmissao_desde`: quando começou (aparece no estúdio).
--
-- Quem grava é a rota `/api/live/transmissao` (service role, depois de checar
-- que quem pede é da equipe). O id da sessão não é segredo: sem a chave do
-- Cloudflare, que só existe no servidor, ninguém puxa faixa nenhuma com ele.
ALTER TABLE public.lives
  ADD COLUMN IF NOT EXISTS transmissao_sessao text,
  ADD COLUMN IF NOT EXISTS transmissao_faixas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS transmissao_desde  timestamptz;

COMMENT ON COLUMN public.lives.transmissao_sessao IS
  'Sessão do professor no Cloudflare Realtime quando ele transmite pela plataforma. NULL = sem transmissão própria.';
COMMENT ON COLUMN public.lives.transmissao_faixas IS
  'Faixas publicadas pelo professor: [{"nome":"tela|camera|audio-mic|audio-tela","tipo":"video|audio"}].';
COMMENT ON COLUMN public.lives.transmissao_desde IS
  'Quando a transmissão pela plataforma começou.';
