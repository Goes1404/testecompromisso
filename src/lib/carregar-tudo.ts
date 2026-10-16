/**
 * Carrega TODAS as linhas de uma consulta do Supabase, de página em página.
 *
 * O PostgREST devolve no máximo 1.000 linhas por pedido, em silêncio — sem
 * erro, sem aviso. A base passou disso (1.144 perfis com nome em 16/10), e as
 * listas da secretaria (Usuários, Matrículas, Gestão de Turmas) carregavam só o
 * começo do alfabeto: quem vinha depois de "Sara" não existia na busca, e a
 * secretaria achava que a conta não existia e tentava criar outra ("e-mail já
 * cadastrado").
 *
 * `consulta(de, ate)` monta o pedido de uma página com `.range(de, ate)`. A
 * ordem precisa ser estável e total (termine em `.order('id')`), senão uma
 * linha pode aparecer em duas páginas ou em nenhuma.
 */
export async function carregarTudo<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  opcoes: { pagina?: number; maximo?: number } = {},
): Promise<{ data: T[]; error: unknown }> {
  const pagina = opcoes.pagina ?? 1000;
  // Teto de segurança: um erro de ordenação não pode virar laço infinito.
  const maximo = opcoes.maximo ?? 50_000;
  const tudo: T[] = [];
  for (let de = 0; de < maximo; de += pagina) {
    const { data, error } = await consulta(de, de + pagina - 1);
    if (error) return { data: tudo, error };
    const linhas = data ?? [];
    tudo.push(...linhas);
    if (linhas.length < pagina) break;
  }
  return { data: tudo, error: null };
}

/** Texto para busca: minúsculas, sem acento. */
export function normalizarBusca(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * A busca da secretaria: todos os termos digitados precisam aparecer em algum
 * dos campos (nome, nome completo, e-mail de login, usuário), sem acento e sem
 * diferença de maiúscula. "maria messina" acha "Maria Eduarda de Oliveira
 * Messina"; "mariaemessina" acha pelo e-mail.
 */
export function bateComBusca(
  pessoa: { name?: string | null; full_name?: string | null; email?: string | null; username?: string | null },
  busca: string,
): boolean {
  const termos = normalizarBusca(busca).trim().split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;
  const campos = [pessoa.name, pessoa.full_name, pessoa.email, pessoa.username].map(normalizarBusca);
  return termos.every((t) => campos.some((c) => c.includes(t)));
}

/** Nome para mostrar: há contas antigas sem `name`; nunca mostrar vazio. */
export function nomeParaMostrar(pessoa: { name?: string | null; full_name?: string | null; email?: string | null }): string {
  return pessoa.name?.trim() || pessoa.full_name?.trim() || pessoa.email?.split("@")[0] || "Sem nome";
}
