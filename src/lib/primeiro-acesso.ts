/**
 * Regras da busca do primeiro acesso (`/primeiro-acesso`, link de convite em
 * massa). Puras, para caber em `scripts/test-primeiro-acesso.ts`.
 *
 * O que estava errado até 16/10 (143 logins recusados contra 32 aceitos em 24 h):
 *
 * 1. A busca casava PEDAÇO do nome (`ilike %nome%`) e pegava a primeira linha,
 *    sem ordem: "Gabriel de Souza" podia devolver o login de "Pietro Gabriel de
 *    Souza". 370 alunos tinham o nome contido no de outro.
 * 2. Com contas duplicadas (322 alunos com nome idêntico a outra conta), entregava
 *    uma delas ao acaso.
 * 3. A tela dizia "senha padrão: compromisso2026" para todo mundo; 1 em cada 4
 *    alunos ativos já não tinha essa senha.
 *
 * Agora: nome completo EXATO (sem acento, sem diferença de maiúscula, espaços
 * normalizados) ou o login; duas ou mais contas → a tela não escolhe; e o
 * servidor confere se a conta ainda usa a senha padrão antes de mostrá-la.
 */

export const DOMINIO_DO_LOGIN = "compromisso.com";

/** Espelho de `public.normalizar_nome()` (migration 20261016150000). */
export function normalizarNome(nome: string | null | undefined): string {
  return (nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Se o que foi digitado é um login, devolve o e-mail completo. Aceita
 * "mariaemessina", "mariaemessina@compromisso.com" e "MariaEMessina " (o
 * celular põe maiúscula e espaço). Uma palavra só também pode ser um nome de
 * uma palavra; quem chama busca pelos dois.
 */
export function loginDigitado(entrada: string | null | undefined): string | null {
  const t = (entrada ?? "").trim().toLowerCase();
  if (!t || /\s/.test(t)) return null;
  if (t.includes("@")) return /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(t) ? t : null;
  return /^[a-z0-9._-]{2,64}$/.test(t) ? `${t}@${DOMINIO_DO_LOGIN}` : null;
}

export type ContaAchada = { email: string; nome: string | null; usa_senha_padrao: boolean };

export type ResultadoDaBusca =
  | { encontrado: "nenhum" }
  | { encontrado: "um"; user: { email: string; name: string }; senhaPadrao: boolean }
  | { encontrado: "varios"; quantidade: number };

/** Decide o que a tela mostra a partir das contas que bateram EXATAMENTE. */
export function resultadoDaBusca(contas: ContaAchada[], nomeDigitado: string): ResultadoDaBusca {
  const unicas = [...new Map(contas.map((c) => [c.email.toLowerCase(), c])).values()];
  if (unicas.length === 0) return { encontrado: "nenhum" };
  if (unicas.length === 1) {
    const c = unicas[0];
    return {
      encontrado: "um",
      user: { email: c.email, name: c.nome?.trim() || nomeDigitado.trim() },
      senhaPadrao: c.usa_senha_padrao,
    };
  }
  return { encontrado: "varios", quantidade: unicas.length };
}

/**
 * Logins candidatos quando o nome já tem conta e o aluno pediu uma conta nova:
 * `base@`, `base2@`, `base3@`… O servidor tenta em ordem até achar um livre.
 */
export function emailsCandidatos(emailBase: string, maximo = 20): string[] {
  const [local, dominio] = emailBase.split("@");
  if (!local || !dominio) return [];
  const lista = [emailBase];
  for (let i = 2; i <= maximo; i++) lista.push(`${local}${i}@${dominio}`);
  return lista;
}
