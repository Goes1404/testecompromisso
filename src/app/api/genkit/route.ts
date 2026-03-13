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
 * Este endpoint é o único ponto de entrada para a IA, garantindo que as chaves 
 * permaneçam protegidas no ambiente seguro do servidor.
 */

export const maxDuration = 60; 

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

    // Executa o fluxo no ambiente seguro do servidor
    const result = await targetFlow(input);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    const errorMsg = error?.message || '';
    
    console.error(`[AURORA ERROR LOG]:`, errorMsg);

    // Identificação de problemas de chave vazada, inválida ou de cota
    if (errorMsg.includes('API key expired') || errorMsg.includes('400 Bad Request') || errorMsg.includes('API_KEY_INVALID')) {
      return NextResponse.json(
        { error: '⚠️ Conexão interrompida com a Aurora. Se você estiver em um repositório público, a chave pode ter sido revogada automaticamente pelo Google.' },
        { status: 401 }
      );
    }

    if (errorMsg.includes('quota') || errorMsg.includes('429')) {
      return NextResponse.json(
        { error: '⚠️ A Aurora atingiu o limite de testes gratuitos para este minuto. Aguarde um instante para continuar.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'A Aurora encontrou uma instabilidade técnica. Tente novamente em alguns instantes.' },
      { status: 500 }
    );
  }
}
