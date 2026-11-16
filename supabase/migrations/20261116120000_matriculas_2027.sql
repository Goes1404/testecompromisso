-- Matrícula 2027: ficha online, planilha da equipe e sorteio nas salas 1 a 8.
--
-- Proposta aprovada em 16/11 ("Matrículas 2027 — proposta"). Fluxo:
-- ficha pública (sem login) → Recebida → confirmação no balcão (RG +
-- responsável) → Confirmada → sorteio por foco → sala. Quem não cabe vai para
-- a lista de espera pela ORDEM DE INSCRIÇÃO, nunca por sorteio.
--
-- Decisões:
--
-- 1. **Ninguém de fora lê nem grava as tabelas.** A ficha pública entra por
--    `/api/matricula`, que tem limite por IP e chama `registrar_matricula()`
--    com service_role. Leitura e edição: só admin/staff (`profiles.role`,
--    nunca o claim `user_role`, que é null aqui).
-- 2. **Sem CPF, RG, endereço completo nem renda.** Documento é conferido no
--    balcão; a plataforma já decidiu não guardar CPF.
-- 3. **Número sequencial por ano**, gerado com a linha da turma travada
--    (`FOR UPDATE`). Protocolo = "2027-0001".
-- 4. **Mesmo nome (normalizado) + mesma data de nascimento no mesmo ano é
--    recusado** — a não ser que a anterior esteja cancelada. É o que evita
--    repetir as 201 contas duplicadas de 2026 já na entrada.
-- 5. **ENEM e ETEC não se misturam numa sala.** A sala precisa existir no ano
--    e ter o mesmo foco do aluno (gatilho). Só Confirmada tem sala; mudar o
--    status para outra coisa tira a sala.
-- 6. **Tudo que a equipe muda fica em `matriculas_historico`** (quem, quando,
--    campo, de, para), por gatilho.
-- 7. **A turma de 2027 NÃO vira conta na plataforma aqui.** `profiles.sala`
--    hoje é a sala de 2026 (ETEC 1–6, ENEM 7–12) e alimenta chamada de live
--    e restrição por turma: criar agora as contas de 2027 com sala 1–8 as
--    colocaria nas aulas de 2026 e as marcaria ausentes. Isso é a fase 2,
--    junto com o arquivamento da turma 2026 (pergunta 9 da proposta).

-- ── Turma do ano (janela de inscrição) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matricula_turmas (
  ano          INT PRIMARY KEY CHECK (ano BETWEEN 2026 AND 2100),
  abre_em      TIMESTAMPTZ NOT NULL,
  fecha_em     TIMESTAMPTZ NOT NULL,
  aberta       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT matricula_turmas_janela CHECK (fecha_em > abre_em)
);
COMMENT ON COLUMN public.matricula_turmas.aberta IS
  'Interruptor manual: false fecha a ficha mesmo dentro das datas.';

CREATE TABLE IF NOT EXISTS public.matricula_salas (
  ano         INT NOT NULL REFERENCES public.matricula_turmas(ano) ON DELETE CASCADE,
  sala        INT NOT NULL CHECK (sala BETWEEN 1 AND 30),
  foco        TEXT NOT NULL CHECK (foco IN ('ETEC', 'ENEM')),
  capacidade  INT NOT NULL CHECK (capacidade BETWEEN 1 AND 200),
  PRIMARY KEY (ano, sala)
);

-- ── Inscrições ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matriculas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                INT NOT NULL REFERENCES public.matricula_turmas(ano),
  numero             INT NOT NULL,
  protocolo          TEXT GENERATED ALWAYS AS (ano::text || '-' || lpad(numero::text, 4, '0')) STORED,
  nome               TEXT NOT NULL CHECK (length(btrim(nome)) BETWEEN 5 AND 120),
  nascimento         DATE NOT NULL,
  celular            TEXT NOT NULL CHECK (celular ~ '^[0-9]{10,11}$'),
  email              TEXT CHECK (email IS NULL OR length(email) <= 120),
  bairro             TEXT NOT NULL CHECK (length(btrim(bairro)) BETWEEN 2 AND 80),
  cidade             TEXT NOT NULL CHECK (length(btrim(cidade)) BETWEEN 2 AND 80),
  foco               TEXT NOT NULL CHECK (foco IN ('ETEC', 'ENEM')),
  serie              TEXT NOT NULL CHECK (serie IN ('9EF', '1EM', '2EM', '3EM', 'formado')),
  escola             TEXT NOT NULL CHECK (length(btrim(escola)) BETWEEN 2 AND 120),
  escola_tipo        TEXT NOT NULL CHECK (escola_tipo IN ('publica', 'particular', 'bolsista')),
  turno_escola       TEXT NOT NULL CHECK (turno_escola IN ('manha', 'tarde', 'noite', 'integral', 'nao_estuda')),
  ja_fez_cursinho    BOOLEAN NOT NULL DEFAULT false,
  ex_aluno           BOOLEAN NOT NULL DEFAULT false,
  resp_nome          TEXT CHECK (resp_nome IS NULL OR length(resp_nome) <= 120),
  resp_parentesco    TEXT CHECK (resp_parentesco IS NULL OR length(resp_parentesco) <= 40),
  resp_celular       TEXT CHECK (resp_celular IS NULL OR resp_celular ~ '^[0-9]{10,11}$'),
  como_conheceu      TEXT CHECK (como_conheceu IS NULL OR length(como_conheceu) <= 80),
  aceite_veracidade  BOOLEAN NOT NULL CHECK (aceite_veracidade),
  aceite_dados       BOOLEAN NOT NULL CHECK (aceite_dados),
  aceite_imagem      BOOLEAN NOT NULL DEFAULT false,
  status             TEXT NOT NULL DEFAULT 'recebida'
                       CHECK (status IN ('recebida', 'confirmada', 'espera', 'cancelada')),
  sala               INT,
  observacoes        TEXT CHECK (observacoes IS NULL OR length(observacoes) <= 2000),
  origem             TEXT NOT NULL DEFAULT 'site' CHECK (origem IN ('site', 'secretaria')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT matriculas_numero_unico UNIQUE (ano, numero)
);

CREATE INDEX IF NOT EXISTS matriculas_ano_status_idx ON public.matriculas (ano, status, foco);
CREATE INDEX IF NOT EXISTS matriculas_ano_sala_idx ON public.matriculas (ano, sala);

COMMENT ON TABLE public.matriculas IS
  'Ficha de matricula (pre-matricula) de alunos novos. Nao e conta na plataforma.';

CREATE TABLE IF NOT EXISTS public.matriculas_historico (
  id            BIGSERIAL PRIMARY KEY,
  matricula_id  UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  campo         TEXT NOT NULL,
  de            TEXT,
  para          TEXT,
  por           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  por_nome      TEXT,
  em            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matriculas_historico_idx ON public.matriculas_historico (matricula_id, em DESC);

-- ── Quem gere ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pode_gerir_matricula()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('admin', 'staff')
  );
$$;
REVOKE ALL ON FUNCTION public.pode_gerir_matricula() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_gerir_matricula() TO authenticated;

ALTER TABLE public.matricula_turmas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matricula_salas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matricula_turmas_gerir ON public.matricula_turmas;
CREATE POLICY matricula_turmas_gerir ON public.matricula_turmas FOR ALL TO authenticated
  USING (public.pode_gerir_matricula()) WITH CHECK (public.pode_gerir_matricula());

DROP POLICY IF EXISTS matricula_salas_gerir ON public.matricula_salas;
CREATE POLICY matricula_salas_gerir ON public.matricula_salas FOR ALL TO authenticated
  USING (public.pode_gerir_matricula()) WITH CHECK (public.pode_gerir_matricula());

-- Sem INSERT: inscrição nova só por registrar_matricula() (número sequencial).
DROP POLICY IF EXISTS matriculas_ler ON public.matriculas;
CREATE POLICY matriculas_ler ON public.matriculas FOR SELECT TO authenticated
  USING (public.pode_gerir_matricula());
DROP POLICY IF EXISTS matriculas_editar ON public.matriculas;
CREATE POLICY matriculas_editar ON public.matriculas FOR UPDATE TO authenticated
  USING (public.pode_gerir_matricula()) WITH CHECK (public.pode_gerir_matricula());
DROP POLICY IF EXISTS matriculas_apagar ON public.matriculas;
CREATE POLICY matriculas_apagar ON public.matriculas FOR DELETE TO authenticated
  USING (public.pode_gerir_matricula());

-- Histórico: só leitura; quem escreve é o gatilho.
DROP POLICY IF EXISTS matriculas_historico_ler ON public.matriculas_historico;
CREATE POLICY matriculas_historico_ler ON public.matriculas_historico FOR SELECT TO authenticated
  USING (public.pode_gerir_matricula());

-- ── Gatilhos ───────────────────────────────────────────────────────────────
-- Sala: só Confirmada tem sala, e a sala precisa ser do mesmo foco.
CREATE OR REPLACE FUNCTION public.matriculas_antes_de_gravar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_foco TEXT;
BEGIN
  IF NEW.status <> 'confirmada' THEN
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

DROP TRIGGER IF EXISTS trg_matriculas_antes ON public.matriculas;
CREATE TRIGGER trg_matriculas_antes
  BEFORE INSERT OR UPDATE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.matriculas_antes_de_gravar();

CREATE OR REPLACE FUNCTION public.matriculas_registrar_historico()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_de   JSONB := to_jsonb(OLD);
  v_para JSONB := to_jsonb(NEW);
  v_campo TEXT;
  v_nome TEXT;
BEGIN
  SELECT coalesce(nullif(btrim(full_name), ''), name) INTO v_nome FROM public.profiles WHERE id = auth.uid();
  FOR v_campo IN SELECT jsonb_object_keys(v_para) LOOP
    CONTINUE WHEN v_campo IN ('updated_at', 'atualizado_por', 'protocolo');
    IF (v_de -> v_campo) IS DISTINCT FROM (v_para -> v_campo) THEN
      INSERT INTO public.matriculas_historico (matricula_id, campo, de, para, por, por_nome)
      VALUES (NEW.id, v_campo, v_de ->> v_campo, v_para ->> v_campo, auth.uid(), coalesce(v_nome, 'sistema'));
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matriculas_historico ON public.matriculas;
CREATE TRIGGER trg_matriculas_historico
  AFTER UPDATE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.matriculas_registrar_historico();

-- Sala com aluno não muda de foco nem some (deixaria aluno numa sala que não existe).
CREATE OR REPLACE FUNCTION public.matricula_salas_proteger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_n INT;
BEGIN
  SELECT count(*) INTO v_n FROM public.matriculas WHERE ano = OLD.ano AND sala = OLD.sala;
  IF v_n > 0 AND (TG_OP = 'DELETE' OR NEW.foco <> OLD.foco OR NEW.sala <> OLD.sala) THEN
    RAISE EXCEPTION 'A sala % tem % aluno(s). Tire os alunos antes de apagar ou trocar o foco.', OLD.sala, v_n
      USING ERRCODE = 'P0001';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_matricula_salas_proteger ON public.matricula_salas;
CREATE TRIGGER trg_matricula_salas_proteger
  BEFORE UPDATE OR DELETE ON public.matricula_salas
  FOR EACH ROW EXECUTE FUNCTION public.matricula_salas_proteger();

-- ── Registrar (ficha pública e balcão) ─────────────────────────────────────
-- Chamada pela API com service_role. A API valida formato e o responsável
-- para menor; aqui fica o que precisa de banco: janela, número, repetida.
CREATE OR REPLACE FUNCTION public.registrar_matricula(p JSONB, p_origem TEXT DEFAULT 'site')
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_t    public.matricula_turmas%ROWTYPE;
  v_num  INT;
  v_ano  INT := (p ->> 'ano')::int;
  v_prot TEXT;
BEGIN
  SELECT * INTO v_t FROM public.matricula_turmas WHERE ano = v_ano FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matrícula % não encontrada.', v_ano USING ERRCODE = 'P0001';
  END IF;

  IF p_origem = 'site' AND (NOT v_t.aberta OR now() < v_t.abre_em OR now() > v_t.fecha_em) THEN
    RAISE EXCEPTION 'As inscrições não estão abertas agora.' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matriculas
     WHERE ano = v_ano AND status <> 'cancelada'
       AND nascimento = (p ->> 'nascimento')::date
       AND public.normalizar_nome(nome) = public.normalizar_nome(p ->> 'nome')
  ) THEN
    RAISE EXCEPTION 'Já existe uma inscrição com este nome e data de nascimento. Se precisa corrigir algo, fale com a secretaria.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(max(numero), 0) + 1 INTO v_num FROM public.matriculas WHERE ano = v_ano;

  INSERT INTO public.matriculas (
    ano, numero, nome, nascimento, celular, email, bairro, cidade, foco, serie, escola, escola_tipo,
    turno_escola, ja_fez_cursinho, ex_aluno, resp_nome, resp_parentesco, resp_celular, como_conheceu,
    aceite_veracidade, aceite_dados, aceite_imagem, origem
  ) VALUES (
    v_ano, v_num, btrim(p ->> 'nome'), (p ->> 'nascimento')::date, p ->> 'celular', nullif(btrim(p ->> 'email'), ''),
    btrim(p ->> 'bairro'), btrim(p ->> 'cidade'), p ->> 'foco', p ->> 'serie', btrim(p ->> 'escola'), p ->> 'escola_tipo',
    p ->> 'turno_escola', coalesce((p ->> 'ja_fez_cursinho')::boolean, false), coalesce((p ->> 'ex_aluno')::boolean, false),
    nullif(btrim(p ->> 'resp_nome'), ''), nullif(btrim(p ->> 'resp_parentesco'), ''), nullif(p ->> 'resp_celular', ''),
    nullif(btrim(p ->> 'como_conheceu'), ''),
    coalesce((p ->> 'aceite_veracidade')::boolean, false), coalesce((p ->> 'aceite_dados')::boolean, false),
    coalesce((p ->> 'aceite_imagem')::boolean, false), p_origem
  ) RETURNING protocolo INTO v_prot;

  RETURN v_prot;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_matricula(JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_matricula(JSONB, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_matricula(JSONB, TEXT) TO service_role;

-- ── Sorteio das salas ──────────────────────────────────────────────────────
-- Por foco. Concorrem as Confirmadas sem sala e a Lista de espera. Entram, na
-- ordem de inscrição, quantas couberem nas vagas que sobram; as outras ficam
-- (ou continuam) na Lista de espera. Quem entra é distribuído em ordem
-- aleatória, sempre na sala do foco com MENOS alunos — as salas ficam com
-- diferença de no máximo 1, e quem já tinha sala não muda.
-- p_refazer = true tira antes a sala de todo mundo do foco.
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
    RAISE EXCEPTION 'Matrícula % não encontrada.', p_ano USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matricula_salas WHERE ano = p_ano AND foco = p_foco) THEN
    RAISE EXCEPTION 'Não há sala de % cadastrada.', p_foco USING ERRCODE = 'P0001';
  END IF;

  IF p_refazer THEN
    UPDATE public.matriculas SET sala = NULL
     WHERE ano = p_ano AND foco = p_foco AND status = 'confirmada' AND sala IS NOT NULL;
  END IF;

  SELECT coalesce(sum(s.capacidade), 0)
         - (SELECT count(*) FROM public.matriculas m
             WHERE m.ano = p_ano AND m.foco = p_foco AND m.status = 'confirmada' AND m.sala IS NOT NULL)
    INTO v_vagas
    FROM public.matricula_salas s WHERE s.ano = p_ano AND s.foco = p_foco;
  v_vagas := greatest(v_vagas, 0);

  -- Quem entra: os primeiros por ordem de inscrição, até acabar a vaga.
  CREATE TEMP TABLE _entram ON COMMIT DROP AS
    SELECT id FROM public.matriculas
     WHERE ano = p_ano AND foco = p_foco
       AND ((status = 'confirmada' AND sala IS NULL) OR status = 'espera')
     ORDER BY numero
     LIMIT v_vagas;

  -- Quem sobra: lista de espera.
  UPDATE public.matriculas SET status = 'espera'
   WHERE ano = p_ano AND foco = p_foco AND status = 'confirmada' AND sala IS NULL
     AND id NOT IN (SELECT id FROM _entram);
  SELECT count(*) INTO v_espera FROM public.matriculas
   WHERE ano = p_ano AND foco = p_foco AND status = 'espera' AND id NOT IN (SELECT id FROM _entram);

  -- Quem entra, em ordem aleatória, para a sala menos cheia do foco.
  FOR v_m IN SELECT id FROM _entram ORDER BY random() LOOP
    SELECT s.sala INTO v_sala
      FROM public.matricula_salas s
      LEFT JOIN public.matriculas m ON m.ano = s.ano AND m.sala = s.sala
     WHERE s.ano = p_ano AND s.foco = p_foco
     GROUP BY s.sala, s.capacidade
    HAVING count(m.id) < s.capacidade
     ORDER BY count(m.id), random()
     LIMIT 1;
    EXIT WHEN v_sala IS NULL;
    UPDATE public.matriculas SET status = 'confirmada', sala = v_sala WHERE id = v_m.id;
    v_alocados := v_alocados + 1;
  END LOOP;

  DROP TABLE IF EXISTS _entram;
  RETURN jsonb_build_object('alocados', v_alocados, 'espera', v_espera);
END;
$$;
REVOKE ALL ON FUNCTION public.sortear_salas_matricula(INT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sortear_salas_matricula(INT, TEXT, BOOLEAN) TO authenticated;

-- ── 2027: abre hoje, fecha 31/01/2027; ETEC 1–4 e ENEM 5–8, 40 lugares ─────
-- Tudo ajustável na tela da equipe.
INSERT INTO public.matricula_turmas (ano, abre_em, fecha_em)
VALUES (2027, '2026-11-16 00:00:00-03', '2027-01-31 23:59:00-03')
ON CONFLICT (ano) DO NOTHING;

INSERT INTO public.matricula_salas (ano, sala, foco, capacidade)
SELECT 2027, g, CASE WHEN g <= 4 THEN 'ETEC' ELSE 'ENEM' END, 40
  FROM generate_series(1, 8) g
ON CONFLICT (ano, sala) DO NOTHING;
