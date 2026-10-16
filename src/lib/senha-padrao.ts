/**
 * Senha inicial das contas criadas pela secretaria. SÓ SERVIDOR.
 *
 * Vem de `SENHA_PADRAO_INICIAL` quando definida (é a rotação pendente no
 * CLAUDE.md: trocar a variável troca a senha de quem for criado dali em diante
 * e o que a tela de primeiro acesso mostra). Sem a variável, vale a histórica.
 * Contas novas nascem com troca obrigatória, então ela vale só até o 1º login.
 */
export const SENHA_PADRAO: string = process.env.SENHA_PADRAO_INICIAL?.trim() || 'compromisso2026';
