import { NextResponse } from "next/server";
import { ANO_MATRICULA, situacaoDaFicha, TurmaDaMatricula } from "@/lib/matricula";
import { fichaDoCorpo, registrar, supabaseServico } from "@/lib/matricula-servidor";

/**
 * Ficha pública da matrícula (sem login).
 *
 * GET  → a janela da turma (aberta, abre_em, fecha_em) para a página saber o que mostrar.
 * POST → grava a ficha. Sem sessão, então as travas são: campo-isca para robô,
 *        limite por IP (alto: uma turma inteira pode se inscrever do mesmo Wi-Fi)
 *        e a função do banco, que confere janela e inscrição repetida.
 */
export const dynamic = "force-dynamic";

const LIMITE_POR_HORA = 30;

export async function GET() {
  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ ano: ANO_MATRICULA, situacao: "indisponivel" });
  const { data, error } = await supa.from("matricula_turmas").select("ano, abre_em, fecha_em, aberta").eq("ano", ANO_MATRICULA).maybeSingle();
  if (error || !data) return NextResponse.json({ ano: ANO_MATRICULA, situacao: "indisponivel" });
  const t = data as TurmaDaMatricula;
  return NextResponse.json({ ...t, situacao: situacaoDaFicha(t) });
}

export async function POST(request: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  // Campo-isca: invisível para pessoas, robô preenche. Responde como sucesso
  // genérico de erro para não ensinar o robô.
  if (typeof corpo.site === "string" && corpo.site.trim()) {
    return NextResponse.json({ error: "Não deu para registrar agora." }, { status: 400 });
  }

  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ error: "Inscrições indisponíveis no momento." }, { status: 503 });

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || request.headers.get("x-real-ip") || "desconhecido";
  try {
    const desde = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supa
      .from("password_reset_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("identifier", "matricula")
      .gte("created_at", desde);
    if ((count ?? 0) >= LIMITE_POR_HORA) {
      return NextResponse.json(
        { error: "Muitas inscrições deste local na última hora. Tente mais tarde ou procure a secretaria." },
        { status: 429 },
      );
    }
    await supa.from("password_reset_attempts").insert({ ip, identifier: "matricula", success: true });
  } catch {
    // Tabela de tentativas fora do ar: segue sem travar a inscrição legítima.
  }

  const r = await registrar(supa, fichaDoCorpo(corpo), "site");
  if (!r.ok) return NextResponse.json({ error: r.erro, erros: r.erros }, { status: r.status });
  return NextResponse.json({ protocolo: r.protocolo, inscricao: r.inscricao });
}
