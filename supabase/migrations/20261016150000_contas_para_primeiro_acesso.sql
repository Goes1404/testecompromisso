-- ============================================================
-- Busca do primeiro acesso: nome EXATO ou login, e se a conta ainda usa a
-- senha padrão. Regras e motivo em src/lib/primeiro-acesso.ts.
--
-- Antes (até 16/10) a rota fazia `name ilike %nome%` com limit 1 e sem ordem,
-- e a tela mostrava a senha padrão para qualquer conta achada: 143 logins
-- recusados contra 32 aceitos em 24 h.
--
-- Só o servidor (service_role) chama esta função: ela compara a senha
-- guardada com a padrão, e isso não pode ficar ao alcance do navegador.
-- ============================================================

-- Espelho de normalizarNome() em TS: minúsculas, sem acento, espaços únicos.
-- A tradução é explícita (e não `unaccent`) para ser IMMUTABLE e bater com o TS.
CREATE OR REPLACE FUNCTION public.normalizar_nome(p text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT btrim(regexp_replace(
    translate(lower(coalesce(p, '')),
      'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
      'aaaaaaeeeeiiiiooooouuuucnyy'),
    '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.contas_para_primeiro_acesso(
  p_nome text,
  p_login text,
  p_senha_padrao text
)
RETURNS TABLE (email text, nome text, usa_senha_padrao boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH achados AS (
    SELECT p.id, p.email::text AS email,
           coalesce(nullif(btrim(p.name), ''), p.full_name)::text AS nome
    FROM public.profiles p
    WHERE p.arquivado_em IS NULL
      AND p.email IS NOT NULL
      AND (
        (p_login IS NOT NULL AND lower(p.email) = lower(btrim(p_login)))
        OR (
          nullif(public.normalizar_nome(p_nome), '') IS NOT NULL
          AND public.normalizar_nome(coalesce(nullif(btrim(p.name), ''), p.full_name))
              = public.normalizar_nome(p_nome)
        )
      )
    ORDER BY p.email
    LIMIT 6
  )
  SELECT a.email, a.nome,
         coalesce(p_senha_padrao <> ''
           AND u.encrypted_password = extensions.crypt(p_senha_padrao, u.encrypted_password), false)
  FROM achados a
  JOIN auth.users u ON u.id = a.id;
END;
$$;

REVOKE ALL ON FUNCTION public.contas_para_primeiro_acesso(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contas_para_primeiro_acesso(text, text, text) TO service_role;
