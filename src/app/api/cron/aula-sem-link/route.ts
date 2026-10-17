import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push";
import { segredoConfere, segredoEsperado } from "@/lib/cron-auth";
import { avisoDeAulaSemLink, type AulaSemLink } from "@/lib/lives";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Aviso de aula sem link (17/10). Chamada pelo `pg_cron` a cada 5 minutos.
 *
 * Quem precisa de aviso sai de `lives_sem_link_para_avisar()`: agendada,
 * começando em até 15 min (ou atrasada até 10 min), sem YouTube nem Meet. Vai
 * para o professor da aula e para a coordenação/secretaria (admin + staff) —
 * qualquer um da equipe pode colar o link e abrir a sala.
 *
 * Um aviso por pessoa por rodada, mesmo com várias aulas (ENEM e ETEC começam
 * no mesmo horário): duas notificações iguais seguidas ensinam a ignorar.
 */
export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const esperado = await segredoEsperado(admin);
  if (!esperado) return NextResponse.json({ error: "Rota não configurada." }, { status: 503 });
  const recebido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!recebido || !segredoConfere(recebido, esperado)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { data: candidatas, error } = await admin.rpc("lives_sem_link_para_avisar");
  if (error) {
    console.error("[cron/aula-sem-link]", error.message);
    return NextResponse.json({ error: "Falha ao consultar." }, { status: 500 });
  }
  if (!candidatas?.length) return NextResponse.json({ aulas: 0, avisados: 0 });

  // Marca ANTES de enviar: só avisa a aula que esta chamada conseguiu marcar.
  const { data: marcadas } = await admin
    .from("lives")
    .update({ avisado_sem_link_em: new Date().toISOString() })
    .in("id", (candidatas as AulaSemLink[]).map((a) => a.id))
    .is("avisado_sem_link_em", null)
    .select("id");
  const ids = new Set((marcadas ?? []).map((m: { id: string }) => m.id));
  const aulas = (candidatas as AulaSemLink[]).filter((a) => ids.has(a.id));
  if (!aulas.length) return NextResponse.json({ aulas: 0, avisados: 0 });

  const { data: equipe } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["admin", "staff"])
    .is("arquivado_em", null);

  // Cada pessoa recebe a lista das aulas que lhe dizem respeito: a coordenação
  // todas, o professor só as dele.
  const porPessoa = new Map<string, AulaSemLink[]>();
  const juntar = (uid: string | null, aula: AulaSemLink) => {
    if (!uid) return;
    porPessoa.set(uid, [...(porPessoa.get(uid) ?? []), aula]);
  };
  for (const aula of aulas) {
    juntar(aula.teacher_id, aula);
    for (const p of equipe ?? []) if (p.id !== aula.teacher_id) juntar(p.id, aula);
  }

  let avisados = 0;
  for (const [uid, lista] of porPessoa) {
    const { title, body } = avisoDeAulaSemLink(lista);
    await sendPushToUsers([uid], { title, body, url: "/dashboard/teacher/live", type: "info" });
    avisados++;
  }

  return NextResponse.json({ aulas: aulas.length, avisados });
}
