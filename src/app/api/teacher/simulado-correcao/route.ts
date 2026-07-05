import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireTeacherOrAdmin } from '@/lib/server-auth';

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

function bestMatch(target: string, profiles: { id: string; full_name: string }[]) {
  const tn = norm(target);
  const tokens = tn.split(' ');
  const exact = profiles.find(p => norm(p.full_name) === tn);
  if (exact) return { profile: exact, confidence: 'high' as const };
  if (tokens.length >= 2) {
    const t2 = tokens.slice(0, 2).join(' ');
    const hit = profiles.find(p => norm(p.full_name).startsWith(t2));
    if (hit) return { profile: hit, confidence: 'high' as const };
  }
  let best: typeof profiles[0] | null = null, bestScore = 0;
  for (const p of profiles) {
    const pt = norm(p.full_name).split(' ');
    const m = tokens.filter(t => pt.includes(t)).length;
    const score = m / Math.max(tokens.length, pt.length);
    if (score > bestScore) { bestScore = score; best = p; }
  }
  if (best && bestScore >= 0.75) return { profile: best, confidence: 'high' as const };
  if (best && bestScore >= 0.5) return { profile: best, confidence: 'low' as const };
  return null;
}

// GET: list exams OR get one exam with attempts
export async function GET(req: NextRequest) {
  const caller = await requireTeacherOrAdmin();
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const db = admin();
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get('examId');

  if (!examId) {
    // List all simulado_importado exams
    const { data, error } = await db.from('exams')
      .select('id, title, year, answer_key')
      .eq('exam_type', 'simulado_importado')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ exams: data });
  }

  // Get specific exam + all attempts + student names
  const [examRes, attemptsRes] = await Promise.all([
    db.from('exams').select('id, title, year, answer_key').eq('id', examId).single(),
    db.from('exam_attempts')
      .select('id, user_id, score, answers, completed_at, profile:profiles!user_id(full_name)')
      .eq('exam_id', examId)
      .order('completed_at', { ascending: false }),
  ]);

  if (examRes.error) return NextResponse.json({ error: examRes.error.message }, { status: 500 });
  return NextResponse.json({ exam: examRes.data, attempts: attemptsRes.data || [] });
}

export async function POST(req: NextRequest) {
  const caller = await requireTeacherOrAdmin();
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const db = admin();
  const body = await req.json();
  const { action } = body;

  // ── Save gabarito ──────────────────────────────────────────
  if (action === 'save_gabarito') {
    const { examId, answerKey } = body as { examId: string; answerKey: string[] };
    const { error } = await db.from('exams').update({ answer_key: answerKey }).eq('id', examId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Save score only (no per-question) ─────────────────────
  if (action === 'save_score') {
    const { examId, userId, score } = body as { examId: string; userId: string; score: number };
    const { error } = await db.from('exam_attempts').upsert(
      { user_id: userId, exam_id: examId, score, total_questions: 0, answers: [], completed_at: new Date().toISOString() },
      { onConflict: 'user_id,exam_id' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Save full card (per-question answers) ─────────────────
  if (action === 'save_card') {
    const { examId, userId, selected, answerKey } = body as {
      examId: string; userId: string; selected: string[]; answerKey: string[];
    };
    const score = selected.filter((a, i) => a && a.toUpperCase() === (answerKey[i] || '').toUpperCase()).length;
    const answers = selected.map((s, i) => ({ q: i + 1, selected: s.toUpperCase() }));
    const { error } = await db.from('exam_attempts').upsert(
      { user_id: userId, exam_id: examId, score, total_questions: answerKey.length, answers, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,exam_id' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, score });
  }

  // ── Excel preview ──────────────────────────────────────────
  if (action === 'excel_preview') {
    const { rows } = body as { rows: string[][] };
    const { data: profiles } = await db.from('profiles').select('id, full_name').limit(1000);
    const list = profiles || [];

    const results = rows.map(row => {
      const name = String(row[0] || '').trim();
      if (!name) return null;
      const match = bestMatch(name, list);
      // Detect format: if row has >2 cols it's detailed (Q1..Q60)
      const isDetailed = row.length > 2;
      const scoreRaw = isDetailed ? null : Number(row[1]);
      const answers = isDetailed ? row.slice(1).map(v => (v || '').trim().toUpperCase()) : null;
      return { name, userId: match?.profile.id ?? null, matchedName: match?.profile.full_name ?? null, confidence: match?.confidence ?? 'none', score: scoreRaw, answers, isDetailed };
    }).filter(Boolean);

    return NextResponse.json({ results });
  }

  // ── Excel apply ────────────────────────────────────────────
  if (action === 'excel_apply') {
    const { examId, entries, answerKey } = body as {
      examId: string;
      answerKey: string[] | null;
      entries: { userId: string; score: number | null; answers: string[] | null }[];
    };

    let ok = 0, err = 0;
    for (const e of entries) {
      let score = e.score ?? 0;
      let answers: object[] = [];
      if (e.answers && answerKey) {
        score = e.answers.filter((a, i) => a && a.toUpperCase() === (answerKey[i] || '').toUpperCase()).length;
        answers = e.answers.map((s, i) => ({ q: i + 1, selected: s.toUpperCase() }));
      }
      const { error } = await db.from('exam_attempts').upsert(
        { user_id: e.userId, exam_id: examId, score, total_questions: answerKey?.length ?? 0, answers, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,exam_id' }
      );
      if (error) err++; else ok++;
    }
    return NextResponse.json({ ok, err });
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
}
