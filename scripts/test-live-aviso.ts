import assert from "node:assert/strict";
import { avisoDaLive, quandoDaLive, LIMITE_DO_PUSH } from "../src/lib/live-aviso";

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

console.log("✓ test-live-aviso: ok");
