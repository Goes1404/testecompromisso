/**
 * Protocolo de banca do INEP, aplicado a correções independentes da IA.
 *
 * Como o INEP corrige de verdade:
 *   1. Dois corretores avaliam a redação de forma independente — não se
 *      conhecem e não se comunicam.
 *   2. Há DISCREPÂNCIA se as notas totais diferem em mais de 100 pontos, OU se
 *      a diferença em qualquer competência passa de 80 pontos.
 *   3. Havendo discrepância, um terceiro corretor avalia, também às cegas.
 *   4. A nota final é a MÉDIA das duas notas mais próximas.
 *   5. Se a nota do terceiro ficar equidistante das outras duas, uma banca de
 *      três (supervisor + dois auxiliares) refaz a correção e as notas
 *      anteriores são descartadas.
 *
 * O que havia antes: um único prompt pedia ao modelo que "simulasse o debate de
 * 3 corretores" e devolvesse o veredito. Isso é um corretor só escrevendo o
 * diálogo dos três — a independência, que é o ponto inteiro do protocolo, não
 * existe. Em paralelo, três execuções do mesmo prompt eram reduzidas pela
 * mediana, o que estabiliza a nota mas não reproduz a regra do INEP.
 *
 * Aqui as correções são chamadas independentes de verdade, e a combinação segue
 * a regra oficial: média das duas mais próximas, não mediana.
 *
 * O protocolo é PARAMETRIZADO PELA BANCA (`src/lib/bancas.ts`). Ele nasceu do
 * INEP, mas serve às duas bancas por duas razões distintas: no ENEM reproduz a
 * regra oficial; na FUVEST dá estabilidade a uma nota de IA, que é o motivo de
 * existirem duas correções independentes em primeiro lugar.
 *
 * A banca é sempre o ÚLTIMO parâmetro e sempre opcional, com default ENEM.
 * Assim nenhum chamador anterior à FUVEST precisou mudar — inclusive
 * `scripts/test-inep-banca.ts`, que continua sendo a prova de que o ENEM não
 * regrediu.
 */
import { BANCA_ENEM, type Banca } from '@/lib/bancas';

/**
 * Competências do ENEM. Mantido como export porque é o vocabulário do ENEM em
 * si — para código que precisa valer nas duas bancas, use `banca.criterios`.
 */
export const COMP_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;
export type CompKey = (typeof COMP_KEYS)[number];

/**
 * Notas que um CORRETOR pode atribuir a uma competência: múltiplos de 40.
 *
 * A nota FINAL não obedece a isso, porque é a média de dois corretores — é por
 * isso que existem notas de ENEM como 940 ou 780, que não são múltiplos de 40.
 * Ver `mediaFinal`.
 */
export const VALID_SCORES = BANCA_ENEM.valoresValidos;

/**
 * Aproxima o palpite do corretor ao valor válido mais próximo da banca.
 *
 * No ENEM é o múltiplo de 40 mais próximo (0–200); na FUVEST, o múltiplo de 10
 * (0–50). O desempate escolhe o MENOR, e é isso que torna `mediaFinal`
 * necessária — ver o comentário lá.
 */
export function snapCompetency(raw: unknown, banca: Banca = BANCA_ENEM): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return banca.valoresValidos.reduce(
    (best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best),
    0,
  );
}

/**
 * Média das notas de competência que compõem o resultado final.
 *
 * NÃO arredonda para múltiplo de 40. Fazer isso introduzia um viés sistemático
 * para baixo: toda média que caísse no meio de duas bandas (140, 180) descia
 * uma faixa inteira, porque o desempate do `snapCompetency` escolhe o menor.
 * Numa redação real corrigida em 800 e 760, a nota final saía 720 — quarenta
 * pontos abaixo do MENOR dos dois corretores.
 *
 * A média de dois múltiplos de 40 é múltiplo de 20, e é assim que o ENEM
 * funciona de fato. Com três notas (caso de banca) o valor é arredondado ao
 * inteiro, já que aí a divisão pode não ser exata.
 */
export function mediaFinal(notas: number[]): number {
  return Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
}

/**
 * Limiares oficiais de discrepância.
 *
 * Nota sobre o limiar de 100: como toda competência é múltiplo de 40, a
 * diferença entre duas notas totais também é. Não existe diferença de 100 —
 * "mais de 100 pontos" equivale, na prática, a 120 ou mais.
 */
export const DISCREPANCIA_TOTAL = BANCA_ENEM.discrepanciaTotal;
export const DISCREPANCIA_COMPETENCIA = BANCA_ENEM.discrepanciaCriterio;

export type Correcao = {
  /** Notas [c1..c5], já normalizadas a múltiplos de 40. */
  vetor: number[];
};

export type ResultadoBanca = {
  /** Nota final por competência, [c1..c5]. */
  vetor: number[];
  total: number;
  /** true se os dois primeiros corretores discordaram além do limiar. */
  houveDiscrepancia: boolean;
  /** Motivos legíveis da discrepância, para o espelho de correção. */
  motivos: string[];
  /** true quando o 3º ficou equidistante e a banca de três seria acionada. */
  precisouBanca: boolean;
  /** Índices das correções usadas na nota final (as duas mais próximas). */
  usadas: number[];
};

/**
 * Nota final da banca a partir do vetor de critérios.
 *
 * No ENEM é a soma (0–1000); na FUVEST, a média arredondada (0–50). É por isso
 * que a combinação é função da banca e não uma soma fixa aqui.
 */
export function total(vetor: number[], banca: Banca = BANCA_ENEM): number {
  return banca.combinarTotal(vetor);
}

/**
 * Verifica discrepância entre duas correções pela regra do INEP.
 * Devolve a lista de motivos — vazia quando não há discrepância.
 */
export function motivosDeDiscrepancia(
  a: number[],
  b: number[],
  banca: Banca = BANCA_ENEM,
): string[] {
  const motivos: string[] = [];

  const difTotal = Math.abs(total(a, banca) - total(b, banca));
  if (difTotal > banca.discrepanciaTotal) {
    motivos.push(`nota total diferiu em ${difTotal} pontos (limite: ${banca.discrepanciaTotal})`);
  }

  banca.criterios.forEach((criterio, i) => {
    const dif = Math.abs(a[i] - b[i]);
    if (dif > banca.discrepanciaCriterio) {
      motivos.push(`${criterio.key.toUpperCase()} diferiu em ${dif} pontos (limite: ${banca.discrepanciaCriterio})`);
    }
  });

  return motivos;
}

/**
 * Aplica o protocolo. Recebe as correções na ordem em que foram produzidas:
 * as duas primeiras são os corretores independentes; a terceira, quando
 * fornecida, é o desempate.
 *
 * `pedirTerceira` permite ao chamador só gastar a terceira chamada de IA
 * quando ela é de fato necessária — que é como o INEP opera, e reduz o custo
 * em ~⅓ nas redações sem divergência.
 */
export function aplicarProtocoloInep(
  correcoes: Correcao[],
  banca: Banca = BANCA_ENEM,
): ResultadoBanca {
  if (correcoes.length === 0) {
    throw new Error('Nenhuma correção para combinar.');
  }
  if (correcoes.length === 1) {
    const v = correcoes[0].vetor;
    return {
      vetor: v, total: total(v, banca),
      houveDiscrepancia: false, motivos: [], precisouBanca: false, usadas: [0],
    };
  }

  const [a, b] = correcoes;
  const motivos = motivosDeDiscrepancia(a.vetor, b.vetor, banca);

  // Sem discrepância: média dos dois, como o INEP faz.
  if (motivos.length === 0) {
    const vetor = a.vetor.map((_, i) => mediaFinal([a.vetor[i], b.vetor[i]]));
    return {
      vetor, total: total(vetor, banca),
      houveDiscrepancia: false, motivos: [], precisouBanca: false, usadas: [0, 1],
    };
  }

  // Discrepância sem terceiro corretor disponível: o melhor que dá para fazer
  // é a média, sinalizando que a divergência ficou sem arbitragem.
  if (correcoes.length < 3) {
    const vetor = a.vetor.map((_, i) => mediaFinal([a.vetor[i], b.vetor[i]]));
    return {
      vetor, total: total(vetor, banca),
      houveDiscrepancia: true, motivos, precisouBanca: false, usadas: [0, 1],
    };
  }

  // Terceiro corretor: a nota final é a média das duas TOTAIS mais próximas.
  const c = correcoes[2];
  const totais = [total(a.vetor, banca), total(b.vetor, banca), total(c.vetor, banca)];
  const pares: [number, number][] = [[0, 1], [0, 2], [1, 2]];
  const distancias = pares.map(([i, j]) => Math.abs(totais[i] - totais[j]));
  const menor = Math.min(...distancias);

  // Equidistância: o 3º ficou exatamente no meio dos outros dois. O INEP manda
  // a redação para uma banca de três e descarta as notas anteriores. Sem banca
  // humana aqui, sinalizamos para revisão do professor e usamos a média das
  // três — que é o valor menos arbitrário entre correções igualmente distantes.
  const empatados = distancias.filter(d => d === menor).length > 1;
  if (empatados) {
    const vetor = a.vetor.map((_, i) =>
      mediaFinal([a.vetor[i], b.vetor[i], c.vetor[i]]));
    return {
      vetor, total: total(vetor, banca),
      houveDiscrepancia: true,
      motivos: [...motivos, 'terceira correção ficou equidistante — caso de banca; recomenda-se revisão humana'],
      precisouBanca: true,
      usadas: [0, 1, 2],
    };
  }

  const [i, j] = pares[distancias.indexOf(menor)];
  const vetor = correcoes[i].vetor.map((_, k) =>
    mediaFinal([correcoes[i].vetor[k], correcoes[j].vetor[k]]));

  return {
    vetor, total: total(vetor, banca),
    houveDiscrepancia: true, motivos, precisouBanca: false, usadas: [i, j],
  };
}
