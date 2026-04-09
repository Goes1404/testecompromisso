import { NextResponse } from "next/server";
import { OpenAI } from "openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { theme, text } = await req.json();

    if (!text || text.length < 100) {
      return NextResponse.json({ success: false, error: "Texto muito curto para avaliação." }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é uma IA especialista em correção de redações no modelo ENEM. Avalie a redação do aluno com base nas 5 competências do ENEM (C1 a C5).

REGRAS CRÍTICAS PARA AVALIAÇÃO:

1. COMPETÊNCIA 1 (Domínio da Norma Culta):
   - Seja categórico: Se a nota for 200, afirme que a redação tem excelente domínio e NÃO aponte "pequenos deslizes" ou "erros leves" no feedback da C1, a menos que você consiga citar exatamente qual foi o erro no campo 'detailed_corrections'.
   - Se houver desvios gramaticais evidentes, a nota deve ser 160 ou menos.

2. COMPETÊNCIA 5 (Proposta de Intervenção):
   - Aceite como "Detalhamento" qualquer especificação, exemplificação ou justificativa válida para um dos outros 4 elementos (Agente, Ação, Meio/Modo ou Efeito).
   - NÃO exija obrigatoriamente etapas de implementação cronológicas ou listas de processos para validar o detalhamento. Se o aluno detalhou o Meio/Modo (ex: explicando o conteúdo de um curso), isso conta como detalhamento oficial.

Sua resposta deve ser estritamente em JSON no seguinte formato:
{
  "total_score": 1000,
  "general_feedback": "Texto inspirador sobre o tema...",
  "competencies": {
    "c1": { "score": 200, "feedback": "Excelente domínio da modalidade escrita formal, sem desvios gramaticais." },
    "c2": { "score": 200, "feedback": "Estrutura argumentativa sólida..." },
    "c3": { "score": 200, "feedback": "Argumentação bem desenvolvida..." },
    "c4": { "score": 200, "feedback": "Coesão textual fluida..." },
    "c5": { "score": 200, "feedback": "Proposta de intervenção completa com os 5 elementos (agente, ação, meio/modo, efeito e detalhamento)." }
  },
  "detailed_corrections": [
    { "original": "fazem dois anos", "suggestion": "faz dois anos", "reason": "Erro de concordância verbal com o verbo fazer indicando tempo decorrido." }
  ],
  "suggestions": [
     "Use mais conectivos entre os parágrafos.",
     "Aprofunde a tese no primeiro parágrafo."
  ]
}`
        },
        {
          role: "user",
          content: `Tema: ${theme}\n\nTexto da Redação:\n${text}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message?.content || "{}");

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Erro na avaliação da redação:", error);
    return NextResponse.json({ success: false, error: "Falha na comunicação com a API de IA." }, { status: 500 });
  }
}
