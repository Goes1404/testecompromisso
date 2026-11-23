-- Simulado Pré-Etec: notas guardadas, consulta pública e vínculo com a conta
-- do aluno (pedido da coordenação, 23/11).
--
-- Até aqui a correção por foto vivia só na aba de quem corrigia (sessionStorage)
-- e saía em Excel. Agora "Lançar notas" grava:
--   1. `simulado_gabaritos`  — o gabarito certo do ano (um só, para todo mundo
--      que corrige usar o mesmo);
--   2. `simulado_resultados` — as marcações e a nota de cada inscrição, com a
--      conta da plataforma quando o aluno tem uma (`perfil_id`).
--
-- O aluno vê de dois jeitos:
--   a) link público `/resultado`: nome completo (ou nº de inscrição) + data de
--      nascimento, igual à consulta da inscrição → `resultado_do_simulado()`,
--      só service_role (a rota põe limite por IP na frente);
--   b) na plataforma: a rota de lançamento grava um `exam_attempts`
--      (source='teacher') na prova "Simulado Pré-Etec 2026", que já aparece em
--      Simulados → Resultados Oficiais.
--
-- Ninguém de fora lê as tabelas: SELECT só admin/staff, escrita só service_role
-- (rota `/api/admin/simulado/resultados`, com exigirAdmin). A FOTO do cartão
-- continua não sendo guardada — só as letras lidas.

CREATE TABLE IF NOT EXISTS public.simulado_gabaritos (
  ano            INT PRIMARY KEY,
  titulo         TEXT NOT NULL,
  -- ["A","C",null,"*",...]: índice 0 = questão 1; null ou "*" = questão anulada.
  chave          JSONB NOT NULL CHECK (jsonb_typeof(chave) = 'array'),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por UUID
);

CREATE TABLE IF NOT EXISTS public.simulado_resultados (
  matricula_id UUID PRIMARY KEY REFERENCES public.matriculas(id) ON DELETE CASCADE,
  ano          INT NOT NULL,
  -- O que o aluno marcou: "A".."E", null = em branco, "*" = duas ou mais.
  respostas    JSONB NOT NULL CHECK (jsonb_typeof(respostas) = 'array'),
  acertos      INT NOT NULL CHECK (acertos >= 0),
  total        INT NOT NULL CHECK (total > 0 AND acertos <= total),
  -- Conta da plataforma em que a nota também aparece (NULL = só no link).
  perfil_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lancado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  lancado_por  UUID
);
CREATE INDEX IF NOT EXISTS idx_simulado_resultados_ano ON public.simulado_resultados(ano);
-- Uma conta recebe a nota de UMA inscrição: duas no mesmo perfil seria a nota de outro aluno.
CREATE UNIQUE INDEX IF NOT EXISTS uq_simulado_resultados_perfil ON public.simulado_resultados(ano, perfil_id) WHERE perfil_id IS NOT NULL;

ALTER TABLE public.simulado_gabaritos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_resultados ENABLE ROW LEVEL SECURITY;

-- Só leitura para a equipe; gravação só pelo servidor (service_role ignora RLS).
DROP POLICY IF EXISTS simulado_gabaritos_ler ON public.simulado_gabaritos;
CREATE POLICY simulado_gabaritos_ler ON public.simulado_gabaritos FOR SELECT TO authenticated
  USING (public.pode_gerir_matricula());
DROP POLICY IF EXISTS simulado_resultados_ler ON public.simulado_resultados;
CREATE POLICY simulado_resultados_ler ON public.simulado_resultados FOR SELECT TO authenticated
  USING (public.pode_gerir_matricula());

REVOKE ALL ON public.simulado_gabaritos, public.simulado_resultados FROM anon;

-- ── Consulta pública do resultado ──────────────────────────────────────────
-- Mesma chave da consulta da inscrição: nome completo exato (sem acento, sem
-- maiúscula) OU o número de inscrição, sempre com a data de nascimento.
-- NULL = não existe inscrição com esses dados. `respostas` NULL = a inscrição
-- existe, mas a nota ainda não foi lançada (ou o aluno faltou).
-- Devolve só primeiro nome, nº, sala e as marcações: nada de celular, escola
-- ou responsável. A conta (certo/errado) é feita no servidor, em TypeScript,
-- com o mesmo `corrigir()` da tela da equipe — uma regra só.
CREATE OR REPLACE FUNCTION public.resultado_do_simulado(p_ano INT, p_busca TEXT, p_nascimento DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_busca TEXT := btrim(coalesce(p_busca, ''));
  v_prot  TEXT;
  v_res   JSONB;
BEGIN
  IF v_busca = '' OR p_nascimento IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_busca ~ '^[0-9]{4}[- ]?[0-9]{1,4}$' AND left(v_busca, 4) = p_ano::text THEN
    v_prot := p_ano::text || '-' || lpad(regexp_replace(substr(v_busca, 5), '[^0-9]', '', 'g'), 4, '0');
  ELSIF v_busca ~ '^[0-9]{1,4}$' THEN
    v_prot := p_ano::text || '-' || lpad(v_busca, 4, '0');
  END IF;

  -- Quem tem nota vem primeiro: uma inscrição cancelada e refeita não pode
  -- esconder o resultado da que valeu.
  SELECT jsonb_build_object(
           'protocolo', m.protocolo,
           'primeiro_nome', split_part(btrim(m.nome), ' ', 1),
           'sala', m.sala,
           'respostas', r.respostas,
           'lancado_em', r.lancado_em
         )
    INTO v_res
    FROM public.matriculas m
    LEFT JOIN public.simulado_resultados r ON r.matricula_id = m.id
   WHERE m.ano = p_ano AND m.nascimento = p_nascimento
     AND (m.protocolo = v_prot OR public.normalizar_nome(m.nome) = public.normalizar_nome(v_busca))
   ORDER BY (r.matricula_id IS NULL), (m.status = 'cancelada'), m.numero DESC
   LIMIT 1;

  RETURN v_res;
END;
$$;
REVOKE ALL ON FUNCTION public.resultado_do_simulado(INT, TEXT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resultado_do_simulado(INT, TEXT, DATE) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resultado_do_simulado(INT, TEXT, DATE) TO service_role;
