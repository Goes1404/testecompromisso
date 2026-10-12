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
