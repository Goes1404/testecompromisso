/**
 * Relatório das provas ETEC: questões e tentativas por prova, para decidir a
 * limpeza das duplicatas de 2023-1/2023-2/2024-1 (importadas duas vezes com
 * títulos diferentes — "ETEC 2023-1" vs "ETEC 2023 - 1º Semestre"). NÃO altera nada.
 *
 * Uso: npx tsx scripts/auditoria-provas-etec.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data: exams, error } = await db
    .from('exams')
    .select('id, title, year')
    .eq('exam_type', 'etec')
    .order('year');
  if (error) throw error;

  for (const ex of exams ?? []) {
    const { count: qs } = await db
      .from('exam_questions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', ex.id);
    const { count: tent } = await db
      .from('exam_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', ex.id);
    console.log(`${ex.year} | ${ex.title} | ${qs} questões | ${tent} tentativas | ${ex.id}`);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
