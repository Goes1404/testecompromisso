/**
 * Relatório: vencedores de todos os ciclos do ranking + melhor nota da FUVEST.
 *
 * Por que existe: a plataforma só sabe mostrar o pódio do ÚLTIMO ciclo
 * (`ranking_last_podium`, que filtra por `ends_at DESC LIMIT 1`). Quem precisa
 * conferir a entrega dos prêmios — a secretaria — não tem de onde tirar o
 * histórico completo, e um pódio que já rolou some da tela do aluno assim que
 * o ciclo seguinte fecha.
 *
 * Este script NÃO altera nada. Só lê.
 *
 * ── Ciclo vencido e não apurado ──────────────────────────────────────────────
 * `close_due_ranking_cycles()` depende de agendador. Se ele não rodou, o ciclo
 * fica com `closed_at IS NULL` e sem linhas em `ranking_cycle_winners` — foi
 * exatamente o que aconteceu em 08/08. Nesses casos o script calcula um pódio
 * PROVISÓRIO com a mesma regra vigente desde 11/08 (soma bruta do
 * `student_xp_log` na janela, a mesma que o aluno via na tela) e marca como
 * provisório. Ele não grava nada: quem oficializa é `close_ranking_cycle()`.
 *
 * ── Melhor nota da FUVEST ────────────────────────────────────────────────────
 * `essay_submissions.score` não tem teto único desde que a FUVEST entrou — a
 * coluna `banca` é que diz como ler o número (regra de `redacao-metrics.ts`).
 * Por isso o filtro é `banca = 'fuvest'`, nunca "score <= 50": um ENEM 45 é
 * quase zero e passaria pelo corte numérico.
 *
 * Anuladas (score 0) ficam fora — medem procedimento, não escrita —, mas são
 * contadas ao lado, igual a `mediaRedacao()`.
 *
 * Uso:
 *   npx tsx scripts/vencedores-e-melhor-fuvest.ts
 *   npx tsx scripts/vencedores-e-melhor-fuvest.ts --top 10   # top N da FUVEST
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const argTop = process.argv.indexOf('--top');
const TOP_FUVEST = argTop >= 0 ? Math.max(1, Number(process.argv[argTop + 1]) || 5) : 5;

const PAGINA = 1000;

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type Ciclo = {
  id: string;
  label: string | null;
  starts_at: string;
  ends_at: string;
  closed_at: string | null;
};

type Vencedor = {
  cycle_id: string;
  position: number;
  student_id: string;
  xp_premiado: number;
  xp_bruto: number;
};

const data = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Lê uma tabela inteira em páginas — `.select()` corta em 1.000 linhas. */
async function tudo<T>(
  supabase: SupabaseClient,
  tabela: string,
  colunas: string,
  filtro?: (q: any) => any,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    let q = supabase.from(tabela).select(colunas).range(de, de + PAGINA - 1);
    if (filtro) q = filtro(q);
    const { data: pagina, error } = await q;
    if (error) throw error;
    linhas.push(...((pagina ?? []) as T[]));
    if (!pagina || pagina.length < PAGINA) return linhas;
  }
}

/**
 * O pódio gravado. A coluna virou `xp_premiado` na migration de 11/08; em base
 * que ainda não a recebeu ela se chama `xp_apurado`. Tentar as duas evita que
 * o relatório inteiro morra por causa do nome de uma coluna.
 */
async function lerVencedores(supabase: SupabaseClient): Promise<Vencedor[]> {
  for (const coluna of ['xp_premiado', 'xp_apurado'] as const) {
    const { data: linhas, error } = await supabase
      .from('ranking_cycle_winners')
      .select(`cycle_id, position, student_id, xp_bruto, ${coluna}`)
      .order('position');
    if (!error) {
      return (linhas ?? []).map((l: any) => ({
        cycle_id: l.cycle_id,
        position: l.position,
        student_id: l.student_id,
        xp_premiado: l[coluna],
        xp_bruto: l.xp_bruto,
      }));
    }
    if (!String(error.message).includes(coluna)) throw error;
  }
  return [];
}

/** Soma bruta do XP na janela — a mesma conta de `close_ranking_cycle()`. */
async function podioProvisorio(
  supabase: SupabaseClient,
  ciclo: Pick<Ciclo, 'starts_at' | 'ends_at'>,
  alunos: Set<string>,
  top = 3,
) {
  const log = await tudo<{ student_id: string; xp_earned: number }>(
    supabase,
    'student_xp_log',
    'student_id, xp_earned',
    (q) => q.gte('created_at', ciclo.starts_at).lte('created_at', ciclo.ends_at),
  );

  const soma = new Map<string, number>();
  for (const l of log) {
    if (!alunos.has(l.student_id)) continue; // só `role = 'student'`, como a função faz
    soma.set(l.student_id, (soma.get(l.student_id) ?? 0) + (l.xp_earned ?? 0));
  }

  return [...soma.entries()]
    .filter(([, xp]) => xp > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([student_id, xp], i) => ({ position: i + 1, student_id, xp }));
}

async function main() {
  const supabase = db();

  const perfis = await tudo<{ id: string; full_name: string | null; role: string }>(
    supabase,
    'profiles',
    'id, full_name, role',
  );
  const nome = new Map(perfis.map((p) => [p.id, p.full_name ?? '(sem nome)']));
  const alunos = new Set(perfis.filter((p) => p.role === 'student').map((p) => p.id));

  // ───────────────────────────── Ranking ─────────────────────────────
  const ciclos = await tudo<Ciclo>(supabase, 'ranking_cycles', 'id, label, starts_at, ends_at, closed_at', (q) =>
    q.order('starts_at'),
  );
  const vencedores = await lerVencedores(supabase);
  const porCiclo = new Map<string, Vencedor[]>();
  for (const v of vencedores) porCiclo.set(v.cycle_id, [...(porCiclo.get(v.cycle_id) ?? []), v]);

  console.log('🏆 VENCEDORES DO RANKING — todos os ciclos\n' + '='.repeat(62));

  if (!ciclos.length) {
    console.log('\nNenhum ciclo cadastrado em `ranking_cycles`.');
    console.log('Sem ciclo, a view `weekly_ranking` cai na semana corrente e nada é premiado.');
  }

  const agora = new Date();
  for (const c of ciclos) {
    const janela = `${data(c.starts_at)} → ${data(c.ends_at)}`;
    console.log(`\n▸ ${c.label ?? '(sem rótulo)'}  [${janela}]`);

    const podio = (porCiclo.get(c.id) ?? []).sort((a, b) => a.position - b.position);

    if (podio.length) {
      for (const v of podio) {
        const nota =
          v.xp_bruto !== v.xp_premiado ? `  (bruto na tela: ${v.xp_bruto} XP)` : '';
        console.log(`   ${v.position}º  ${nome.get(v.student_id) ?? v.student_id} — ${v.xp_premiado} XP${nota}`);
      }
      if (podio.some((v) => v.xp_bruto !== v.xp_premiado)) {
        console.log('   ↳ apurado sob a regra anti-repetição, vigente até 11/08/2026.');
      }
      continue;
    }

    if (new Date(c.ends_at) > agora) {
      const parcial = await podioProvisorio(supabase, { starts_at: c.starts_at, ends_at: c.ends_at }, alunos);
      console.log('   ⏳ EM ANDAMENTO — liderança parcial, ainda pode mudar:');
      for (const p of parcial) console.log(`   ${p.position}º  ${nome.get(p.student_id) ?? p.student_id} — ${p.xp} XP`);
      if (!parcial.length) console.log('   (ninguém pontuou ainda)');
      continue;
    }

    const provisorio = await podioProvisorio(supabase, { starts_at: c.starts_at, ends_at: c.ends_at }, alunos);
    console.log('   ⚠️  ENCERRADO E NÃO APURADO — `closed_at` nulo, sem pódio gravado.');
    console.log('   Pódio PROVISÓRIO (soma bruta do log, mesma regra de close_ranking_cycle):');
    for (const p of provisorio) console.log(`   ${p.position}º  ${nome.get(p.student_id) ?? p.student_id} — ${p.xp} XP`);
    if (!provisorio.length) console.log('   (ninguém pontuou na janela)');
    console.log('   Para oficializar e disparar o comunicado: select close_due_ranking_cycles();');
  }

  // ────────────────────────────── FUVEST ──────────────────────────────
  console.log('\n\n✍️  REDAÇÃO FUVEST — melhores notas (escala 0–50)\n' + '='.repeat(62));

  const { data: redacoes, error } = await supabase
    .from('essay_submissions')
    .select('user_id, theme, score, created_at, banca')
    .eq('banca', 'fuvest')
    .not('score', 'is', null)
    .order('score', { ascending: false })
    .limit(500);

  if (error) {
    if (String(error.message).includes('banca')) {
      console.log('\nA coluna `essay_submissions.banca` não existe nesta base.');
      console.log('Aplique a migration 20260820120000_redacao_banca_fuvest.sql (npx supabase db push).');
      return;
    }
    throw error;
  }

  const notas = redacoes ?? [];
  const validas = notas.filter((r: any) => (r.score ?? 0) > 0);
  const anuladas = notas.length - validas.length;

  if (!validas.length) {
    console.log(`\nNenhuma redação da FUVEST com nota acima de zero (${anuladas} anulada(s)).`);
    return;
  }

  validas.slice(0, TOP_FUVEST).forEach((r: any, i: number) => {
    const marca = i === 0 ? '🥇' : `${i + 1}º`;
    console.log(`\n${marca}  ${r.score}/50 — ${nome.get(r.user_id) ?? r.user_id}`);
    console.log(`    Tema: ${r.theme ?? '(sem tema)'}`);
    console.log(`    Enviada em ${data(r.created_at)}`);
  });

  const media = validas.reduce((s: number, r: any) => s + r.score, 0) / validas.length;
  console.log(
    `\n— ${validas.length} redação(ões) da FUVEST corrigida(s), média ${
      Math.round(media * 10) / 10
    }/50` + (anuladas ? `, ${anuladas} anulada(s) fora da média.` : '.'),
  );
}

main().catch((e) => {
  console.error('Falhou:', e instanceof Error ? e.message : e);
  process.exit(1);
});
