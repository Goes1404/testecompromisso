import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/server-auth";
import { assinarLinkDaPorta } from "@/lib/conferencia-token";

/** Gera o link da porta (conferência sem login). Só admin/staff. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await exigirAdmin();
  if (auth.negado) return auth.negado;
  const r = assinarLinkDaPorta();
  if (!r) return NextResponse.json({ error: "Falta o segredo do servidor (LINK_SENHA_SECRET)." }, { status: 500 });
  const origem = new URL(request.url).origin;
  return NextResponse.json({ url: `${origem}/conferencia?t=${r.token}`, expiraEm: r.expiraEm.toISOString() });
}
