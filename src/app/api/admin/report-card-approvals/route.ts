import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminUser } from "@/lib/server-auth";
import type { ReportCardTrack } from "@/app/api/admin/report-card-import/route";

const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

function tableFor(track: ReportCardTrack) {
  return track === "etec" ? "report_card_entries" : "report_card_entries_enem";
}

export type PendingEntry = {
  id: string;
  track: ReportCardTrack;
  student_id: string;
  student_name: string;
  semester: number;
  colegio: string | null;
  sala: string | null;
  classificatoria_score: number | null;
  classificatoria_max: number | null;
  redacao_score: number | null;
  imported_at: string;
  imported_by_name: string | null;
};

// GET /api/admin/report-card-approvals → lista boletins com status='pending' (ENEM + ETEC)
export async function GET() {
  const caller = await requireAdminUser();
  if (!caller) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const supabase = serviceClient();

  const [enem, etec] = await Promise.all([
    supabase
      .from("report_card_entries_enem")
      .select("id, student_id, semester, colegio, sala, classificatoria_score, classificatoria_max, redacao_score, imported_at, imported_by")
      .eq("status", "pending")
      .order("imported_at", { ascending: false }),
    supabase
      .from("report_card_entries")
      .select("id, student_id, semester, colegio, sala, classificatoria_score, classificatoria_max, redacao_score, imported_at, imported_by")
      .eq("status", "pending")
      .order("imported_at", { ascending: false }),
  ]);

  if (enem.error) return NextResponse.json({ error: enem.error.message }, { status: 500 });
  if (etec.error) return NextResponse.json({ error: etec.error.message }, { status: 500 });

  const rows = [
    ...(enem.data || []).map((r) => ({ ...r, track: "enem" as const })),
    ...(etec.data || []).map((r) => ({ ...r, track: "etec" as const })),
  ];

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.student_id, r.imported_by].filter(Boolean) as string[])));
  const { data: profiles, error: pError } = userIds.length
    ? await supabase.from("profiles").select("id, name").in("id", userIds)
    : { data: [], error: null };

  if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });
  const nameMap = new Map((profiles || []).map((p) => [p.id, p.name]));

  const entries: PendingEntry[] = rows.map((r) => ({
    id: r.id,
    track: r.track,
    student_id: r.student_id,
    student_name: nameMap.get(r.student_id) || "Aluno não encontrado",
    semester: r.semester,
    colegio: r.colegio,
    sala: r.sala,
    classificatoria_score: r.classificatoria_score,
    classificatoria_max: r.classificatoria_max,
    redacao_score: r.redacao_score,
    imported_at: r.imported_at,
    imported_by_name: r.imported_by ? nameMap.get(r.imported_by) || null : null,
  }));

  entries.sort((a, b) => new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime());

  return NextResponse.json({ entries });
}

// POST /api/admin/report-card-approvals  { action: 'approve'|'reject', id, track, reason? }
export async function POST(req: NextRequest) {
  const caller = await requireAdminUser();
  if (!caller) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { action, id, track, reason } = await req.json();
  if (!id || (track !== "enem" && track !== "etec")) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const supabase = serviceClient();
  const table = tableFor(track);

  const { error } = await supabase
    .from(table)
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: caller.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: action === "reject" ? (reason ?? null) : null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
