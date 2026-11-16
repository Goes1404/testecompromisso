import { NextResponse } from "next/server";
import { consultar, supabaseServico } from "@/lib/matricula-servidor";

/**
 * Consulta pública da inscrição (sem login), no mesmo link da ficha.
 *
 * POST { busca, nascimento } → { inscricao } ou 404.
 * `busca` é o nome completo (exato, sem diferença de acento/maiúscula) OU o
 * protocolo; a data de nascimento é sempre exigida. Devolve só primeiro nome,
 * foco, situação, sala e lugar na fila — nada de celular, escola ou responsável.
 * Limite por IP para ninguém varrer nomes: 40 consultas por hora (alto porque
 * uma turma inteira pode consultar do mesmo Wi-Fi).
 */
export const dynamic = "force-dynamic";

const LIMITE_POR_HORA = 40;

export async function POST(request: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const busca = typeof corpo.busca === "string" ? corpo.busca.replace(/\s+/g, " ").trim() : "";
  const nascimento = typeof corpo.nascimento === "string" ? corpo.nascimento.trim() : "";
  if (!busca || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
    return NextResponse.json({ error: "Preencha o nome completo (ou o número de inscrição) e a data de nascimento." }, { status: 400 });
  }

  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ error: "Consulta indisponível no momento." }, { status: 503 });

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || request.headers.get("x-real-ip") || "desconhecido";
  try {
    const desde = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supa
      .from("password_reset_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("identifier", "matricula_consulta")
      .gte("created_at", desde);
    if ((count ?? 0) >= LIMITE_POR_HORA) {
      return NextResponse.json({ error: "Muitas consultas deste local na última hora. Tente mais tarde ou procure a secretaria." }, { status: 429 });
    }
    await supa.from("password_reset_attempts").insert({ ip, identifier: "matricula_consulta", success: true });
  } catch {
    // Tabela de tentativas fora do ar: segue, a consulta exige nome exato + nascimento.
  }

  const inscricao = await consultar(supa, busca, nascimento);
  if (!inscricao) {
    return NextResponse.json(
      { error: "Não achamos nenhuma inscrição com esses dados. Confira o nome completo (como na ficha) e a data de nascimento, ou use o número de inscrição." },
      { status: 404 },
    );
  }
  return NextResponse.json({ inscricao });
}
