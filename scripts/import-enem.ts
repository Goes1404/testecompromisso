/**
 * Script de importação de questões do ENEM via api.enem.dev
 *
 * Uso:
 *   npx tsx scripts/import-enem.ts --year 2023
 *   npx tsx scripts/import-enem.ts --year 2019 --year 2020 --year 2021
 *   npx tsx scripts/import-enem.ts --all
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← bypass RLS, nunca expor no frontend
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ─── Config ────────────────────────────────────────────────────────────────

const ENEM_API = "https://api.enem.dev/v1";
const PAGE_SIZE = 50;
const ALL_YEARS = [2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023];

// Mapeamento área API → subject name no nosso banco
const DISCIPLINE_MAP: Record<string, string> = {
  linguagens: "Linguagens e Códigos",
  matematica: "Matemática",
  natureza:   "Ciências da Natureza",
  humanas:    "Ciências Humanas",
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface EnemAlternative {
  letter: string;
  text: string;
  file: string | null;
  isCorrect: boolean;
}

interface EnemQuestion {
  title: string;
  index: number;
  discipline: string;
  language: string | null;
  year: number;
  context: string | null;
  files: string[];
  correctAlternative: string;
  alternativesIntroduction: string | null;
  alternatives: EnemAlternative[];
}

interface EnemResponse {
  questions: EnemQuestion[];
  metadata: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ─── Supabase ───────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchSubjectMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("subjects").select("id, name");
  if (error) throw new Error(`Erro ao buscar subjects: ${error.message}`);
  return Object.fromEntries((data ?? []).map((s) => [s.name, s.id]));
}

async function fetchPage(year: number, offset: number): Promise<EnemResponse> {
  const url = `${ENEM_API}/exams/${year}/questions?limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status} em ${url}`);
  return res.json();
}

function buildOptions(alternatives: EnemAlternative[]): Record<string, string> {
  const opts: Record<string, string> = {};
  for (const alt of alternatives) {
    opts[alt.letter] = alt.text || (alt.file ? `[IMAGEM: ${alt.file}]` : "");
  }
  return opts;
}

function buildQuestionText(q: EnemQuestion): string {
  // Questões de linguagens/idioma têm conteúdo só na alternativa — usa o title como fallback
  return q.alternativesIntroduction?.trim() || q.title;
}

// ─── Import por ano ─────────────────────────────────────────────────────────

async function importYear(year: number, subjectMap: Record<string, string>) {
  console.log(`\n📥 Importando ENEM ${year}...`);

  let offset = 0;
  let total = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  do {
    const page = await fetchPage(year, offset);
    total = page.metadata.total;

    const rows = page.questions
      // Ignora variantes de idioma (espanhol/inglês) — mantém só português
      .filter((q) => q.language === null || q.language === "portugues")
      .map((q) => {
        const disciplineName = DISCIPLINE_MAP[q.discipline] ?? "Não Categorizado";
        const subject_id = subjectMap[disciplineName] ?? subjectMap["Não Categorizado"];
        const options = buildOptions(q.alternatives);
        const question_text = buildQuestionText(q);

        return {
          question_text,
          options,
          correct_answer: q.correctAlternative,
          subject_id,
          supporting_text: q.context ?? null,
          image_url: q.files?.[0] ?? null,
          target_audience: "enem",
          explanation: null,
          // campos de rastreabilidade (Opção C)
          enem_discipline: q.discipline,
          enem_year: q.year,
          enem_index: q.index,
        };
      });

    if (rows.length === 0) {
      offset += PAGE_SIZE;
      continue;
    }

    // Upsert: question_hash é gerado pelo trigger do banco no INSERT.
    // ON CONFLICT no índice único idx_questions_hash faz skip automático.
    const { data, error } = await supabase
      .from("questions")
      .insert(rows)
      .select("id");

    if (error) {
      // Erro de duplicata (código 23505) é esperado — conta como skip
      if (error.code === "23505") {
        skipped += rows.length;
      } else {
        console.error(`  ⚠️  Erro no batch offset=${offset}:`, error.message);
        errors += rows.length;
      }
    } else {
      inserted += data?.length ?? 0;
      // Rows que não vieram no select foram ignoradas pelo ON CONFLICT
      skipped += rows.length - (data?.length ?? 0);
    }

    process.stdout.write(
      `\r  offset=${offset + PAGE_SIZE}/${total} | ✅ ${inserted} inseridas | ⏭  ${skipped} duplicatas | ❌ ${errors} erros`
    );

    offset += PAGE_SIZE;
  } while (offset < total);

  console.log(`\n  ✔ ENEM ${year} concluído: ${inserted} novas, ${skipped} duplicatas, ${errors} erros`);
  return { inserted, skipped, errors };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
    process.exit(1);
  }

  // Resolve anos a importar
  let years: number[] = [];
  if (args.includes("--all")) {
    years = ALL_YEARS;
  } else {
    const yearArgs = args.flatMap((a, i) => (a === "--year" ? [Number(args[i + 1])] : []));
    if (yearArgs.length === 0) {
      console.error("Uso: npx tsx scripts/import-enem.ts --year 2023\n      npx tsx scripts/import-enem.ts --all");
      process.exit(1);
    }
    years = yearArgs;
  }

  console.log(`🎯 Anos selecionados: ${years.join(", ")}`);

  const subjectMap = await fetchSubjectMap();
  console.log(`📚 Subjects carregados: ${Object.keys(subjectMap).join(", ")}`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const year of years) {
    const { inserted, skipped, errors } = await importYear(year, subjectMap);
    totalInserted += inserted;
    totalSkipped += skipped;
    totalErrors += errors;
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`🏁 Importação concluída`);
  console.log(`   ✅ ${totalInserted} questões inseridas`);
  console.log(`   ⏭  ${totalSkipped} duplicatas ignoradas`);
  console.log(`   ❌ ${totalErrors} erros`);
  console.log(`\n💡 Próximo passo: reclassificar por matéria com IA`);
  console.log(`   SELECT COUNT(*), enem_discipline FROM questions WHERE enem_discipline IS NOT NULL GROUP BY enem_discipline;`);
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
