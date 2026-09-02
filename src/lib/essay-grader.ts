/**
 * Motor de correção de redação.
 *
 * Vive fora da rota HTTP porque precisa ser chamável de scripts — recorrigir
 * uma redação já enviada, rodar calibração contra as notas dos professores,
 * comparar modelos em lote. Se o motor morasse dentro do route handler, cada
 * uma dessas coisas viraria uma reimplementação paralela, e o que se testa
 * deixaria de ser o que roda em produção.
 *
 * `/api/essay-evaluate` é uma casca fina sobre `corrigirRedacao`.
 */
import OpenAI from "openai";
import { analisarRedacao, evidenciaParaPrompt, type EssayAnalysis } from "@/lib/essay-analysis";
import { localizarTrechos } from "@/lib/essay-highlight";
import {
  aplicarProtocoloInep, motivosDeDiscrepancia, snapCompetency, total,
  type Correcao, type ResultadoBanca,
} from "@/lib/inep-banca";
import { getBanca, type Banca, type BancaId } from "@/lib/bancas";

export type EntradaCorrecao = {
  theme: string;
  text: string;
  /** Textos motivadores da proposta, em texto puro. */
  motivadores?: string[];
  /** "ocr" quando o texto veio de foto — evita punir o critério de norma por ruído de transcrição. */
  origin?: string;
  /** Modelo a usar; sobrescrevível para comparar custo e qualidade. */
  model?: string;
  /**
   * Banca que define critérios, escala e prompt. Ausente ou desconhecida cai
   * no ENEM — nenhum chamador anterior à FUVEST precisa saber que isto existe.
   */
  banca?: BancaId;
};

/** Erro com status HTTP, para a rota traduzir sem conhecer as regras. */
/**
 * Hash estável (djb2) do texto, usado como semente de amostragem. Precisa ser
 * inteiro positivo e caber em 32 bits para a API aceitar.
 */
function sementeDoTexto(entrada: string): number {
  let h = 5381;
  for (let i = 0; i < entrada.length; i++) {
    h = ((h << 5) + h + entrada.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2_000_000_000;
}

export class ErroCorrecao extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ErroCorrecao';
  }
}

/*
 * O prompt de cada banca vive em `src/lib/bancas.ts`, junto da escala e dos
 * critérios que ele descreve. Separá-los deixaria o texto dizendo "0, 40, 80,
 * 120, 160 ou 200" enquanto a configuração dizia outra coisa.
 */

type ParsedRun = {
  competencies: Record<string, { score: number; feedback: string }>;
  vector: number[];
  detailed_corrections: any[];
  suggestions: any[];
  general_feedback: string;
  anulacao: string | null;
};

/** Normaliza um JSON cru da IA num run consistente. */
function normalizeRun(parsed: any, banca: Banca): ParsedRun {
  const comps = parsed?.competencies || {};
  const competencies: Record<string, { score: number; feedback: string }> = {};
  const vector: number[] = [];
  for (const { key } of banca.criterios) {
    const score = snapCompetency(comps[key]?.score, banca);
    vector.push(score);
    competencies[key] = {
      score,
      feedback: typeof comps[key]?.feedback === "string" ? comps[key].feedback : "",
    };
  }
  return {
    competencies,
    vector,
    detailed_corrections: Array.isArray(parsed?.detailed_corrections) ? parsed.detailed_corrections : [],
    suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions : [],
    general_feedback: typeof parsed?.general_feedback === "string" ? parsed.general_feedback : "",
    anulacao: typeof parsed?.anulacao === "string" ? parsed.anulacao : null,
  };
}

/** Monta o conteúdo enviado ao corretor. */
function montarUserContent(
  theme: string,
  text: string,
  motivadores: string[],
  origin: string | undefined,
  analise: EssayAnalysis,
  banca: Banca,
): string {
  let out = `Tema: ${theme}\n\n`;

  if (motivadores.length > 0) {
    const criterioTema = banca.criteriosDeConteudo[0].toUpperCase();
    out += `Textos motivadores da proposta (copiar/parafrasear estes textos NÃO é repertório legitimado e reduz ${criterioTema}):\n` +
      motivadores.map((t, i) => `(${i + 1}) ${t}`).join('\n') + `\n\n`;
  }

  if (origin === "ocr") {
    const criterioNorma = banca.criterioNorma.toUpperCase();
    out += `AVISO: este texto foi transcrito de uma FOTO da redação manuscrita. Marcações "[ilegível]" e pequenos ruídos de digitalização NÃO devem penalizar a ${criterioNorma} — avalie a norma culta apenas pelo que está claramente legível.\n\n`;
  }

  out += evidenciaParaPrompt(analise, banca) + `\n\nTexto da Redação:\n${text}`;
  return out;
}

/** Resposta de anulação, montada sem gastar chamada de IA. */
function respostaAnulacao(
  motivo: string,
  explicacao: string,
  analise: EssayAnalysis,
  banca: Banca,
) {
  const competencies: Record<string, { score: number; feedback: string }> = {};
  for (const { key } of banca.criterios) competencies[key] = { score: 0, feedback: explicacao };

  const minimoLinhas = banca.linhasInsuficientes + 1;

  return {
    anulacao: motivo,
    banca: banca.id,
    competencies,
    total_score: 0,
    general_feedback: explicacao,
    detailed_corrections: [],
    suggestions: [
      banca.exigeIntervencao
        ? 'Reescreva o texto atendendo à proposta: dissertativo-argumentativo, com tese, argumentos próprios e proposta de intervenção.'
        : 'Reescreva o texto atendendo à proposta: uma dissertação com tese clara, argumentos próprios e reflexão crítica.',
      'Use os textos motivadores apenas como ponto de partida — copiá-los anula a redação.',
      `Preencha ao menos ${minimoLinhas} das ${banca.linhasAlvo[1]} linhas da folha; abaixo disso o texto é considerado insuficiente.`,
    ],
    _analise: analise,
    _banca: { id: banca.id, anulada: true, motivo },
  };
}

/**
 * Corrige uma redação seguindo o protocolo do INEP.
 *
 * Sequência: análise determinística → anulações objetivas (sem gastar IA) →
 * duas correções independentes → terceira só se houver discrepância →
 * combinação pela regra oficial.
 */
export async function corrigirRedacao(entrada: EntradaCorrecao, openai: OpenAI) {
  const { theme, text, origin, model = "gpt-4o" } = entrada;
  const banca = getBanca(entrada.banca);

  if (!text || typeof text !== 'string' || text.trim().length < 40) {
    throw new ErroCorrecao("Texto muito curto para avaliação.", 400);
  }

  const motivadores = (entrada.motivadores ?? []).filter(l => l.trim().length > 4);

  // ── 1. Análise determinística ──
  const analise = analisarRedacao(text, motivadores, banca);

  // ── 2. Anulações objetivas, na hierarquia do INEP ──
  // Estas duas não dependem de julgamento: são medidas. Resolver aqui evita
  // gastar chamadas de IA para concluir o que a contagem já provou, e evita o
  // caso em que o modelo "tem pena" e dá nota a um texto anulável.
  if (analise.textoInsuficiente) {
    return respostaAnulacao(
      'texto_insuficiente',
      `Seu texto tem cerca de ${analise.linhasEstimadas} ${analise.linhasEstimadas === 1 ? 'linha' : 'linhas'} (${analise.palavras} palavras). ` +
      `O ${banca.label} anula redações com até ${banca.linhasInsuficientes} linhas — é a regra de "texto insuficiente", e ela vem antes de qualquer avaliação de conteúdo. ` +
      `Escreva entre ${banca.linhasAlvo[0]} e ${banca.linhasAlvo[1]} linhas para ter todos os critérios avaliados.`,
      analise,
      banca,
    );
  }

  if (analise.copiaIntegral) {
    return respostaAnulacao(
      'copia',
      `${(analise.fracaoCopiada * 100).toFixed(0)}% do seu texto reproduz literalmente os textos motivadores da proposta. ` +
      `A redação é anulada nesse caso: os textos de apoio servem para você refletir, não para copiar. ` +
      `Use as informações deles, mas escreva com as suas palavras e acrescente repertório próprio.`,
      analise,
      banca,
    );
  }

  const userContent = montarUserContent(theme, text, motivadores, origin, analise, banca);

  // Semente derivada do próprio texto. Sem ela, corrigir a mesma redação duas
  // vezes sorteava amostras diferentes e devolvia notas diferentes — a aluna
  // que corrigia os erros e reenviava via a nota CAIR, porque o ruído do
  // sorteio (até 100 pontos, o limite de discrepância) era maior que o ganho
  // real da correção dela. Agora o mesmo texto sempre cai na mesma amostra, e
  // uma diferença de nota passa a significar uma diferença de texto.
  const semente = sementeDoTexto(`${banca.id}|${theme}|${text}`);

  const corrigir = (corretor: number) =>
    openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: banca.systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      // Cada corretor recebe uma semente distinta: continuam independentes
      // entre si (o protocolo de discrepância segue tendo função), mas o
      // conjunto é reprodutível para um mesmo texto.
      seed: semente + corretor,
      // Reduzida de 0.4: a dispersão entre corretores era da ordem de uma
      // banda inteira de competência (40 pontos), e como a nota é a média de
      // dois, isso batia direto na nota final.
      temperature: 0.25,
      max_tokens: 2500,
    });

  const parse = (r: PromiseSettledResult<any>): ParsedRun | null => {
    if (r.status !== "fulfilled") return null;
    try {
      return normalizeRun(JSON.parse(r.value.choices[0].message?.content || "{}"), banca);
    } catch {
      return null;
    }
  };

  // ── 3. Dois corretores independentes, em paralelo ──
  const primeiros = await Promise.allSettled([corrigir(0), corrigir(1)]);
  const runs: ParsedRun[] = primeiros.map(parse).filter((r): r is ParsedRun => r !== null);

  if (runs.length === 0) {
    throw new ErroCorrecao("A IA retornou um formato inesperado. Tente novamente.", 502);
  }

  // ── 4. Terceiro corretor SÓ quando há discrepância ──
  if (runs.length >= 2 && motivosDeDiscrepancia(runs[0].vector, runs[1].vector, banca).length > 0) {
    const terceira = parse((await Promise.allSettled([corrigir(2)]))[0]);
    if (terceira) runs.push(terceira);
  }

  // ── 5. Anulação por julgamento — exige maioria ──
  // Um corretor sozinho não anula a redação de ninguém.
  const anulacoes = runs.map(r => r.anulacao).filter(Boolean) as string[];
  if (anulacoes.length > runs.length / 2) {
    const motivo = anulacoes[0];
    const comFeedback = runs.find(r => r.anulacao)!;
    return {
      ...respostaAnulacao(motivo, comFeedback.general_feedback, analise, banca),
      suggestions: comFeedback.suggestions,
      _banca: { id: banca.id, anulada: true, motivo, votos: `${anulacoes.length}/${runs.length}` },
    };
  }

  // ── 6. Combinação pela regra oficial ──
  // `protocolo` é o RESULTADO da combinação; `banca` é a configuração. Nomes
  // distintos de propósito: os dois já se chamaram "banca" e um sombreava o
  // outro dentro desta função.
  const correcoes: Correcao[] = runs.map(r => ({ vetor: r.vector }));
  const protocolo: ResultadoBanca = aplicarProtocoloInep(correcoes, banca);

  // Os textos vêm da correção mais próxima do resultado final, para que
  // feedback e nota não se contradigam.
  const representativo = runs.reduce((best, r) => {
    const dist = (v: number[]) => v.reduce((acc, s, i) => acc + Math.abs(s - protocolo.vetor[i]), 0);
    return dist(r.vector) < dist(best.vector) ? r : best;
  }, runs[0]);

  const competencies: Record<string, { score: number; feedback: string }> = {};
  banca.criterios.forEach(({ key }, idx) => {
    competencies[key] = {
      score: protocolo.vetor[idx],
      feedback: representativo.competencies[key]?.feedback || "",
    };
  });

  return {
    anulacao: null,
    banca: banca.id,
    competencies,
    total_score: total(protocolo.vetor, banca),
    detailed_corrections: localizarTrechos(text, representativo.detailed_corrections),
    suggestions: representativo.suggestions,
    general_feedback: representativo.general_feedback,
    // Espelho de correção: como a nota foi formada.
    _banca: {
      id: banca.id,
      corretores: runs.map(r => ({ vetor: r.vector, total: total(r.vector, banca) })),
      houveDiscrepancia: protocolo.houveDiscrepancia,
      motivos: protocolo.motivos,
      precisouBanca: protocolo.precisouBanca,
      usadas: protocolo.usadas,
      revisaoRecomendada: protocolo.precisouBanca || protocolo.houveDiscrepancia,
    },
    _analise: analise,
  };
}
