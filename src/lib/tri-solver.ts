/**
 * tri-solver.ts
 *
 * Módulo de cálculo matemático de Teoria de Resposta ao Item (TRI)
 * baseado no Modelo Logístico de 3 Parâmetros (3PL) usando
 * estimação EAP (Expected A Posteriori) com prior Normal Padrão N(0, 1).
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

/**
 * Função de probabilidade do acerto no modelo 3PL.
 * P_i(theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
 */
export function calculateProbability3PL(theta: number, a: number, b: number, c: number): number {
  const expTerm = Math.exp(-a * (theta - b));
  return c + (1 - c) / (1 + expTerm);
}

/**
 * Calcula a proficiência estimada (theta) usando Expected A Posteriori (EAP)
 * com uma grade de integração uniforme e prior normal padrão N(0, 1).
 */
export function estimateThetaEAP(responses: StudentQuestionResponse[]): number {
  if (responses.length === 0) return 0.0;

  // Grade de integração de -4.0 a +4.0 em passos de 0.1
  const GRID_START = -4.0;
  const GRID_END = 4.0;
  const GRID_STEP = 0.1;

  let sumNumerator = 0;
  let sumDenominator = 0;

  for (let theta = GRID_START; theta <= GRID_END; theta += GRID_STEP) {
    let likelihood = 1.0;

    for (const res of responses) {
      const p = calculateProbability3PL(theta, res.triParams.a, res.triParams.b, res.triParams.c);
      likelihood *= res.correct ? p : (1 - p);
    }

    // Densidade de prior Normal Padrão: phi(theta) = 1/sqrt(2pi) * exp(-0.5 * theta^2)
    // O termo 1/sqrt(2pi) cancela no numerador/denominador, então usamos apenas exp(-0.5 * theta^2)
    const prior = Math.exp(-0.5 * theta * theta);

    const term = likelihood * prior;
    sumNumerator += theta * term;
    sumDenominator += term;
  }

  // Se a verossimilhança for nula para todos os pontos (caso extremo), retorna 0 (proficiência média)
  if (sumDenominator === 0) return 0.0;

  return sumNumerator / sumDenominator;
}

/**
 * Mapeia o valor de proficiência estimado (theta, geralmente de -3.0 a +3.0)
 * para a escala clássica do ENEM (Média 500, Desvio Padrão 100).
 */
export function mapThetaToEnemScore(theta: number): number {
  // ENEM escala típica: Nota = 500 + 100 * theta
  // Mapeamento normalizado:
  const mean = 500;
  const standardDeviation = 100;
  
  let score = mean + standardDeviation * theta;
  
  // Limites realistas de nota mínima e máxima do ENEM
  // A nota mínima histórica nunca é zero por conta do chute (TRI calcula mesmo com 0 acertos),
  // mas limitamos entre 0 e 1000 por conformidade de exibição.
  score = Math.max(0, Math.min(1000, score));
  
  return Math.round(score);
}

/**
 * Mapeamento prático de nível de dificuldade textual para parâmetros 3PL padrão.
 */
export function getParamsFromDifficulty(difficulty: string): TriQuestionParameters {
  const diffNormalized = difficulty.trim().toLowerCase();
  
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
