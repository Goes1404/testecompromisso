import assert from "node:assert/strict";
import {
  avisoDaLive,
  avisoDeVariasLives,
  avisosQueFaltam,
  agruparPorAluno,
  podeAvisarAgendadaAgora,
  quandoDaLive,
  LIMITE_DO_PUSH,
  type LiveDaRodada,
} from "../src/lib/live-aviso";

// 13/10/2026 10:00 em Brasília = 13:00 UTC
const agora = new Date("2026-10-13T13:00:00Z");

// Fuso: aula às 19h de Brasília (22h UTC) não pode sair como 22:00.
assert.equal(quandoDaLive("2026-10-13T22:00:00Z", agora), "hoje às 19:00");
assert.equal(quandoDaLive("2026-10-14T22:00:00Z", agora), "amanhã às 19:00");
// 01:30 UTC do dia 14 ainda é dia 13 em Brasília.
assert.equal(quandoDaLive("2026-10-14T01:30:00Z", agora), "hoje às 22:30");
assert.match(quandoDaLive("2026-10-16T22:00:00Z", agora), /16\/10 às 19:00$/);

const live = { id: "abc", title: "Revisão de Química", teacher_name: "Prof. Ana", start_time: "2026-10-13T22:00:00Z" };

const ag = avisoDaLive("agendada", live, agora);
assert.ok(ag.title.includes("Revisão de Química"));
assert.ok(ag.body.includes("hoje às 19:00"));
assert.ok(ag.body.includes("Prof. Ana"));
assert.equal(ag.url, "/dashboard/live/abc");
assert.equal(ag.tag, "live-abc-agendada");

const av = avisoDaLive("ao_vivo", live, agora);
assert.ok(av.title.startsWith("🔴"));
assert.ok(av.body.includes("entrar"));
assert.notEqual(av.tag, ag.tag, "agendada e ao vivo não podem se substituir no aparelho");

// Sem professor e sem título não quebra
const vazio = avisoDaLive("agendada", { id: "x", title: null, teacher_name: null, start_time: null }, agora);
assert.ok(vazio.title.includes("Aula ao vivo"));
assert.ok(!vazio.body.includes(" com "));

// Nome gigante continua dentro do limite
const longo = avisoDaLive("agendada", { ...live, teacher_name: "x".repeat(400) }, agora);
assert.ok(longo.body.length <= LIMITE_DO_PUSH);
assert.ok(longo.title.length <= 90);

// ── Rodada automática (/api/cron/avisos-de-live) ─────────────────────────
// Aulas criadas fora da tela do professor (em lote, por script) não passam pelo
// /api/push/notify; o cron confere a cada minuto o aviso que falta.
const aula = (id: string, inicio: string, extra: Partial<LiveDaRodada> = {}): LiveDaRodada => ({
  id,
  title: `Aula ${id}`,
  teacher_name: null,
  start_time: inicio,
  status: "scheduled",
  turmas: ["ETEC"],
  no_ar_desde: null,
  avisado_agendada_em: null,
  avisado_ao_vivo_em: null,
  ...extra,
});

// 00:15 de Brasília: aula criada de madrugada espera as 07:00 para avisar.
const madrugada = new Date("2026-10-17T03:15:00Z");
assert.equal(podeAvisarAgendadaAgora(madrugada), false);
assert.deepEqual(avisosQueFaltam([aula("a", "2026-10-17T11:00:00Z")], madrugada).agendada, []);

// 07:00 de Brasília: a das 08:00 avisa; a das 07:10 está perto demais (vai só o "ao vivo").
const manha = new Date("2026-10-17T10:00:00Z");
assert.equal(podeAvisarAgendadaAgora(manha), true);
const r1 = avisosQueFaltam(
  [
    aula("oito", "2026-10-17T11:00:00Z"),
    aula("perto", "2026-10-17T10:10:00Z"),
    aula("ja-avisada", "2026-10-17T11:00:00Z", { avisado_agendada_em: "2026-10-16T20:00:00Z" }),
    aula("longe", "2026-11-20T11:00:00Z"),
    aula("passada", "2026-10-16T11:00:00Z"),
    aula("encerrada", "2026-10-17T11:00:00Z", { status: "completed" }),
  ],
  manha,
);
assert.deepEqual(r1.agendada.map((l) => l.id), ["oito"]);
assert.deepEqual(r1.ao_vivo, []);

// 21:59 ainda avisa; 22:00 já é silêncio.
assert.equal(podeAvisarAgendadaAgora(new Date("2026-10-18T00:59:00Z")), true);
assert.equal(podeAvisarAgendadaAgora(new Date("2026-10-18T01:00:00Z")), false);

// "Ao vivo" sai a qualquer hora, só para quem entrou no ar há pouco e ainda não avisou.
const r2 = avisosQueFaltam(
  [
    aula("agora", "2026-10-17T10:00:00Z", { status: "live", no_ar_desde: "2026-10-17T09:58:00Z" }),
    aula("sem-cronometro", "2026-10-17T09:50:00Z", { status: "live" }),
    aula("faz-tempo", "2026-10-17T08:00:00Z", { status: "live", no_ar_desde: "2026-10-17T08:00:00Z" }),
    aula("avisada", "2026-10-17T10:00:00Z", { status: "live", avisado_ao_vivo_em: "2026-10-17T09:59:00Z" }),
  ],
  manha,
);
assert.deepEqual(r2.ao_vivo.map((l) => l.id), ["agora", "sem-cronometro"]);
assert.deepEqual(r2.agendada, []);

// Agrupamento: cada aluno recebe UMA notificação por rodada, com as aulas dele.
const grupos = agruparPorAluno(
  new Map([
    ["L1", ["ana", "bia"]],
    ["L2", ["bia", "caio"]],
  ]),
);
const deQuem = (aluno: string) => grupos.find((g) => g.alunos.includes(aluno))!.liveIds;
assert.deepEqual(deQuem("ana"), ["L1"]);
assert.deepEqual(deQuem("bia"), ["L1", "L2"]);
assert.deepEqual(deQuem("caio"), ["L2"]);
assert.equal(grupos.reduce((n, g) => n + g.alunos.length, 0), 3, "ninguém aparece em dois grupos");
// As 6 aulas ETEC do aulão, para a mesma turma, viram um envio só.
const aulao = agruparPorAluno(new Map(["e1", "e2", "e3"].map((id) => [id, ["ana", "bia"]])));
assert.equal(aulao.length, 1);
assert.deepEqual(aulao[0].alunos, ["ana", "bia"]);

// Texto de várias aulas: diz quantas e quando é a primeira, sem passar do limite.
const varias = avisoDeVariasLives(
  "agendada",
  [aula("b", "2026-10-17T11:40:00Z"), aula("a", "2026-10-17T11:00:00Z")],
  manha,
);
assert.ok(varias.title.includes("2 aulas"));
assert.ok(varias.body.includes("hoje às 08:00"), "a primeira é a mais cedo, não a primeira da lista");
assert.equal(varias.url, "/dashboard/live");
const muitas = avisoDeVariasLives(
  "ao_vivo",
  Array.from({ length: 30 }, (_, i) => aula(`x${i}`, "2026-10-17T10:00:00Z", { title: "Revisão ".repeat(10) })),
  manha,
);
assert.ok(muitas.title.startsWith("🔴"));
assert.ok(muitas.body.length <= LIMITE_DO_PUSH);
assert.ok(muitas.body.endsWith("Toque para escolher a sala."), "a frase do que fazer nunca é cortada");

console.log("✓ test-live-aviso: ok");
