/**
 * Regras puras do chat ao vivo da aula (tabela `live_chat`, função
 * `chat_da_live`). Testadas em `scripts/test-live-chat.ts`.
 *
 * A leitura é por consulta incremental, não Realtime: o plano grátis do
 * Supabase aguenta 200 conexões de Realtime e um aulão tem centenas de alunos.
 * Cada consulta pede só o que mudou desde a última `versao`.
 */

export const LIMITE_DA_MENSAGEM = 300;
/** Mesmo valor do gatilho `live_chat_ao_inserir` (o banco é quem barra). */
export const ESPERA_ENTRE_MENSAGENS_S = 10;
/** Aluno consulta a cada 5 s; a equipe, que modera, a cada 3 s. */
export const INTERVALO_DO_ALUNO_MS = 5_000;
export const INTERVALO_DA_EQUIPE_MS = 3_000;
/** Com o chat parado, o aluno espaça até aqui (ver `proximoIntervaloDoChat`). */
export const INTERVALO_MAXIMO_DO_ALUNO_MS = 10_000;

/**
 * Quanto esperar até a próxima consulta.
 *
 * Com ~855 alunos, consultar a cada 5 s dá uns 170 pedidos por segundo só do
 * chat. Quando ele está parado (ninguém escreve), isso é pedido à toa: depois
 * de 3 consultas sem novidade o aluno passa a 7 s, depois de 6 a 10 s. Na
 * primeira mensagem que chega (ou que ele manda) volta a 5 s. A equipe, que
 * modera, fica sempre em 3 s — são poucas conexões.
 */
export function proximoIntervaloDoChat(consultasSemNovidade: number, equipe: boolean): number {
  if (equipe) return INTERVALO_DA_EQUIPE_MS;
  if (consultasSemNovidade < 3) return INTERVALO_DO_ALUNO_MS;
  if (consultasSemNovidade < 6) return 7_000;
  return INTERVALO_MAXIMO_DO_ALUNO_MS;
}
/** Quantas mensagens a tela guarda. Mais que isso pesa no celular. */
export const MAXIMO_NA_TELA = 200;

export type MensagemDoChat = {
  id: number;
  versao: number;
  user_id: string;
  user_name: string;
  equipe: boolean;
  /** `null` quando oculta e quem lê não é da equipe. */
  texto: string | null;
  oculta: boolean;
  created_at: string;
};

export type RespostaDoChat = {
  mensagens: MensagemDoChat[];
  status: string | null;
  silenciado: boolean;
  silenciados: string[];
  /** Mensagem fixada no topo pela equipe (17/10). Ausente no banco antigo. */
  fixada?: MensagemFixada | null;
  /** Reações dos últimos 15 s (17/10). Ausente no banco antigo. */
  reacoes?: Reacao[];
};

/** Cópia da mensagem fixada (`lives.chat_fixado`). */
export type MensagemFixada = { id: number; texto: string | null; autor: string; equipe: boolean; em: string };

/** As reações rápidas, na ordem dos botões. Precisa bater com o CHECK de `live_reacoes`. */
export const REACOES = ["👍", "❤️", "😂", "🔥", "👏"] as const;
export type Emoji = (typeof REACOES)[number];
export type Reacao = { id: number; emoji: string };

/**
 * Das reações que vieram do banco, as que ainda não subiram na tela. O banco
 * devolve as dos últimos 15 s a cada consulta, então a mesma volta várias
 * vezes: só anima o que tem id acima do último já visto. Na PRIMEIRA consulta
 * (`ultimoVisto` nulo) não anima nada — quem abre a sala não recebe uma rajada
 * de corações de 15 s atrás.
 */
export function reacoesNovas(reacoes: Reacao[] | null | undefined, ultimoVisto: number | null): { novas: Reacao[]; ultimo: number | null } {
  const lista = (reacoes ?? []).filter((r) => (REACOES as readonly string[]).includes(r.emoji));
  const maior = lista.reduce((m, r) => (r.id > m ? r.id : m), ultimoVisto ?? 0);
  if (ultimoVisto === null) return { novas: [], ultimo: lista.length ? maior : 0 };
  return { novas: lista.filter((r) => r.id > ultimoVisto).sort((a, b) => a.id - b.id), ultimo: maior };
}

/** Inicial do avatar: primeira letra do nome, maiúscula, sem acento quebrado. */
export function inicialDoNome(nome: string | null | undefined): string {
  const letra = (nome ?? "").trim().charAt(0);
  return letra ? letra.toLocaleUpperCase("pt-BR") : "?";
}

/**
 * Junta o que chegou com o que já está na tela.
 *
 * - A mesma mensagem pode voltar com versão nova (foi ocultada ou reexibida):
 *   a nova substitui a velha.
 * - Para quem não é da equipe, mensagem oculta sai da lista.
 * - A ordem é de envio (`id`), não de versão: ocultar e reexibir não pode
 *   jogar uma mensagem antiga para o fim do chat.
 */
export function mesclarMensagens(
  atuais: MensagemDoChat[],
  novas: MensagemDoChat[],
  souEquipe: boolean,
  maximo = MAXIMO_NA_TELA,
): MensagemDoChat[] {
  if (novas.length === 0) return atuais;
  const porId = new Map<number, MensagemDoChat>();
  for (const m of atuais) porId.set(m.id, m);
  for (const m of novas) {
    const antes = porId.get(m.id);
    if (antes && antes.versao > m.versao) continue;
    if (m.oculta && !souEquipe) porId.delete(m.id);
    else porId.set(m.id, m);
  }
  const lista = [...porId.values()].sort((a, b) => a.id - b.id);
  return lista.length > maximo ? lista.slice(lista.length - maximo) : lista;
}

/** Maior versão conhecida: é o `desde` da próxima consulta. */
export function ultimaVersao(atual: number, novas: MensagemDoChat[]): number {
  return novas.reduce((max, m) => (m.versao > max ? m.versao : max), atual);
}

export function validarMensagemDoChat(texto: string): string | null {
  const t = texto.trim();
  if (!t) return "Escreva a mensagem.";
  if (t.length > LIMITE_DA_MENSAGEM) return `A mensagem passa de ${LIMITE_DA_MENSAGEM} caracteres.`;
  return null;
}

/** Erro do banco em português para o aluno. Os do gatilho já vêm prontos. */
export function erroDoChat(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Não foi possível enviar agora. Tente de novo em instantes.";
  if (error.code === "23514") return `A mensagem precisa ter entre 1 e ${LIMITE_DA_MENSAGEM} caracteres.`;
  if ((error.code === "P0001" || error.code === "P0002") && error.message) return error.message;
  return "Não foi possível enviar agora. Tente de novo em instantes.";
}

/** "Ana Beatriz Ferreira" → "Ana Ferreira": nome e sobrenome, como na chamada. */
export function nomeCurto(nome: string | null | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Aluno";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

/** Cor estável por pessoa, para dar para seguir a conversa sem ler o nome. */
const CORES = ["text-orange-300", "text-sky-300", "text-emerald-300", "text-fuchsia-300", "text-amber-300", "text-cyan-300", "text-rose-300", "text-lime-300"];
// Fundo do avatar, na mesma posição da cor do nome: o aluno é a mesma cor nos dois.
const FUNDOS = ["bg-orange-500", "bg-sky-500", "bg-emerald-500", "bg-fuchsia-500", "bg-amber-500", "bg-cyan-500", "bg-rose-500", "bg-lime-500"];
const indicesJaCalculados = new Map<string, number>();
function indiceDaCor(userId: string): number {
  let i = indicesJaCalculados.get(userId);
  if (i === undefined) {
    let h = 0;
    for (let k = 0; k < userId.length; k++) h = (h * 31 + userId.charCodeAt(k)) >>> 0;
    i = h % CORES.length;
    indicesJaCalculados.set(userId, i);
  }
  return i;
}
export function corDoNome(userId: string): string {
  return CORES[indiceDaCor(userId)];
}
export function corDoAvatar(userId: string): string {
  return FUNDOS[indiceDaCor(userId)];
}

// Um formatador só: criar um `Intl.DateTimeFormat` por mensagem, a cada
// redesenho, era boa parte do congelamento do chat em celular fraco.
const FORMATO_DA_HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const horasJaFormatadas = new Map<string, string>();

export function horaDaMensagem(iso: string): string {
  let h = horasJaFormatadas.get(iso);
  if (h === undefined) {
    h = FORMATO_DA_HORA.format(new Date(iso));
    if (horasJaFormatadas.size > 2000) horasJaFormatadas.clear();
    horasJaFormatadas.set(iso, h);
  }
  return h;
}
