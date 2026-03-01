import { NextRequest, NextResponse } from 'next/server';
import { conceptExplanationAssistantFlow } from '@/ai/flows/concept-explanation-assistant';
import { financialAidDeterminationFlow } from '@/ai/flows/financial-aid-determination';
import { quizGeneratorFlow } from '@/ai/flows/quiz-generator';
import { bulkQuestionParserFlow } from '@/ai/flows/bulk-question-parser';
import { essayTopicGeneratorFlow } from '@/ai/flows/essay-topic-generator';
import { essayEvaluatorFlow } from '@/ai/flows/essay-evaluator';

/**
 * @fileOverview Gateway de API para os fluxos da Aurora IA.
 * Centraliza as chamadas para garantir que todos os fluxos usem a mesma infraestrutura.
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

    console.log(`[AURORA API] Acionando motor: ${flowId}`);

    // MAPA DE FLUXOS: Garanta que os IDs aqui correspondam aos enviados pelo Frontend
    const flows: Record<string, any> = {
      conceptExplanationAssistant: conceptExplanationAssistantFlow,
      financialAidDetermination: financialAidDeterminationFlow,
      quizGenerator: quizGeneratorFlow,
      bulkQuestionParser: bulkQuestionParserFlow,
      essayTopicGenerator: essayTopicGeneratorFlow,
      essayEvaluator: essayEvaluatorFlow,
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
