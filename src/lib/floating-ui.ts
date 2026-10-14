/**
 * Botões flutuantes (Aurora e Feedback) no celular.
 *
 * No celular os dois ficam no canto direito, por cima do conteúdo. Em telas de
 * digitação (chat, suporte, fórum, sala de aula, prova, leitor de livro) eles
 * caíam exatamente em cima do botão de enviar e do campo de texto — o aluno
 * tocava no robô querendo enviar a mensagem. Nessas telas eles somem abaixo de
 * `lg`; no computador continuam onde sempre estiveram.
 */
export function escondeFlutuantesNoCelular(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return (
    p.includes("/chat/") ||
    p.includes("/support") ||
    p.includes("/forum/") ||
    p.includes("/classroom/") ||
    p.includes("/library/book/") ||
    p.includes("/teacher/live/") ||
    // Sala do aluno: tem o campo de dúvidas para o professor (não a lista).
    p.startsWith("/dashboard/live/") ||
    (p.includes("/student/provas/") && p !== "/dashboard/student/provas")
  );
}

/**
 * Telas em que os flutuantes somem também no computador. Na aula ao vivo o
 * chat fica no canto direito, e os botões caíam em cima do "enviar".
 */
export function escondeFlutuantesSempre(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return p.startsWith("/dashboard/live/") || p.startsWith("/dashboard/teacher/live/");
}
