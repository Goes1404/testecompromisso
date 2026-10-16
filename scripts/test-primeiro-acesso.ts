/**
 * Testes da busca do primeiro acesso (link de convite em massa).
 * `npx tsx scripts/test-primeiro-acesso.ts`
 *
 * Em 16/10: 143 logins recusados contra 32 aceitos em 24 h. A busca casava
 * pedaço do nome e escolhia ao acaso; a tela dava a senha padrão a todo mundo.
 */
import assert from 'node:assert/strict';
import { emailsCandidatos, loginDigitado, normalizarNome, resultadoDaBusca } from '../src/lib/primeiro-acesso';

let n = 0;
const ok = (nome: string, fn: () => void) => { fn(); n++; console.log(`ok   ${nome}`); };

ok('nome: sem acento, sem maiúscula, espaços únicos', () => {
  assert.equal(normalizarNome('  MARIA  Eduarda de   Oliveira MÉSSINA '), 'maria eduarda de oliveira messina');
  assert.equal(normalizarNome('João Antônio Çaçapava'), 'joao antonio cacapava');
  assert.equal(normalizarNome(null), '');
  assert.equal(normalizarNome('Samuel A.Rosa'), 'samuel a rosa');
  assert.equal(normalizarNome('Samuel A. Rosa'), 'samuel a rosa');
});

ok('nome do SQL e do TS batem nas letras do português', () => {
  // As mesmas letras que a migration traduz: se uma faltar lá, este teste lembra.
  const letras = 'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ';
  assert.equal(normalizarNome(letras), 'aaaaaaeeeeiiiiooooouuuucnyy');
  assert.equal(normalizarNome(letras.toUpperCase()), 'aaaaaaeeeeiiiiooooouuuucnyy');
});

ok('login: com ou sem domínio, com maiúscula e espaço do celular', () => {
  assert.equal(loginDigitado('mariaemessina'), 'mariaemessina@compromisso.com');
  assert.equal(loginDigitado(' MariaEMessina '), 'mariaemessina@compromisso.com');
  assert.equal(loginDigitado('mariaemessina@compromisso.com'), 'mariaemessina@compromisso.com');
  assert.equal(loginDigitado('abnerjesus2'), 'abnerjesus2@compromisso.com');
});

ok('nome com espaço não é login; lixo também não', () => {
  assert.equal(loginDigitado('Maria Messina'), null);
  assert.equal(loginDigitado(''), null);
  assert.equal(loginDigitado('a'), null);
  assert.equal(loginDigitado('maria,messina'), null);
  assert.equal(loginDigitado('x@y'), null);
});

ok('nenhuma conta: vai para o cadastro', () => {
  assert.deepEqual(resultadoDaBusca([], 'Fulano'), { encontrado: 'nenhum' });
});

ok('uma conta com senha padrão: mostra a senha', () => {
  const r = resultadoDaBusca([{ email: 'a@compromisso.com', nome: 'Ana Souza', usa_senha_padrao: true }], 'ana souza');
  assert.deepEqual(r, { encontrado: 'um', user: { email: 'a@compromisso.com', name: 'Ana Souza' }, senhaPadrao: true });
});

ok('uma conta que já trocou a senha: NÃO mostra a padrão', () => {
  const r = resultadoDaBusca([{ email: 'a@compromisso.com', nome: 'Ana Souza', usa_senha_padrao: false }], 'ana souza');
  assert.equal(r.encontrado === 'um' && r.senhaPadrao, false);
});

ok('duas contas: não escolhe nenhuma (nem mostra login)', () => {
  const r = resultadoDaBusca([
    { email: 'gabrieldsouza@compromisso.com', nome: 'Gabriel de Souza', usa_senha_padrao: true },
    { email: 'gabrielsouza@compromisso.com', nome: 'Gabriel de Souza', usa_senha_padrao: false },
  ], 'Gabriel de Souza');
  assert.deepEqual(r, { encontrado: 'varios', quantidade: 2 });
  assert.ok(!JSON.stringify(r).includes('@'));
});

ok('a mesma conta achada por nome e por login conta uma vez só', () => {
  const c = { email: 'a@compromisso.com', nome: 'Ana', usa_senha_padrao: true };
  assert.equal(resultadoDaBusca([c, { ...c, email: 'A@compromisso.com' }], 'ana').encontrado, 'um');
});

ok('conta sem nome mostra o que foi digitado', () => {
  const r = resultadoDaBusca([{ email: 'x@compromisso.com', nome: null, usa_senha_padrao: true }], 'Xavier');
  assert.equal(r.encontrado === 'um' && r.user.name, 'Xavier');
});

ok('e-mail diferente: base2, base3… no mesmo domínio', () => {
  const l = emailsCandidatos('gabrieldsouza@compromisso.com', 4);
  assert.deepEqual(l, [
    'gabrieldsouza@compromisso.com', 'gabrieldsouza2@compromisso.com',
    'gabrieldsouza3@compromisso.com', 'gabrieldsouza4@compromisso.com',
  ]);
  assert.deepEqual(emailsCandidatos('sem-arroba'), []);
});

console.log(`\nprimeiro acesso: ${n} testes, tudo certo`);
