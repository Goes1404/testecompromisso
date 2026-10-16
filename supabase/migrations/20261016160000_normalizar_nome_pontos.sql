-- Nome abreviado com ponto ("Samuel A.Rosa") não batia com nada: o ponto
-- grudava as palavras. Agora ponto vira espaço, como no TS (normalizarNome).
-- A busca do primeiro acesso também passou a procurar pelo login que o nome
-- digitado gera (src/app/api/student/primeiro-acesso/route.ts).
CREATE OR REPLACE FUNCTION public.normalizar_nome(p text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT btrim(regexp_replace(
    translate(lower(coalesce(p, '')),
      'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ.',
      'aaaaaaeeeeiiiiooooouuuucnyy '),
    '\s+', ' ', 'g'))
$$;
