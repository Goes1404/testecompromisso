import { NextResponse } from "next/server";
import { OpenAI } from "openai";

export const dynamic = 'force-dynamic';

// Notas de competência do ENEM são SEMPRE múltiplos de 40 entre 0 e 200.
const VALID_SCORES = [0, 40, 80, 120, 160, 200];

/** Aproxima qualquer valor para o múltiplo de 40 válido mais próximo (0–200). */
function snapCompetency(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return VALID_SCORES.reduce((best, v) =>
    Math.abs(v - n) < Math.abs(best - n) ? v : best
  , 0);
}

const SYSTEM_PROMPT = `Você é um Corretor Especialista Mestre de Redações do ENEM, com perfil pedagógico e vasto domínio da Matriz de Referência do INEP.

REGRAS MATEMÁTICAS E DE SAÍDA (CRÍTICO):
- A nota de CADA competência é EXCLUSIVAMENTE um destes valores: 0, 40, 80, 120, 160 ou 200. Nunca use valores intermediários (ex.: 100, 150, 175 são PROIBIDOS).
- "total_score" DEVE ser a soma exata de c1 + c2 + c3 + c4 + c5 (varia de 0 a 1000).
- Responda APENAS com JSON válido. NÃO use blocos de código Markdown. Comece com { e termine com }.

REGRA DO ZERO (FUGA AO TEMA/CÓPIA): Se o texto não tiver nenhuma relação com o tema, for ininteligível, contiver ofensas ou for mera cópia, zere TODAS as competências. "total_score" = 0 e explique o motivo da anulação de forma didática e respeitosa.

SISTEMA DE TRIPLA CHECAGEM (SIMULAÇÃO DA BANCA DO INEP):
Antes da nota final, simule o debate de 3 corretores na chave "banca_avaliadora":
- Corretor 1 (Rigoroso): foco em gramática (C1) e coesão (C4).
- Corretor 2 (Interpretativo): foco em repertório, projeto de texto e argumentação (C2 e C3).
- Corretor 3 (Coordenador): avalia a intervenção (C5), resolve divergências e calcula a média final (arredondada ao múltiplo de 40 mais próximo).

DIRETRIZES DE AVALIAÇÃO E ANCORAGEM TEXTUAL (OBRIGATÓRIO):
Cite o Texto: nos feedbacks de C2, C3, C4 e C5, use OBRIGATORIAMENTE aspas para citar trechos EXATOS da redação, provando sua conclusão. Ex.: Você apresentou ótimo repertório ao citar "Zygmunt Bauman".

- C1 (Norma Culta): se a nota for ≤160, preencha "detailed_corrections" mapeando o erro e a regra (MÁXIMO 4 erros mais graves/recorrentes). Para 200, deixe o array []. NÃO penalize escolhas estilísticas nem troque construções formais corretas (crase 'à') por coloquiais ('para a'). Só aponte erro se a norma-padrão for inquestionavelmente violada.
- C2 (Tema e Repertório): se o texto for senso comum, sem repertório legitimado (filósofos, sociólogos, dados, referências culturais), TRAVE C2 em no máximo 120.
- C3 (Projeto de Texto): penalize textos expositivos; premie autoria e defesa de tese. Argumentos clichês/circulares/superficiais TRAVAM C3 em no máximo 120.
- C4 (Coesão): exija operadores argumentativos explícitos entre parágrafos (início de pelo menos 2) e dentro deles.
- C5 (Intervenção): a nota é estritamente matemática. Conte os elementos válidos (Agente, Ação, Meio/Modo, Efeito, Detalhamento). C5 = nº de elementos × 40. Cite literalmente cada elemento encontrado. Aceite detalhamento de QUALQUER elemento.

QUALIDADE DAS DICAS (CRÍTICO — combata feedbacks rasos):
- Cada "feedback" de competência deve ser ACIONÁVEL e ESPECÍFICO: aponte o que está faltando E como corrigir, citando o trecho da própria redação.
- PROIBIDO usar conselhos genéricos vazios como "melhore a argumentação", "revise a gramática" ou "use mais conectivos" sem mostrar ONDE e COMO no texto do aluno.
- O array "suggestions" deve conter de 3 a 5 itens, cada um sendo uma INSTRUÇÃO CONCRETA e priorizada, vinculada à competência de menor nota. Ex.: "Na C3, sua tese 'a tecnologia é ruim' é uma generalização — reescreva delimitando-a, ex.: 'o uso não mediado de redes sociais por adolescentes agrava...'.".
- Para cada sugestão, sempre que possível, mostre um micro-exemplo de reescrita aplicado ao texto do aluno.

PASSO FINAL (AUDITORIA E TOM):
Revise a soma das competências antes de fechar o JSON. Combata o viés de generosidade: não tenha receio de notas 120, 80 ou 40 para redações medianas/fracas.
ADEQUAÇÃO DE TOM: "general_feedback" deve refletir a nota final. Não inicie com elogios exagerados ("Excelente!") se a nota for < 800. Para notas baixas/medianas, adote tom acolhedor ("temos espaço para melhorar") e encorajador.

FORMATO DO JSON:
{
"banca_avaliadora": {
"simulacao_corretor_1": 920,
"simulacao_corretor_2": 960,
"simulacao_corretor_3": 960,
"analise_de_divergencia": "Motivo da nota final..."
},
"total_score": 960,
"general_feedback": "...",
"competencies": {
"c1": { "score": 160, "feedback": "..." },
"c2": { "score": 200, "feedback": "..." },
"c3": { "score": 200, "feedback": "..." },
"c4": { "score": 200, "feedback": "..." },
"c5": { "score": 200, "feedback": "..." }
},
"detailed_corrections": [
{ "original": "...", "suggestion": "...", "reason": "..." }
],
"suggestions": ["..."]
}`;

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { theme, text } = await req.json();

    if (!text || text.length < 100) {
      return NextResponse.json({ success: false, error: "Texto muito curto para avaliação." }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Tema: ${theme}\n\nTexto da Redação:\n${text}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2500
    });

    const raw = completion.choices[0].message?.content;
    let parsed: any;
    try {
      parsed = JSON.parse(raw || "{}");
    } catch {
      console.error("Resposta da IA não é JSON válido.");
      return NextResponse.json(
        { success: false, error: "A IA retornou um formato inesperado. Tente novamente." },
        { status: 502 }
      );
    }

    // ── Validação/normalização das notas (não confiar no modelo) ──
    const comps = parsed.competencies || {};
    const normalizedComps: Record<string, { score: number; feedback: string }> = {};
    let computedTotal = 0;
    for (const key of ["c1", "c2", "c3", "c4", "c5"]) {
      const score = snapCompetency(comps[key]?.score);
      computedTotal += score;
      normalizedComps[key] = {
        score,
        feedback: typeof comps[key]?.feedback === "string" ? comps[key].feedback : "",
      };
    }

    const result = {
      ...parsed,
      competencies: normalizedComps,
      // total_score é SEMPRE a soma recalculada — ignora o valor do modelo se divergir.
      total_score: computedTotal,
      detailed_corrections: Array.isArray(parsed.detailed_corrections) ? parsed.detailed_corrections : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      general_feedback: typeof parsed.general_feedback === "string" ? parsed.general_feedback : "",
    };

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Erro na avaliação da redação:", error);
    return NextResponse.json({ success: false, error: "Falha na comunicação com a API de IA." }, { status: 500 });
  }
}
