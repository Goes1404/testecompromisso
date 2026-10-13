import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { sendPushToUser, sendPushToUsers, idsDeAlunos, idsDeAlunosDasSalas } from "@/lib/push";
import { avisoDaLive, COLUNA_DO_AVISO, type EventoDaLive } from "@/lib/live-aviso";

type NotifyBody =
  | { type: "chat"; receiverId: string; content: string }
  | { type: "communication"; announcementId: string }
  | { type: "material"; materialId: string }
  | { type: "live"; liveId: string; event: EventoDaLive };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NotifyBody;

    // Autenticar o emissor
    const cookieStore = await cookies();
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Buscar nome do emissor para personalizar a notificação
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("name, role")
      .eq("id", user.id)
      .maybeSingle();
    const senderName = senderProfile?.name || "Compromisso";

    // ── Caso 1: Mensagem direta no chat ──────────────────────
    if (body.type === "chat") {
      if (!body.receiverId) {
        return NextResponse.json({ error: "receiverId obrigatório" }, { status: 400 });
      }

      // A notificação é derivada da mensagem GRAVADA, não do texto enviado no
      // corpo. Antes, qualquer sessão autenticada podia disparar push com
      // conteúdo arbitrário para qualquer usuário — bastava informar o id do
      // destinatário. O nome do remetente ia junto, então dava para forjar uma
      // mensagem convincente de outra pessoa.
      //
      // Buscar a mensagem real resolve as duas coisas de uma vez: prova que a
      // conversa existe e garante que o texto notificado é o que foi de fato
      // enviado.
      const { data: mensagem } = await admin
        .from("direct_messages")
        .select("content, created_at")
        .eq("sender_id", user.id)
        .eq("receiver_id", body.receiverId)
        .gte("created_at", new Date(Date.now() - 120_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mensagem) {
        return NextResponse.json(
          { error: "Nenhuma mensagem recente para notificar." },
          { status: 409 },
        );
      }

      const texto = mensagem.content ?? "";
      const preview = texto.length > 140 ? texto.slice(0, 140) + "…" : texto;
      const result = await sendPushToUser(body.receiverId, {
        title: senderName,
        body: preview,
        type: "chat",
        url: `/dashboard/chat/${user.id}`,
        tag: `chat-${user.id}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // ── Caso 2: Comunicado/Aviso ─────────────────────────────
    if (body.type === "communication") {
      // As colunas sao `message` e `target_group`. Ate 31/08 este select pedia
      // `content` e `target_audience`, que nunca existiram na tabela: o
      // PostgREST devolvia erro, `ann` vinha nulo e a rota respondia 404 — e as
      // duas telas que chamam aqui engolem a falha com `.catch(() => {})`.
      // Resultado: nenhum push de comunicado jamais saiu.
      const { data: ann, error: annError } = await admin
        .from("announcements")
        .select("title, message, priority, target_group")
        .eq("id", body.announcementId)
        .maybeSingle();
      if (annError) {
        console.error("[push/notify] falha ao ler comunicado:", annError.message);
        return NextResponse.json({ error: "Falha ao ler o comunicado" }, { status: 500 });
      }
      if (!ann) return NextResponse.json({ error: "Comunicado não encontrado" }, { status: 404 });

      // Restringe envio a roles autorizadas
      if (!senderProfile || !["teacher", "admin", "staff"].includes(senderProfile.role)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }

      // Publico: 'all' | 'enem' | 'etec' (best-effort por exam_target); quando
      // `target_group` traz o id de uma turma, cai no geral, que e o
      // comportamento que a tela ja mostrava antes desta correcao.
      // profile_type é texto livre (ex.: "etec", "Estudante ETEC") — usar role,
      // que é o enum confiável para identificar alunos.
      const publico = (ann.target_group || "all").toLowerCase();
      const userIds = await idsDeAlunos(
        publico === "enem" || publico === "etec" ? publico.toUpperCase() : undefined,
      );

      const result = await sendPushToUsers(userIds, {
        title: ann.priority === "high" ? "⚠️ " + ann.title : ann.title,
        body: (ann.message || "").slice(0, 200),
        type: "communication",
        url: `/dashboard/home`,
        tag: `comunicado-${body.announcementId}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // ── Caso 3: Material publicado ───────────────────────────
    if (body.type === "material") {
      const { data: mat } = await admin
        .from("class_materials")
        .select("title, subject, target_group, teacher_name")
        .eq("id", body.materialId)
        .maybeSingle();
      if (!mat) return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });

      if (!senderProfile || !["teacher", "admin", "staff"].includes(senderProfile.role)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }

      const userIds = await idsDeAlunos(
        mat.target_group === "enem" || mat.target_group === "etec" ? mat.target_group.toUpperCase() : undefined,
      );

      const result = await sendPushToUsers(userIds, {
        title: `📚 Novo material: ${mat.title}`,
        body: `${mat.teacher_name || "Professor"}${mat.subject ? " — " + mat.subject : ""}`,
        type: "material",
        url: `/dashboard/student/materials`,
        tag: `material-${body.materialId}`,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    // ── Caso 4: Live agendada / entrou no ar ─────────────────
    // O aviso vai para os alunos das turmas da aula (`lives.turmas`; vazio =
    // todos) — os outros nem conseguem abrir a sala (RLS). O texto sai da live
    // GRAVADA (nunca do corpo), e o evento `ao_vivo` só sai se o status no
    // banco for de fato `live`.
    if (body.type === "live") {
      if (!body.liveId || (body.event !== "agendada" && body.event !== "ao_vivo")) {
        return NextResponse.json({ error: "liveId e event obrigatórios" }, { status: 400 });
      }
      if (!senderProfile || !["teacher", "admin", "staff"].includes(senderProfile.role)) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }

      // `turmas` vem da migration 20261013120000. Sem ela a coluna não existe e
      // o select inteiro falharia — então tenta com e cai para sem.
      let { data: live, error: erroLive } = await admin
        .from("lives")
        .select("id, title, teacher_name, start_time, status, turmas")
        .eq("id", body.liveId)
        .maybeSingle();
      if (erroLive) {
        ({ data: live } = await admin
          .from("lives")
          .select("id, title, teacher_name, start_time, status")
          .eq("id", body.liveId)
          .maybeSingle());
      }
      if (!live) return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
      if (body.event === "ao_vivo" && live.status !== "live") {
        return NextResponse.json({ error: "A live não está no ar" }, { status: 409 });
      }

      // Marca antes de enviar, só se ainda não estava marcada: liga/desliga do
      // sinal ou dois cliques simultâneos não viram dois pushes para ~855
      // alunos. Coluna ausente (migration não aplicada) → avisa mesmo assim,
      // só perde a memória (mesma regra do mural).
      const coluna = COLUNA_DO_AVISO[body.event];
      const marcado = await admin
        .from("lives")
        .update({ [coluna]: new Date().toISOString() })
        .eq("id", live.id)
        .is(coluna, null)
        .select("id");
      if (!marcado.error && (marcado.data?.length ?? 0) === 0) {
        return NextResponse.json({ ok: true, skipped: "já avisado" });
      }
      if (marcado.error) {
        console.warn("[push/notify] live sem coluna de aviso:", marcado.error.message);
      }

      const turmas: string[] = Array.isArray((live as any).turmas) ? (live as any).turmas : [];
      const userIds = turmas.length > 0 ? await idsDeAlunosDasSalas(turmas) : await idsDeAlunos();

      const aviso = avisoDaLive(body.event, live);
      const result = await sendPushToUsers(userIds, { ...aviso, type: "info" });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Tipo de evento desconhecido" }, { status: 400 });
  } catch (err: any) {
    console.error("[push/notify]", err);
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 });
  }
}
