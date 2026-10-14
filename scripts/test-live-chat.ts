/**
 * Testes do chat ao vivo da aula.
 * `npx tsx scripts/test-live-chat.ts`
 *
 * O que importa aqui: mensagem ocultada pelo professor precisa SAIR da tela de
 * quem já a tinha (a consulta devolve a linha de novo, sem texto), e a ordem
 * do chat não pode embaralhar quando uma mensagem antiga muda de versão.
 */
import assert from 'node:assert/strict';
import {
  mesclarMensagens,
  ultimaVersao,
  validarMensagemDoChat,
  erroDoChat,
  nomeCurto,
  corDoNome,
  horaDaMensagem,
  LIMITE_DA_MENSAGEM,
  type MensagemDoChat,
} from '../src/lib/live-chat';

const msg = (id: number, versao: number, extra: Partial<MensagemDoChat> = {}): MensagemDoChat => ({
  id,
  versao,
  user_id: `u${id}`,
  user_name: `Aluno ${id}`,
  equipe: false,
  texto: `oi ${id}`,
  oculta: false,
  created_at: '2026-10-13T22:00:00Z',
  ...extra,
});

let n = 0;
const ok = (nome: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok  ', nome);
};

ok('junta e ordena por envio', () => {
  const r = mesclarMensagens([msg(2, 2)], [msg(1, 1), msg(3, 3)], false);
  assert.deepEqual(r.map((m) => m.id), [1, 2, 3]);
});

ok('ocultada some da tela do aluno', () => {
  const tela = [msg(1, 1), msg(2, 2)];
  const r = mesclarMensagens(tela, [msg(1, 5, { oculta: true, texto: null })], false);
  assert.deepEqual(r.map((m) => m.id), [2]);
});

ok('ocultada continua (marcada) na tela da equipe', () => {
  const r = mesclarMensagens([msg(1, 1)], [msg(1, 5, { oculta: true })], true);
  assert.equal(r.length, 1);
  assert.equal(r[0].oculta, true);
  assert.equal(r[0].texto, 'oi 1');
});

ok('reexibir uma antiga não a joga para o fim', () => {
  const r = mesclarMensagens([msg(1, 1, { oculta: true }), msg(2, 2), msg(3, 3)], [msg(1, 9)], true);
  assert.deepEqual(r.map((m) => m.id), [1, 2, 3]);
  assert.equal(r[0].oculta, false);
});

ok('resposta atrasada (versão menor) não desfaz a mais nova', () => {
  const r = mesclarMensagens([msg(1, 7, { oculta: true })], [msg(1, 3)], true);
  assert.equal(r[0].oculta, true);
});

ok('guarda só as últimas N', () => {
  const muitas = Array.from({ length: 250 }, (_, i) => msg(i + 1, i + 1));
  const r = mesclarMensagens([], muitas, false, 200);
  assert.equal(r.length, 200);
  assert.equal(r[0].id, 51);
  assert.equal(r[199].id, 250);
});

ok('sem novidade devolve a mesma lista (sem re-render)', () => {
  const tela = [msg(1, 1)];
  assert.equal(mesclarMensagens(tela, [], false), tela);
});

ok('última versão', () => {
  assert.equal(ultimaVersao(4, [msg(1, 2), msg(2, 9), msg(3, 5)]), 9);
  assert.equal(ultimaVersao(4, []), 4);
});

ok('validação da mensagem', () => {
  assert.equal(validarMensagemDoChat('  oi  '), null);
  assert.equal(typeof validarMensagemDoChat('   '), 'string');
  assert.equal(typeof validarMensagemDoChat('a'.repeat(LIMITE_DA_MENSAGEM + 1)), 'string');
  assert.equal(validarMensagemDoChat('a'.repeat(LIMITE_DA_MENSAGEM)), null);
});

ok('erros do banco em português', () => {
  assert.equal(erroDoChat({ code: 'P0001', message: 'O professor pausou suas mensagens nesta aula.' }), 'O professor pausou suas mensagens nesta aula.');
  assert.match(erroDoChat({ code: '23514' }), /entre 1 e 300/);
  assert.match(erroDoChat({ code: '42501', message: 'new row violates row-level security' }), /Tente de novo/);
});

ok('nome curto', () => {
  assert.equal(nomeCurto('Ana Beatriz Ferreira'), 'Ana Ferreira');
  assert.equal(nomeCurto('Ana'), 'Ana');
  assert.equal(nomeCurto('  '), 'Aluno');
  assert.equal(nomeCurto(null), 'Aluno');
});

ok('cor do nome é estável', () => {
  assert.equal(corDoNome('abc'), corDoNome('abc'));
});

ok('hora no fuso da escola', () => {
  assert.equal(horaDaMensagem('2026-10-13T22:05:00Z'), '19:05');
});

console.log(`\nchat ao vivo: ${n} testes, tudo certo`);
