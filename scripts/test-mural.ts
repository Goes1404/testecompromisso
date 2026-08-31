/**
 * Testes do mural (anúncios e pedidos de trabalho).
 * `npx tsx scripts/test-mural.ts`
 *
 * O que está sob teste é a conta de prazo: ela decide o que "pega fogo", e o
 * contador do menu e o card do aluno precisam chegar ao mesmo número. O caso da
 * hora tardia existe porque `entrega_em` é DATE — lida como UTC, uma entrega de
 * sábado vira sexta para quem abre o app às 22h em Brasília.
 */
import { prazoDoTrabalho, estaPegandoFogo, questoesDeTexto, ordenarMural, normalizarQuestoes, pendentesParaHome } from '../src/lib/mural';

let falhas = 0;
const eq = (nome: string, obtido: any, esperado: any) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
};

// 31/08 às 22h — hora tardia é justamente onde o UTC estragaria a conta.
const agora = new Date(2026, 7, 31, 22, 30);

eq("entrega no sábado 05/09 → faltam 5 dias", prazoDoTrabalho("2026-09-05", agora)!.rotulo, "Faltam 5 dias");
eq("entrega hoje", prazoDoTrabalho("2026-08-31", agora)!.rotulo, "Entrega é hoje");
eq("entrega amanhã", prazoDoTrabalho("2026-09-01", agora)!.rotulo, "Entrega é amanhã");
eq("ontem → encerrado", prazoDoTrabalho("2026-08-30", agora)!.encerrado, true);
eq("ontem → rótulo", prazoDoTrabalho("2026-08-30", agora)!.rotulo, "Prazo encerrado ontem");
eq("hoje ainda não encerrou", prazoDoTrabalho("2026-08-31", agora)!.encerrado, false);
eq("d+3 é urgente", prazoDoTrabalho("2026-09-03", agora)!.urgente, true);
eq("d+4 não é urgente", prazoDoTrabalho("2026-09-04", agora)!.urgente, false);
eq("vencido não é urgente", prazoDoTrabalho("2026-08-25", agora)!.urgente, false);
eq("sem data → null", prazoDoTrabalho(null, agora), null);
eq("timestamp completo é aceito", prazoDoTrabalho("2026-09-05T00:00:00+00:00", agora)!.dias, 5);

eq("fixado pega fogo sem prazo", estaPegandoFogo({ destaque: true, entrega_em: null }, agora), true);
eq("prazo apertado pega fogo", estaPegandoFogo({ destaque: false, entrega_em: "2026-09-02" }, agora), true);
eq("prazo longe não pega fogo", estaPegandoFogo({ destaque: false, entrega_em: "2026-10-01" }, agora), false);
eq("anúncio comum não pega fogo", estaPegandoFogo({ destaque: false, entrega_em: null }, agora), false);

eq("tira a numeração colada do WhatsApp",
  questoesDeTexto("1. O que é bullying?\n\n2) Quais fatores levam a isso?\n3 - E os exemplos?\n"),
  ["O que é bullying?", "Quais fatores levam a isso?", "E os exemplos?"]);
eq("ano no começo da questão sobrevive", questoesDeTexto("2024 foi o ano da lei; comente."), ["2024 foi o ano da lei; comente."]);
eq("linha sem número passa inteira", questoesDeTexto("Explique com suas palavras."), ["Explique com suas palavras."]);
eq("questoes não-array viram lista vazia", normalizarQuestoes("1. algo"), []);
eq("questoes com lixo são limpas", normalizarQuestoes(["  a  ", "", null, "b"]), ["a", "b"]);

const p = (id: string, extra: any) => ({
  id, tipo: "trabalho", titulo: id, tema: null, descricao: "x", questoes: [], instrucoes: null,
  imagem_url: null, ativo: true, autor_id: null, autor_nome: null,
  created_at: "2026-08-20T10:00:00Z", updated_at: "2026-08-20T10:00:00Z",
  destaque: false, entrega_em: null, ...extra,
}) as any;

eq("ordem: fixado, prazo mais curto, vencido no fim",
  ordenarMural([
    p("vencido",  { entrega_em: "2026-08-01" }),
    p("longe",    { entrega_em: "2026-10-01" }),
    p("perto",    { entrega_em: "2026-09-02" }),
    p("fixado",   { destaque: true, entrega_em: "2026-12-01" }),
  ], agora).map(x => x.id),
  ["fixado", "perto", "longe", "vencido"]);

eq("sem prazo, o mais novo primeiro",
  ordenarMural([
    p("antigo", { tipo: "anuncio", created_at: "2026-08-10T10:00:00Z" }),
    p("novo",   { tipo: "anuncio", created_at: "2026-08-30T10:00:00Z" }),
  ], agora).map(x => x.id),
  ["novo", "antigo"]);

// ── Aviso da home ───────────────────────────────────────────────────────────
const trab = (id: string, extra: any) => p(id, { tipo: "trabalho", ...extra });

eq("mostra o trabalho aberto que o aluno não fez",
  pendentesParaHome([trab("pesquisa", { entrega_em: "2026-09-05" })], [], agora).map(x => x.id),
  ["pesquisa"]);

eq("some assim que ele marca 'já fiz'",
  pendentesParaHome([trab("pesquisa", { entrega_em: "2026-09-05" })], ["pesquisa"], agora),
  []);

eq("anúncio nunca vira cobrança",
  pendentesParaHome([p("cartaz", { tipo: "anuncio", destaque: true })], [], agora),
  []);

eq("trabalho arquivado não cobra",
  pendentesParaHome([trab("velho", { entrega_em: "2026-09-05", ativo: false })], [], agora),
  []);

eq("atrasado há 3 dias ainda cobra",
  pendentesParaHome([trab("atrasado", { entrega_em: "2026-08-28" })], [], agora).map(x => x.id),
  ["atrasado"]);

eq("atrasado há 8 dias para de cobrar",
  pendentesParaHome([trab("antigo", { entrega_em: "2026-08-23" })], [], agora),
  []);

eq("sem data de entrega, cobra até ser arquivado",
  pendentesParaHome([trab("sem-data", {})], [], agora).map(x => x.id),
  ["sem-data"]);

eq("o mais urgente vem primeiro",
  pendentesParaHome([
    trab("longe", { entrega_em: "2026-09-20" }),
    trab("amanha", { entrega_em: "2026-09-01" }),
    trab("semana", { entrega_em: "2026-09-05" }),
  ], [], agora).map(x => x.id),
  ["amanha", "semana", "longe"]);

console.log(falhas === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
