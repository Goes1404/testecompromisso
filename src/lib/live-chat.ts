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
};

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
export function corDoNome(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return CORES[h % CORES.length];
}

export function horaDaMensagem(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
