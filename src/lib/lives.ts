/**
 * Regras das aulas ao vivo (tabela `lives`).
 *
 * O aulão vai pelo YouTube, como transmissão "não listada", e não pelo Meet:
 * o Meet grátis corta em 100 pessoas e em 60 minutos, e o cursinho tem ~855
 * alunos. O Meet continua existindo como sala opcional para quem quer falar.
 *
 * Tudo aqui é puro (sem Supabase, sem React) para caber em
 * `scripts/test-lives.ts`.
 */

/** O id de vídeo do YouTube tem sempre 11 caracteres deste alfabeto. */
const ID_DE_VIDEO = /^[A-Za-z0-9_-]{11}$/;

const HOSTS_DO_YOUTUBE = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'studio.youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
]);

/**
 * Tira o id do vídeo de qualquer link que o professor costuma colar:
 * `youtube.com/live/ID`, `youtu.be/ID`, `watch?v=ID`, `embed/ID`,
 * `shorts/ID`, o link do YouTube Studio (`studio.youtube.com/video/ID/...`)
 * ou só o id.
 *
 * Devolve `null` para o link do *canal* (`youtube.com/@cursinho/live`): ele
 * aponta para "a live que estiver no ar agora", não para uma aula, e não dá
 * para embutir sem o id interno do canal.
 */
export function idDoYoutube(entrada: string | null | undefined): string | null {
  const texto = (entrada ?? '').trim();
  if (!texto) return null;
  if (ID_DE_VIDEO.test(texto)) return texto;

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!HOSTS_DO_YOUTUBE.has(host)) return null;

  const partes = url.pathname.split('/').filter(Boolean);
  let candidato: string | null = null;

  if (host === 'youtu.be') {
    candidato = partes[0] ?? null;
  } else if (partes[0] === 'watch') {
    candidato = url.searchParams.get('v');
  } else if (['live', 'embed', 'shorts', 'v', 'video'].includes(partes[0])) {
    candidato = partes[1] ?? null;
  }

  return candidato && ID_DE_VIDEO.test(candidato) ? candidato : null;
}

/**
 * Endereço do player embutido. O id é revalidado aqui de propósito: ele vem do
 * banco, e o banco aceita qualquer texto na coluna.
 */
export function urlDoPlayer(id: string | null | undefined): string | null {
  if (!id || !ID_DE_VIDEO.test(id)) return null;
  return `https://www.youtube.com/embed/${id}?rel=0&playsinline=1`;
}

/** Link para abrir a aula no app do YouTube, para quem preferir. */
export function linkDoVideo(id: string | null | undefined): string | null {
  if (!id || !ID_DE_VIDEO.test(id)) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Só deixa sair link `http(s)`. O link do Meet vira `href` na tela do aluno;
 * qualquer outro esquema (`javascript:`, `data:`) não tem o que fazer ali.
 */
export function linkExternoSeguro(url: string | null | undefined): string | null {
  const texto = (url ?? '').trim();
  if (!texto) return null;
  try {
    const u = new URL(texto);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export type StatusDaLive = 'scheduled' | 'live' | 'completed';

/**
 * Aula agendada continua na lista por 3 horas depois do horário marcado: o
 * professor que atrasa para abrir a sala não pode fazer a aula sumir da tela
 * de quem está esperando.
 */
export const TOLERANCIA_DE_ATRASO_H = 3;

/**
 * Aula marcada como "no ar" sai da lista 12 horas depois do horário marcado.
 * Nenhuma aula dura isso; é o professor que esqueceu de encerrar, e um selo de
 * "ao vivo" eterno na tela do aluno é pior do que nenhum.
 */
export const VALIDADE_DO_AO_VIVO_H = 12;

const HORA = 3_600_000;

/**
 * Se a aula aparece na agenda do aluno.
 *
 * Antes era um corte fixo de 1 hora depois do início, aplicado também a quem
 * estava no ar: o aulão das 19h sumia da lista às 20h01, no meio da aula.
 */
export function estaNaAgenda(
  live: { status: string | null; start_time: string | null },
  agora: Date = new Date(),
): boolean {
  if (!live.start_time) return false;
  const inicio = new Date(live.start_time).getTime();
  if (Number.isNaN(inicio)) return false;

  if (live.status === 'live') return inicio >= agora.getTime() - VALIDADE_DO_AO_VIVO_H * HORA;
  if (live.status === 'scheduled') return inicio >= agora.getTime() - TOLERANCIA_DE_ATRASO_H * HORA;
  return false;
}

/** Piso da consulta: nada mais antigo que isso pode entrar na agenda. */
export function inicioDaJanelaDaAgenda(agora: Date = new Date()): string {
  return new Date(agora.getTime() - VALIDADE_DO_AO_VIVO_H * HORA).toISOString();
}

export function rotuloDoStatus(status: string | null): string {
  if (status === 'live') return 'No ar';
  if (status === 'completed') return 'Encerrada';
  return 'Agendada';
}

/**
 * O botão do estúdio anda num sentido só: agendada → no ar → encerrada.
 * "Fechar sala" antigo voltava para "agendada", e a aula que acabou de
 * terminar reaparecia para o aluno como se ainda fosse acontecer.
 * Encerrada pode ser reaberta (queda de internet do professor).
 */
export function proximoStatus(status: string | null): { para: StatusDaLive; rotulo: string } {
  if (status === 'live') return { para: 'completed', rotulo: 'Encerrar aula' };
  if (status === 'completed') return { para: 'live', rotulo: 'Reabrir aula' };
  return { para: 'live', rotulo: 'Abrir para alunos' };
}

// ── Turmas e chamada automática ─────────────────────────────────────────────

/**
 * A turma de verdade é `profiles.sala`, digitada de vários jeitos ("5", "05",
 * "sala 5"). Tudo vira "5"; o que não é número vira `null`. Espelho exato de
 * `public.sala_normalizada()` — se mudar uma, mude a outra.
 */
export function normalizarSala(sala: string | null | undefined): string | null {
  const x = (sala ?? '').trim().toLowerCase().replace(/^(sala\s*)?0*/, '');
  return /^[0-9]+$/.test(x) ? x : null;
}

/** "Todas as turmas", "Sala 3", "Salas 1, 2 e 5". Vazio = todas. */
export function rotuloDasTurmas(turmas: string[] | null | undefined): string {
  const lista = [...new Set((turmas ?? []).map(normalizarSala).filter((t): t is string => !!t))]
    .sort((a, b) => Number(a) - Number(b));
  if (lista.length === 0) return 'Todas as turmas';
  if (lista.length === 1) return `Sala ${lista[0]}`;
  return `Salas ${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`;
}

/** Decisão da coordenação (13/10): presente quem ficou 60% da aula na sala. */
export const PRESENCA_MINIMA = 0.6;

/**
 * A sala avisa o banco a cada 60 s. O banco soma o tempo real entre dois
 * avisos, até 130 s por aviso — então um aviso que atrasa por rede ruim ainda
 * conta inteiro, e metralhar avisos não soma nada.
 */
export const INTERVALO_DO_SINAL_MS = 60_000;

export function situacaoDaPresenca(segundos: number, segundosDaAula: number) {
  const porcentagem = segundosDaAula > 0 ? Math.min(100, Math.floor((segundos / segundosDaAula) * 100)) : 0;
  return {
    porcentagem,
    presente: segundosDaAula > 0 && segundos >= Math.ceil(segundosDaAula * PRESENCA_MINIMA),
  };
}

/** "45 s", "12 min", "1h05". */
export function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

// ── Dúvidas na sala ─────────────────────────────────────────────────────────
// Espelhos dos limites do gatilho `live_messages_ao_inserir` (o banco é quem
// manda; aqui é só para avisar antes de o aluno apertar "Enviar").
export const LIMITE_DA_DUVIDA = 500;
export const INTERVALO_ENTRE_DUVIDAS_S = 20;
export const MAXIMO_DE_DUVIDAS_POR_AULA = 20;

export type Duvida = {
  id: string;
  created_at: string;
  user_name: string | null;
  content: string;
  is_answered: boolean;
  resposta: string | null;
  oculta: boolean;
};

/** Mensagem de erro para mostrar ao aluno, ou `null` se dá para enviar. */
export function validarDuvida(texto: string): string | null {
  const t = texto.trim();
  if (!t) return 'Escreva sua dúvida antes de enviar.';
  if (t.length > LIMITE_DA_DUVIDA) return `A dúvida pode ter até ${LIMITE_DA_DUVIDA} caracteres.`;
  return null;
}

/**
 * Ordem da fila do professor: pendentes primeiro, da mais antiga para a mais
 * nova — quem perguntou primeiro não pode ficar esperando para sempre atrás
 * de quem acabou de chegar. Depois as respondidas (mais recente em cima) e,
 * por último, as ocultas.
 */
export function ordenarDuvidasParaProfessor<T extends Pick<Duvida, 'created_at' | 'is_answered' | 'oculta'>>(lista: T[]): T[] {
  const grupo = (d: T) => (d.oculta ? 2 : d.is_answered ? 1 : 0);
  return [...lista].sort((a, b) => {
    const g = grupo(a) - grupo(b);
    if (g !== 0) return g;
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return grupo(a) === 0 ? ta - tb : tb - ta;
  });
}
