import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminUser } from "@/lib/server-auth";

const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

// Normaliza nome para matching: lowercase, sem acentos, colapsa espaços
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(name: string, n = 2): string[] {
  return normalizeName(name).split(" ").slice(0, n);
}

export type ReportCardTrack = "enem" | "etec";

export type ReportCardImportRow = {
  name: string;
  colegio: string | null;
  sala: string | null;
  turno: string | null;
  classificatoria_score: number | null;
  classificatoria_max: number | null;
  redacao_score: number | null;
  redacao_max: number | null;
  simulado_score: number | null;
  simulado_1_score: number | null;
  simulado_2_score: number | null;
  simulado_3_score: number | null;
  simulado_max: number | null;
  lingua_portuguesa: number | null;
  matematica: number | null;
  historia: number | null;
  geografia: number | null;
  biologia: number | null;
  quimica: number | null;
  fisica: number | null;
  filosofia: number | null;
  sociologia: number | null;
  ingles: number | null;
  absences_1sem: number | null;
  absences_2sem: number | null;
  early_departures_1sem: number | null;
  early_departures_2sem: number | null;
};

export type ReportCardMatchResult = {
  row: ReportCardImportRow;
  profileId: string | null;
  profileName: string | null;
  confidence: "high" | "low" | "none";
};

export type ReportCardPreviewResponse = { matches: ReportCardMatchResult[] };
export type ReportCardApplyResponse = { imported: number; updated: number; skipped: number; errors: string[] };

function tableFor(track: ReportCardTrack) {
  return track === "etec" ? "report_card_entries" : "report_card_entries_enem";
}

async function handlePreview(rows: ReportCardImportRow[], supabase: ReturnType<typeof serviceClient>) {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("profile_type", "student");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profileList = (profiles || []).map((p) => ({
    id: p.id,
    name: p.name ?? "",
    norm: normalizeName(p.name ?? ""),
  }));

  const matches: ReportCardMatchResult[] = rows.map((row) => {
    const normRow = normalizeName(row.name);
    const tokens = nameTokens(row.name, 2);

    const exact = profileList.find((p) => p.norm === normRow);
    if (exact) {
      return { row, profileId: exact.id, profileName: exact.name, confidence: "high" };
    }

    const partial = profileList.filter((p) => tokens.every((t) => p.norm.includes(t)));
    if (partial.length === 1) {
      return { row, profileId: partial[0].id, profileName: partial[0].name, confidence: "high" };
    }
    if (partial.length > 1) {
      const allTokens = normRow.split(" ");
      const scored = partial
        .map((p) => ({ ...p, hits: allTokens.filter((t) => p.norm.includes(t)).length }))
        .sort((a, b) => b.hits - a.hits);
      return { row, profileId: scored[0].id, profileName: scored[0].name, confidence: "low" };
    }

    return { row, profileId: null, profileName: null, confidence: "none" };
  });

  return NextResponse.json({ matches } satisfies ReportCardPreviewResponse);
}

async function handleApply(
  matches: ReportCardMatchResult[],
  track: ReportCardTrack,
  subtrack: ReportCardTrack,
  semester: number,
  callerId: string,
  supabase: ReturnType<typeof serviceClient>
) {
  const table = tableFor(track);
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const valid = matches.filter((m) => m.profileId && m.confidence !== "none");

  for (const m of valid) {
    const { row, profileId } = m;

    const payload: Record<string, unknown> = {
      student_id: profileId,
      semester,
      colegio: row.colegio,
      sala: row.sala,
      turno: row.turno,
      classificatoria_score: row.classificatoria_score,
      classificatoria_max: row.classificatoria_max,
      redacao_score: row.redacao_score,
      redacao_max: row.redacao_max,
      absences_1sem: row.absences_1sem,
      absences_2sem: row.absences_2sem,
      status: "pending",
      imported_by: callerId,
      imported_at: new Date().toISOString(),
    };

    if (track === "etec") {
      payload.track = subtrack;
      payload.simulado_score = row.simulado_score;
      payload.simulado_max = row.simulado_max;
    } else {
      payload.simulado_1_score = row.simulado_1_score;
      payload.simulado_2_score = row.simulado_2_score;
      payload.simulado_3_score = row.simulado_3_score;
      payload.simulado_max = row.simulado_max;
      payload.lingua_portuguesa = row.lingua_portuguesa;
      payload.matematica = row.matematica;
      payload.historia = row.historia;
      payload.geografia = row.geografia;
      payload.biologia = row.biologia;
      payload.quimica = row.quimica;
      payload.fisica = row.fisica;
      payload.filosofia = row.filosofia;
      payload.sociologia = row.sociologia;
      payload.ingles = row.ingles;
      payload.early_departures_1sem = row.early_departures_1sem;
      payload.early_departures_2sem = row.early_departures_2sem;
    }

    const { data: existing, error: findErr } = await supabase
      .from(table)
      .select("id")
      .eq("student_id", profileId!)
      .eq("semester", semester)
      .maybeSingle();

    if (findErr) {
      errors.push(`${row.name}: erro ao verificar boletim existente — ${findErr.message}`);
      skipped++;
      continue;
    }

    if (existing) {
      const { error: updateErr } = await supabase.from(table).update(payload).eq("id", existing.id);
      if (updateErr) {
        errors.push(`${row.name}: erro ao atualizar boletim — ${updateErr.message}`);
        skipped++;
        continue;
      }
      updated++;
    } else {
      const { error: insertErr } = await supabase.from(table).insert(payload);
      if (insertErr) {
        errors.push(`${row.name}: erro ao importar boletim — ${insertErr.message}`);
        skipped++;
        continue;
      }
      imported++;
    }
  }

  skipped += matches.filter((m) => !m.profileId).length;

  return NextResponse.json({ imported, updated, skipped, errors } satisfies ReportCardApplyResponse);
}

export async function POST(req: NextRequest) {
  const caller = await requireAdminUser();
  if (!caller) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const supabase = serviceClient();
  const body = await req.json();
  const { action, rows, matches, track, subtrack, semester } = body;

  if (track !== "enem" && track !== "etec") {
    return NextResponse.json({ error: "Track inválido" }, { status: 400 });
  }

  if (action === "preview") {
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha enviada" }, { status: 400 });
    }
    return handlePreview(rows as ReportCardImportRow[], supabase);
  }

  if (action === "apply") {
    if (!Array.isArray(matches) || !Number.isInteger(semester) || (semester !== 1 && semester !== 2)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const resolvedSubtrack: ReportCardTrack = subtrack === "enem" ? "enem" : "etec";
    return handleApply(matches as ReportCardMatchResult[], track, resolvedSubtrack, semester, caller.id, supabase);
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
