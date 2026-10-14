/**
 * Cache de tela "mostra o que já tinha e atualiza por trás".
 *
 * Problema (14/10): o aluno que saía da aula ao vivo e voltava — trocar de app
 * no celular, ir ao Mural e voltar, puxar a tela para baixo — via tudo sumir e
 * recarregar: esqueleto da sala, roda girando no chat, as 80 últimas mensagens
 * de novo. Parecia travado.
 *
 * Agora a tela abre com o último estado conhecido e a consulta corre por trás.
 * Duas camadas:
 * - memória do módulo: sobrevive à navegação dentro do app (instantâneo);
 * - `sessionStorage`: sobrevive ao recarregamento da aba (o celular costuma
 *   descartar a aba em segundo plano) e morre ao fechar a aba.
 *
 * Segurança: as chaves começam com `dash_cache_` e levam o id do usuário; o
 * `signOut` (AuthProvider) apaga todas — um celular emprestado não mostra o
 * chat de outra pessoa. Nada aqui vai para `localStorage`.
 */

export const PREFIXO_DO_CACHE = "dash_cache_";

type Entrada<T> = { em: number; valor: T };

const memoria = new Map<string, Entrada<unknown>>();

function armazenamento(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null; // modo privado / bloqueado
  }
}

export function chaveDoCache(userId: string | null | undefined, ...partes: string[]): string | null {
  if (!userId) return null;
  return `${PREFIXO_DO_CACHE}${userId}_${partes.join("_")}`;
}

/** Último valor salvo, se tiver no máximo `idadeMaximaMs`. */
export function lerCache<T>(chave: string | null, idadeMaximaMs: number, agora = Date.now()): T | null {
  if (!chave) return null;
  let entrada = memoria.get(chave) as Entrada<T> | undefined;
  if (!entrada) {
    try {
      const bruto = armazenamento()?.getItem(chave);
      if (bruto) entrada = JSON.parse(bruto) as Entrada<T>;
      if (entrada) memoria.set(chave, entrada);
    } catch {
      entrada = undefined;
    }
  }
  if (!entrada || typeof entrada.em !== "number") return null;
  if (agora - entrada.em > idadeMaximaMs) return null;
  return entrada.valor;
}

const pendentes = new Set<string>();
let timerDoDisco: ReturnType<typeof setTimeout> | null = null;

function gravarNoDisco(chave: string) {
  const entrada = memoria.get(chave);
  if (!entrada) return;
  try {
    armazenamento()?.setItem(chave, JSON.stringify(entrada));
  } catch {
    // cota cheia: fica só na memória
  }
}

/** Grava no sessionStorage o que ficou pendente. Chamado ao esconder/fechar a aba. */
export function descarregarCache(): void {
  if (timerDoDisco) clearTimeout(timerDoDisco);
  timerDoDisco = null;
  pendentes.forEach(gravarNoDisco);
  pendentes.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", descarregarCache);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") descarregarCache();
  });
}

/**
 * Memória na hora; `sessionStorage` adiado (1,5 s, ou ao esconder a aba).
 * Serializar 200 mensagens a cada mensagem que chega era trabalho síncrono no
 * meio da rolagem do celular.
 */
export function gravarCache<T>(chave: string | null, valor: T, agora = Date.now(), imediato = false): void {
  if (!chave) return;
  const entrada: Entrada<T> = { em: agora, valor };
  memoria.set(chave, entrada);
  if (imediato || !armazenamento()) {
    gravarNoDisco(chave);
    return;
  }
  pendentes.add(chave);
  if (!timerDoDisco) timerDoDisco = setTimeout(descarregarCache, 1500);
}

/** Apaga tudo do cache (memória e sessionStorage). Chamado no signOut. */
export function limparCacheDaSessao(): void {
  memoria.clear();
  pendentes.clear();
  if (timerDoDisco) clearTimeout(timerDoDisco);
  timerDoDisco = null;
  const s = armazenamento();
  if (!s) return;
  try {
    Object.keys(s)
      .filter((k) => k.startsWith(PREFIXO_DO_CACHE))
      .forEach((k) => s.removeItem(k));
  } catch {
    // nada a fazer
  }
}

/** Só para teste: esquece a camada de memória. */
export function _esquecerMemoria(): void {
  memoria.clear();
}
