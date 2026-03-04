import { NextRequest, NextResponse } from 'next/server';
import { conceptExplanationAssistantFlow } from '@/ai/flows/concept-explanation-assistant';
import { financialAidDeterminationFlow } from '@/ai/flows/financial-aid-determination';
import { quizGeneratorFlow } from '@/ai/flows/quiz-generator';
import { bulkQuestionParserFlow } from '@/ai/flows/bulk-question-parser';
import { essayTopicGeneratorFlow } from '@/ai/flows/essay-topic-generator';
import { essayEvaluatorFlow } from '@/ai/flows/essay-evaluator';
import { trailStructureGeneratorFlow } from '@/ai/flows/trail-structure-generator';

/**
 * @fileOverview Gateway de API para os fluxos da Aurora IA.
 * Utiliza o modelo gemini-1.5-flash para estabilidade industrial e compatibilidade global.
 */

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Corpo da requisição vazio.' }, { status: 400 });
    }

    const { flowId, input } = JSON.parse(text);

    if (!flowId) {
      return NextResponse.json({ error: 'Identificador do motor (flowId) é obrigatório.' }, { status: 400 });
    }

    console.log(`[AURORA API] Acionando motor: ${flowId} com Gemini 1.5 Flash`);

    // MAPA DE FLUXOS
    const flows: Record<string, any> = {
      conceptExplanationAssistant: conceptExplanationAssistantFlow,
      financialAidDetermination: financialAidDeterminationFlow,
      quizGenerator: quizGeneratorFlow,
      bulkQuestionParser: bulkQuestionParserFlow,
      essayTopicGenerator: essayTopicGeneratorFlow,
      essayEvaluator: essayEvaluatorFlow,
      trailStructureGenerator: trailStructureGeneratorFlow,
    };

    const targetFlow = flows[flowId];

    if (!targetFlow) {
      console.error(`[AURORA API] Erro: Motor '${flowId}' não localizado no registro.`);
      return NextResponse.json(
        { error: `O motor '${flowId}' não está mapeado no servidor.` },
        { status: 404 }
      );
    }

    const result = await targetFlow(input);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error(`[AURORA API] Erro Crítico durante a execução:`, error);
    return NextResponse.json(
      { error: error.message || 'A Aurora encontrou uma instabilidade na rede neural ao processar sua solicitação.' },
      { status: 500 }
    );
  }
}
