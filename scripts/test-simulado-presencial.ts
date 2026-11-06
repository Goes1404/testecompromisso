/**
 * Testes do simulado presencial (inscrição + sala sorteada).
 * `npx tsx scripts/test-simulado-presencial.ts`
 *
 * O banco decide quem pode se inscrever e quando a sala aparece; aqui se prova
 * que a tela desenha o mesmo estado: fase pela janela, datas no fuso da escola
 * (o servidor roda em UTC) e o que a home cobra do aluno.
 */
import {
  faseDoSimulado, avisoParaHome, diaDoSimulado, instante, paraCampoDeData, doCampoDeData,
  validarSimulado, RASCUNHO_VAZIO, salasEmLote, ocupacao, lugaresNoSorteio, numeroDeInscricao,
  fichaHtml, listaDaPortariaHtml, SimuladoDoAluno,
} from "../src/lib/simulado-presencial";

let falhas = 0;
const eq = (nome: string, obtido: any, esperado: any) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
};

// O calendário da coordenação: inscrição 08 a 11/11, sala de 12/11, prova 14/11.
const janela = {
  inscricao_abre: "2026-11-08T00:00:00-03:00",
  inscricao_fecha: "2026-11-11T23:59:00-03:00",
  salas_divulgadas_em: "2026-11-12T00:00:00-03:00",
};
const em = (iso: string) => new Date(iso);

eq("antes de abrir", faseDoSimulado(janela, em("2026-11-07T23:59:00-03:00")), "em_breve");
eq("abriu à meia-noite de Brasília", faseDoSimulado(janela, em("2026-11-08T00:00:00-03:00")), "inscricoes");
eq("11/11 às 23h ainda inscreve", faseDoSimulado(janela, em("2026-11-11T23:00:00-03:00")), "inscricoes");
eq("fechou, sala ainda não saiu", faseDoSimulado(janela, em("2026-11-11T23:59:30-03:00")), "aguardando_sala");
eq("12/11 a sala aparece", faseDoSimulado(janela, em("2026-11-12T00:00:00-03:00")), "sala_divulgada");

eq("dia por extenso (hora local, não UTC)", diaDoSimulado("2026-11-14"), "sábado, 14/11");
eq("instante no fuso da escola", instante("2026-11-08T03:00:00Z"), "08/11 às 00:00");
eq("campo de data no fuso da escola", paraCampoDeData("2026-11-12T03:00:00Z"), "2026-11-12T00:00");
eq("campo → ISO com fuso", doCampoDeData("2026-11-11T23:59"), "2026-11-11T23:59:00-03:00");
eq("campo inválido", doCampoDeData("11/11/2026"), null);
eq("ida e volta do campo", paraCampoDeData(doCampoDeData("2026-11-08T07:30")!), "2026-11-08T07:30");

const base = {
  ...RASCUNHO_VAZIO, titulo: "Simulado ETEC", aplicado_em: "2026-11-14",
  inscricao_abre: "2026-11-08T00:00", inscricao_fecha: "2026-11-11T23:59", salas_divulgadas_em: "2026-11-12T00:00",
};
const ok = validarSimulado(base);
eq("calendário da coordenação é válido", "registro" in ok, true);
eq("grava com fuso", "registro" in ok ? ok.registro.inscricao_abre : null, "2026-11-08T00:00:00-03:00");
eq("sem título", "erro" in validarSimulado({ ...base, titulo: " " }), true);
eq("fecha antes de abrir", "erro" in validarSimulado({ ...base, inscricao_fecha: "2026-11-07T10:00" }), true);
eq("sala antes de fechar a inscrição", "erro" in validarSimulado({ ...base, salas_divulgadas_em: "2026-11-10T00:00" }), true);
eq("sala depois do dia da prova", "erro" in validarSimulado({ ...base, salas_divulgadas_em: "2026-11-15T08:00" }), true);

const simulado = (extra: Partial<SimuladoDoAluno>): SimuladoDoAluno => ({
  id: "s1", titulo: "Simulado", aplicado_em: "2026-11-14", horario: "8h", local: null, publico: "todos",
  instrucoes: null, agora: "", elegivel: true, inscricao: null, ...janela, ...extra,
});
const inscricao = { numero: 7, nome: "Ana <b>Lima</b>", turma: "3", inscrito_em: "2026-11-08T12:00:00Z", sala: null, predio: null, carteira: null };

eq("home cobra inscrição aberta", avisoParaHome([simulado({})], em("2026-11-09T10:00:00-03:00"))?.tipo, "inscrever");
eq("home não cobra antes de abrir", avisoParaHome([simulado({})], em("2026-11-07T10:00:00-03:00")), null);
eq("home não cobra quem perdeu o prazo", avisoParaHome([simulado({})], em("2026-11-12T10:00:00-03:00")), null);
eq("home não cobra quem não é do público", avisoParaHome([simulado({ elegivel: false })], em("2026-11-09T10:00:00-03:00")), null);
eq("inscrito aguardando", avisoParaHome([simulado({ inscricao })], em("2026-11-10T10:00:00-03:00"))?.tipo, "aguardando");
eq("sala divulgada", avisoParaHome([simulado({ inscricao: { ...inscricao, sala: "Sala 2", carteira: 14 } })], em("2026-11-12T10:00:00-03:00"))?.tipo, "sala");

const salas = [
  { id: "a", simulado_id: "s", nome: "Sala 10", predio: null, capacidade: 30, reserva: false, ordem: 2 },
  { id: "b", simulado_id: "s", nome: "Sala 2", predio: null, capacidade: 40, reserva: false, ordem: 1 },
  { id: "c", simulado_id: "s", nome: "Fundo A", predio: "Fundo", capacidade: 30, reserva: true, ordem: 9 },
];
eq("reserva fica fora dos lugares", lugaresNoSorteio(salas), 70);
eq("ocupação na ordem cadastrada", ocupacao(salas, [{ sala_id: "a" }, { sala_id: "a" }, { sala_id: null }]).map((s) => [s.nome, s.ocupadas]),
  [["Sala 2", 0], ["Sala 10", 2], ["Fundo A", 0]]);
eq("salas em lote pulam nome existente", salasEmLote([{ nome: "Sala 2", ordem: 3 }], 3, 40).map((s) => [s.nome, s.ordem]),
  [["Sala 1", 4], ["Sala 3", 5], ["Sala 4", 6]]);
eq("número com 4 dígitos", numeroDeInscricao(7), "0007");

const ficha = fichaHtml(simulado({}), inscricao);
eq("ficha escapa o nome", ficha.includes("Ana &lt;b&gt;Lima&lt;/b&gt;") && !ficha.includes("<b>Lima"), true);
eq("ficha sem sala diz quando sai", ficha.includes("Divulgada em 12/11 às 00:00"), true);
const portaria = listaDaPortariaHtml({ titulo: "S", aplicado_em: "2026-11-14" }, [
  { numero: 2, nome: "Bruno", turma: null, sala: null, predio: null, carteira: null },
  { numero: 1, nome: "Álvaro", turma: "1", sala: "Sala 1", predio: null, carteira: 3 },
]);
eq("portaria em ordem alfabética (acento)", portaria.indexOf("Álvaro") < portaria.indexOf("Bruno"), true);
eq("portaria marca quem está sem sala", portaria.includes("SEM SALA"), true);

if (falhas) { console.error(`\n${falhas} falha(s)`); process.exit(1); }
console.log("\ntudo ok");
