import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const upperCode = code.trim().toUpperCase();
    const cookieStore = await cookies();

    // Autenticar o aluno via cookie de sessão
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // Usar service role para validar código e fazer upsert (evita complexidade de RLS no auto-checkin)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Buscar sessão com código válido e não expirado
    const { data: session, error: sessionError } = await adminClient
      .from("class_sessions")
      .select("id, title, session_date")
      .eq("checkin_code", upperCode)
      .gt("checkin_code_expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
    }

    // Verificar se já existe registro para não sobrescrever status definido pelo professor
    const { data: existing } = await adminClient
      .from("attendance_records")
      .select("id, status")
      .eq("session_id", session.id)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existing && existing.status !== "ausente") {
      // Já está presente ou justificado — não sobrescreve
      return NextResponse.json({
        message: "Presença já registrada.",
        session_title: session.title,
        session_date: session.session_date,
      });
    }

    const { error: upsertError } = await adminClient
      .from("attendance_records")
      .upsert(
        {
          session_id: session.id,
          student_id: user.id,
          status: "presente",
          self_checkin: true,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: "session_id,student_id" }
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      session_title: session.title,
      session_date: session.session_date,
    });
  } catch (err) {
    console.error("[checkin]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
