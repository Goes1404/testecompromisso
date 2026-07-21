/**
 * tri-solver.ts
 *
 * Cálculo de Teoria de Resposta ao Item (TRI) no Modelo Logístico de 3
 * Parâmetros (3PL) via estimação EAP (Expected A Posteriori) com prior
 * Normal N(0, 1).
 *
 * O EAP já captura a "coerência pedagógica" da TRI: acertar itens difíceis
 * e errar itens fáceis achata a verossimilhança e puxa a proficiência para
 * baixo — exatamente o que penaliza o chute no ENEM real.
 */

export interface TriQuestionParameters {
  a: number; // Discriminação
  b: number; // Dificuldade
  c: number; // Acerto casual (chute)
}

export interface StudentQuestionResponse {
  correct: boolean;
  triParams: TriQuestionParameters;
}

export interface TriResult {
  /** Proficiência estimada (escala latente ~N(0,1)). */
  theta: number;
  /** Erro-padrão a posteriori (desvio da distribuição posterior). */
  se: number;
  /** Nota na escala ENEM (0–1000). */
  score: number;
  /** Limite inferior da faixa de confiança (~95%). */
  scoreLow: number;
  /** Limite superior da faixa de confiança (~95%). */
  scoreHigh: number;
}

/**
 * Probabilidade de acerto no modelo 3PL.
 * P(θ) = c + (1 - c) / (1 + exp(-a·(θ - b)))
 */
export function calculateProbability3PL(theta: number, a: number, b: number, c: number): number {
  const expTerm = Math.exp(-a * (theta - b));
  return c + (1 - c) / (1 + expTerm);
}

/** Sanitiza parâmetros vindos do banco (evita NaN/valores absurdos). */
function sanitizeParams(p: TriQuestionParameters): TriQuestionParameters {
  const a = Number.isFinite(p.a) ? Math.min(3.0, Math.max(0.3, p.a)) : 1.0;
  const b = Number.isFinite(p.b) ? Math.min(4.0, Math.max(-4.0, p.b)) : 0.0;
  const c = Number.isFinite(p.c) ? Math.min(0.5, Math.max(0.0, p.c)) : 0.2;
  return { a, b, c };
}

const GRID_START = -4.0;
const GRID_END = 4.0;
const GRID_STEP = 0.05; // grade mais fina que a anterior (0.1) → estimativa mais suave

/**
 * Momentos da distribuição posterior (média = θ, e variância) via EAP com
 * prior N(0,1) numa grade uniforme. Retorna θ e o erro-padrão.
 */
export function estimateThetaEAPWithSE(responses: StudentQuestionResponse[]): { theta: number; se: number } {
  if (responses.length === 0) return { theta: 0, se: 1 };

  const items = responses.map((r) => ({ correct: r.correct, ...sanitizeParams(r.triParams) }));

  let sum0 = 0; // Σ posterior
  let sum1 = 0; // Σ θ·posterior
  let sum2 = 0; // Σ θ²·posterior

  for (let theta = GRID_START; theta <= GRID_END + 1e-9; theta += GRID_STEP) {
    // Log-verossimilhança (soma de logs evita underflow com muitas questões)
    let logLik = 0;
    for (const it of items) {
      const p = calculateProbability3PL(theta, it.a, it.b, it.c);
      const pc = Math.min(1 - 1e-9, Math.max(1e-9, p));
      logLik += it.correct ? Math.log(pc) : Math.log(1 - pc);
    }
    const logPrior = -0.5 * theta * theta; // N(0,1) sem a constante (cancela)
    const w = Math.exp(logLik + logPrior);

    sum0 += w;
    sum1 += theta * w;
    sum2 += theta * theta * w;
  }

  if (sum0 === 0) return { theta: 0, se: 1 };

  const theta = sum1 / sum0;
  const variance = Math.max(0, sum2 / sum0 - theta * theta);
  return { theta, se: Math.sqrt(variance) };
}

/**
 * Compatibilidade: retorna apenas θ (usa a implementação com SE).
 */
export function estimateThetaEAP(responses: StudentQuestionResponse[]): number {
  return estimateThetaEAPWithSE(responses).theta;
}

/**
 * Mapeia a proficiência θ (~N(0,1)) para a escala ENEM (média 500, DP 100),
 * limitada a 0–1000.
 */
export function mapThetaToEnemScore(theta: number): number {
  const score = 500 + 100 * theta;
  return Math.round(Math.max(0, Math.min(1000, score)));
}

/**
 * Resultado TRI completo: θ, erro-padrão, nota ENEM e faixa de confiança ~95%.
 */
export function computeTriResult(responses: StudentQuestionResponse[]): TriResult {
  const { theta, se } = estimateThetaEAPWithSE(responses);
  return {
    theta,
    se,
    score: mapThetaToEnemScore(theta),
    scoreLow: mapThetaToEnemScore(theta - 1.96 * se),
    scoreHigh: mapThetaToEnemScore(theta + 1.96 * se),
  };
}

/**
 * Mapeamento de nível de dificuldade textual para parâmetros 3PL padrão.
 */
export function getParamsFromDifficulty(difficulty: string): TriQuestionParameters {
  const diffNormalized = (difficulty || "").trim().toLowerCase();

  switch (diffNormalized) {
    case "facil":
    case "fácil":
      return { a: 1.0, b: -1.2, c: 0.20 };
    case "medio":
    case "médio":
      return { a: 1.2, b: 0.2, c: 0.20 };
    case "dificil":
    case "difícil":
      return { a: 1.5, b: 1.6, c: 0.20 };
    default:
      return { a: 1.2, b: 0.2, c: 0.20 }; // Padrão Médio
  }
}
