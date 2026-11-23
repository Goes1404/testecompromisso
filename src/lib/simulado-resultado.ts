/**
 * Simulado Pré-Etec: nota lançada, consulta pública e conta da plataforma
 * (pedido da coordenação, 23/11).
 *
 * "Lançar notas" guarda as marcações de cada cartão em `simulado_resultados`.
 * A partir daí o aluno vê de dois jeitos: no link público `/resultado` (nome
 * completo ou nº de inscrição + nascimento) e, se tem conta, na plataforma
 * (Simulados → Resultados Oficiais).
 *
 * Regras puras — a rota, a tela e o teste usam as mesmas. Quem corrige continua
 * sendo `corrigir()` (`correcao-gabarito.ts`): nada aqui recalcula nota por
 * conta própria. Prova: scripts/test-simulado-resultado.ts.
 */
import { normalizarNome } from "@/lib/primeiro-acesso";
import { Marca, ResultadoDaQuestao, corrigir, marca, respostasDe, semelhanca } from "@/lib/correcao-gabarito";

/** Ano da prova (o das inscrições é o da turma, 2027). */
export const ANO_DA_PROVA_DO_SIMULADO = 2026;
/** Título da prova em `exams` — precisa bater com `TITULO_DO_SIMULADO` (o teste confere). */
export const TITULO_DA_PROVA_DO_SIMULADO = "Simulado Pré-Etec 2026";
/** Caminho do link público que a equipe manda aos alunos. */
export const LINK_DO_RESULTADO = "/resultado";
export const MAXIMO_DE_QUESTOES = 200;
export const MAXIMO_DE_CARTOES = 800;

// ── O que vai para `exams` / `exam_attempts` ────────────────────────────────
/**
 * Questão anulada no `answer_key` da prova. Marcador explícito de propósito:
 * `""` já existe em gabaritos antigos como "ainda não preenchido", e tratar
 * vazio como anulada daria ponto de graça em prova que não é esta.
 */
export const ANULADA_NA_PROVA = "*";

export function chaveParaAProva(chave: Marca[]): string[] {
  return chave.map((g) => (g === null || g === "*" ? ANULADA_NA_PROVA : g));
}

/** Formato de `exam_attempts.answers`. Em branco fica de fora (é assim que a tela conta "sem resposta"). */
export function respostasParaAProva(respostas: Marca[]): { q: number; selected: string }[] {
  const lista: { q: number; selected: string }[] = [];
  respostas.forEach((r, i) => { if (r !== null) lista.push({ q: i + 1, selected: r }); });
  return lista;
}

/** Como a tela do aluno lê uma questão do resultado oficial. */
export function situacaoNaProva(gabarito: string | null | undefined, marcada: string | null | undefined): ResultadoDaQuestao | "sem_gabarito" {
  const g = (gabarito ?? "").trim().toUpperCase();
  const m = (marcada ?? "").trim().toUpperCase();
  if (!g) return "sem_gabarito";
  if (g === ANULADA_NA_PROVA) return "certa";
  if (!m) return "branco";
  if (m === "*") return "anulada";
  return m === g ? "certa" : "errada";
}

// ── Resultado que o link público mostra ─────────────────────────────────────
export interface QuestaoDoResultado {
  n: number;
  marcada: Marca;
  /** Letra certa; null = questão anulada (vale ponto para todos). */
  gabarito: "A" | "B" | "C" | "D" | "E" | null;
  resultado: ResultadoDaQuestao;
}

export interface ResultadoPublico {
  primeiro_nome: string;
  numero: string;
  sala: number | null;
  /** false = a inscrição existe, mas a nota ainda não foi lançada. */
  lancado: boolean;
  acertos: number;
  total: number;
  questoes: QuestaoDoResultado[];
}

export function questoesDoResultado(chave: Marca[], respostas: Marca[]): QuestaoDoResultado[] {
  const c = corrigir(chave, respostas);
  return chave.map((g, i) => ({
    n: i + 1,
    marcada: respostas[i] ?? null,
    gabarito: g === null || g === "*" ? null : g,
    resultado: c.porQuestao[i],
  }));
}

export function contagemDoResultado(questoes: QuestaoDoResultado[]) {
  const n = (r: ResultadoDaQuestao) => questoes.filter((q) => q.resultado === r).length;
  return { certas: n("certa"), erradas: n("errada"), brancos: n("branco"), anuladas: n("anulada") };
}

/** Faixa de cor proporcional ao total (nunca valor absoluto — a prova não tem sempre 50 questões). */
export function faixaDaNota(acertos: number, total: number): "alta" | "media" | "baixa" {
  const p = total > 0 ? acertos / total : 0;
  return p >= 0.7 ? "alta" : p >= 0.5 ? "media" : "baixa";
}

// ── Lançamento: o que a rota aceita ─────────────────────────────────────────
export interface ItemDoLancamento {
  matricula_id: string;
  respostas: Marca[];
  /** Conta da plataforma escolhida; null = só no link público. */
  perfil_id: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ehUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** A chave como veio da tela → lista de Marcas. Null = inválida. */
export function chaveDoCorpo(v: unknown): Marca[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > MAXIMO_DE_QUESTOES) return null;
  const chave = v.map(marca);
  // Gabarito todo anulado não é gabarito: todo mundo tiraria nota máxima.
  return chave.some((g) => g !== null && g !== "*") ? chave : null;
}

/**
 * Valida os cartões do lançamento. Cartão repetido para a mesma inscrição é
 * recusado inteiro (a tela já marca "aparece em mais de um cartão"): escolher
 * um dos dois em silêncio seria dar a nota de um aluno a outro.
 */
export function itensDoCorpo(v: unknown, total: number): { itens: ItemDoLancamento[]; erro?: undefined } | { itens?: undefined; erro: string } {
  if (!Array.isArray(v) || v.length < 1) return { erro: "Nenhum cartão para lançar." };
  if (v.length > MAXIMO_DE_CARTOES) return { erro: `No máximo ${MAXIMO_DE_CARTOES} cartões por vez.` };
  const vistos = new Set<string>();
  const contas = new Set<string>();
  const itens: ItemDoLancamento[] = [];
  for (const bruto of v) {
    const x = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
    if (!ehUuid(x.matricula_id)) return { erro: "Há um cartão sem aluno escolhido." };
    if (vistos.has(x.matricula_id)) return { erro: "O mesmo aluno aparece em mais de um cartão. Resolva antes de lançar." };
    vistos.add(x.matricula_id);
    const perfil_id = ehUuid(x.perfil_id) ? x.perfil_id : null;
    if (perfil_id) {
      if (contas.has(perfil_id)) return { erro: "A mesma conta da plataforma foi escolhida para dois alunos." };
      contas.add(perfil_id);
    }
    itens.push({ matricula_id: x.matricula_id, respostas: respostasDe(x.respostas, total), perfil_id });
  }
  return { itens };
}

/** Mesmo gabarito? (para saber se as notas já lançadas precisam ser refeitas) */
export function mesmaChave(a: unknown, b: Marca[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  return a.every((x, i) => marca(x) === b[i]);
}

// ── Achar a conta da plataforma ─────────────────────────────────────────────
export interface InscricaoParaConta {
  id: string;
  nome: string;
  nascimento: string; // AAAA-MM-DD
  /** Sala do aluno no Compromisso em 2026 (só quem marcou "estou no cursinho"). */
  sala_origem: number | null;
  /** Marcou "Estou no cursinho Compromisso este ano". */
  ex_aluno: boolean;
}

export interface Conta {
  id: string;
  nome: string;
  login: string | null;
  sala: string | null;
  nascimento: string | null;
  /** Já entrou na plataforma alguma vez? null = não foi conferido. */
  usada: boolean | null;
}

export type SituacaoDaConta = "conta" | "duvida" | "sem_conta";

export interface Escolha {
  situacao: SituacaoDaConta;
  conta: Conta | null;
  /** Para a equipe escolher quando há dúvida. */
  candidatos: Conta[];
  motivo: string;
}

const salaLimpa = (s: string | null | undefined) => {
  const x = (s ?? "").trim().toLowerCase().replace(/^(sala\s*)?0*/, "");
  return /^[0-9]+$/.test(x) ? x : null;
};

/**
 * Acha a conta da plataforma de uma inscrição. Só decide sozinha quando não há
 * como ser outra pessoa; o resto vira "dúvida" e a equipe escolhe.
 *
 * - Nome completo EXATO (sem acento/maiúscula), como no primeiro acesso —
 *   pedaço de nome entregaria a nota de um aluno a outro.
 * - Data de nascimento diferente no cadastro = outra pessoa (homônimo): nunca
 *   é escolhida sozinha.
 * - Quem NÃO marcou "estou no cursinho" só é ligado sozinho se o nascimento
 *   confirma: um candidato de fora com o nome de um aluno nosso é provável.
 * - Aluno com duas contas (ainda há duplicadas na base): desempata por
 *   nascimento, depois pela sala, depois por "só uma já foi usada".
 */
export function escolherConta(insc: InscricaoParaConta, contas: Conta[]): Escolha {
  const alvo = normalizarNome(insc.nome);
  const exatas = contas.filter((c) => normalizarNome(c.nome) === alvo);
  const conflita = (c: Conta) => !!c.nascimento && c.nascimento !== insc.nascimento;
  const confirma = (c: Conta) => !!c.nascimento && c.nascimento === insc.nascimento;
  const pool = exatas.filter((c) => !conflita(c));

  if (pool.length === 1) {
    const c = pool[0];
    if (confirma(c) || insc.ex_aluno) return { situacao: "conta", conta: c, candidatos: [], motivo: confirma(c) ? "Nome e nascimento iguais" : "Nome igual" };
    return { situacao: "duvida", conta: null, candidatos: [c], motivo: "Mesmo nome, mas a ficha não diz que é aluno do cursinho" };
  }

  if (pool.length > 1) {
    const mesmaSala = (c: Conta) => insc.sala_origem !== null && salaLimpa(c.sala) === String(insc.sala_origem);
    const filtros: [(c: Conta) => boolean, string][] = [
      [confirma, "Nascimento igual"], [mesmaSala, "Mesma sala"], [(c) => c.usada === true, "A única conta já usada"],
    ];
    let resto = pool;
    for (const [filtro, motivo] of filtros) {
      const f = resto.filter(filtro);
      if (f.length === 1 && (insc.ex_aluno || confirma(f[0]))) return { situacao: "conta", conta: f[0], candidatos: pool, motivo: `${pool.length} contas com este nome. ${motivo}` };
      if (f.length > 1) resto = f;
    }
    return { situacao: "duvida", conta: null, candidatos: pool, motivo: `${pool.length} contas com este nome` };
  }

  if (exatas.length) {
    return { situacao: "duvida", conta: null, candidatos: exatas, motivo: "Mesmo nome, mas outra data de nascimento no cadastro" };
  }

  // Sem nome exato. Só para quem disse que é do cursinho: procura nome parecido
  // (a ficha é digitada pelo aluno; o cadastro, pela secretaria).
  if (insc.ex_aluno) {
    const palavras = new Set(alvo.split(" ").filter((p) => p.length > 2));
    const parecidas = contas
      .filter((c) => !conflita(c) && normalizarNome(c.nome).split(" ").some((p) => palavras.has(p)))
      .map((c) => ({ c, s: Math.max(semelhanca(insc.nome, c.nome), semelhanca(c.nome, insc.nome)) }))
      .filter((x) => x.s >= 0.75 || (confirma(x.c) && x.s >= 0.5))
      .sort((x, y) => y.s - x.s)
      .slice(0, 5)
      .map((x) => x.c);
    if (parecidas.length) return { situacao: "duvida", conta: null, candidatos: parecidas, motivo: "Nome parecido no cadastro" };
  }
  return { situacao: "sem_conta", conta: null, candidatos: [], motivo: insc.ex_aluno ? "Não achamos conta com este nome" : "Não é aluno do cursinho" };
}

/** Contas que só o "já foi usada?" consegue desempatar (para o servidor conferir só essas). */
export function contasParaConferirUso(inscricoes: InscricaoParaConta[], contas: Conta[]): string[] {
  const porNome = new Map<string, Conta[]>();
  for (const c of contas) {
    const k = normalizarNome(c.nome);
    if (!k) continue;
    porNome.set(k, [...(porNome.get(k) ?? []), c]);
  }
  const ids = new Set<string>();
  for (const i of inscricoes) {
    const grupo = porNome.get(normalizarNome(i.nome)) ?? [];
    if (grupo.length > 1) grupo.forEach((c) => ids.add(c.id));
  }
  return [...ids];
}

/** Texto do sininho quando a nota chega na conta do aluno. */
export function avisoDaNota(acertos: number, total: number): { title: string; body: string; url: string } {
  return {
    title: "Saiu a sua nota do Simulado Pré-Etec",
    body: `Você acertou ${acertos} de ${total}. Toque para ver o gabarito questão a questão.`,
    url: "/dashboard/student/simulados",
  };
}
