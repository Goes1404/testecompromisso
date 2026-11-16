import { NextResponse } from "next/server";
import { ANO_MATRICULA } from "@/lib/matricula";
import { supabaseServico } from "@/lib/matricula-servidor";
import { linkDaPortaValido } from "@/lib/conferencia-token";

/**
 * Conferência da porta sem login: a chave do link (`t`) é a autorização.
 * GET  ?t=  → inscrições com só o que o fiscal precisa (sem celular nem responsável).
 * POST {t, id, acao: "confirmar" | "desfazer"} → muda só o status
 *      (recebida ↔ confirmada). A sala nunca muda por aqui.
 */
export const dynamic = "force-dynamic";

const CAMPOS = "id, ano, numero, protocolo, nome, nascimento, foco, status, sala, sala_origem";

export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get("t");
  if (!linkDaPortaValido(t)) return NextResponse.json({ error: "Link vencido ou inválido. Peça um novo à coordenação." }, { status: 401 });
  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ error: "Servidor sem configuração." }, { status: 503 });
  const linhas: unknown[] = [];
  for (let de = 0; de < 20_000; de += 1000) {
    const { data, error } = await supa.from("matriculas").select(CAMPOS).eq("ano", ANO_MATRICULA)
      .order("numero").order("id").range(de, de + 999);
    if (error) return NextResponse.json({ error: "Não deu para carregar agora." }, { status: 500 });
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return NextResponse.json({ lista: linhas });
}

export async function POST(request: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!linkDaPortaValido(typeof corpo.t === "string" ? corpo.t : null)) {
    return NextResponse.json({ error: "Link vencido ou inválido. Peça um novo à coordenação." }, { status: 401 });
  }
  const id = typeof corpo.id === "string" ? corpo.id : "";
  const acao = corpo.acao;
  if (!/^[0-9a-f-]{36}$/i.test(id) || (acao !== "confirmar" && acao !== "desfazer")) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ error: "Servidor sem configuração." }, { status: 503 });
  const [de, para] = acao === "confirmar" ? ["recebida", "confirmada"] : ["confirmada", "recebida"];
  const { data, error } = await supa.from("matriculas").update({ status: para })
    .eq("id", id).eq("ano", ANO_MATRICULA).eq("status", de).not("sala", "is", null)
    .select(CAMPOS);
  if (error) return NextResponse.json({ error: "Não deu para salvar." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Esta inscrição mudou. Atualize a lista." }, { status: 409 });
  return NextResponse.json({ inscricao: data[0] });
}
