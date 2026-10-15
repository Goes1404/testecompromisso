/**
 * Ensaio de carga do aulão: N alunos de mentira na sala, contra o Supabase de
 * verdade, fazendo exatamente o que a tela do aluno faz (chat a cada 5 s,
 * presença a cada 60 s, releitura da aula a cada 20 s, uma mensagem de vez em
 * quando). Mede a latência e os erros de cada pedido, pela mesma porta
 * (PostgREST) que os celulares usam.
 *
 *   npx tsx scripts/ensaio-da-live.ts --alunos 300 --minutos 3 --sim
 *   npx tsx scripts/ensaio-da-live.ts --limpar          # apaga tudo do ensaio
 *
 * Precisa, no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_JWT_SECRET  (Dashboard → Project Settings → API → JWT Secret)
 *     Com ele, o script assina um token por aluno e não passa pelo login — o
 *     GoTrue limita logins por IP e 300 logins seguidos seriam barrados. Sem
 *     ele, faz login em lotes (mais lento; espera e repete se cair em 429).
 *
 * Sem a chave de serviço (`--aula <id>`): as contas e a aula já foram criadas
 * por fora (SQL no painel), com a senha em ENSAIO_SENHA; o script só faz os
 * logins e a carga, e não apaga nada no fim.
 *
 * O que ele cria, e apaga no fim:
 *   - N contas `ensaio.carga.<n>@compromisso.test` (role student, sala 99);
 *   - uma aula "ENSAIO DE CARGA (apagar)" no ar, restrita à sala 99 — nenhum
 *     aluno de verdade vê (RLS); a equipe vê na agenda enquanto o ensaio roda.
 * `--manter` guarda as contas para rodar de novo mais rápido. ⚠️ Contas
 * mantidas contam como "esperadas" (e ausentes) na chamada de qualquer aula
 * para todas as turmas. Rode `--limpar` antes do aulão de verdade.
 *
 * Números de referência (15/10, banco em compute menor, max_connections=60):
 * chat_da_live 0,4 ms, registrar_presenca_live 0,4 ms, lives por id 0,1 ms.
 * O que este ensaio mede a mais é a porta: PostgREST, JWT, rede.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createHmac } from 'node:crypto';
import { performance } from 'node:perf_hooks';

config({ path: '.env.local' });

const TITULO = 'ENSAIO DE CARGA (apagar)';
const DOMINIO = 'compromisso.test';
const SENHA = process.env.ENSAIO_SENHA || 'ensaio-de-carga-2026';
const RAMPA_MS = 15_000;

// ── argumentos ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const num = (n: string, padrao: number) => {
  const i = args.indexOf(`--${n}`);
  const v = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : padrao;
};
const ALUNOS = num('alunos', 100);
const MINUTOS = num('minutos', 2);
const SALA = String(num('sala', 99));
const MENSAGEM_CADA_S = num('mensagem-cada', 45);
const MANTER = flag('manter');
const LIMPAR = flag('limpar');
const AULA_PRONTA = (() => {
  const i = args.indexOf('--aula');
  return i >= 0 ? args[i + 1] : null;
})();

// ── ambiente ──────────────────────────────────────────────────────────────
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
if (!URL || !ANON || (!SERVICE && !AULA_PRONTA)) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY no .env.local (ou passe --aula <id> com a aula e as contas já criadas).');
  process.exit(1);
}
const admin = createClient(URL, SERVICE || ANON, { auth: { persistSession: false, autoRefreshToken: false } });

const emailDe = (i: number) => `ensaio.carga.${i}@${DOMINIO}`;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── medição ───────────────────────────────────────────────────────────────
type Medida = { ms: number; erro: string | null };
const medidas: Record<string, Medida[]> = { chat: [], presenca: [], aula: [], enviar: [] };

async function medir(op: keyof typeof medidas, fn: () => PromiseLike<{ error: any }>) {
  const t = performance.now();
  let erro: string | null = null;
  try {
    const { error } = await fn();
    if (error) erro = error.code || error.message || 'erro';
  } catch (e: any) {
    erro = e?.code || e?.message || String(e);
  }
  medidas[op].push({ ms: performance.now() - t, erro });
}

function percentil(valores: number[], p: number): number {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))];
}

function relatorio(titulo: string) {
  console.log(`\n── ${titulo} ──`);
  console.log('op         pedidos  erros   p50     p95     p99     máx');
  for (const [op, lista] of Object.entries(medidas)) {
    const ms = lista.map((m) => m.ms);
    const erros = lista.filter((m) => m.erro);
    const linha = [
      op.padEnd(10),
      String(lista.length).padStart(7),
      String(erros.length).padStart(6),
      ...[50, 95, 99].map((p) => `${percentil(ms, p).toFixed(0)}ms`.padStart(7)),
      `${(ms.length ? Math.max(...ms) : 0).toFixed(0)}ms`.padStart(7),
    ].join(' ');
    console.log(linha);
    if (erros.length) {
      const porTipo: Record<string, number> = {};
      for (const e of erros) porTipo[e.erro!] = (porTipo[e.erro!] ?? 0) + 1;
      for (const [k, n] of Object.entries(porTipo)) console.log(`           ↳ ${n}× ${k}`);
    }
  }
}

// ── contas de ensaio ──────────────────────────────────────────────────────
type Conta = { id: string; email: string };

async function contasExistentes(): Promise<Conta[]> {
  const { data, error } = await admin
    .from('profiles')
    .select('id,email')
    .like('email', `ensaio.carga.%@${DOMINIO}`)
    .limit(5000);
  if (error) throw new Error(`listar contas: ${error.message}`);
  return (data ?? []) as Conta[];
}

async function garantirContas(n: number): Promise<Conta[]> {
  const existentes = new Map((await contasExistentes()).map((c) => [c.email, c]));
  const contas: Conta[] = [];
  for (let i = 1; i <= n; i++) {
    const email = emailDe(i);
    let conta = existentes.get(email);
    if (!conta) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: SENHA,
        email_confirm: true,
        user_metadata: { full_name: `Ensaio ${i}` },
      });
      if (error || !data.user) throw new Error(`criar ${email}: ${error?.message}`);
      conta = { id: data.user.id, email };
      if (i % 50 === 0) console.log(`  criadas ${i}/${n}`);
    }
    contas.push(conta);
  }
  // O gatilho de auth.users cria o perfil como student; aqui garante papel,
  // sala e nome (a sala é o que faz pode_ver_live aceitar a aula do ensaio).
  for (let i = 0; i < contas.length; i += 200) {
    const lote = contas.slice(i, i + 200);
    const { error } = await admin
      .from('profiles')
      .update({ role: 'student', sala: SALA, status: 'active', arquivado_em: null })
      .in('id', lote.map((c) => c.id));
    if (error) throw new Error(`ajustar perfis: ${error.message}`);
  }
  return contas;
}

async function apagarContas(contas: Conta[]) {
  let n = 0;
  for (const c of contas) {
    const { error } = await admin.auth.admin.deleteUser(c.id);
    if (error) console.warn(`  não apagou ${c.email}: ${error.message}`);
    else n++;
  }
  console.log(`  ${n} contas de ensaio apagadas`);
}

async function apagarAulasDoEnsaio() {
  const { data, error } = await admin.from('lives').delete().eq('title', TITULO).select('id');
  if (error) console.warn(`  não apagou aulas: ${error.message}`);
  else console.log(`  ${data?.length ?? 0} aula(s) de ensaio apagada(s)`);
}

// ── token por aluno ───────────────────────────────────────────────────────
const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');

function tokenAssinado(conta: Conta): string {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const corpo = b64url(
    JSON.stringify({
      aud: 'authenticated',
      role: 'authenticated',
      sub: conta.id,
      email: conta.email,
      iss: `${URL}/auth/v1`,
      iat: agora,
      exp: agora + 3 * 3600,
    }),
  );
  const assinatura = createHmac('sha256', JWT_SECRET!).update(`${cabecalho}.${corpo}`).digest('base64url');
  return `${cabecalho}.${corpo}.${assinatura}`;
}

function clienteCom(token: string): SupabaseClient {
  return createClient(URL!, ANON!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function tokenPorLogin(conta: Conta): Promise<string> {
  const c = createClient(URL!, ANON!, { auth: { persistSession: false, autoRefreshToken: false } });
  for (let tentativa = 1; ; tentativa++) {
    const { data, error } = await c.auth.signInWithPassword({ email: conta.email, password: SENHA });
    if (!error && data.session) return data.session.access_token;
    if (tentativa >= 4) throw new Error(`login ${conta.email}: ${error?.message}`);
    console.warn(`  login de ${conta.email} falhou (${error?.message}); esperando 30 s`);
    await dormir(30_000);
  }
}

async function tokensDe(contas: Conta[]): Promise<string[]> {
  if (JWT_SECRET) return contas.map(tokenAssinado);
  console.warn('Sem SUPABASE_JWT_SECRET: fazendo login em lotes de 20 (o GoTrue limita por IP).');
  const tokens: string[] = [];
  for (let i = 0; i < contas.length; i += 20) {
    tokens.push(...(await Promise.all(contas.slice(i, i + 20).map(tokenPorLogin))));
    if (tokens.length % 100 === 0) console.log(`  ${tokens.length}/${contas.length} logados`);
    await dormir(1_500);
  }
  return tokens;
}

// ── a aula ────────────────────────────────────────────────────────────────
async function idDaEquipe(): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'staff', 'teacher'])
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function criarAula(teacherId: string | null): Promise<string> {
  const { data, error } = await admin
    .from('lives')
    .insert({
      title: TITULO,
      description: 'Aula de mentira do ensaio de carga. Pode apagar.',
      status: 'live',
      start_time: new Date().toISOString(),
      turmas: [SALA],
      teacher_name: 'Ensaio de carga',
      teacher_id: teacherId,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`criar aula: ${error?.message}`);
  return data.id as string;
}

// ── um aluno ──────────────────────────────────────────────────────────────
function aluno(conta: Conta, token: string, liveId: string, atrasoMs: number, parar: () => boolean) {
  const sb = clienteCom(token);
  const jitter = (ms: number) => Math.round(ms * (0.9 + Math.random() * 0.2));
  let versao = 0;

  const laco = async (cadaMs: number, acao: () => Promise<void>, primeiroMs = 0) => {
    await dormir(atrasoMs + primeiroMs);
    while (!parar()) {
      await acao();
      await dormir(jitter(cadaMs));
    }
  };

  const chat = laco(5_000, async () => {
    await medir('chat', async () => {
      const r = await sb.rpc('chat_da_live', { p_live: liveId, p_desde: versao });
      const novas = (r.data as any)?.mensagens ?? [];
      for (const m of novas) if (m.versao > versao) versao = m.versao;
      return r;
    });
  });
  const presenca = laco(60_000, () => medir('presenca', () => sb.rpc('registrar_presenca_live', { p_live_id: liveId })));
  const aula = laco(20_000, () => medir('aula', () => sb.from('lives').select('*').eq('id', liveId).maybeSingle()), 3_000);
  const envio = laco(
    MENSAGEM_CADA_S * 1000,
    () =>
      medir('enviar', () =>
        sb.from('live_chat').insert({ live_id: liveId, user_id: conta.id, texto: `oi, sou o ${conta.email.split('@')[0]} (${new Date().toLocaleTimeString('pt-BR')})` }),
      ),
    Math.random() * MENSAGEM_CADA_S * 1000,
  );
  return Promise.all([chat, presenca, aula, envio]);
}

// ── principal ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`Projeto: ${URL}`);

  if (LIMPAR) {
    console.log('Limpando o ensaio…');
    await apagarAulasDoEnsaio();
    await apagarContas(await contasExistentes());
    return;
  }

  if (!flag('sim')) {
    console.log(`Vai criar ${ALUNOS} contas de ensaio e uma aula no ar (sala ${SALA}) nesse projeto, por ${MINUTOS} min.`);
    console.log('Confirme com --sim. Para apagar o que um ensaio deixou: --limpar.');
    process.exit(2);
  }

  let contas: Conta[];
  let liveId: string;
  let equipe: string | null = null;
  if (AULA_PRONTA) {
    // Modo sem chave de serviço: contas 1..N e aula criadas por fora.
    contas = Array.from({ length: ALUNOS }, (_, i) => ({ id: '', email: emailDe(i + 1) }));
    liveId = AULA_PRONTA;
    console.log(`Aula do ensaio (já criada): ${liveId}`);
  } else {
    console.log(`Contas de ensaio (${ALUNOS})…`);
    contas = await garantirContas(ALUNOS);
    equipe = await idDaEquipe();
    liveId = await criarAula(equipe);
    console.log(`Aula do ensaio: ${liveId}`);
  }
  console.log('Tokens…');
  const tokens = await tokensDe(contas);
  // Sem chave de serviço o id vem do próprio token (o insert no chat precisa dele).
  if (AULA_PRONTA) {
    contas = contas.map((c, i) => ({ ...c, id: JSON.parse(Buffer.from(tokens[i].split('.')[1], 'base64url').toString()).sub }));
  }

  let fim = false;
  const parar = () => fim;
  const encerrar = async (motivo: string) => {
    if (fim) return;
    fim = true;
    console.log(`\nEncerrando (${motivo})…`);
    await dormir(1_500);
    relatorio('resultado final');
    if (equipe && JWT_SECRET) {
      const prof = clienteCom(tokenAssinado({ id: equipe, email: 'equipe@ensaio' }));
      const { data } = await prof.rpc('presencas_da_live', { p_live_id: liveId });
      if (data) console.log(`\nChamada: ${(data as any).alunos?.length ?? 0} entraram de ${(data as any).esperados} esperados; aula no ar há ${(data as any).segundos_da_aula}s`);
    }
    if (AULA_PRONTA) {
      console.log('\nModo --aula: nada foi apagado. Apague a aula e as contas de ensaio pelo painel (SQL).');
      return;
    }
    const { count } = await admin.from('live_chat').select('id', { count: 'exact', head: true }).eq('live_id', liveId);
    console.log(`Mensagens no chat do ensaio: ${count ?? '?'}`);
    console.log('\nLimpando…');
    await apagarAulasDoEnsaio();
    if (MANTER) {
      console.log(`  ⚠️ ${contas.length} contas de ensaio MANTIDAS (sala ${SALA}). Rode --limpar antes do aulão de verdade.`);
    } else {
      await apagarContas(contas);
    }
  };
  process.on('SIGINT', () => encerrar('Ctrl+C').then(() => process.exit(0)));

  console.log(`\n${ALUNOS} alunos entrando ao longo de ${RAMPA_MS / 1000} s; ensaio de ${MINUTOS} min. Ctrl+C encerra e limpa.`);
  const alunos = contas.map((c, i) => aluno(c, tokens[i], liveId, (i / contas.length) * RAMPA_MS, parar));
  const parcial = setInterval(() => relatorio(`${new Date().toLocaleTimeString('pt-BR')} (parcial)`), 30_000);
  await dormir(MINUTOS * 60_000);
  clearInterval(parcial);
  await encerrar('tempo esgotado');
  await Promise.race([Promise.all(alunos), dormir(10_000)]);
}

main().catch(async (e) => {
  console.error('\nEnsaio falhou:', e?.message ?? e);
  console.error('Rode --limpar para apagar o que ficou.');
  process.exit(1);
});
