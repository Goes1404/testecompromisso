/**
 * Correção do Simulado Pré-Etec por foto (pedido da coordenação, 21/11).
 *
 * A equipe manda a foto do gabarito certo e as fotos dos cartões dos alunos. A
 * IA só LÊ (nome escrito, nº de inscrição e as bolinhas marcadas); quem corrige
 * é este arquivo, comparando com o gabarito — para a nota não depender do
 * humor do modelo, e para a equipe poder corrigir a leitura na tela e a nota
 * mudar na hora.
 *
 * Regras puras: mesma conta na tela e no Excel. Prova: scripts/test-correcao-gabarito.ts.
 */
import { normalizarNome } from "@/lib/primeiro-acesso";

/** "A".."E"; null = em branco; "*" = mais de uma marcada (anula a questão). */
export type Marca = "A" | "B" | "C" | "D" | "E" | "*" | null;
export const LETRAS = ["A", "B", "C", "D", "E"] as const;

/** O que a IA devolve de um cartão. */
export interface LeituraDoCartao {
  nome: string | null;
  inscricao: string | null;
  respostas: Marca[]; // índice 0 = questão 1
}

export type ResultadoDaQuestao = "certa" | "errada" | "branco" | "anulada";

export interface Correcao {
  acertos: number;
  total: number;
  porQuestao: ResultadoDaQuestao[];
}

/** Normaliza o que vem da IA (ou de quem edita) para uma Marca. */
export function marca(v: unknown): Marca {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s || ["-", "NULL", "BRANCO", "NENHUMA"].includes(s)) return null;
  if (s === "*") return "*";
  const letras = s.replace(/[\s,/;]+/g, "");
  if (/^[A-E]$/.test(letras)) return letras as Marca;
  if (/^[A-E]{2,5}$/.test(letras)) return "*"; // duas ou mais marcadas
  return null;
}

/** Converte {"1":"A","2":"B"} ou ["A","B"] numa lista de Marcas do tamanho certo. */
export function respostasDe(entrada: unknown, total?: number): Marca[] {
  let lista: Marca[] = [];
  if (Array.isArray(entrada)) lista = entrada.map(marca);
  else if (entrada && typeof entrada === "object") {
    const obj = entrada as Record<string, unknown>;
    const n = Math.max(0, ...Object.keys(obj).map((k) => Number(k)).filter((k) => Number.isInteger(k) && k > 0 && k <= 300));
    lista = Array.from({ length: n }, (_, i) => marca(obj[String(i + 1)]));
  }
  if (total !== undefined) {
    if (lista.length > total) lista = lista.slice(0, total);
    while (lista.length < total) lista.push(null);
  }
  return lista;
}

/**
 * Corrige pelo gabarito. Questão com gabarito em branco ou "*" é ANULADA no
 * gabarito: conta como certa para todos (é o costume de vestibular quando a
 * banca anula uma questão).
 */
export function corrigir(chave: Marca[], respostas: Marca[]): Correcao {
  const porQuestao: ResultadoDaQuestao[] = chave.map((g, i) => {
    const r = respostas[i] ?? null;
    if (g === null || g === "*") return "certa";
    if (r === null) return "branco";
    if (r === "*") return "anulada";
    return r === g ? "certa" : "errada";
  });
  return { acertos: porQuestao.filter((q) => q === "certa").length, total: chave.length, porQuestao };
}

// ── Achar o aluno ───────────────────────────────────────────────────────────
export interface Inscrito {
  id: string;
  numero: number;
  protocolo: string;
  nome: string;
  sala: number | null;
}

export type Confianca = "numero" | "nome" | "parecido" | "nenhum";

export interface Achado {
  inscrito: Inscrito | null;
  confianca: Confianca;
  /** Outros que também batem (para a equipe escolher). */
  alternativas: Inscrito[];
}

/** Distância de edição (para letra de mão lida errada: "Lucaz" ~ "Lucas"). */
function distancia(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let ant = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    ant = cur;
  }
  return ant[n];
}

const PREPOSICOES = new Set(["de", "da", "do", "das", "dos", "e"]);
const palavras = (s: string) => normalizarNome(s).split(" ").filter((p) => p && !PREPOSICOES.has(p));

/** 0–1: quanto o nome lido parece com o nome cadastrado (palavra a palavra, tolera erro de leitura). */
export function semelhanca(lido: string, cadastrado: string): number {
  const a = palavras(lido), b = palavras(cadastrado);
  if (!a.length || !b.length) return 0;
  let soma = 0;
  for (const p of a) {
    let melhor = 0;
    for (const q of b) {
      const d = distancia(p, q);
      const s = 1 - d / Math.max(p.length, q.length);
      if (s > melhor) melhor = s;
    }
    soma += melhor;
  }
  // Primeiro nome errado pesa: "Ana" lida como "Ama" ainda passa, mas "João" ≠ "Pedro".
  const primeiro = 1 - distancia(a[0], b[0]) / Math.max(a[0].length, b[0].length);
  const base = soma / Math.max(a.length, Math.min(b.length, a.length + 1));
  return primeiro < 0.5 ? base * 0.6 : base;
}

/**
 * Acha o inscrito do cartão. O nº de inscrição, se legível e existente, ganha
 * de tudo (desde que o nome não contradiga de vez). Depois, o nome: ≥ 0,85 é
 * "nome"; 0,6–0,85 é "parecido" (a tela pede para conferir).
 */
export function acharAluno(leitura: Pick<LeituraDoCartao, "nome" | "inscricao">, inscritos: Inscrito[]): Achado {
  const num = Number(String(leitura.inscricao ?? "").replace(/\D/g, "").slice(-4));
  if (num > 0) {
    const porNumero = inscritos.find((i) => i.numero === num);
    if (porNumero && (!leitura.nome || semelhanca(leitura.nome, porNumero.nome) >= 0.45)) {
      return { inscrito: porNumero, confianca: "numero", alternativas: [] };
    }
  }
  if (!leitura.nome || !normalizarNome(leitura.nome)) return { inscrito: null, confianca: "nenhum", alternativas: [] };
  const notas = inscritos
    .map((i) => ({ i, s: semelhanca(leitura.nome!, i.nome) }))
    .filter((x) => x.s >= 0.6)
    .sort((x, y) => y.s - x.s);
  if (!notas.length) return { inscrito: null, confianca: "nenhum", alternativas: [] };
  const [melhor, ...resto] = notas;
  const empatados = resto.filter((x) => melhor.s - x.s < 0.05).map((x) => x.i);
  const confianca: Confianca = melhor.s >= 0.85 && !empatados.length ? "nome" : "parecido";
  return { inscrito: melhor.i, confianca, alternativas: [...empatados, ...resto.filter((x) => !empatados.includes(x.i)).map((x) => x.i)].slice(0, 5) };
}

/** Linha do Excel de resultados. */
export function linhaDoResultado(
  r: { nomeLido: string | null; inscrito: Inscrito | null; correcao: Correcao | null; respostas: Marca[] },
): Record<string, string | number> {
  const linha: Record<string, string | number> = {
    "Nº de inscrição": r.inscrito ? r.inscrito.protocolo.split("-").pop()! : "",
    "Nome (inscrição)": r.inscrito?.nome ?? "",
    "Nome lido no cartão": r.nomeLido ?? "",
    Sala: r.inscrito?.sala ?? "",
    Acertos: r.correcao?.acertos ?? "",
    Questões: r.correcao?.total ?? "",
    "%": r.correcao && r.correcao.total ? Math.round((r.correcao.acertos / r.correcao.total) * 1000) / 10 : "",
  };
  r.respostas.forEach((m, i) => { linha[`Q${i + 1}`] = m ?? ""; });
  return linha;
}
