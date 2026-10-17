-- Aviso à equipe: aula a 15 minutos de começar e ainda sem link (17/10).
--
-- Cada aula depende de alguém colar o link (YouTube ou Meet) e abrir a sala.
-- Esquecer deixa a turma inteira sem aula e sem presença. Esta função ESCOLHE
-- as aulas que precisam de aviso; quem envia é a rota `/api/cron/aula-sem-link`
-- (Web Push precisa de VAPID, que não existe dentro do Postgres), chamada pelo
-- `pg_cron` a cada 5 minutos.
--
-- `avisado_sem_link_em` é a memória: a rota marca ANTES de enviar
-- (`UPDATE … WHERE avisado_sem_link_em IS NULL`), então cada aula avisa uma vez
-- só, mesmo com duas chamadas do cron se sobrepondo.

ALTER TABLE public.lives ADD COLUMN IF NOT EXISTS avisado_sem_link_em timestamptz;

CREATE OR REPLACE FUNCTION public.lives_sem_link_para_avisar()
RETURNS TABLE (id uuid, title text, start_time timestamptz, teacher_id uuid, teacher_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT l.id, l.title, l.start_time, l.teacher_id, l.teacher_name
  FROM public.lives l
  WHERE l.status = 'scheduled'
    AND l.avisado_sem_link_em IS NULL
    AND nullif(btrim(coalesce(l.youtube_id, '')), '') IS NULL
    AND nullif(btrim(coalesce(l.meet_link, '')), '') IS NULL
    -- Faltam até 15 min, ou já passou do horário há até 10 min sem link.
    AND l.start_time BETWEEN now() - interval '10 minutes' AND now() + interval '15 minutes'
  ORDER BY l.start_time;
$$;

COMMENT ON FUNCTION public.lives_sem_link_para_avisar() IS
  'Aulas agendadas que começam em até 15 min sem YouTube nem Meet e ainda não foram avisadas. O envio é da rota /api/cron/aula-sem-link.';

REVOKE ALL ON FUNCTION public.lives_sem_link_para_avisar() FROM PUBLIC, anon, authenticated;

-- O job copia o cabeçalho de autorização do `lembrete-diario` (o segredo mora
-- em `configuracao_privada` e no comando do job, nunca no repositório):
--
--   SELECT cron.schedule('aula-sem-link', '*/5 * * * *',
--     replace(command, '/api/cron/lembrete-diario', '/api/cron/aula-sem-link'))
--   FROM cron.job WHERE jobname = 'lembrete-diario';
