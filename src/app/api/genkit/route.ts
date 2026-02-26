import { NextRequest, NextResponse } from 'next/server';
import { conceptExplanationAssistantFlow } from '@/ai/flows/concept-explanation-assistant';
import { financialAidDeterminationFlow } from '@/ai/flows/financial-aid-determination';
import { quizGeneratorFlow } from '@/ai/flows/quiz-generator';
import { bulkQuestionParserFlow } from '@/ai/flows/bulk-question-parser';

/**
 * @fileOverview Gateway de API para os fluxos da Aurora IA.
 * Mapeia as chamadas do front-end para os fluxos do Genkit.
 */

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Corpo vazio.' }, { status: 400 });
    }

    const { flowId, input } = JSON.parse(text);

    if (!flowId) {
      return NextResponse.json({ error: 'flowId é obrigatório.' }, { status: 400 });
    }

    console.log(`[AURORA API] Iniciando flow: ${flowId}`);

    // Mapeamento explícito de fluxos registrados
    const flows: Record<string, any> = {
      conceptExplanationAssistant: conceptExplanationAssistantFlow,
      financialAidDetermination: financialAidDeterminationFlow,
      quizGenerator: quizGeneratorFlow,
      bulkQuestionParser: bulkQuestionParserFlow,
    };

    const targetFlow = flows[flowId];

    if (!targetFlow) {
      console.error(`[AURORA API] Flow não encontrado: ${flowId}`);
      return NextResponse.json({ error: `Flow '${flowId}' não cadastrado.` }, { status: 404 });
    }

    const result = await targetFlow(input);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error(`[AURORA API] Erro fatal:`, error);
    return NextResponse.json(
      { error: `Falha na Aurora: ${error.message || 'Erro interno'}` },
      { status: 500 }
    );
  }
}
