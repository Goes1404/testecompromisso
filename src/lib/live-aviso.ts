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
 *
 * Aula criada ou aberta fora dessas telas (em lote, por script) é avisada pelo
 * cron `/api/cron/avisos-de-live`, que usa `avisosQueFaltam()` e a mesma coluna.
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

// ── Rodada automática do cron ────────────────────────────────────────────

export interface LiveDaRodada extends LiveParaAviso {
  status: string | null;
  turmas: string[] | null;
  no_ar_desde: string | null;
  avisado_agendada_em: string | null;
  avisado_ao_vivo_em: string | null;
}

/** Aula que começa em menos que isso não ganha "agendada": o "ao vivo" já vem. */
export const ANTECEDENCIA_DA_AGENDADA_MIN = 15;
/** Aula marcada para mais longe que isso avisa quando chegar mais perto. */
export const HORIZONTE_DA_AGENDADA_DIAS = 14;
/** Aula no ar há mais que isso sem aviso (o cron estava fora) não avisa mais. */
export const JANELA_DO_AO_VIVO_MIN = 60;

/**
 * "Agendada" só sai entre 07:00 e 21:59 de Brasília. As aulas do aulão de 17/10
 * foram criadas à 00:15: sem esta trava, ~1.000 celulares tocariam de madrugada.
 * "Ao vivo" não tem trava: a aula está acontecendo.
 */
export function podeAvisarAgendadaAgora(agora: Date = new Date()): boolean {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(agora),
  );
  return hora >= 7 && hora < 22;
}

/** Quais aulas ainda devem cada aviso nesta rodada. */
export function avisosQueFaltam(lives: LiveDaRodada[], agora: Date = new Date()) {
  const t = agora.getTime();
  const minutos = (iso: string) => (new Date(iso).getTime() - t) / 60_000;

  const ao_vivo = lives.filter((l) => {
    if (l.status !== "live" || l.avisado_ao_vivo_em) return false;
    const desde = l.no_ar_desde ?? l.start_time;
    return !desde || -minutos(desde) <= JANELA_DO_AO_VIVO_MIN;
  });

  const agendada = !podeAvisarAgendadaAgora(agora)
    ? []
    : lives.filter((l) => {
        if (l.status !== "scheduled" || l.avisado_agendada_em || !l.start_time) return false;
        const faltam = minutos(l.start_time);
        return faltam >= ANTECEDENCIA_DA_AGENDADA_MIN && faltam <= HORIZONTE_DA_AGENDADA_DIAS * 24 * 60;
      });

  return { ao_vivo, agendada };
}

/**
 * Junta quem recebe exatamente as mesmas aulas num envio só. Entra
 * `liveId → alunos`; sai cada conjunto de aulas com os alunos dele. As 6 aulas
 * ETEC de um aulão viram UMA notificação por aluno, não seis seguidas.
 */
export function agruparPorAluno(destinos: Map<string, string[]>): { alunos: string[]; liveIds: string[] }[] {
  const aulasDoAluno = new Map<string, string[]>();
  for (const [liveId, alunos] of destinos) {
    for (const a of alunos) aulasDoAluno.set(a, [...(aulasDoAluno.get(a) ?? []), liveId]);
  }
  const grupos = new Map<string, { alunos: string[]; liveIds: string[] }>();
  for (const [aluno, liveIds] of aulasDoAluno) {
    const chave = liveIds.join("|");
    const g = grupos.get(chave) ?? { alunos: [], liveIds };
    g.alunos.push(aluno);
    grupos.set(chave, g);
  }
  return [...grupos.values()];
}

/** Um aviso só para várias aulas do mesmo aluno na mesma rodada. */
export function avisoDeVariasLives(evento: EventoDaLive, lives: LiveParaAviso[], agora: Date = new Date()) {
  const ordem = [...lives].sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  const primeira = ordem[0];
  const n = ordem.length;

  let title: string;
  let body: string;
  if (evento === "ao_vivo") {
    title = `🔴 ${n} aulas ao vivo agora`;
    const fim = "Toque para escolher a sala.";
    const nomes = ordem.map((l) => (l.title || "Aula ao vivo").trim()).join(" · ");
    const cabe = LIMITE_DO_PUSH - fim.length - 2;
    body = `${nomes.length > cabe ? nomes.slice(0, cabe - 1) + "…" : nomes}. ${fim}`;
  } else {
    const quando = primeira.start_time ? quandoDaLive(primeira.start_time, agora) : "em breve";
    title = `📅 ${n} aulas ao vivo marcadas`;
    body = `A primeira é ${quando}. Você recebe outro aviso quando cada uma começar.`;
  }

  return { title, body, url: "/dashboard/live", tag: `lives-${primeira.id}-${evento}` };
}
