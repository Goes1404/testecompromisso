import { NextRequest, NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/server-auth";
import { idDoYoutube } from "@/lib/lives";
import { interpretarOembed, urlDoOembed, verificacaoIndisponivel, type Verificacao } from "@/lib/live-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** O YouTube costuma responder em menos de 1 s; mais que isso é indisponível. */
const TEMPO_LIMITE_MS = 6_000;

/**
 * Pergunta ao oEmbed do YouTube se o vídeo da aula existe e pode ser embutido.
 * Só a equipe chama (é quem abre a sala). Não grava nada: o resultado vale
 * para aquele momento — o professor pode mudar a visibilidade no YouTube
 * Studio a qualquer hora, e por isso a sala confere de novo ao abrir.
 *
 * Servidor, e não o navegador do professor, porque o oEmbed do YouTube não
 * libera CORS. A regra de leitura da resposta mora em `src/lib/live-video.ts`.
 */
export async function POST(req: NextRequest) {
  const user = await requireTeacherOrAdmin();
  if (!user) return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });

  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "corpo_invalido" }, { status: 400 });
  }
  const id = idDoYoutube(typeof corpo?.videoId === "string" ? corpo.videoId : null);
  if (!id) return NextResponse.json({ erro: "video_invalido" }, { status: 400 });

  const verificacao = await consultarOembed(id);
  return NextResponse.json({ videoId: id, verificacao });
}

async function consultarOembed(id: string): Promise<Verificacao> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const r = await fetch(urlDoOembed(id), {
      signal: controle.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    let json: unknown = null;
    if (r.status === 200) {
      try {
        json = await r.json();
      } catch {
        json = null;
      }
    }
    return interpretarOembed(r.status, json);
  } catch {
    return verificacaoIndisponivel();
  } finally {
    clearTimeout(timer);
  }
}
