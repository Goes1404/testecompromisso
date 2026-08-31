/**
 * Mural: anúncios e pedidos de trabalho.
 *
 * O que mora aqui é o que a tela do aluno e a tela de quem publica precisam
 * concordar — tipos, rótulos e, principalmente, a régua de prazo. Prazo
 * calculado em dois lugares vira dois resultados diferentes no dia da virada.
 */

export type MuralTipo = "anuncio" | "trabalho";

export interface MuralPost {
  id: string;
  tipo: MuralTipo;
  titulo: string;
  tema: string | null;
  descricao: string;
  questoes: string[];
  instrucoes: string | null;
  entrega_em: string | null;
  imagem_url: string | null;
  destaque: boolean;
  ativo: boolean;
  autor_id: string | null;
  autor_nome: string | null;
  created_at: string;
  updated_at: string;
}

/** Rascunho do formulário — o que a tela de publicação manda para o banco. */
export type MuralRascunho = Pick<
  MuralPost,
  "tipo" | "titulo" | "tema" | "descricao" | "instrucoes" | "entrega_em" | "imagem_url" | "destaque"
> & { questoes: string[] };

export const RASCUNHO_VAZIO: MuralRascunho = {
  tipo: "anuncio",
  titulo: "",
  tema: "",
  descricao: "",
  instrucoes: "",
  entrega_em: null,
  imagem_url: null,
  destaque: false,
  questoes: [],
};

export const TIPOS: Record<MuralTipo, { label: string; plural: string; ajuda: string }> = {
  anuncio: {
    label: "Anúncio",
    plural: "Anúncios",
    ajuda: "Campanha, cartaz, recado ou evento. Sem prazo de entrega.",
  },
  trabalho: {
    label: "Pedido de trabalho",
    plural: "Pedidos de trabalho",
    ajuda: "Atividade ou pesquisa com data de entrega e lista de questões.",
  },
};

/** Papéis que publicam no mural — a mesma lista de `pode_publicar_no_mural()`. */
export const PAPEIS_QUE_PUBLICAM = ["teacher", "admin", "staff"] as const;

export function podePublicar(role: string | null | undefined): boolean {
  return PAPEIS_QUE_PUBLICAM.includes(role as (typeof PAPEIS_QUE_PUBLICAM)[number]);
}

export interface Prazo {
  /** Negativo depois da data de entrega; 0 no próprio dia. */
  dias: number;
  encerrado: boolean;
  /** Vence hoje ou nos próximos 3 dias — é o que acende o card. */
  urgente: boolean;
  rotulo: string;
}

/**
 * Dias inteiros até a entrega, contados por data e não por hora: um trabalho
 * para amanhã de manhã não pode dizer "faltam 0 dias" só porque agora é de
 * noite. `entrega_em` é DATE no banco, então a string chega "2026-09-05" e é
 * lida como hora local — `new Date("2026-09-05")` seria UTC e adiantaria o
 * prazo em um dia para quem está em Brasília.
 */
export function prazoDoTrabalho(entregaEm: string | null, agora: Date = new Date()): Prazo | null {
  if (!entregaEm) return null;
  const [ano, mes, dia] = entregaEm.slice(0, 10).split("-").map(Number);
  if (!ano || !mes || !dia) return null;

  const alvo = new Date(ano, mes - 1, dia);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);

  const rotulo =
    dias < -1 ? `Prazo encerrado há ${Math.abs(dias)} dias`
    : dias === -1 ? "Prazo encerrado ontem"
    : dias === 0 ? "Entrega é hoje"
    : dias === 1 ? "Entrega é amanhã"
    : `Faltam ${dias} dias`;

  return { dias, encerrado: dias < 0, urgente: dias >= 0 && dias <= 3, rotulo };
}

/**
 * O selo "pegando fogo": ou quem publicou fixou o post, ou o prazo está em cima.
 * O contador do menu usa a mesma regra — o número no menu tem que bater com o
 * que o aluno encontra quando clica.
 */
export function estaPegandoFogo(post: Pick<MuralPost, "destaque" | "entrega_em">, agora?: Date): boolean {
  if (post.destaque) return true;
  return prazoDoTrabalho(post.entrega_em, agora)?.urgente ?? false;
}

/** Ordem da vitrine: fixado primeiro, prazo mais apertado antes, depois o mais novo. */
export function ordenarMural(posts: MuralPost[], agora?: Date): MuralPost[] {
  return [...posts].sort((a, b) => {
    if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
    const pa = prazoDoTrabalho(a.entrega_em, agora);
    const pb = prazoDoTrabalho(b.entrega_em, agora);
    const abertoA = pa && !pa.encerrado;
    const abertoB = pb && !pb.encerrado;
    if (abertoA && abertoB) return pa!.dias - pb!.dias;
    if (abertoA !== abertoB) return abertoA ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Por quantos dias um trabalho atrasado continua cobrando na home. Depois disso
 * ele some de lá — mas continua no mural, porque some da cobrança, não do
 * enunciado. Uma semana é o intervalo entre dois sábados de aula: passado isso a
 * correção presencial já aconteceu e o aviso vira só ruído em cima de quem não
 * pode mais fazer nada a respeito.
 */
export const DIAS_DE_COBRANCA_APOS_VENCER = 7;

/**
 * O que o aviso da home mostra: trabalho no ar que este aluno ainda não marcou
 * como feito, do mais urgente para o menos. Some sozinho quando ele marca "já
 * fiz" — por isso o aviso não tem botão de dispensar: dispensar seria esconder
 * a cobrança sem fazer o trabalho, e o aluno perderia o prazo achando que
 * resolveu.
 */
export function pendentesParaHome(
  posts: MuralPost[],
  feitos: Set<string> | string[],
  agora: Date = new Date(),
): MuralPost[] {
  const jaFez = feitos instanceof Set ? feitos : new Set(feitos);
  const pendentes = posts.filter((p) => {
    if (p.tipo !== "trabalho" || !p.ativo || jaFez.has(p.id)) return false;
    const prazo = prazoDoTrabalho(p.entrega_em, agora);
    // Sem data marcada, o trabalho cobra até alguém arquivá-lo: não há quando
    // parar de cobrar se ninguém disse quando é para entregar.
    if (!prazo) return true;
    return prazo.dias >= -DIAS_DE_COBRANCA_APOS_VENCER;
  });
  return ordenarMural(pendentes, agora);
}

/**
 * O banco aceita `questoes` como qualquer array JSON; a tela precisa de strings
 * limpas. Também é aqui que linhas em branco do textarea somem — o professor
 * separa as questões por linha e sempre sobra uma no fim.
 */
export function normalizarQuestoes(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map((q) => (typeof q === "string" ? q.trim() : String(q ?? "").trim()))
    .filter(Boolean);
}

export function questoesDeTexto(texto: string): string[] {
  // O separador é obrigatório ("1.", "2)", "3 - "), e não só o número: sem ele,
  // uma questão que comece por ano ("2024 foi o ano em que…") perderia o ano.
  return texto
    .split("\n")
    .map((linha) => linha.replace(/^\s*\d+\s*[).\-–—:]\s*/, "").trim())
    .filter(Boolean);
}

/** Linha do banco → `MuralPost` com os campos já saneados. */
export function lerPost(linha: any): MuralPost {
  return {
    ...linha,
    tema: linha.tema ?? null,
    instrucoes: linha.instrucoes ?? null,
    entrega_em: linha.entrega_em ?? null,
    imagem_url: linha.imagem_url ?? null,
    destaque: !!linha.destaque,
    ativo: linha.ativo !== false,
    questoes: normalizarQuestoes(linha.questoes),
  } as MuralPost;
}
