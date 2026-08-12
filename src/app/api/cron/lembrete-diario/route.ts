import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { sendPushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";
// Fan-out para dezenas de alunos com uma chamada Web Push cada.
export const maxDuration = 60;

/**
 * Lembrete diário de estudo.
 *
 * Chamada por `pg_cron` uma vez por dia. É o primeiro job de engajamento da
 * plataforma: até 12/08 nada acordava o aluno — o histórico tinha um disparo
 * de material em 15/06 e 23 mensagens de chat, e mais nada.
 *
 * Quem é escolhido e por quê fica em `alunos_para_lembrete()`, no banco. Aqui
 * só se decide o texto e se envia.
 */

type Segmento = "ultimo_dia" | "protegida" | "sumido";

interface Alvo {
  user_id: string;
  segmento: Segmento;
  ofensiva: number;
  protecoes: number;
  dias_parado: number;
  /** Nome do bichinho, quando o aluno já adotou um. */
  pet_nome: string | null;
}

/**
 * O texto de cada segmento.
 *
 * Regra de tom: cobrar o que dá para cumprir hoje e nunca culpar. O aluno que
 * sumiu duas semanas já sabe que sumiu — repetir isso é o que faz desinstalar.
 * Uma questão é um pedido pequeno o bastante para caber num intervalo de aula.
 *
 * Quem tem bichinho ouve a voz dele. É a diferença entre um sistema cobrando
 * uma métrica e alguém esperando por você — e era esse o ponto da ideia.
 */
function mensagem(a: Alvo): { title: string; body: string } {
  const pet = a.pet_nome;
  const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

  switch (a.segmento) {
    case "ultimo_dia":
      return pet
        ? {
            title: `🍎 ${pet} está com fome`,
            body: `Sua ofensiva de ${dias(a.ofensiva)} termina hoje. Uma questão alimenta ele.`,
          }
        : {
            title: `🔥 Sua ofensiva de ${dias(a.ofensiva)} termina hoje`,
            body: "Responda 1 questão e ela continua de pé. Leva um minuto.",
          };
    case "protegida":
      return pet
        ? {
            title: `🛡️ ${pet} segurou sua ofensiva`,
            body: `Seus ${dias(a.ofensiva)} continuam guardados. Estude hoje para seguir de onde parou.`,
          }
        : {
            title: "🛡️ Uma proteção segurou sua ofensiva",
            body: `Você tem ${dias(a.ofensiva)} guardados. Estude hoje para seguir de onde parou.`,
          };
    case "sumido":
      return pet
        ? {
            title: `💤 ${pet} foi dormir esperando você`,
            body: "Uma questão hoje acorda ele. Escolha a matéria que quiser.",
          }
        : {
            title: "Bora voltar? 👋",
            body: "Uma questão hoje já começa uma ofensiva nova. Escolha a matéria que quiser.",
          };
  }
}

/** Compara segredos sem vazar quanto do valor o chamador já acertou. */
function segredoConfere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const esperado = process.env.CRON_SECRET;
  if (!esperado || esperado.length < 16) {
    // Falha fechada: sem segredo configurado a rota não roda, em vez de ficar
    // aberta para qualquer um disparar notificação para a base inteira.
    console.error("[cron/lembrete-diario] CRON_SECRET ausente ou curto demais.");
    return NextResponse.json({ error: "Rota não configurada." }, { status: 503 });
  }

  const recebido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!recebido || !segredoConfere(recebido, esperado)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await admin.rpc("alunos_para_lembrete");
    if (error) throw new Error(error.message);

    const alvos = (data ?? []) as Alvo[];
    if (alvos.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0, porSegmento: {} });
    }

    // Agrupa por texto: alunos do mesmo segmento e mesma ofensiva recebem a
    // mesma mensagem, e `sendPushToUsers` já faz fan-out de uma só vez.
    const grupos = new Map<string, { alvos: Alvo[]; texto: ReturnType<typeof mensagem> }>();
    for (const a of alvos) {
      const texto = mensagem(a);
      const chave = `${texto.title}|${texto.body}`;
      const g = grupos.get(chave);
      if (g) g.alvos.push(a);
      else grupos.set(chave, { alvos: [a], texto });
    }

    let enviados = 0;
    const porSegmento: Record<string, number> = {};

    for (const { alvos: doGrupo, texto } of grupos.values()) {
      const r = await sendPushToUsers(doGrupo.map(a => a.user_id), {
        ...texto,
        type: "ofensiva",
        url: "/dashboard/student/simulados",
        // `tag` faz a notificação nova substituir a anterior no aparelho, em
        // vez de empilhar lembretes de dias diferentes na bandeja.
        tag: "lembrete-estudo",
      });
      enviados += r.sent;
      for (const a of doGrupo) {
        porSegmento[a.segmento] = (porSegmento[a.segmento] ?? 0) + 1;
      }
    }

    // Sem nome nem e-mail: o log diz o volume, não quem.
    console.log(`[cron/lembrete-diario] ${alvos.length} alvos, ${enviados} push entregues`, porSegmento);

    return NextResponse.json({ ok: true, alvos: alvos.length, enviados, porSegmento });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[cron/lembrete-diario]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
