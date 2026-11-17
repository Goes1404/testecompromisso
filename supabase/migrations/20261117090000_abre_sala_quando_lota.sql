-- Simulado Pré-Etec (coordenação, 17/11): "sempre que todas as salas estiverem
-- cheias, abra mais uma". Quando a ficha não acha lugar em nenhuma sala de prova,
-- ela abre a próxima e põe o aluno lá — ninguém vai para a lista de espera.
--
-- Qual sala abre: primeiro uma sala de reserva do foco que já exista (a de número
-- menor; em 17/11 eram 9–12, sobras do desenho anterior), que deixa de ser
-- reserva; se não houver, cria a próxima (maior número + 1) com a mesma lotação
-- da maior sala de prova (40). Nunca a sala do aluno no cursinho (sala_origem) e
-- nunca acima da 30 (limite da tabela) — passou disso, aí sim lista de espera.
--
-- Depende de 20261116220000_sala_de_origem.sql.

CREATE OR REPLACE FUNCTION public.abrir_proxima_sala_matricula(p_ano INT, p_foco TEXT, p_evitar INT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sala INT;
  v_cap  INT;
BEGIN
  SELECT sala INTO v_sala FROM public.matricula_salas
   WHERE ano = p_ano AND foco = p_foco AND reserva AND sala IS DISTINCT FROM p_evitar
   ORDER BY sala LIMIT 1;
  IF FOUND THEN
    UPDATE public.matricula_salas SET reserva = false WHERE ano = p_ano AND sala = v_sala;
    RETURN v_sala;
  END IF;

  SELECT coalesce(max(sala), 0) + 1 INTO v_sala FROM public.matricula_salas WHERE ano = p_ano;
  IF v_sala = p_evitar THEN v_sala := v_sala + 1; END IF;
  IF v_sala > 30 THEN
    RETURN NULL;
  END IF;
  SELECT coalesce(max(capacidade), 40) INTO v_cap FROM public.matricula_salas
   WHERE ano = p_ano AND foco = p_foco AND NOT reserva;
  INSERT INTO public.matricula_salas (ano, sala, foco, capacidade, reserva)
  VALUES (p_ano, v_sala, p_foco, v_cap, false);
  RETURN v_sala;
END;
$$;
REVOKE ALL ON FUNCTION public.abrir_proxima_sala_matricula(INT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.abrir_proxima_sala_matricula(INT, TEXT, INT) FROM anon, authenticated;

-- Registrar: se tudo lotou, abre a próxima sala.
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
  v_origem INT := nullif(p ->> 'sala_origem', '')::int;
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

  IF v_origem IS NOT NULL AND (v_origem < 1 OR v_origem > 30) THEN
    RAISE EXCEPTION 'Confira o número da sua sala no Compromisso.' USING ERRCODE = 'P0001';
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
    v_sala := public.sala_livre_da_matricula(v_ano, v_foco, v_origem);
    -- Tudo cheio: abre a próxima sala e põe o aluno nela. Só vai para a fila
    -- se passar do limite de salas (30).
    IF v_sala IS NULL THEN
      v_sala := public.abrir_proxima_sala_matricula(v_ano, v_foco, v_origem);
    END IF;
    IF v_sala IS NULL THEN
      v_status := 'espera';
    END IF;
  END IF;

  SELECT coalesce(max(numero), 0) + 1 INTO v_num FROM public.matriculas WHERE ano = v_ano;

  INSERT INTO public.matriculas (
    ano, numero, nome, nascimento, celular, email, bairro, cidade, foco, serie, escola, escola_tipo,
    turno_escola, ja_fez_cursinho, ex_aluno, resp_nome, resp_parentesco, resp_celular, como_conheceu,
    aceite_veracidade, aceite_dados, aceite_imagem, origem, status, sala, sala_origem
  ) VALUES (
    v_ano, v_num, btrim(p ->> 'nome'), (p ->> 'nascimento')::date, p ->> 'celular', nullif(btrim(p ->> 'email'), ''),
    btrim(p ->> 'bairro'), btrim(p ->> 'cidade'), v_foco,
    coalesce(nullif(p ->> 'serie', ''), CASE WHEN v_foco = 'ETEC' THEN '9EF' ELSE '3EM' END),
    btrim(p ->> 'escola'), p ->> 'escola_tipo',
    p ->> 'turno_escola', coalesce((p ->> 'ja_fez_cursinho')::boolean, false), coalesce((p ->> 'ex_aluno')::boolean, false),
    nullif(btrim(p ->> 'resp_nome'), ''), nullif(btrim(p ->> 'resp_parentesco'), ''), nullif(p ->> 'resp_celular', ''),
    nullif(btrim(p ->> 'como_conheceu'), ''),
    coalesce((p ->> 'aceite_veracidade')::boolean, false), coalesce((p ->> 'aceite_dados')::boolean, false),
    coalesce((p ->> 'aceite_imagem')::boolean, false), p_origem, v_status, v_sala, v_origem
  ) RETURNING protocolo INTO v_prot;

  RETURN v_prot;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_matricula(JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_matricula(JSONB, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_matricula(JSONB, TEXT) TO service_role;
