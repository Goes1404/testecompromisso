import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/server-auth";
import { fichaDoCorpo, registrar, supabaseServico } from "@/lib/matricula-servidor";

/**
 * Inscrição feita pela secretaria no balcão (admin/staff). Vale fora do prazo
 * da ficha pública; a regra de repetida continua valendo.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await exigirAdmin();
  if (auth.negado) return auth.negado;

  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 500 });

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const r = await registrar(supa, fichaDoCorpo(corpo), "secretaria");
  if (!r.ok) return NextResponse.json({ error: r.erro, erros: r.erros }, { status: r.status });
  return NextResponse.json({ protocolo: r.protocolo, inscricao: r.inscricao });
}
