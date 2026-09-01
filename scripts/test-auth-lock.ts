/**
 * Prova do deadlock que travava a criação de senha no primeiro acesso.
 * `npx tsx scripts/test-auth-lock.ts`
 *
 * Não é um mock do problema: monta um GoTrueClient de verdade (o mesmo
 * @supabase/auth-js que o app usa), com fetch e storage de mentira, e mede o que
 * acontece com `updateUser` quando o callback de `onAuthStateChange` aguarda
 * outra chamada do Supabase.
 *
 * `updateUser` roda dentro do lock de auth e notifica os inscritos DE DENTRO
 * dele. Um callback que aguarda `getSession()` cai no lock reentrante, que
 * espera a operação de fora terminar — e ela está esperando a notificação.
 * Espera circular.
 */
import { GoTrueClient } from '@supabase/auth-js';

let falhas = 0;
const eq = (nome: string, obtido: any, esperado: any) => {
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FALHA"} ${nome}${ok ? "" : ` → obtido ${obtido}, esperado ${esperado}`}`);
};

const SESSAO = {
  access_token: 'jwt-de-mentira',
  refresh_token: 'refresh-de-mentira',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: { id: 'aluno-1', aud: 'authenticated', role: 'authenticated', email: 'a@b.c',
          app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};

function memoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
}

function cliente() {
  const storage = memoria();
  storage.setItem('sb-teste', JSON.stringify(SESSAO));
  return new GoTrueClient({
    url: 'http://localhost:0/auth/v1',
    storageKey: 'sb-teste',
    storage: storage as any,
    autoRefreshToken: false,
    persistSession: true,
    // PUT /user responde o usuário atualizado, como o GoTrue real faria.
    fetch: (async () => new Response(
      JSON.stringify(SESSAO.user),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as any,
  });
}

/** Roda `updateUser` com um limite de tempo e diz se ele resolveu. */
async function updateUserResolve(c: GoTrueClient, ms = 3000): Promise<boolean> {
  return Promise.race([
    c.updateUser({ password: 'nova-senha-123!' }).then(() => true).catch(() => true),
    new Promise<boolean>(r => setTimeout(() => r(false), ms)),
  ]);
}

(async () => {
  // ── O jeito antigo: callback async que aguarda outra chamada do Supabase ──
  const travado = cliente();
  await travado.initialize?.();
  travado.onAuthStateChange((async (_evento: string) => {
    // É isto que o AuthProvider fazia: `await fetchProfile(...)`, e toda query
    // do PostgREST passa por `getSession()` para pegar o token.
    await travado.getSession();
  }) as any);
  eq('o jeito antigo trava o updateUser', await updateUserResolve(travado), false);

  // ── O jeito novo: callback síncrono, trabalho adiado com setTimeout(0) ──
  const solto = cliente();
  await solto.initialize?.();
  let rodouDepois = false;
  solto.onAuthStateChange(((_evento: string) => {
    setTimeout(() => { solto.getSession().then(() => { rodouDepois = true; }); }, 0);
  }) as any);
  eq('adiando com setTimeout(0), o updateUser resolve', await updateUserResolve(solto), true);

  await new Promise(r => setTimeout(r, 50));
  eq('e o trabalho adiado acontece mesmo assim', rodouDepois, true);

  console.log(falhas === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${falhas} FALHA(S)`);
  process.exit(falhas === 0 ? 0 : 1);
})();
