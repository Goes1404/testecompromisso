import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requireTeacherOrAdmin, getAuthUser } from "@/lib/server-auth";
import { faixasDaAula, validarFaixas } from "@/lib/transmissao";
import {
  ErroDoCloudflare,
  assinarSessao,
  conferirAssinatura,
  novaSessao,
  publicarFaixas,
  puxarFaixas,
  renegociar,
  sdpValido,
  transmissaoConfigurada,
} from "@/lib/transmissao-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Transmissão pela plataforma (Cloudflare Realtime). Um POST com `acao`:
 *
 * | acao        | quem               | faz                                                        |
 * |-------------|--------------------|------------------------------------------------------------|
 * | `publicar`  | equipe             | abre a sessão do professor e grava `lives.transmissao_*`   |
 * | `parar`     | equipe             | limpa `lives.transmissao_*` (a sala do aluno volta a esperar) |
 * | `assistir`  | logado que vê a aula (RLS) | abre a sessão do aluno e devolve a oferta + assinatura |
 * | `responder` | o mesmo aluno      | entrega a resposta (SDP) do aluno ao Cloudflare            |
 *
 * Autorização sempre por sessão (cookie) + `profiles.role` no servidor, nunca
 * por dado do corpo (regra 1 de segurança). O aluno só assiste aula que a RLS
 * de `lives` deixa ele ler (turmas) e que está no ar.
 */

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function clienteDoUsuario() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
}

const erro = (status: number, codigo: string, mensagem: string) =>
  NextResponse.json({ erro: codigo, mensagem }, { status });

export async function POST(req: NextRequest) {
  if (!transmissaoConfigurada()) {
    return erro(503, "nao_configurado", "A transmissão pela plataforma ainda não foi configurada.");
  }

  let corpo: any;
  try {
    corpo = JSON.parse(await req.text());
  } catch {
    return erro(400, "corpo_invalido", "Requisição inválida.");
  }
  const acao = corpo?.acao;
  const liveId = typeof corpo?.liveId === "string" ? corpo.liveId : null;

  try {
    // ── Professor começa ────────────────────────────────────────────────
    if (acao === "publicar") {
      const user = await requireTeacherOrAdmin();
      if (!user) return erro(403, "sem_permissao", "Só a equipe pode transmitir.");
      if (!liveId || !sdpValido(corpo?.sdp)) return erro(400, "corpo_invalido", "Requisição inválida.");
      const v = validarFaixas(corpo?.faixas);
      if (!v.ok) return erro(400, "faixas_invalidas", v.erro);

      const { data: live } = await admin().from("lives").select("id, status").eq("id", liveId).maybeSingle();
      if (!live) return erro(404, "aula_nao_encontrada", "Aula não encontrada.");
      if (live.status === "completed") return erro(409, "aula_encerrada", "Esta aula já foi encerrada. Reabra para transmitir.");

      const sessao = await novaSessao();
      const resposta = await publicarFaixas(sessao, { type: "offer", sdp: corpo.sdp }, v.faixas);

      const { error } = await admin()
        .from("lives")
        .update({
          transmissao_sessao: sessao,
          transmissao_faixas: v.faixas.map(({ nome, tipo }) => ({ nome, tipo })),
          transmissao_desde: new Date().toISOString(),
        })
        .eq("id", liveId);
      if (error) {
        // Coluna ausente = migration da transmissão não aplicada.
        return erro(500, "sem_migration", "O banco ainda não tem as colunas da transmissão.");
      }
      return NextResponse.json({ sdp: resposta.sdp, sessao });
    }

    // ── Professor para ──────────────────────────────────────────────────
    if (acao === "parar") {
      const user = await requireTeacherOrAdmin();
      if (!user) return erro(403, "sem_permissao", "Só a equipe pode transmitir.");
      if (!liveId) return erro(400, "corpo_invalido", "Requisição inválida.");
      // Só limpa se a sessão gravada é a que está parando: um "parar" atrasado
      // de uma aba antiga não derruba a transmissão nova do professor.
      let q = admin().from("lives").update({ transmissao_sessao: null, transmissao_faixas: [], transmissao_desde: null }).eq("id", liveId);
      if (typeof corpo?.sessao === "string") q = q.eq("transmissao_sessao", corpo.sessao);
      await q;
      return NextResponse.json({ ok: true });
    }

    // ── Aluno entra ─────────────────────────────────────────────────────
    if (acao === "assistir") {
      const user = await getAuthUser();
      if (!user) return erro(401, "sem_sessao", "Entre na sua conta.");
      if (!liveId) return erro(400, "corpo_invalido", "Requisição inválida.");

      // Lida com o cliente DO ALUNO: a RLS de `lives` decide se ele vê a aula
      // (turmas). Sem linha = não pode assistir.
      const sb = await clienteDoUsuario();
      const { data: live } = await sb
        .from("lives")
        .select("id, status, transmissao_sessao, transmissao_faixas")
        .eq("id", liveId)
        .maybeSingle();
      if (!live) return erro(404, "aula_nao_encontrada", "Aula não encontrada.");
      if (live.status !== "live" || !live.transmissao_sessao) {
        return erro(409, "sem_transmissao", "O professor ainda não começou a transmitir.");
      }
      const nomes = faixasDaAula(live.transmissao_faixas).map((f) => f.nome);
      if (nomes.length === 0) return erro(409, "sem_transmissao", "O professor ainda não começou a transmitir.");

      const sessao = await novaSessao();
      const { oferta, faixas } = await puxarFaixas(sessao, live.transmissao_sessao, nomes);
      if (!oferta || faixas.length === 0) {
        // As faixas sumiram no Cloudflare (professor fechou a aba sem parar).
        return erro(409, "sem_transmissao", "A transmissão caiu. Aguardando o professor voltar.");
      }
      return NextResponse.json({
        sessao,
        assinatura: assinarSessao(sessao, user.id),
        sdp: oferta.sdp,
        faixas,
        transmissao: live.transmissao_sessao,
      });
    }

    // ── Aluno responde ──────────────────────────────────────────────────
    if (acao === "responder") {
      const user = await getAuthUser();
      if (!user) return erro(401, "sem_sessao", "Entre na sua conta.");
      const sessao = typeof corpo?.sessao === "string" ? corpo.sessao : "";
      if (!sessao || !sdpValido(corpo?.sdp) || !conferirAssinatura(sessao, user.id, corpo?.assinatura)) {
        return erro(403, "assinatura_invalida", "Sessão inválida.");
      }
      await renegociar(sessao, { type: "answer", sdp: corpo.sdp });
      return NextResponse.json({ ok: true });
    }

    return erro(400, "acao_desconhecida", "Ação desconhecida.");
  } catch (e) {
    if (e instanceof ErroDoCloudflare) {
      console.error("[transmissao] cloudflare:", e.message);
      return erro(502, "cloudflare", "O serviço de vídeo não respondeu. Tente de novo.");
    }
    console.error("[transmissao]", (e as Error)?.message);
    return erro(500, "interno", "Erro interno.");
  }
}
