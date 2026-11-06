-- Simulado presencial: inscrição pela plataforma e sorteio de salas.
--
-- Pedido da coordenação (06/11) para o simulado de 14/11: o aluno é obrigado a
-- se inscrever na plataforma (08 a 11/11), a secretaria sorteia as salas e a
-- sala sai para o aluno a partir de 12/11. No dia ele leva o RG original e a
-- ficha de inscrição. Quem chegar sem inscrição ou sem documento vai para as
-- salas de reserva (prédio do fundo), que ficam FORA do sorteio.
--
-- Decisões:
--
-- 1. **O aluno não toca nas tabelas.** Inscrição e consulta passam por funções
--    SECURITY DEFINER. Assim a janela (abre/fecha), o público (ENEM/ETEC) e a
--    numeração ficam no banco, e a sala sorteada só aparece para o aluno depois
--    de `salas_divulgadas_em` — mesmo que a secretaria sorteie antes.
-- 2. **Número de inscrição é sequencial por simulado** e sai com a linha do
--    simulado travada (`FOR UPDATE`): 1.000 alunos clicando no sábado à noite
--    não podem ganhar o mesmo número.
-- 3. **Sorteio = ordem aleatória preenchendo as salas na ordem cadastrada.**
--    Encher sala por sala usa o mínimo de salas e fiscais; a aleatoriedade está
--    em quem cai onde. A carteira é a posição de cada um dentro da sala.
-- 4. **Sortear de novo depois da divulgação exige `p_forcar`**: o aluno já pode
--    ter anotado a sala. Para quem entrou depois do sorteio existe
--    `p_so_sem_sala`, que só encaixa os que estão sem sala nas vagas que sobraram.
-- 5. Papel sai de `profiles.role` (nunca do claim `user_role`, que é null aqui).
--    Gerir = admin/staff (coordenação e secretaria).

-- ── Tabelas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.simulados_presenciais (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo               TEXT NOT NULL CHECK (length(btrim(titulo)) BETWEEN 3 AND 160),
  aplicado_em          DATE NOT NULL,
  horario              TEXT,
  local                TEXT,
  publico              TEXT NOT NULL DEFAULT 'todos' CHECK (publico IN ('todos', 'ENEM', 'ETEC')),
  inscricao_abre       TIMESTAMPTZ NOT NULL,
  inscricao_fecha      TIMESTAMPTZ NOT NULL,
  salas_divulgadas_em  TIMESTAMPTZ NOT NULL,
  instrucoes           TEXT,
  sorteado_em          TIMESTAMPTZ,
  ativo                BOOLEAN NOT NULL DEFAULT true,
  criado_por           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT simulados_presenciais_janela CHECK (inscricao_fecha > inscricao_abre)
);

COMMENT ON TABLE public.simulados_presenciais IS
  'Simulado aplicado no cursinho com inscricao obrigatoria pela plataforma e sala sorteada.';
COMMENT ON COLUMN public.simulados_presenciais.salas_divulgadas_em IS
  'A partir deste instante o aluno ve a propria sala e carteira. Antes disso o sorteio fica so com a equipe.';

CREATE TABLE IF NOT EXISTS public.simulado_salas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id  UUID NOT NULL REFERENCES public.simulados_presenciais(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 60),
  predio       TEXT,
  capacidade   INT NOT NULL CHECK (capacidade BETWEEN 1 AND 500),
  reserva      BOOLEAN NOT NULL DEFAULT false,
  ordem        INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT simulado_salas_nome_unico UNIQUE (simulado_id, nome)
);

COMMENT ON COLUMN public.simulado_salas.reserva IS
  'Sala para quem chega sem inscricao ou sem documento. Fica fora do sorteio.';

CREATE TABLE IF NOT EXISTS public.simulado_inscricoes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id  UUID NOT NULL REFERENCES public.simulados_presenciais(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero       INT NOT NULL,
  nome         TEXT NOT NULL,
  foco         TEXT,
  turma        TEXT,
  sala_id      UUID REFERENCES public.simulado_salas(id) ON DELETE SET NULL,
  carteira     INT,
  origem       TEXT NOT NULL DEFAULT 'aluno' CHECK (origem IN ('aluno', 'secretaria')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT simulado_inscricoes_um_por_aluno UNIQUE (simulado_id, user_id),
  CONSTRAINT simulado_inscricoes_numero_unico UNIQUE (simulado_id, numero)
);

COMMENT ON COLUMN public.simulado_inscricoes.nome IS
  'Nome congelado na inscricao: e o que sai na ficha e na lista de presenca da sala.';

CREATE INDEX IF NOT EXISTS simulado_inscricoes_sala_idx ON public.simulado_inscricoes (sala_id);
CREATE INDEX IF NOT EXISTS simulado_salas_simulado_idx ON public.simulado_salas (simulado_id, ordem);

CREATE OR REPLACE FUNCTION public.simulados_presenciais_touch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_simulados_presenciais_touch ON public.simulados_presenciais;
CREATE TRIGGER trg_simulados_presenciais_touch
  BEFORE UPDATE ON public.simulados_presenciais
  FOR EACH ROW EXECUTE FUNCTION public.simulados_presenciais_touch();

-- ── Quem gere ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pode_gerir_simulado()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('admin', 'staff')
  );
$$;
REVOKE ALL ON FUNCTION public.pode_gerir_simulado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_gerir_simulado() TO authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.simulados_presenciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_salas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_inscricoes   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS simulados_presenciais_select ON public.simulados_presenciais;
CREATE POLICY simulados_presenciais_select ON public.simulados_presenciais
  FOR SELECT TO authenticated USING (ativo OR public.pode_gerir_simulado());

DROP POLICY IF EXISTS simulados_presenciais_gerir ON public.simulados_presenciais;
CREATE POLICY simulados_presenciais_gerir ON public.simulados_presenciais
  FOR ALL TO authenticated
  USING (public.pode_gerir_simulado()) WITH CHECK (public.pode_gerir_simulado());

-- Salas e inscrições: só a equipe lê direto. O aluno vê a dele pela função,
-- que esconde a sala até a data de divulgação.
DROP POLICY IF EXISTS simulado_salas_gerir ON public.simulado_salas;
CREATE POLICY simulado_salas_gerir ON public.simulado_salas
  FOR ALL TO authenticated
  USING (public.pode_gerir_simulado()) WITH CHECK (public.pode_gerir_simulado());

-- Sem policy de INSERT: inscrição nova só pelas funções (número sequencial).
DROP POLICY IF EXISTS simulado_inscricoes_ler ON public.simulado_inscricoes;
CREATE POLICY simulado_inscricoes_ler ON public.simulado_inscricoes
  FOR SELECT TO authenticated USING (public.pode_gerir_simulado());

DROP POLICY IF EXISTS simulado_inscricoes_mover ON public.simulado_inscricoes;
CREATE POLICY simulado_inscricoes_mover ON public.simulado_inscricoes
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_simulado()) WITH CHECK (public.pode_gerir_simulado());

DROP POLICY IF EXISTS simulado_inscricoes_apagar ON public.simulado_inscricoes;
CREATE POLICY simulado_inscricoes_apagar ON public.simulado_inscricoes
  FOR DELETE TO authenticated USING (public.pode_gerir_simulado());

-- ── O que o aluno vê ───────────────────────────────────────────────────────
-- Simulados ativos que ainda não passaram (data de Brasília), com a inscrição
-- do aluno quando existe. Sala e carteira só depois da divulgação.
CREATE OR REPLACE FUNCTION public.simulados_presenciais_do_aluno()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(item ORDER BY (item->>'aplicado_em')), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'titulo', s.titulo,
      'aplicado_em', s.aplicado_em,
      'horario', s.horario,
      'local', s.local,
      'publico', s.publico,
      'inscricao_abre', s.inscricao_abre,
      'inscricao_fecha', s.inscricao_fecha,
      'salas_divulgadas_em', s.salas_divulgadas_em,
      'instrucoes', s.instrucoes,
      'agora', now(),
      'elegivel', (s.publico = 'todos' OR public.foco_normalizado(p.exam_target) = s.publico),
      'inscricao', CASE WHEN i.id IS NULL THEN NULL ELSE jsonb_build_object(
        'numero', i.numero,
        'nome', i.nome,
        'turma', i.turma,
        'inscrito_em', i.created_at,
        'sala', CASE WHEN now() >= s.salas_divulgadas_em THEN sa.nome END,
        'predio', CASE WHEN now() >= s.salas_divulgadas_em THEN sa.predio END,
        'carteira', CASE WHEN now() >= s.salas_divulgadas_em THEN i.carteira END
      ) END
    ) AS item
    FROM public.simulados_presenciais s
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    LEFT JOIN public.simulado_inscricoes i ON i.simulado_id = s.id AND i.user_id = auth.uid()
    LEFT JOIN public.simulado_salas sa ON sa.id = i.sala_id
    WHERE s.ativo
      AND auth.uid() IS NOT NULL
      AND s.aplicado_em >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
  ) x;
$$;
REVOKE ALL ON FUNCTION public.simulados_presenciais_do_aluno() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.simulados_presenciais_do_aluno() TO authenticated;

-- ── Inscrição (núcleo, sem checagem de quem chama) ─────────────────────────
CREATE OR REPLACE FUNCTION public._inscrever_no_simulado(p_simulado UUID, p_user UUID, p_origem TEXT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_s   public.simulados_presenciais%ROWTYPE;
  v_p   public.profiles%ROWTYPE;
  v_num INT;
BEGIN
  -- Trava o simulado: serializa a numeração.
  SELECT * INTO v_s FROM public.simulados_presenciais WHERE id = p_simulado FOR UPDATE;
  IF NOT FOUND OR NOT v_s.ativo THEN
    RAISE EXCEPTION 'Simulado não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  SELECT numero INTO v_num FROM public.simulado_inscricoes
   WHERE simulado_id = p_simulado AND user_id = p_user;
  IF FOUND THEN
    RETURN v_num; -- já inscrito: clicar duas vezes não é erro
  END IF;

  SELECT * INTO v_p FROM public.profiles WHERE id = p_user;
  IF NOT FOUND OR v_p.role::text <> 'student' OR v_p.arquivado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Só alunos ativos podem se inscrever.' USING ERRCODE = 'P0001';
  END IF;

  IF p_origem = 'aluno' THEN
    IF now() < v_s.inscricao_abre THEN
      RAISE EXCEPTION 'As inscrições ainda não abriram.' USING ERRCODE = 'P0001';
    END IF;
    IF now() > v_s.inscricao_fecha THEN
      RAISE EXCEPTION 'As inscrições já encerraram. Procure a secretaria.' USING ERRCODE = 'P0001';
    END IF;
    IF v_s.publico <> 'todos' AND public.foco_normalizado(v_p.exam_target) IS DISTINCT FROM v_s.publico THEN
      RAISE EXCEPTION 'Este simulado é só para alunos %.', v_s.publico USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT coalesce(max(numero), 0) + 1 INTO v_num
    FROM public.simulado_inscricoes WHERE simulado_id = p_simulado;

  INSERT INTO public.simulado_inscricoes (simulado_id, user_id, numero, nome, foco, turma, origem)
  VALUES (
    p_simulado, p_user, v_num,
    coalesce(nullif(btrim(v_p.full_name), ''), nullif(btrim(v_p.name), ''), 'Aluno'),
    public.foco_normalizado(v_p.exam_target),
    public.sala_normalizada(v_p.sala),
    p_origem
  );
  RETURN v_num;
END;
$$;
REVOKE ALL ON FUNCTION public._inscrever_no_simulado(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._inscrever_no_simulado(UUID, UUID, TEXT) FROM authenticated, anon;

-- O aluno se inscreve (dentro da janela, do público certo).
CREATE OR REPLACE FUNCTION public.inscrever_no_simulado(p_simulado UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para se inscrever.' USING ERRCODE = 'P0001';
  END IF;
  RETURN public._inscrever_no_simulado(p_simulado, auth.uid(), 'aluno');
END;
$$;
REVOKE ALL ON FUNCTION public.inscrever_no_simulado(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inscrever_no_simulado(UUID) TO authenticated;

-- A secretaria inscreve um aluno (fora da janela também: é o balcão).
CREATE OR REPLACE FUNCTION public.inscrever_aluno_no_simulado(p_simulado UUID, p_user UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.pode_gerir_simulado() THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE = '42501';
  END IF;
  RETURN public._inscrever_no_simulado(p_simulado, p_user, 'secretaria');
END;
$$;
REVOKE ALL ON FUNCTION public.inscrever_aluno_no_simulado(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inscrever_aluno_no_simulado(UUID, UUID) TO authenticated;

-- ── Sorteio ────────────────────────────────────────────────────────────────
-- p_so_sem_sala = true: mantém quem já tem sala e encaixa os demais nas vagas.
-- p_forcar = true: permite refazer tudo depois da divulgação.
CREATE OR REPLACE FUNCTION public.sortear_salas_do_simulado(
  p_simulado UUID,
  p_so_sem_sala BOOLEAN DEFAULT false,
  p_forcar BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_s          public.simulados_presenciais%ROWTYPE;
  v_alocados   INT;
  v_sem_lugar  INT;
BEGIN
  IF NOT public.pode_gerir_simulado() THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_s FROM public.simulados_presenciais WHERE id = p_simulado FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulado não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  IF NOT p_so_sem_sala AND NOT p_forcar AND v_s.sorteado_em IS NOT NULL AND now() >= v_s.salas_divulgadas_em THEN
    RAISE EXCEPTION 'As salas já foram divulgadas aos alunos. Refazer o sorteio muda a sala de quem já anotou.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.simulado_salas WHERE simulado_id = p_simulado AND NOT reserva) THEN
    RAISE EXCEPTION 'Cadastre pelo menos uma sala (fora das de reserva) antes de sortear.' USING ERRCODE = 'P0001';
  END IF;

  IF NOT p_so_sem_sala THEN
    UPDATE public.simulado_inscricoes SET sala_id = NULL, carteira = NULL
     WHERE simulado_id = p_simulado;
  ELSE
    -- Quem estava numa sala que virou reserva (ou foi apagada) volta para a fila.
    UPDATE public.simulado_inscricoes i SET sala_id = NULL, carteira = NULL
      FROM public.simulado_salas sa
     WHERE i.simulado_id = p_simulado AND i.sala_id = sa.id AND sa.reserva;
  END IF;

  WITH vagas AS (
    SELECT sa.id, sa.ordem, sa.nome,
           sa.capacidade - count(i.id)::int AS livres,
           coalesce(max(i.carteira), 0) AS ultima
      FROM public.simulado_salas sa
      LEFT JOIN public.simulado_inscricoes i ON i.sala_id = sa.id
     WHERE sa.simulado_id = p_simulado AND NOT sa.reserva
     GROUP BY sa.id
  ),
  lugares AS (
    SELECT v.id AS sala_id, v.ultima + g AS carteira,
           row_number() OVER (ORDER BY v.ordem, v.nome, g) AS pos
      FROM vagas v
      CROSS JOIN LATERAL generate_series(1, greatest(v.livres, 0)) g
  ),
  fila AS (
    SELECT id, row_number() OVER (ORDER BY random()) AS pos
      FROM public.simulado_inscricoes
     WHERE simulado_id = p_simulado AND sala_id IS NULL
  )
  UPDATE public.simulado_inscricoes i
     SET sala_id = l.sala_id, carteira = l.carteira
    FROM fila f JOIN lugares l ON l.pos = f.pos
   WHERE i.id = f.id;
  GET DIAGNOSTICS v_alocados = ROW_COUNT;

  SELECT count(*) INTO v_sem_lugar FROM public.simulado_inscricoes
   WHERE simulado_id = p_simulado AND sala_id IS NULL;

  UPDATE public.simulados_presenciais SET sorteado_em = now() WHERE id = p_simulado;

  RETURN jsonb_build_object('alocados', v_alocados, 'sem_lugar', v_sem_lugar);
END;
$$;
REVOKE ALL ON FUNCTION public.sortear_salas_do_simulado(UUID, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sortear_salas_do_simulado(UUID, BOOLEAN, BOOLEAN) TO authenticated;
