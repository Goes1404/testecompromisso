/**
 * Leitura dos erros do GoTrue que a interface precisa tratar de forma especial.
 */

/**
 * O GoTrue recusa trocar a senha pela mesma que já está valendo
 * (`same_password`). Normalmente isso é um erro de verdade — mas no primeiro
 * acesso é o sintoma de um aluno que ficou preso: a senha dele já foi trocada
 * com sucesso no servidor e só o metadado `must_change_password` não chegou a
 * ser desligado (era o que o deadlock do lock de auth provocava, até 31/08).
 *
 * Ao voltar para a tela, esse aluno digita a senha que ele mesmo criou e leva um
 * "senha inválida" que não explica nada. Para ele, o passo já está cumprido: ele
 * tem uma senha própria. Daí a tela tratar este erro como sucesso e seguir.
 *
 * O código veio primeiro, a mensagem é rede de segurança: versões mais antigas
 * do GoTrue devolvem só o texto.
 */
export function ehMesmaSenha(erro: unknown): boolean {
  if (!erro || typeof erro !== "object") return false;
  const e = erro as { code?: unknown; message?: unknown };
  if (e.code === "same_password") return true;
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return msg.includes("should be different from the old password")
    || msg.includes("different from the old password");
}
