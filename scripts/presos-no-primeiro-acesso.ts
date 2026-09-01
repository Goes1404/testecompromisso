/**
 * Quantos alunos travaram na criação de senha do primeiro acesso.
 *
 * O defeito (corrigido em 31/08, ver "Nunca chame o Supabase dentro de
 * onAuthStateChange" no CLAUDE.md): `updateUser` entrava em deadlock com o lock
 * de auth. A senha MUDAVA no servidor, mas a promessa nunca resolvia no
 * navegador, então o passo 2 não rodava e `must_change_password` continuava
 * ligado. O aluno ficava com a senha nova e o middleware o devolvia ao
 * `/dashboard/first-access` para sempre.
 *
 * Ninguém sabia o tamanho disso: o aluno atingido não abre chamado, ele desiste.
 *
 * Este script NÃO altera nada. Ele cruza duas fontes:
 *
 *   1. `app_events` — quantos alunos distintos registraram
 *      `primeiro_acesso_senha_falhou`. É a medida direta de quem viu o erro,
 *      mas subestima: a telemetria envia em lote a cada 5s, e quem fechou o
 *      aplicativo antes disso não aparece.
 *   2. `auth.users` — quem ainda está com `must_change_password: true` E já
 *      entrou alguma vez. É a fila real de gente presa hoje, e o número que
 *      importa para saber se a correção resolveu: ele tem que cair sozinho nos
 *      próximos dias, conforme os alunos voltam.
 *
 * O cruzamento (aluno na fila E com falha registrada) é o mais próximo de
 * "vítima confirmada" que dá para afirmar sem testar senha de ninguém.
 *
 * Uso:
 *   npx tsx scripts/presos-no-primeiro-acesso.ts          # resumo
 *   npx tsx scripts/presos-no-primeiro-acesso.ts --csv    # lista para a secretaria
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const csv = process.argv.includes('--csv');

/** `listUsers` pagina de 1000 em 1000; a base tem ~1.6 mil contas. */
async function todosOsUsuarios() {
  const todos: any[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    todos.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return todos;
}

(async () => {
  const usuarios = await todosOsUsuarios();

  const presos = usuarios.filter(u =>
    u.user_metadata?.must_change_password === true && !!u.last_sign_in_at);

  const nuncaEntraram = usuarios.filter(u =>
    u.user_metadata?.must_change_password === true && !u.last_sign_in_at);

  const { data: falhas, error } = await db
    .from('app_events')
    .select('user_id, created_at')
    .eq('name', 'primeiro_acesso_senha_falhou');
  if (error) throw error;

  const comFalha = new Set((falhas || []).map(f => f.user_id).filter(Boolean));
  const confirmados = presos.filter(u => comFalha.has(u.id));

  const datas = (falhas || []).map(f => f.created_at).sort();

  if (csv) {
    console.log('email,ultimo_login,falha_registrada');
    for (const u of presos) {
      console.log([u.email, u.last_sign_in_at, comFalha.has(u.id) ? 'sim' : 'nao'].join(','));
    }
    return;
  }

  console.log('\n── Primeiro acesso: quem travou ─────────────────────────────\n');
  console.log(`  Contas no total                              ${usuarios.length}`);
  console.log(`  Com must_change_password ligado              ${presos.length + nuncaEntraram.length}`);
  console.log(`    ├─ já entraram alguma vez  (PRESOS HOJE)   ${presos.length}`);
  console.log(`    └─ nunca entraram (normal, ainda não usou)  ${nuncaEntraram.length}`);
  console.log('');
  console.log(`  Alunos distintos com falha registrada        ${comFalha.size}`);
  console.log(`  Presos COM falha registrada (confirmados)    ${confirmados.length}`);
  if (datas.length) {
    console.log(`  Falhas registradas: ${datas.length}, de ${datas[0]?.slice(0, 10)} a ${datas[datas.length - 1]?.slice(0, 10)}`);
  }
  console.log('\n  A telemetria subestima (envia em lote a cada 5s; quem fechou');
  console.log('  o app antes não aparece). "Presos hoje" é o número que importa:');
  console.log('  ele tem que cair sozinho conforme os alunos voltam ao app.');
  console.log('\n  Nenhum dado foi alterado. --csv gera a lista para a secretaria.\n');
})().catch(e => { console.error('Falhou:', e.message); process.exit(1); });
