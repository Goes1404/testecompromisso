-- Ficha de inscrição 2027: a sala sai NA HORA da inscrição, e o aluno consulta
-- a própria inscrição pelo mesmo link (pedido da coordenação, 16/11).
--
-- Antes: Recebida → confirmação no balcão → sorteio → sala. O aluno saía da
-- ficha sem saber a sala. Agora:
--
-- 1. **A inscrição já entra numa sala do foco dela**: a sala de ETEC (ou ENEM)
--    com MENOS alunos, desempate aleatório — o mesmo critério do sorteio, só que
--    um a um, na ordem de chegada. A sala é sempre do foco do aluno: o gatilho
--    continua recusando ENEM em sala de ETEC e vice-versa.
-- 2. **Sala cheia → Lista de espera**, pela ordem de inscrição. E se já existe
--    alguém esperando naquele foco, quem chega depois também espera: vaga que
--    abre (cancelamento) é do primeiro da fila, não de quem se inscreveu por
--    último. A secretaria chama a fila com "Preencher vagas" (o sorteio).
-- 3. **Recebida e Confirmada têm sala**; Lista de espera e Cancelada não (o
--    gatilho tira). Cancelar libera o lugar.
-- 4. **Consulta pública** (`consultar_inscricao`): nome completo OU protocolo,
--    sempre com a data de nascimento. Só service_role executa — a rota
--    `/api/matricula/consulta` põe limite por IP na frente. Devolve só o
--    primeiro nome, foco, situação, sala e posição na fila: nada de celular,
--    escola ou responsável.
-- 5. `registrar_matricula` continua devolvendo o protocolo (TEXT), então o app
--    antigo segue funcionando se esta migration for aplicada antes do deploy.

-- ── Sala só para Recebida/Confirmada, e sempre do mesmo foco ───────────────
CREATE OR REPLACE FUNCTION public.matriculas_antes_de_gravar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_foco TEXT;
BEGIN
  IF NEW.status NOT IN ('recebida', 'confirmada') THEN
    NEW.sala := NULL;
  END IF;
  IF NEW.sala IS NOT NULL THEN
    SELECT foco INTO v_foco FROM public.matricula_salas WHERE ano = NEW.ano AND sala = NEW.sala;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A sala % não existe em %.', NEW.sala, NEW.ano USING ERRCODE = 'P0001';
    END IF;
    IF v_foco <> NEW.foco THEN
      RAISE EXCEPTION 'A sala % é de %; o aluno é %.', NEW.sala, v_foco, NEW.foco USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    NEW.atualizado_por := coalesce(auth.uid(), NEW.atualizado_por);
  END IF;
  RETURN NEW;
END;
$$;

-- ── A sala do foco com menos alunos e lugar sobrando (NULL = tudo cheio) ───
CREATE OR REPLACE FUNCTION public.sala_livre_da_matricula(p_ano INT, p_foco TEXT)
RETURNS INT
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.sala
    FROM public.matricula_salas s
    LEFT JOIN public.matriculas m ON m.ano = s.ano AND m.sala = s.sala
   WHERE s.ano = p_ano AND s.foco = p_foco
   GROUP BY s.sala, s.capacidade
  HAVING count(m.id) < s.capacidade
   ORDER BY count(m.id), random()
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.sala_livre_da_matricula(INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sala_livre_da_matricula(INT, TEXT) FROM anon, authenticated;

-- ── Registrar: agora já decide a sala (ou a fila) ──────────────────────────
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

  IF EXISTS (
    SELECT 1 FROM public.matriculas
     WHERE ano = v_ano AND status <> 'cancelada'
       AND nascimento = (p ->> 'nascimento')::date
       AND public.normalizar_nome(nome) = public.normalizar_nome(p ->> 'nome')
  ) THEN
    RAISE EXCEPTION 'Já existe uma inscrição com este nome e data de nascimento. Toque em "Consultar inscrição" para ver a sua sala.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Fila primeiro: se alguém do foco já espera, quem chega agora espera também.
  IF EXISTS (SELECT 1 FROM public.matriculas WHERE ano = v_ano AND foco = v_foco AND status = 'espera') THEN
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

-- ── Consulta pública: nome completo OU protocolo + data de nascimento ──────
CREATE OR REPLACE FUNCTION public.consultar_inscricao(p_ano INT, p_busca TEXT, p_nascimento DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_busca TEXT := btrim(coalesce(p_busca, ''));
  v_prot  TEXT;
  v_m     public.matriculas%ROWTYPE;
  v_pos   INT;
BEGIN
  IF v_busca = '' OR p_nascimento IS NULL THEN
    RETURN NULL;
  END IF;

  -- "2027-0007", "2027 0007", "0007" ou "7" viram o protocolo do ano.
  IF v_busca ~ '^[0-9]{4}[- ]?[0-9]{1,4}$' AND left(v_busca, 4) = p_ano::text THEN
    v_prot := p_ano::text || '-' || lpad(regexp_replace(substr(v_busca, 5), '[^0-9]', '', 'g'), 4, '0');
  ELSIF v_busca ~ '^[0-9]{1,4}$' THEN
    v_prot := p_ano::text || '-' || lpad(v_busca, 4, '0');
  END IF;

  SELECT * INTO v_m
    FROM public.matriculas
   WHERE ano = p_ano AND nascimento = p_nascimento
     AND (protocolo = v_prot OR public.normalizar_nome(nome) = public.normalizar_nome(v_busca))
   ORDER BY (status = 'cancelada'), numero DESC
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_m.status = 'espera' THEN
    SELECT count(*) INTO v_pos FROM public.matriculas
     WHERE ano = p_ano AND foco = v_m.foco AND status = 'espera' AND numero <= v_m.numero;
  END IF;

  RETURN jsonb_build_object(
    'protocolo', v_m.protocolo,
    'primeiro_nome', split_part(btrim(v_m.nome), ' ', 1),
    'foco', v_m.foco,
    'status', v_m.status,
    'sala', v_m.sala,
    'posicao', v_pos
  );
END;
$$;
REVOKE ALL ON FUNCTION public.consultar_inscricao(INT, TEXT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consultar_inscricao(INT, TEXT, DATE) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_inscricao(INT, TEXT, DATE) TO service_role;

-- ── Sorteio = "Preencher vagas" ────────────────────────────────────────────
-- Concorrem: Recebida/Confirmada sem sala e a Lista de espera. Entram, na
-- ordem de inscrição, quantas couberem; quem sai da espera volta a Recebida
-- (ainda falta a confirmação no balcão). Quem sobra vai/fica na espera.
-- p_refazer = true tira antes a sala de todo mundo do foco — e o aluno já viu
-- a sala dele na tela da inscrição, por isso a tela da equipe avisa.
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
  IF NOT EXISTS (SELECT 1 FROM public.matricula_salas WHERE ano = p_ano AND foco = p_foco) THEN
    RAISE EXCEPTION 'Não há sala de % cadastrada.', p_foco USING ERRCODE = 'P0001';
  END IF;

  IF p_refazer THEN
    UPDATE public.matriculas SET sala = NULL
     WHERE ano = p_ano AND foco = p_foco AND status IN ('recebida', 'confirmada') AND sala IS NOT NULL;
  END IF;

  SELECT coalesce(sum(s.capacidade), 0)
         - (SELECT count(*) FROM public.matriculas m
             WHERE m.ano = p_ano AND m.foco = p_foco AND m.sala IS NOT NULL)
    INTO v_vagas
    FROM public.matricula_salas s WHERE s.ano = p_ano AND s.foco = p_foco;
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

-- ── Quem já se inscreveu sem sala ganha a sua agora, na ordem de chegada ───
DO $$
DECLARE
  v_m    RECORD;
  v_sala INT;
BEGIN
  FOR v_m IN
    SELECT id, ano, foco FROM public.matriculas
     WHERE status IN ('recebida', 'confirmada') AND sala IS NULL
     ORDER BY ano, numero
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
