/**
 * Correção do simulado por foto: leitura → correção → achar o aluno.
 * `npx tsx scripts/test-correcao-gabarito.ts` — roda dentro de `npm test`.
 */
import { marca, respostasDe, corrigir, acharAluno, semelhanca, Inscrito, linhaDoResultado } from "../src/lib/correcao-gabarito";

let falhas = 0;
const eq = (n: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FALHA"} ${n}${ok ? "" : ` → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`}`);
};

eq("marcas", ["a", " B ", "", "-", "AC", "A,C", "*", "F", null].map(marca), ["A", "B", null, null, "*", "*", "*", null, null]);
eq("respostas de objeto, completa até o total", respostasDe({ "1": "A", "3": "c" }, 4), ["A", null, "C", null]);
eq("respostas de lista, corta no total", respostasDe(["A", "B", "C"], 2), ["A", "B"]);

const chave = respostasDe(["A", "B", "C", "D", "E", null]);
const c = corrigir(chave, respostasDe(["A", "C", null, "AD", "E", "B"]));
eq("corrigir: certa, errada, branco, anulada, certa, anulada no gabarito conta", c.porQuestao, ["certa", "errada", "branco", "anulada", "certa", "certa"]);
eq("acertos", [c.acertos, c.total], [3, 6]);

const inscritos: Inscrito[] = [
  { id: "1", numero: 12, protocolo: "2027-0012", nome: "Lucas Oliveira Nascimento", sala: 3 },
  { id: "2", numero: 40, protocolo: "2027-0040", nome: "Maria Eduarda dos Santos", sala: 5 },
  { id: "3", numero: 41, protocolo: "2027-0041", nome: "Maria Eduarda Souza", sala: 2 },
  { id: "4", numero: 77, protocolo: "2027-0077", nome: "João Pedro Lima", sala: 1 },
];
eq("acha pelo número", acharAluno({ nome: "Lucas O. Nascimento", inscricao: "12" }, inscritos).inscrito?.id, "1");
eq("número que não bate com o nome não vale", acharAluno({ nome: "João Pedro Lima", inscricao: "12" }, inscritos).inscrito?.id, "4");
const porNome = acharAluno({ nome: "lucas oliveira nacimento", inscricao: null }, inscritos);
eq("acha pelo nome com letra errada", [porNome.inscrito?.id, porNome.confianca], ["1", "nome"]);
const ambiguo = acharAluno({ nome: "Maria Eduarda", inscricao: null }, inscritos);
eq("nome curto que bate com duas: pede conferência e mostra a outra", [ambiguo.confianca, ambiguo.alternativas.length >= 1], ["parecido", true]);
eq("nome que não existe", acharAluno({ nome: "Fulano Beltrano", inscricao: null }, inscritos).confianca, "nenhum");
eq("primeiro nome diferente derruba", semelhanca("Pedro Lima", "João Pedro Lima") < 0.85, true);
eq("linha do Excel", linhaDoResultado({ nomeLido: "Lucas", inscrito: inscritos[0], correcao: c, respostas: chave }).Acertos, 3);

if (falhas) { console.error(`\n${falhas} falha(s)`); process.exit(1); }
console.log("\ntudo ok");
