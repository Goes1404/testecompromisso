/**
 * Regras da matrícula 2027 (ficha, idade, repetidas, prévia do sorteio, Excel).
 * `npx tsx scripts/test-matricula.ts` — roda dentro de `npm test`.
 */
import {
  validarFicha, FICHA_VAZIA, Ficha, idade, ehMenor, errosDoPasso, repetidas, previaDoSorteio,
  situacaoDaFicha, instante, paraCampoDeData, doCampoDeData, dataBR, abasDoExcel, Matricula,
  statusParaMostrar, listasDasSalasHtml, formatarCelular, SalaDaMatricula, serieDoFoco, textoDaSituacao, buscarNaConferencia, placarDaConferencia,
} from "../src/lib/matricula";

let falhas = 0;
const eq = (n: string, a: any, b: any) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FALHA"} ${n}${ok ? "" : ` → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`}`);
};
const HOJE = "2026-11-16";
const boa: Ficha = {
  ...FICHA_VAZIA, nome: "  Maria  Eduarda Santos ", nascimento: "2011-03-10", celular: "(11) 91234-5678",
  bairro: "Fazendinha", foco: "ETEC", serie: "9EF", escola: "Leda Caira", escola_tipo: "publica", turno_escola: "manha",
  resp_nome: "Ana Santos", resp_parentesco: "Mãe", resp_celular: "11 99876-5432",
  aceite_veracidade: true, aceite_dados: true,
};

eq("idade antes do aniversário", idade("2008-11-17", HOJE), 17);
eq("idade no aniversário", idade("2008-11-16", HOJE), 18);
eq("menor", ehMenor("2008-11-17", HOJE), true);
eq("maior no dia dos 18", ehMenor("2008-11-16", HOJE), false);

const v = validarFicha(boa, HOJE);
eq("ficha boa sem erros", v.erros, {});
eq("nome aparado", v.limpa.nome, "Maria Eduarda Santos");
eq("celular só dígitos", v.limpa.celular, "11912345678");
eq("menor sem responsável", Object.keys(validarFicha({ ...boa, resp_nome: "", resp_celular: "" }, HOJE).erros).sort(), ["resp_celular", "resp_nome"]);
eq("maior sem responsável passa", validarFicha({ ...boa, nascimento: "2000-01-01", resp_nome: "", resp_parentesco: "", resp_celular: "" }, HOJE).erros, {});
eq("nome de uma palavra", !!validarFicha({ ...boa, nome: "Maria" }, HOJE).erros.nome, true);
eq("data impossível", !!validarFicha({ ...boa, nascimento: "2011-02-30" }, HOJE).erros.nascimento, true);
eq("idade fora (5 anos)", !!validarFicha({ ...boa, nascimento: "2021-01-01" }, HOJE).erros.nascimento, true);
eq("celular curto", !!validarFicha({ ...boa, celular: "912345678" }, HOJE).erros.celular, true);
eq("e-mail errado", !!validarFicha({ ...boa, email: "maria@" }, HOJE).erros.email, true);
eq("sem aceites", Object.keys(validarFicha({ ...boa, aceite_dados: false, aceite_veracidade: false }, HOJE).erros).sort(), ["aceite_dados", "aceite_veracidade"]);
eq("erro do passo 1 não trava o passo 0", errosDoPasso(0, validarFicha({ ...boa, foco: "" }, HOJE).erros), {});
eq("série não é perguntada: vem do foco", [validarFicha({ ...boa, serie: "" }, HOJE).erros.serie, validarFicha({ ...boa, serie: "" }, HOJE).limpa.serie], [undefined, "9EF"]);
eq("série do ENEM", serieDoFoco("ENEM"), "3EM");
eq("erro do passo 1 aparece no passo 1", Object.keys(errosDoPasso(1, validarFicha({ ...boa, foco: "" }, HOJE).erros)), ["foco"]);

const t = { ano: 2027, abre_em: "2026-11-16T00:00:00-03:00", fecha_em: "2027-01-31T23:59:00-03:00", aberta: true };
eq("aberta", situacaoDaFicha(t, new Date("2026-11-16T10:00:00-03:00")), "aberta");
eq("antes", situacaoDaFicha(t, new Date("2026-11-15T23:00:00-03:00")), "antes");
eq("encerrada", situacaoDaFicha(t, new Date("2027-02-01T00:00:00-03:00")), "encerrada");
eq("pausada", situacaoDaFicha({ ...t, aberta: false }, new Date("2026-12-01T10:00:00-03:00")), "pausada");
eq("instante no fuso", instante("2027-02-01T02:59:00Z"), "31/01/2027 às 23:59");
eq("campo de data ida e volta", paraCampoDeData(doCampoDeData("2027-01-31T23:59")!), "2027-01-31T23:59");
eq("data BR sem fuso", dataBR("2011-03-10"), "10/03/2011");
eq("celular formatado", formatarCelular("11912345678"), "(11) 91234-5678");

const m = (i: number, x: Partial<Matricula> = {}): Matricula => ({
  ...boa, ...v.limpa, id: `m${i}`, ano: 2027, numero: i, protocolo: `2027-${String(i).padStart(4, "0")}`, email: null,
  foco: "ETEC", serie: "9EF", escola_tipo: "publica", turno_escola: "manha", status: "confirmada", sala: null,
  observacoes: null, origem: "site", created_at: "2026-11-16T13:00:00Z", updated_at: "2026-11-16T13:00:00Z",
  nome: `Aluno ${i}`, celular: `119000000${String(i).padStart(2, "0")}`, ...x,
});
const rep = repetidas([m(1, { nome: "José Silva" }), m(2, { nome: "JOSE  silva" }), m(3, { celular: "11900000001" }), m(4, { nome: "José Silva", status: "cancelada" })]);
eq("repetidas: nome sem acento + celular, cancelada fora", [...rep.entries()].sort(), [["m1", "Mesmo nome e nascimento"], ["m2", "Mesmo nome e nascimento"], ["m3", "Mesmo celular"]]);

const salas: SalaDaMatricula[] = [1, 2, 3, 4].map((s) => ({ ano: 2027, sala: s, foco: "ETEC" as const, capacidade: 3 }));
salas.push({ ano: 2027, sala: 5, foco: "ENEM", capacidade: 3 });
const lista = [m(1, { sala: 1 }), m(2, { sala: 1 }), ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => m(i)), m(14, { status: "espera" }), m(15, { status: "recebida" }), m(16, { foco: "ENEM" })];
const p = previaDoSorteio("ETEC", lista, salas);
eq("prévia ETEC: 10 vagas livres, 13 na fila (recebida sem sala conta), 10 entram, 3 espera", [p.vagas, p.candidatos, p.entram, p.espera], [10, 13, 10, 3]);
eq("prévia: salas cheias e equilibradas", p.salas.map((s) => s.depois), [3, 3, 3, 3]);
const pr = previaDoSorteio("ETEC", lista, salas, true);
eq("prévia refazer: 15 concorrem, 12 entram", [pr.candidatos, pr.entram, pr.espera], [15, 12, 3]);
const pRec = previaDoSorteio("ETEC", [m(1, { status: "recebida", sala: 1 }), m(2, { status: "recebida", sala: 1 })], salas);
eq("recebida com sala ocupa lugar", pRec.salas[0].agora, 2);
const p2 = previaDoSorteio("ETEC", lista.slice(0, 5), salas);
eq("poucos alunos: diferença ≤ 1", p2.salas.map((s) => s.depois), [2, 1, 1, 1]);

eq("status mostra a sala", statusParaMostrar({ status: "confirmada", sala: 3 }), "Sala 3");
eq("recebida com sala", statusParaMostrar({ status: "recebida", sala: 2 }), "Recebida · Sala 2");
eq("tela: sala", textoDaSituacao({ status: "recebida", sala: 2, posicao: null, foco: "ETEC" }).titulo, "Sala 2");
eq("tela: fila com posição", textoDaSituacao({ status: "espera", sala: null, posicao: 3, foco: "ENEM" }).titulo, "Lista de espera · 3º lugar");
eq("tela: cancelada", textoDaSituacao({ status: "cancelada", sala: null, posicao: null, foco: "ENEM" }).titulo, "Inscrição cancelada");
const abas = abasDoExcel([m(2, { sala: 1 }), m(1, { sala: 1, nome: "Ana" }), m(3, { status: "espera" }), m(4)], HOJE);
eq("abas do Excel", abas.map((a) => [a.nome, a.linhas.length]), [["Geral", 4], ["Sala 1 (ETEC)", 2], ["Lista de espera", 1]]);
eq("aba da sala em ordem alfabética", abas[1].linhas.map((l) => l.Nome), ["Aluno 2", "Ana"]);
eq("Excel tem idade e responsável", [abas[0].linhas[0].Idade, abas[0].linhas[0]["Responsável"]], [15, "Ana Santos"]);
const html = listasDasSalasHtml([m(1, { sala: 1, nome: "<b>X</b> Y" })], salas);
eq("lista impressa escapa nome", html.includes("&lt;b&gt;X") && !html.includes("<b>X"), true);

const conf = [m(12, { nome: "José Luiz Real Pereira" }), m(7, { nome: "Ana Júlia Real" }), m(3, { nome: "Pedro Henrique Ferreira Silva" })];
eq("conferência: número curto", buscarNaConferencia(conf, "12").map((x) => x.numero), [12]);
eq("conferência: protocolo completo", buscarNaConferencia(conf, "2027-0007").map((x) => x.numero), [7]);
eq("conferência: com zeros", buscarNaConferencia(conf, "0003").map((x) => x.numero), [3]);
eq("conferência: protocolo de outro ano não acha", buscarNaConferencia(conf, "2026-0007"), []);
eq("conferência: pedaços do nome sem acento", buscarNaConferencia(conf, "jose real").map((x) => x.numero), [12]);
eq("conferência: começo do nome vem antes", buscarNaConferencia(conf, "real").map((x) => x.numero), [7, 12]);
eq("conferência: 1 letra não busca", buscarNaConferencia(conf, "a"), []);
eq("placar só conta quem tem sala", placarDaConferencia([m(1, { sala: 1 }), m(2, { status: "recebida", sala: 2 }), m(3, { status: "espera" })]).ETEC, { confirmadas: 1, comSala: 2 });

const comReserva: SalaDaMatricula[] = [
  { ano: 2027, sala: 1, foco: "ETEC", capacidade: 2 }, { ano: 2027, sala: 8, foco: "ETEC", capacidade: 2, reserva: true },
];
const pRes = previaDoSorteio("ETEC", [m(1, { status: "espera" }), m(2, { status: "espera" }), m(3, { status: "espera" }), m(4, { sala: 8 })], comReserva);
eq("reserva fora da prévia: só a sala 1 aparece, 2 vagas, 1 continua na fila", [pRes.salas.map((x) => x.sala), pRes.vagas, pRes.entram, pRes.espera], [[1], 2, 2, 1]);
eq("refazer não conta quem está na reserva", previaDoSorteio("ETEC", [m(4, { sala: 8 })], comReserva, true).candidatos, 0);

if (falhas) { console.error(`\n${falhas} falha(s)`); process.exit(1); }
console.log("\ntudo ok");
