-- O ciclo do ranking passa a fechar no SÁBADO.
--
-- A grade era segunda→domingo, então o pódio saía por volta das 00:05 de
-- segunda: a coordenação descobria os vencedores no começo da semana, longe do
-- sábado, que é quando a turma está junta e o prêmio é entregue na mão.
--
-- A grade nova é DOMINGO → SÁBADO 23:59:59 (horário de Brasília). Duas coisas
-- que ela precisa respeitar, e é por isso que os valores estão escritos um a um
-- em vez de calculados na hora:
--
--   1. SEM BURACO ENTRE CICLOS. O fim de um encosta no início do seguinte
--      (23:59:59 → 00:00:00 do dia seguinte). Um intervalo de um dia entre
--      ciclos seria um dia em que o aluno estuda e o XP não conta para
--      premiação nenhuma — e ele não teria como saber disso.
--   2. O CICLO EM ANDAMENTO NÃO MUDA DE INÍCIO. Ele começou segunda 31/08 e só
--      perde o domingo do fim: vira 31/08 → 05/09, seis dias, uma vez só.
--      Mexer no `starts_at` de um ciclo já correndo tiraria da conta XP que os
--      alunos já ganharam dentro dele.
--
-- `close_due_ranking_cycles()` (cron de hora em hora, migration 20260811002000)
-- continua igual. Quem decide o dia do fechamento é o `ends_at` de cada ciclo,
-- não o agendamento do cron — por isso esta migration não toca no cron. O cron
-- roda no minuto 5, então o pódio sai até ~00:05 de domingo.
--
-- Só ciclos EM ABERTO. Os quatro já apurados ficam como estão: mexer neles
-- mudaria a janela de uma premiação que já aconteceu.

UPDATE public.ranking_cycles AS c
SET starts_at = v.starts_at,
    ends_at   = v.ends_at,
    label     = v.label
FROM (VALUES
  ('86fa5aac-3567-4719-979a-4a8d59994292'::uuid, TIMESTAMPTZ '2026-08-31 00:00:00-03', TIMESTAMPTZ '2026-09-05 23:59:59-03', 'Semana de 31/08 a 05/09'),
  ('6e34c16c-f588-4a1d-85a1-79e5c3a33945'::uuid, TIMESTAMPTZ '2026-09-06 00:00:00-03', TIMESTAMPTZ '2026-09-12 23:59:59-03', 'Semana de 06/09 a 12/09'),
  ('04054be1-69b4-4b9c-8591-5cd49efb21cb'::uuid, TIMESTAMPTZ '2026-09-13 00:00:00-03', TIMESTAMPTZ '2026-09-19 23:59:59-03', 'Semana de 13/09 a 19/09'),
  ('518b8321-2eb8-4cf0-8126-b390f45a8cac'::uuid, TIMESTAMPTZ '2026-09-20 00:00:00-03', TIMESTAMPTZ '2026-09-26 23:59:59-03', 'Semana de 20/09 a 26/09'),
  ('be2b78d3-e566-4c26-98bc-1fb44c5575b1'::uuid, TIMESTAMPTZ '2026-09-27 00:00:00-03', TIMESTAMPTZ '2026-10-03 23:59:59-03', 'Semana de 27/09 a 03/10'),
  ('7c11e19e-61dd-4051-97f4-9ab9fc0944c9'::uuid, TIMESTAMPTZ '2026-10-04 00:00:00-03', TIMESTAMPTZ '2026-10-10 23:59:59-03', 'Semana de 04/10 a 10/10'),
  ('e50a473e-8157-421e-bb76-38290ae0603c'::uuid, TIMESTAMPTZ '2026-10-11 00:00:00-03', TIMESTAMPTZ '2026-10-17 23:59:59-03', 'Semana de 11/10 a 17/10'),
  ('12faedf6-c008-4917-a188-2e2b1774558f'::uuid, TIMESTAMPTZ '2026-10-18 00:00:00-03', TIMESTAMPTZ '2026-10-24 23:59:59-03', 'Semana de 18/10 a 24/10'),
  ('cccd0bf1-8a17-475a-8578-6f129232bc20'::uuid, TIMESTAMPTZ '2026-10-25 00:00:00-03', TIMESTAMPTZ '2026-10-31 23:59:59-03', 'Semana de 25/10 a 31/10'),
  ('95cd546e-1f09-4834-9bc5-9e13372d9b6f'::uuid, TIMESTAMPTZ '2026-11-01 00:00:00-03', TIMESTAMPTZ '2026-11-07 23:59:59-03', 'Semana de 01/11 a 07/11'),
  ('644c13ee-4444-4c9c-bdba-007c7e2ed065'::uuid, TIMESTAMPTZ '2026-11-08 00:00:00-03', TIMESTAMPTZ '2026-11-14 23:59:59-03', 'Semana de 08/11 a 14/11'),
  ('94dbc65b-71b6-4030-9c42-3014c5b7edbd'::uuid, TIMESTAMPTZ '2026-11-15 00:00:00-03', TIMESTAMPTZ '2026-11-21 23:59:59-03', 'Semana de 15/11 a 21/11'),
  ('6504f21c-970e-4a8a-82d3-5fbf5ac5277e'::uuid, TIMESTAMPTZ '2026-11-22 00:00:00-03', TIMESTAMPTZ '2026-11-28 23:59:59-03', 'Semana de 22/11 a 28/11')
) AS v(id, starts_at, ends_at, label)
WHERE c.id = v.id
  AND c.closed_at IS NULL;   -- nunca reescreve ciclo já apurado

-- Conferência, no próprio banco: todos os ciclos em aberto terminam no sábado e
-- não há buraco entre um e o seguinte. Se um dia isto falhar, é porque o INSERT
-- de novos ciclos voltou a usar a grade antiga — e o aviso aparece aqui, na
-- migration, e não numa segunda-feira sem pódio.
DO $$
DECLARE
  v_nao_sabado int;
  v_buracos    int;
BEGIN
  SELECT count(*) INTO v_nao_sabado
  FROM public.ranking_cycles
  WHERE closed_at IS NULL
    AND extract(dow FROM (ends_at AT TIME ZONE 'America/Sao_Paulo')) <> 6;

  SELECT count(*) INTO v_buracos FROM (
    SELECT ends_at, lead(starts_at) OVER (ORDER BY starts_at) AS proximo
    FROM public.ranking_cycles
    WHERE closed_at IS NULL
  ) t
  WHERE t.proximo IS NOT NULL
    AND t.proximo <> t.ends_at + INTERVAL '1 second';

  IF v_nao_sabado > 0 THEN
    RAISE EXCEPTION '% ciclo(s) em aberto nao terminam no sabado', v_nao_sabado;
  END IF;
  IF v_buracos > 0 THEN
    RAISE EXCEPTION '% buraco(s) entre ciclos', v_buracos;
  END IF;
  RAISE NOTICE 'ok: ciclos em aberto fecham no sabado, sem buracos';
END
$$;
