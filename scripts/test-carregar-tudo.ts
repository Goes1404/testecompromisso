/**
 * Testes das listas da secretaria: carregar todas as linhas e buscar.
 * `npx tsx scripts/test-carregar-tudo.ts`
 *
 * Antes de 16/10 as listas paravam em 1.000 (Usuários, Matrículas) ou 500
 * (Gestão de Turmas) e a busca só olhava o nome: quem vinha depois de "Sara"
 * não aparecia, e a secretaria tentava criar a conta de novo.
 */
import assert from 'node:assert/strict';
import { bateComBusca, carregarTudo, nomeParaMostrar } from '../src/lib/carregar-tudo';

let n = 0;
const ok = async (nome: string, fn: () => void | Promise<void>) => {
  await fn();
  n++;
  console.log(`ok   ${nome}`);
};

/** Imita o PostgREST: devolve no máximo 1.000 por pedido, respeitando o range. */
function banco(total: number, corte = 1000) {
  const linhas = Array.from({ length: total }, (_, i) => ({ id: i }));
  let pedidos = 0;
  const consulta = async (de: number, ate: number) => {
    pedidos++;
    return { data: linhas.slice(de, Math.min(ate + 1, de + corte)), error: null };
  };
  return { consulta, pedidos: () => pedidos };
}

(async () => {
  await ok('2.286 linhas chegam inteiras, em 3 pedidos', async () => {
    const b = banco(2286);
    const r = await carregarTudo(b.consulta);
    assert.equal(r.data.length, 2286);
    assert.equal(r.data[2285].id, 2285);
    assert.equal(b.pedidos(), 3);
  });

  await ok('múltiplo exato de 1.000 pede uma página vazia e para', async () => {
    const b = banco(2000);
    const r = await carregarTudo(b.consulta);
    assert.equal(r.data.length, 2000);
    assert.equal(b.pedidos(), 3);
  });

  await ok('menos de uma página: um pedido só', async () => {
    const b = banco(37);
    assert.equal((await carregarTudo(b.consulta)).data.length, 37);
    assert.equal(b.pedidos(), 1);
  });

  await ok('erro no meio devolve o que já veio e o erro', async () => {
    let i = 0;
    const r = await carregarTudo(async () => (i++ === 0
      ? { data: Array.from({ length: 1000 }, (_, k) => k), error: null }
      : { data: null, error: new Error('rede') }));
    assert.equal(r.data.length, 1000);
    assert.ok(r.error instanceof Error);
  });

  await ok('teto de segurança impede laço infinito', async () => {
    let pedidos = 0;
    const r = await carregarTudo(async () => { pedidos++; return { data: Array(1000).fill(0), error: null }; }, { maximo: 5000 });
    assert.equal(pedidos, 5);
    assert.equal(r.data.length, 5000);
  });

  const maria = { name: 'Maria Eduarda de Oliveira Messina', full_name: null, email: 'mariaemessina@compromisso.com', username: null };

  await ok('busca por pedaços do nome, sem acento e fora de ordem', () => {
    assert.equal(bateComBusca(maria, 'maria messina'), true);
    assert.equal(bateComBusca(maria, 'MESSINA eduarda'), true);
    assert.equal(bateComBusca({ name: 'João Antônio' }, 'joao antonio'), true);
    assert.equal(bateComBusca(maria, 'maria souza'), false);
  });

  await ok('busca pelo e-mail de login (antes não achava)', () => {
    assert.equal(bateComBusca(maria, 'mariaemessina'), true);
    assert.equal(bateComBusca(maria, 'mariaemessina@compromisso.com'), true);
  });

  await ok('conta antiga sem nome: acha pelo e-mail e mostra algo', () => {
    const semNome = { name: null, full_name: null, email: 'abnerjesus2@compromisso.com' };
    assert.equal(bateComBusca(semNome, 'abnerjesus2'), true);
    assert.equal(nomeParaMostrar(semNome), 'abnerjesus2');
    assert.equal(nomeParaMostrar({ name: '  ', full_name: 'Nome Completo' }), 'Nome Completo');
    assert.equal(nomeParaMostrar({}), 'Sem nome');
  });

  await ok('busca vazia mostra todo mundo', () => {
    assert.equal(bateComBusca(maria, ''), true);
    assert.equal(bateComBusca(maria, '   '), true);
  });

  console.log(`\nlistas da secretaria: ${n} testes, tudo certo`);
})();
