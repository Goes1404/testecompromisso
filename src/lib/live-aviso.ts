/**
 * Texto do aviso de live para os alunos (push + inbox in-app).
 *
 * Função pura para poder ser testada sem banco (`scripts/test-live-aviso.ts`).
 * Duas ocasiões, e cada uma tem sua coluna de memória em `lives`:
 *
 * | evento     | quando sai                          | coluna                 |
 * |------------|-------------------------------------|------------------------|
 * | `agendada` | professor cria a sala               | `avisado_agendada_em`  |
 * | `ao_vivo`  | professor liga o sinal (status=live)| `avisado_ao_vivo_em`   |
 */

export type EventoDaLive = "agendada" | "ao_vivo";

export const COLUNA_DO_AVISO: Record<EventoDaLive, "avisado_agendada_em" | "avisado_ao_vivo_em"> = {
  agendada: "avisado_agendada_em",
  ao_vivo: "avisado_ao_vivo_em",
};

/** Mesmo teto do mural (`LIMITE_DO_PUSH`): alguns sistemas cortam o corpo depois disso. */
export const LIMITE_DO_PUSH = 200;

export interface LiveParaAviso {
  id: string;
  title: string | null;
  teacher_name: string | null;
  start_time: string | null;
}

/**
 * "qui, 16/10 às 19:00" no fuso da escola. O servidor roda em UTC; sem o
 * `timeZone` explícito uma aula às 19h sairia anunciada para as 22h.
 */
export function quandoDaLive(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso);
  const tz = "America/Sao_Paulo";
  const dia = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(x);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);

  if (dia(d) === dia(agora)) return `hoje às ${hora}`;
  const amanha = new Date(agora.getTime() + 86_400_000);
  if (dia(d) === dia(amanha)) return `amanhã às ${hora}`;

  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short" })
    .format(d)
    .replace(".", "");
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit" }).format(d);
  return `${semana}, ${data} às ${hora}`;
}

export function avisoDaLive(evento: EventoDaLive, live: LiveParaAviso, agora: Date = new Date()) {
  const titulo = (live.title || "Aula ao vivo").trim();
  const mentor = (live.teacher_name || "").trim();
  const com = mentor ? ` com ${mentor}` : "";

  let title: string;
  let fim: string;
  if (evento === "ao_vivo") {
    title = `🔴 Ao vivo agora: ${titulo}`;
    fim = `Começou${com}. Toque para entrar na sala.`;
  } else {
    const quando = live.start_time ? quandoDaLive(live.start_time, agora) : "em breve";
    title = `📅 Nova live: ${titulo}`;
    fim = `Marcada para ${quando}${com}. Você recebe outro aviso quando começar.`;
  }

  // Corta por orçamento, nunca o final: a frase que diz o que fazer fica inteira.
  const body = fim.length > LIMITE_DO_PUSH ? fim.slice(0, LIMITE_DO_PUSH - 1) + "…" : fim;
  if (title.length > 90) title = title.slice(0, 89) + "…";

  return {
    title,
    body,
    url: `/dashboard/live/${live.id}`,
    tag: `live-${live.id}-${evento}`,
  };
}
