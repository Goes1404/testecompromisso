-- Aviso de live que faltou (18/10): `pg_cron` chama `/api/cron/avisos-de-live`
-- a cada minuto.
--
-- O aviso aos alunos ("agendada" e "ao vivo") só saía das telas do professor.
-- As 12 aulas do aulão de 17/10 foram criadas em lote, direto no banco, e
-- nenhum aluno recebeu aviso. A rota acha a aula que ainda deve um aviso e usa
-- as mesmas colunas de memória (`avisado_agendada_em`, `avisado_ao_vivo_em`),
-- marcando antes de enviar: tela e cron nunca avisam a mesma aula duas vezes.
--
-- A cada minuto, e não a cada 5 como `aula-sem-link`: o "ao vivo" atrasado em
-- 5 minutos chega quando a turma já perdeu o começo.
--
-- O job copia o cabeçalho de autorização do `lembrete-diario` (o segredo mora
-- em `configuracao_privada` e no comando do job, nunca no repositório).
-- Aplicar DEPOIS do deploy da rota; antes disso o cron só recebe 404.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'avisos-de-live';

SELECT cron.schedule('avisos-de-live', '* * * * *',
  replace(command, '/api/cron/lembrete-diario', '/api/cron/avisos-de-live'))
FROM cron.job WHERE jobname = 'lembrete-diario';
