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
  live: { status: string | null; start_time: string | null; no_ar_desde?: string | null },
  agora: Date = new Date(),
): boolean {
  // Aula no ar conta a validade a partir de quando ENTROU no ar, não do
  // horário agendado. Em 13/10 uma aula salva com o ano 2007 foi aberta pelo
  // professor e sumiu da lista de todos os alunos: pela data agendada, ela
  // tinha começado 19 anos antes. `start_time` só vale para linhas antigas,
  // anteriores à coluna `no_ar_desde`.
  if (live.status === 'live') {
    const referencia = live.no_ar_desde || live.start_time;
    if (!referencia) return false;
    const t = new Date(referencia).getTime();
    if (Number.isNaN(t)) return false;
    return t >= agora.getTime() - VALIDADE_DO_AO_VIVO_H * HORA;
  }

  if (!live.start_time) return false;
  const inicio = new Date(live.start_time).getTime();
  if (Number.isNaN(inicio)) return false;
  if (live.status === 'scheduled') return inicio >= agora.getTime() - TOLERANCIA_DE_ATRASO_H * HORA;
  return false;
}

/**
 * Piso da consulta para aulas AGENDADAS. Aula no ar entra sempre na consulta
 * (pelo status) e quem decide se ela vale é `estaNaAgenda` — cortar no banco
 * pelo `start_time` jogaria fora justamente a aula com data agendada errada.
 */
export function inicioDaJanelaDaAgenda(agora: Date = new Date()): string {
  return new Date(agora.getTime() - VALIDADE_DO_AO_VIVO_H * HORA).toISOString();
}

/** Filtro `.or()` da agenda do aluno: agendadas recentes + tudo que está no ar. */
export function filtroDaAgenda(agora: Date = new Date()): string {
  return `and(status.eq.scheduled,start_time.gte.${inicioDaJanelaDaAgenda(agora)}),status.eq.live`;
}

/** Até onde o professor pode marcar uma aula para a frente. */
export const ANTECEDENCIA_MAXIMA_DIAS = 180;

/**
 * Confere a data/hora digitada no formulário do professor. Devolve a mensagem
 * de erro, ou null se está ok.
 *
 * O campo de data do navegador aceita qualquer ano de 4 dígitos, e digitar
 * "13/10/07" ou errar um dígito vira 2007 ou 2062 sem aviso nenhum. A aula
 * salva assim some da agenda do aluno (ou aparece meses depois), e o professor
 * só descobre quando ninguém entra.
 */
export function validarHorarioDaAula(data: string, hora: string, agora: Date = new Date()): string | null {
  const inicio = new Date(`${data}T${hora}`);
  if (!data || !hora || Number.isNaN(inicio.getTime())) return 'Data ou horário inválido.';
  const DIA = 24 * HORA;
  if (inicio.getTime() < agora.getTime() - DIA) {
    return `A data ${inicio.toLocaleDateString('pt-BR')} já passou. Confira o dia e o ano.`;
  }
  if (inicio.getTime() > agora.getTime() + ANTECEDENCIA_MAXIMA_DIAS * DIA) {
    return `A data ${inicio.toLocaleDateString('pt-BR')} está longe demais. Confira o ano.`;
  }
  return null;
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

/**
 * Foco do aluno (`profiles.exam_target`): "ENEM" ou "ETEC"; o resto ("Não
 * informado", vazio) vira `null`. Espelho de `public.foco_normalizado()`.
 * Desde 17/10, `lives.turmas` aceita o foco além do número da sala: aula com
 * turmas = ["ETEC"] vale para todo aluno ETEC, com ou sem sala no cadastro.
 */
export const FOCOS = ['ENEM', 'ETEC'] as const;
export type Foco = (typeof FOCOS)[number];

export function normalizarFoco(foco: string | null | undefined): Foco | null {
  const x = (foco ?? '').trim().toUpperCase();
  return x === 'ENEM' || x === 'ETEC' ? x : null;
}

/** Item de `lives.turmas`: foco ("ETEC") ou sala ("5"); lixo vira `null`. */
export function normalizarTurma(t: string | null | undefined): string | null {
  return normalizarFoco(t) ?? normalizarSala(t);
}

function juntarComE(itens: string[]): string {
  return itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** "Todas as turmas", "Foco ETEC", "Sala 3", "Salas 1, 2 e 5". Vazio = todas. */
export function rotuloDasTurmas(turmas: string[] | null | undefined): string {
  const focos = FOCOS.filter((f) => (turmas ?? []).some((t) => normalizarFoco(t) === f));
  const salas = [...new Set((turmas ?? []).map(normalizarSala).filter((t): t is string => !!t))]
    .sort((a, b) => Number(a) - Number(b));
  const partes: string[] = [];
  if (focos.length) partes.push(`Foco ${juntarComE([...focos])}`);
  if (salas.length) partes.push(`${salas.length === 1 ? 'Sala' : 'Salas'} ${juntarComE(salas)}`);
  return partes.length ? partes.join(' · ') : 'Todas as turmas';
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

// ── Datas na tela ───────────────────────────────────────────────────────────

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/**
 * "Hoje, 19:00", "Amanhã, 08:30", "qua, 16/10 · 19:00". A conta é por dia do
 * calendário local, não por 24 h: uma aula às 8h vista às 22h da véspera é
 * "Amanhã", e não "Hoje" por estar a menos de 24 h.
 */
export function quandoE(inicio: string | null | undefined, agora: Date = new Date()): string {
  if (!inicio) return 'Sem horário';
  const d = new Date(inicio);
  if (Number.isNaN(d.getTime())) return 'Sem horário';
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diferenca = Math.round((dia(d) - dia(agora)) / 86_400_000);
  if (diferenca === 0) return `Hoje, ${hora}`;
  if (diferenca === 1) return `Amanhã, ${hora}`;
  if (diferenca === -1) return `Ontem, ${hora}`;
  const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${DIAS_DA_SEMANA[d.getDay()]}, ${data} · ${hora}`;
}

/** Link do painel de transmissão do YouTube Studio, para o professor. */
export function linkDoStudio(id: string | null | undefined): string | null {
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return `https://studio.youtube.com/video/${id}/livestreaming`;
}

/**
 * Agenda do professor em três grupos: no ar, próximas (da mais perto para a
 * mais longe) e anteriores (da mais recente para a mais antiga). Agendada que
 * já passou do horário continua em "próximas" enquanto `estaNaAgenda()` a
 * mantém para o aluno — é aula atrasada, não aula velha.
 */
export function agruparAgenda<T extends { status: string | null; start_time: string | null }>(
  aulas: T[],
  agora: Date = new Date(),
): { noAr: T[]; proximas: T[]; anteriores: T[] } {
  const t = (a: T) => (a.start_time ? new Date(a.start_time).getTime() : 0);
  const noAr = aulas.filter((a) => a.status === 'live');
  const proximas = aulas
    .filter((a) => a.status === 'scheduled' && estaNaAgenda(a, agora))
    .sort((a, b) => t(a) - t(b));
  const anteriores = aulas
    .filter((a) => !noAr.includes(a) && !proximas.includes(a))
    .sort((a, b) => t(b) - t(a));
  return { noAr, proximas, anteriores };
}

// ── Chat do YouTube ─────────────────────────────────────────────────────────

/**
 * Chat ao vivo do YouTube embutido na sala. Só existe no computador: o
 * YouTube não libera o chat embutido no navegador do celular ("Embedding live
 * chat isn't available on mobile web", ajuda oficial). `embed_domain` precisa
 * bater com o domínio da página, senão o YouTube recusa o quadro.
 */
export function urlDoChatEmbutido(id: string | null | undefined, dominio: string | null | undefined): string | null {
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const host = (dominio ?? '').trim().toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host) || !host) return null;
  return `https://www.youtube.com/live_chat?v=${id}&embed_domain=${host}&dark_theme=1`;
}

/** Chat em janela própria (computador) — o professor usa para acompanhar. */
export function linkDoChatEmJanela(id: string | null | undefined): string | null {
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return `https://www.youtube.com/live_chat?is_popout=1&v=${id}`;
}

/**
 * Navegador de celular ou tablet, pelo mesmo critério que o YouTube usa para
 * recusar o chat embutido (o user agent, não a largura da tela).
 */
export function ehNavegadorDeCelular(userAgent: string | null | undefined): boolean {
  const ua = userAgent ?? '';
  // iPad com iPadOS 13+ se apresenta como Mac: cai como computador aqui e
  // também no YouTube, que decide pelo mesmo user agent — então o chat abre.
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini|Silk/i.test(ua);
}
