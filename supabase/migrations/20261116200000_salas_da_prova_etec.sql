-- Salas da prova de 2027 (coordenação, 16/11): a ficha online passa a ser só
-- ETEC, e os alunos vão para as salas 1, 2, 3, 4, 5, 6, 7, 9 e 11, com 35
-- lugares cada (315). As salas 8, 10 e 12 são RESERVA: ficam para os alunos
-- do ENEM-aula e para os atrasados da ETEC no dia, e a ficha nunca coloca
-- ninguém nelas sozinha.
--
-- Depende de 20261116180000_inscricao_com_sala.sql (sala_livre_da_matricula).
--
-- 1. `matricula_salas.reserva`: sala de reserva não entra na distribuição
--    automática (ficha e "Preencher vagas") nem na conta de vagas. A equipe
--    ainda pode pôr alguém nela à mão pela planilha.
-- 2. A ficha online recusa ENEM (no banco também, não só na tela). Pelo
--    balcão ENEM ainda entra, mas sem sala ("a definir"), não na fila.
-- 3. Inscrição ENEM que já tinha sala (feita quando a ficha ainda aceitava
--    ENEM) perde a sala e fica Recebida "sala a definir": as salas 5–8 viram
--    ETEC, e ENEM nunca fica em sala de ETEC.

ALTER TABLE public.matricula_salas ADD COLUMN IF NOT EXISTS reserva BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public.matricula_salas.reserva IS
  'Sala de reserva: a ficha e o "Preencher vagas" nunca colocam ninguém nela; só a equipe, à mão.';

-- A sala livre ignora as reservas.
CREATE OR REPLACE FUNCTION public.sala_livre_da_matricula(p_ano INT, p_foco TEXT)
RETURNS INT
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.sala
    FROM public.matricula_salas s
    LEFT JOIN public.matriculas m ON m.ano = s.ano AND m.sala = s.sala
   WHERE s.ano = p_ano AND s.foco = p_foco AND NOT s.reserva
   GROUP BY s.sala, s.capacidade
  HAVING count(m.id) < s.capacidade
   ORDER BY count(m.id), random()
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.sala_livre_da_matricula(INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sala_livre_da_matricula(INT, TEXT) FROM anon, authenticated;

-- Registrar: ficha online só ETEC; foco sem sala (fora reserva) entra "a definir".
CREATE OR REPLACE FUNCTION public.registrar_matricula(p JSONB, p_origem TEXT DEFAULT 'site')
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_t      public.matricula_turmas%ROWTYPE;
  v_num    INT;
  v_ano    INT := (p ->> 'ano')::int;
  v_foco   TEXT := p ->> 'foco';
  v_sala   INT;
  v_status TEXT := 'recebida';
  v_prot   TEXT;
BEGIN
  -- Trava a turma: inscrições do mesmo ano entram uma de cada vez, então
  -- número e lugar na sala nunca saem repetidos.
  SELECT * INTO v_t FROM public.matricula_turmas WHERE ano = v_ano FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição % não encontrada.', v_ano USING ERRCODE = 'P0001';
  END IF;

  IF p_origem = 'site' AND (NOT v_t.aberta OR now() < v_t.abre_em OR now() > v_t.fecha_em) THEN
    RAISE EXCEPTION 'As inscrições não estão abertas agora.' USING ERRCODE = 'P0001';
  END IF;

  IF v_foco IS NULL OR v_foco NOT IN ('ETEC', 'ENEM') THEN
    RAISE EXCEPTION 'Escolha ETEC ou ENEM.' USING ERRCODE = 'P0001';
  END IF;

  -- A ficha online é só ETEC; ENEM só entra pelo balcão.
  IF p_origem = 'site' AND v_foco <> 'ETEC' THEN
    RAISE EXCEPTION 'A ficha online é só para o Vestibulinho ETEC. Para o ENEM, procure a secretaria.' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriculas
     WHERE ano = v_ano AND status <> 'cancelada'
       AND nascimento = (p ->> 'nascimento')::date
       AND public.normalizar_nome(nome) = public.normalizar_nome(p ->> 'nome')
  ) THEN
    RAISE EXCEPTION 'Já existe uma inscrição com este nome e data de nascimento. Toque em "Consultar inscrição" para ver a sua sala.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Foco sem sala nenhuma (fora reserva): entra sem sala, "a definir" — não é fila.
  IF NOT EXISTS (SELECT 1 FROM public.matricula_salas WHERE ano = v_ano AND foco = v_foco AND NOT reserva) THEN
    NULL;
  -- Fila primeiro: se alguém do foco já espera, quem chega agora espera também.
  ELSIF EXISTS (SELECT 1 FROM public.matriculas WHERE ano = v_ano AND foco = v_foco AND status = 'espera') THEN
    v_status := 'espera';
  ELSE
    v_sala := public.sala_livre_da_matricula(v_ano, v_foco);
    IF v_sala IS NULL THEN
      v_status := 'espera';
    END IF;
  END IF;

  SELECT coalesce(max(numero), 0) + 1 INTO v_num FROM public.matriculas WHERE ano = v_ano;

  INSERT INTO public.matriculas (
    ano, numero, nome, nascimento, celular, email, bairro, cidade, foco, serie, escola, escola_tipo,
    turno_escola, ja_fez_cursinho, ex_aluno, resp_nome, resp_parentesco, resp_celular, como_conheceu,
    aceite_veracidade, aceite_dados, aceite_imagem, origem, status, sala
  ) VALUES (
    v_ano, v_num, btrim(p ->> 'nome'), (p ->> 'nascimento')::date, p ->> 'celular', nullif(btrim(p ->> 'email'), ''),
    btrim(p ->> 'bairro'), btrim(p ->> 'cidade'), v_foco,
    coalesce(nullif(p ->> 'serie', ''), CASE WHEN v_foco = 'ETEC' THEN '9EF' ELSE '3EM' END),
    btrim(p ->> 'escola'), p ->> 'escola_tipo',
    p ->> 'turno_escola', coalesce((p ->> 'ja_fez_cursinho')::boolean, false), coalesce((p ->> 'ex_aluno')::boolean, false),
    nullif(btrim(p ->> 'resp_nome'), ''), nullif(btrim(p ->> 'resp_parentesco'), ''), nullif(p ->> 'resp_celular', ''),
    nullif(btrim(p ->> 'como_conheceu'), ''),
    coalesce((p ->> 'aceite_veracidade')::boolean, false), coalesce((p ->> 'aceite_dados')::boolean, false),
    coalesce((p ->> 'aceite_imagem')::boolean, false), p_origem, v_status, v_sala
  ) RETURNING protocolo INTO v_prot;

  RETURN v_prot;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_matricula(JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_matricula(JSONB, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_matricula(JSONB, TEXT) TO service_role;

-- "Preencher vagas": as vagas contam só as salas que não são reserva.
CREATE OR REPLACE FUNCTION public.sortear_salas_matricula(p_ano INT, p_foco TEXT, p_refazer BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_vagas    INT;
  v_alocados INT := 0;
  v_espera   INT := 0;
  v_m        RECORD;
  v_sala     INT;
BEGIN
  IF NOT public.pode_gerir_matricula() THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE = '42501';
  END IF;
  IF p_foco NOT IN ('ETEC', 'ENEM') THEN
    RAISE EXCEPTION 'Foco inválido.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1 FROM public.matricula_turmas WHERE ano = p_ano FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição % não encontrada.', p_ano USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matricula_salas WHERE ano = p_ano AND foco = p_foco AND NOT reserva) THEN
    RAISE EXCEPTION 'Não há sala de % cadastrada (fora as de reserva).', p_foco USING ERRCODE = 'P0001';
  END IF;

  IF p_refazer THEN
    UPDATE public.matriculas m SET sala = NULL
     WHERE m.ano = p_ano AND m.foco = p_foco AND m.status IN ('recebida', 'confirmada') AND m.sala IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.matricula_salas s WHERE s.ano = m.ano AND s.sala = m.sala AND s.reserva);
  END IF;

  SELECT coalesce(sum(s.capacidade), 0)
         - (SELECT count(*) FROM public.matriculas m
              JOIN public.matricula_salas s2 ON s2.ano = m.ano AND s2.sala = m.sala
             WHERE m.ano = p_ano AND m.foco = p_foco AND NOT s2.reserva)
    INTO v_vagas
    FROM public.matricula_salas s WHERE s.ano = p_ano AND s.foco = p_foco AND NOT s.reserva;
  v_vagas := greatest(v_vagas, 0);

  CREATE TEMP TABLE _entram ON COMMIT DROP AS
    SELECT id FROM public.matriculas
     WHERE ano = p_ano AND foco = p_foco
       AND ((status IN ('recebida', 'confirmada') AND sala IS NULL) OR status = 'espera')
     ORDER BY numero
     LIMIT v_vagas;

  UPDATE public.matriculas SET status = 'espera'
   WHERE ano = p_ano AND foco = p_foco AND status IN ('recebida', 'confirmada') AND sala IS NULL
     AND id NOT IN (SELECT id FROM _entram);
  SELECT count(*) INTO v_espera FROM public.matriculas
   WHERE ano = p_ano AND foco = p_foco AND status = 'espera' AND id NOT IN (SELECT id FROM _entram);

  FOR v_m IN SELECT id FROM _entram ORDER BY random() LOOP
    v_sala := public.sala_livre_da_matricula(p_ano, p_foco);
    EXIT WHEN v_sala IS NULL;
    UPDATE public.matriculas
       SET sala = v_sala,
           status = CASE WHEN status = 'espera' THEN 'recebida' ELSE status END
     WHERE id = v_m.id;
    v_alocados := v_alocados + 1;
  END LOOP;

  DROP TABLE IF EXISTS _entram;
  RETURN jsonb_build_object('alocados', v_alocados, 'espera', v_espera);
END;
$$;
REVOKE ALL ON FUNCTION public.sortear_salas_matricula(INT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sortear_salas_matricula(INT, TEXT, BOOLEAN) TO authenticated;

-- ── 2027: ETEC 1–7, 9 e 11 com 35; reserva 8, 10 e 12 ──────────────────────
-- ENEM com sala (de quando a ficha aceitava ENEM) sai da sala antes de a sala
-- virar ETEC: ENEM nunca fica em sala de ETEC.
UPDATE public.matriculas SET sala = NULL
 WHERE ano = 2027 AND foco = 'ENEM' AND sala IS NOT NULL;

INSERT INTO public.matricula_salas (ano, sala, foco, capacidade, reserva)
SELECT 2027, g, 'ETEC', 35, g IN (8, 10, 12)
  FROM generate_series(1, 12) g
ON CONFLICT (ano, sala) DO UPDATE
  SET foco = 'ETEC', capacidade = 35, reserva = EXCLUDED.reserva;

-- Sala que não é das doze (criada à mão antes) e está vazia sai.
DELETE FROM public.matricula_salas s
 WHERE s.ano = 2027 AND s.sala > 12
   AND NOT EXISTS (SELECT 1 FROM public.matriculas m WHERE m.ano = s.ano AND m.sala = s.sala);

-- ETEC sem sala (ou que estava numa sala que virou reserva) ganha a sua agora.
UPDATE public.matriculas m SET sala = NULL
 WHERE m.ano = 2027 AND m.foco = 'ETEC'
   AND EXISTS (SELECT 1 FROM public.matricula_salas s WHERE s.ano = m.ano AND s.sala = m.sala AND s.reserva);

DO $$
DECLARE
  v_m    RECORD;
  v_sala INT;
BEGIN
  FOR v_m IN
    SELECT id, ano, foco FROM public.matriculas
     WHERE ano = 2027 AND foco = 'ETEC' AND status IN ('recebida', 'confirmada') AND sala IS NULL
     ORDER BY numero
  LOOP
    v_sala := public.sala_livre_da_matricula(v_m.ano, v_m.foco);
    IF v_sala IS NULL THEN
      UPDATE public.matriculas SET status = 'espera' WHERE id = v_m.id;
    ELSE
      UPDATE public.matriculas SET sala = v_sala WHERE id = v_m.id;
    END IF;
  END LOOP;
END;
$$;
