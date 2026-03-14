import { NextRequest, NextResponse } from 'next/server';
import { conceptExplanationAssistantFlow } from '@/ai/flows/concept-explanation-assistant';
import { financialAidDeterminationFlow } from '@/ai/flows/financial-aid-determination';
import { quizGeneratorFlow } from '@/ai/flows/quiz-generator';
import { bulkQuestionParserFlow } from '@/ai/flows/bulk-question-parser';
import { essayTopicGeneratorFlow } from '@/ai/flows/essay-topic-generator';
import { essayEvaluatorFlow } from '@/ai/flows/essay-evaluator';
import { trailStructureGeneratorFlow } from '@/ai/flows/trail-structure-generator';

/**
 * @fileOverview Gateway de API Blindado para a Aurora IA.
 */

export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Corpo da requisição vazio.' }, { status: 400 });
    }

    const body = JSON.parse(text);
    const { flowId, input } = body;

    if (!flowId) {
      return NextResponse.json({ error: 'Identificador do motor (flowId) é obrigatório.' }, { status: 400 });
    }

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
      return NextResponse.json(
        { error: `O motor '${flowId}' não está mapeado no servidor.` },
        { status: 404 }
      );
    }

    console.log(`[AURORA EXEC]: Executando fluxo ${flowId}...`);
    const result = await targetFlow(input);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    const errorMsg = error?.message || 'Erro desconhecido no servidor de IA.';
    console.error(`[AURORA CRITICAL ERROR]:`, error); // Log completo para depuração no servidor

    return NextResponse.json(
      { error: `⚠️ ERRO DE PROCESSAMENTO: ${errorMsg}` },
      { status: 500 }
    );
  }
}
