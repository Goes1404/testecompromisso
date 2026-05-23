/**
 * seed-enem.mjs — segunda passagem
 * Insere questões individualmente para não rejeitar batch inteiro por uma duplicata.
 * Uso: NODE_TLS_REJECT_UNAUTHORIZED=0 node --env-file=.env.local seed-enem.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENEM_API = 'https://api.enem.dev/v1';
const PAGE_SIZE = 50;

const DISCIPLINE_TO_SUBJECT = {
  'linguagens':        'Linguagens e Códigos',
  'ciencias-humanas':  'Ciências Humanas',
  'ciencias-natureza': 'Ciências da Natureza',
  'matematica':        'Matemática',
};

function fetchPS(url) {
  const escaped = url.replace(/'/g, "''");
  // Use RawContentStream + explicit UTF-8 decode to avoid PowerShell 5.1 charset bug
  // (Invoke-WebRequest .Content decodes as Windows-1252, corrupting non-ASCII chars)
  const cmd = `powershell -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $r=Invoke-WebRequest -Uri '${escaped}' -UseBasicParsing; [System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())"`;
  return JSON.parse(execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
}

async function fetchAllQuestions(year) {
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (all.length < total) {
    const json = fetchPS(`${ENEM_API}/exams/${year}/questions?limit=${PAGE_SIZE}&offset=${offset}`);
    const batch = json.questions ?? [];
    if (json.metadata?.total) total = json.metadata.total;
    all.push(...batch);
    if (!json.metadata?.hasMore || batch.length === 0) break;
    offset += batch.length;
    await new Promise(r => setTimeout(r, 400));
  }
  return all;
}

async function ensureSubject(db, name) {
  const { data: existing } = await db.from('subjects').select('id').eq('name', name).maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await db.from('subjects').insert({ name }).select('id').single();
  if (error) {
    const { data: retry } = await db.from('subjects').select('id').eq('name', name).maybeSingle();
    if (retry?.id) return retry.id;
    throw new Error(`Disciplina "${name}": ${error.message}`);
  }
  return data.id;
}

async function importYear(db, year) {
  process.stdout.write(`ENEM ${year}... `);

  let apiQ;
  try { apiQ = await fetchAllQuestions(year); }
  catch (e) { process.stdout.write(`⚠ API falhou\n`); return; }

  if (!apiQ?.length) { process.stdout.write(`⚠ sem questões\n`); return; }

  const subjectCache = {};
  for (const [disc, name] of Object.entries(DISCIPLINE_TO_SUBJECT)) {
    subjectCache[disc] = await ensureSubject(db, name);
  }

  let examId;
  const { data: ex } = await db.from('exams').select('id').eq('year', year).eq('exam_type', 'enem').maybeSingle();
  if (ex) {
    examId = ex.id;
  } else {
    const { data: ne, error: ee } = await db.from('exams')
      .insert({ title: `ENEM ${year}`, year, exam_type: 'enem' }).select('id').single();
    if (ee) throw new Error(`Prova ${year}: ${ee.message}`);
    examId = ne.id;
  }

  let inserted = 0, skipped = 0, errors = 0;
  const insertedIds = [];

  // Inserir uma a uma para não perder questões válidas por uma duplicata no batch
  for (const q of apiQ) {
    const payload = {
      question_text: q.alternativesIntroduction ?? q.title ?? `Questão ${q.index}`,
      supporting_text: q.context ?? null,
      image_url: Array.isArray(q.files)
        ? (q.files.find(f => typeof f === 'string' && f.startsWith('http')) ?? null)
        : null,
      options: (q.alternatives ?? []).map(a => ({ key: a.letter, text: a.text ?? '' })),
      correct_answer: q.correctAlternative ?? 'A',
      subject_id: subjectCache[q.discipline ?? 'linguagens'] ?? subjectCache['linguagens'],
      year: q.year ?? year,
      target_audience: 'enem',
      explanation: null,
    };

    const { data: row, error: insErr } = await db.from('questions').insert(payload).select('id').single();
    if (insErr) {
      if (insErr.code === '23505') skipped++; // duplicate hash
      else { errors++; }
    } else if (row) {
      inserted++;
      insertedIds.push(row.id);
    }
  }

  // Vincular ao exame
  if (insertedIds.length > 0) {
    const { data: existing } = await db.from('exam_questions').select('question_id').eq('exam_id', examId);
    const already = new Set((existing ?? []).map(r => r.question_id));
    const links = insertedIds
      .filter(id => !already.has(id))
      .map((question_id, idx) => ({ exam_id: examId, question_id, order_index: idx + 1 }));
    if (links.length > 0) await db.from('exam_questions').insert(links);
  }

  const tag = errors > 0 ? ` (${errors} erros)` : '';
  process.stdout.write(`✓ ${inserted} novas, ${skipped} duplicatas${tag} / ${apiQ.length} total\n`);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔗 ${SUPABASE_URL}\n`);

  const YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010];

  for (const year of YEARS) {
    await importYear(db, year);
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n✅ Concluído!\n');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
