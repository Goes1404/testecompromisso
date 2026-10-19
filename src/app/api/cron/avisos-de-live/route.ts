import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers, idsDeAlunosDasSalas } from "@/lib/push";
import { segredoConfere, segredoEsperado } from "@/lib/cron-auth";
import {
  agruparPorAluno,
  avisoDaLive,
  avisoDeVariasLives,
  avisosQueFaltam,
  COLUNA_DO_AVISO,
  HORIZONTE_DA_AGENDADA_DIAS,
  type EventoDaLive,
  type LiveDaRodada,
} from "@/lib/live-aviso";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Aviso de live que faltou (18/10). Chamada pelo `pg_cron` a cada minuto.
 *
 * O aviso normal sai das telas do professor (`/api/push/notify`): ao criar a
 * aula e ao ligar o sinal. As 12 aulas do aulão de 17/10 foram criadas em lote,
 * direto no banco, e nenhum aluno foi avisado. Esta rota cobre esse caminho:
 * acha a aula que deve "agendada" ou "ao vivo" (`avisosQueFaltam()`), marca a
 * mesma coluna de memória ANTES de enviar e avisa. Quem a tela já avisou está
 * marcado e fica de fora; tela e cron disputando a mesma aula avisam uma vez só.
 *
 * Cada aluno recebe UMA notificação por rodada com as aulas dele
 * (`agruparPorAluno()`): seis aulas criadas juntas não viram seis toques.
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

  const agora = new Date();
  const desde = new Date(agora.getTime() - 12 * 3_600_000).toISOString();
  const ate = new Date(agora.getTime() + HORIZONTE_DA_AGENDADA_DIAS * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("lives")
    .select("id, title, teacher_name, start_time, status, turmas, no_ar_desde, avisado_agendada_em, avisado_ao_vivo_em")
    .in("status", ["scheduled", "live"])
    .or("avisado_agendada_em.is.null,avisado_ao_vivo_em.is.null")
    .gte("start_time", desde)
    .lte("start_time", ate);
  if (error) {
    console.error("[cron/avisos-de-live]", error.message);
    return NextResponse.json({ error: "Falha ao consultar." }, { status: 500 });
  }

  const faltam = avisosQueFaltam((data ?? []) as LiveDaRodada[], agora);
  const resumo: Record<EventoDaLive, { aulas: number; envios: number; alunos: number }> = {
    ao_vivo: await avisar(admin, "ao_vivo", faltam.ao_vivo),
    agendada: await avisar(admin, "agendada", faltam.agendada),
  };
  return NextResponse.json(resumo);
}

async function avisar(admin: SupabaseClient, evento: EventoDaLive, candidatas: LiveDaRodada[]) {
  if (!candidatas.length) return { aulas: 0, envios: 0, alunos: 0 };

  // Marca ANTES de enviar: só avisa a aula que esta chamada conseguiu marcar.
  const coluna = COLUNA_DO_AVISO[evento];
  const { data: marcadas, error } = await admin
    .from("lives")
    .update({ [coluna]: new Date().toISOString() })
    .in("id", candidatas.map((l) => l.id))
    .is(coluna, null)
    .select("id");
  if (error) {
    console.error(`[cron/avisos-de-live] marcar ${evento}:`, error.message);
    return { aulas: 0, envios: 0, alunos: 0 };
  }
  const ids = new Set((marcadas ?? []).map((m: { id: string }) => m.id));
  const aulas = candidatas.filter((l) => ids.has(l.id));
  if (!aulas.length) return { aulas: 0, envios: 0, alunos: 0 };

  // Alunos de cada aula; aulas com as mesmas turmas (o aulão inteiro é ['ETEC'])
  // consultam a lista de alunos uma vez só.
  const porTurmas = new Map<string, Promise<string[]>>();
  const destinos = new Map<string, string[]>();
  for (const l of aulas) {
    const turmas = Array.isArray(l.turmas) ? l.turmas : [];
    const chave = [...turmas].sort().join("|");
    if (!porTurmas.has(chave)) porTurmas.set(chave, idsDeAlunosDasSalas(turmas));
    destinos.set(l.id, await porTurmas.get(chave)!);
  }

  const porId = new Map(aulas.map((l) => [l.id, l]));
  const grupos = agruparPorAluno(destinos);
  let alunos = 0;
  for (const g of grupos) {
    const lista = g.liveIds.map((id) => porId.get(id)!);
    const aviso = lista.length === 1 ? avisoDaLive(evento, lista[0]) : avisoDeVariasLives(evento, lista);
    await sendPushToUsers(g.alunos, { ...aviso, type: "info" });
    alunos += g.alunos.length;
  }
  return { aulas: aulas.length, envios: grupos.length, alunos };
}
