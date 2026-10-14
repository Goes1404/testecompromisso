/**
 * Cache de tela da aula ao vivo (`src/lib/cache-da-sessao.ts`).
 * `npx tsx scripts/test-cache-da-sessao.ts`
 */
import assert from 'node:assert/strict';
import { chaveDoCache, gravarCache, lerCache, limparCacheDaSessao, _esquecerMemoria } from '../src/lib/cache-da-sessao';

// sessionStorage de mentira (o Node não tem)
const loja = new Map<string, string>();
(globalThis as any).window = {
  sessionStorage: {
    getItem: (k: string) => (loja.has(k) ? loja.get(k)! : null),
    setItem: (k: string, v: string) => void loja.set(k, v),
    removeItem: (k: string) => void loja.delete(k),
  },
};
Object.defineProperty((globalThis as any).window.sessionStorage, 'keys', { value: () => [...loja.keys()] });
const keysOriginal = Object.keys;
(Object as any).keys = (o: any) => (o === (globalThis as any).window.sessionStorage ? [...loja.keys()] : keysOriginal(o));

let n = 0;
const ok = (nome: string, fn: () => void) => { fn(); n++; console.log('ok  ', nome); };

ok('sem usuário não há chave (nada é guardado deslogado)', () => {
  assert.equal(chaveDoCache(null, 'x'), null);
  gravarCache(null, 1);
  assert.equal(lerCache(null, 1000), null);
});

ok('a chave leva o usuário: outra pessoa no mesmo aparelho não lê', () => {
  const a = chaveDoCache('ana', 'chat', 'L1');
  const b = chaveDoCache('bruno', 'chat', 'L1');
  gravarCache(a, ['oi']);
  assert.deepEqual(lerCache(a, 60_000), ['oi']);
  assert.equal(lerCache(b, 60_000), null);
});

ok('sobrevive ao recarregar (memória apagada, sessionStorage fica)', () => {
  const k = chaveDoCache('ana', 'live', 'L2');
  gravarCache(k, { title: 'Aula' }, Date.now(), true);
  _esquecerMemoria();
  assert.deepEqual(lerCache(k, 60_000), { title: 'Aula' });
});

ok('vencido não volta', () => {
  const k = chaveDoCache('ana', 'velho');
  gravarCache(k, 1, 1_000, true);
  assert.equal(lerCache(k, 500, 2_000), null);
  assert.equal(lerCache(k, 5_000, 2_000), 1);
});

ok('sair da conta apaga tudo', () => {
  const k = chaveDoCache('ana', 'chat', 'L3');
  gravarCache(k, [1]);
  loja.set('outra_coisa', 'fica');
  limparCacheDaSessao();
  assert.equal(lerCache(k, 60_000), null);
  assert.equal([...loja.keys()].filter((x) => x.startsWith('dash_cache_')).length, 0);
  assert.equal(loja.get('outra_coisa'), 'fica');
});

ok('JSON quebrado no sessionStorage não derruba a tela', () => {
  _esquecerMemoria();
  loja.set('dash_cache_ana_ruim', '{nao é json');
  assert.equal(lerCache('dash_cache_ana_ruim', 60_000), null);
});

console.log(`\ncache da sessão: ${n} testes, tudo certo`);
