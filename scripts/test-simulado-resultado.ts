/**
 * Simulado Pré-Etec: nota lançada, link público e conta da plataforma.
 * `npx tsx scripts/test-simulado-resultado.ts` — roda dentro de `npm test`.
 */
import { respostasDe } from "../src/lib/correcao-gabarito";
import { TITULO_DO_SIMULADO } from "../src/lib/matricula";
import {
  ANULADA_NA_PROVA, Conta, InscricaoParaConta, TITULO_DA_PROVA_DO_SIMULADO, avisoDaNota, chaveDoCorpo, chaveParaAProva,
  contagemDoResultado, contasParaConferirUso, escolherConta, faixaDaNota, itensDoCorpo, mesmaChave, questoesDoResultado,
  respostasParaAProva, situacaoNaProva,
} from "../src/lib/simulado-resultado";

let falhas = 0;
const eq = (n: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FALHA"} ${n}${ok ? "" : ` → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`}`);
};

eq("a prova na plataforma tem o mesmo título da inscrição", TITULO_DA_PROVA_DO_SIMULADO, TITULO_DO_SIMULADO);

// ── O que vai para exams / exam_attempts ────────────────────────────────────
const chave = respostasDe(["A", "B", null, "D", "*"]);
eq("gabarito da prova: anulada vira marcador explícito", chaveParaAProva(chave), ["A", "B", "*", "D", "*"]);
eq("respostas da prova: branco fica de fora", respostasParaAProva(respostasDe(["A", null, "C", "*", null])), [
  { q: 1, selected: "A" }, { q: 3, selected: "C" }, { q: 4, selected: "*" },
]);
eq("tela do aluno: certa, errada, branco, duas marcadas", ["A", "C", "", "*"].map((m) => situacaoNaProva("A", m)), ["certa", "errada", "branco", "anulada"]);
eq("tela do aluno: questão anulada vale ponto até em branco", [situacaoNaProva(ANULADA_NA_PROVA, ""), situacaoNaProva(ANULADA_NA_PROVA, "B")], ["certa", "certa"]);
eq("tela do aluno: gabarito vazio (prova antiga) NÃO vira ponto", situacaoNaProva("", "B"), "sem_gabarito");

// ── Link público ────────────────────────────────────────────────────────────
const qs = questoesDoResultado(chave, respostasDe(["A", "C", null, null, "AD"]));
eq("questões: marcada, gabarito e resultado", qs.map((q) => [q.n, q.marcada, q.gabarito, q.resultado]), [
  [1, "A", "A", "certa"], [2, "C", "B", "errada"], [3, null, null, "certa"], [4, null, "D", "branco"], [5, "*", null, "certa"],
]);
eq("contagem", contagemDoResultado(qs), { certas: 3, erradas: 1, brancos: 1, anuladas: 0 });
eq("faixa é proporcional ao total (48/50 e 35/50 são altas; 25/50 média; 10/50 baixa)", [faixaDaNota(48, 50), faixaDaNota(35, 50), faixaDaNota(25, 50), faixaDaNota(10, 50)], ["alta", "alta", "media", "baixa"]);

// ── O que a rota aceita ─────────────────────────────────────────────────────
eq("chave válida", chaveDoCorpo(["a", "B", "", "*"]), ["A", "B", null, "*"]);
eq("chave toda anulada é recusada", chaveDoCorpo([null, "*", ""]), null);
eq("chave vazia ou que não é lista é recusada", [chaveDoCorpo([]), chaveDoCorpo("ABC")], [null, null]);
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const itens = itensDoCorpo([{ matricula_id: U(1), respostas: ["A", "B"], perfil_id: U(9) }, { matricula_id: U(2), respostas: { "1": "c" }, perfil_id: "lixo" }], 3);
eq("itens: completa até o total e descarta conta inválida", itens.itens, [
  { matricula_id: U(1), respostas: ["A", "B", null], perfil_id: U(9) }, { matricula_id: U(2), respostas: ["C", null, null], perfil_id: null },
]);
eq("mesmo aluno em dois cartões é recusado", !!itensDoCorpo([{ matricula_id: U(1), respostas: [] }, { matricula_id: U(1), respostas: [] }], 2).erro, true);
eq("mesma conta para dois alunos é recusada", !!itensDoCorpo([{ matricula_id: U(1), perfil_id: U(9) }, { matricula_id: U(2), perfil_id: U(9) }], 2).erro, true);
eq("cartão sem aluno é recusado", !!itensDoCorpo([{ respostas: ["A"] }], 1).erro, true);
eq("lista vazia é recusada", !!itensDoCorpo([], 1).erro, true);
eq("mesma chave / chave diferente", [mesmaChave(["A", null, "*"], respostasDe(["A", null, "*"])), mesmaChave(["A", "B"], respostasDe(["A", "C"])), mesmaChave(["A"], respostasDe(["A", "B"]))], [true, false, false]);

// ── Achar a conta da plataforma ─────────────────────────────────────────────
const conta = (id: string, nome: string, x: Partial<Conta> = {}): Conta => ({ id, nome, login: `${id}@compromisso.com`, sala: null, nascimento: null, usada: null, ...x });
const insc = (nome: string, x: Partial<InscricaoParaConta> = {}): InscricaoParaConta => ({ id: "i", nome, nascimento: "2011-05-10", sala_origem: 3, ex_aluno: true, ...x });
const contas: Conta[] = [
  conta("a", "Lucas Oliveira Nascimento", { sala: "03" }),
  conta("b1", "Abner de Jesus Jales da Silva", { sala: "5", usada: false }),
  conta("b2", "Abner de Jesus Jales da Silva", { sala: "5", usada: true }),
  conta("c1", "Maria Eduarda Souza", { sala: "sala 2" }),
  conta("c2", "Maria Eduarda Souza", { sala: "3" }),
  conta("d", "João Pedro Lima", { nascimento: "2009-01-01" }),
  conta("e", "Ana Clara de Souza Lima", { nascimento: "2011-05-10" }),
  conta("f1", "Bruno Costa", { usada: true }), conta("f2", "Bruno Costa", { usada: true }),
];
const r = (i: InscricaoParaConta) => { const e = escolherConta(i, contas); return [e.situacao, e.conta?.id ?? null, e.candidatos.map((c) => c.id)]; };

eq("nome exato, sem acento e sem maiúscula, de quem é do cursinho", r(insc("LUCAS oliveira  nascimênto")), ["conta", "a", []]);
eq("duas contas, só uma já usada: fica com a usada", r(insc("Abner de Jesus Jales da Silva", { sala_origem: 5 })), ["conta", "b2", ["b1", "b2"]]);
eq("duas contas, a sala desempata", r(insc("Maria Eduarda Souza", { sala_origem: 2 })), ["conta", "c1", ["c1", "c2"]]);
eq("duas contas e nada desempata: a equipe escolhe", r(insc("Bruno Costa")), ["duvida", null, ["f1", "f2"]]);
eq("mesmo nome, outra data de nascimento no cadastro: nunca sozinha", r(insc("João Pedro Lima")), ["duvida", null, ["d"]]);
eq("não marcou 'estou no cursinho' e o nascimento não confirma: dúvida (pode ser homônimo de fora)", r(insc("Lucas Oliveira Nascimento", { ex_aluno: false })), ["duvida", null, ["a"]]);
eq("não marcou, mas nome e nascimento iguais: é ele", r(insc("Ana Clara de Souza Lima", { ex_aluno: false })), ["conta", "e", []]);
eq("nome parecido de quem é do cursinho: sugere, não decide", r(insc("Ana Clara Souza Lima")), ["duvida", null, ["e"]]);
eq("nome parecido de quem NÃO é do cursinho: sem conta", r(insc("Ana Clara Souza Lima", { ex_aluno: false })), ["sem_conta", null, []]);
eq("ninguém com esse nome", r(insc("Fulano Beltrano da Silva")), ["sem_conta", null, []]);
eq("pedaço do nome não acha (não entrega a nota de 'Pietro Gabriel' a 'Gabriel')", escolherConta(insc("Pedro Lima", { ex_aluno: false }), contas).situacao, "sem_conta");
eq("só confere 'já usou?' nas contas de nome repetido", contasParaConferirUso([insc("Abner de Jesus Jales da Silva"), insc("Lucas Oliveira Nascimento")], contas).sort(), ["b1", "b2"]);

eq("aviso do sininho", avisoDaNota(32, 50).body.includes("32 de 50"), true);

if (falhas) { console.error(`\n${falhas} falha(s)`); process.exit(1); }
console.log("\ntudo ok");
