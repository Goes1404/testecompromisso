import { conceptExplanationAssistantFlow } from '@/ai/flows/concept-explanation-assistant';
import { financialAidDeterminationFlow } from '@/ai/flows/financial-aid-determination';
import { quizGeneratorFlow } from '@/ai/flows/quiz-generator';
import { bulkQuestionParserFlow } from '@/ai/flows/bulk-question-parser';
import { essayTopicGeneratorFlow } from '@/ai/flows/essay-topic-generator';
import { essayEvaluatorFlow } from '@/ai/flows/essay-evaluator';
import { trailStructureGeneratorFlow } from '@/ai/flows/trail-structure-generator';
import { audioSimpleFlow } from '@/ai/flows/audio-simple-flow';

/**
 * 🚀 GATEWAY DE INTELIGÊNCIA AURORA - COMPROMISSO 360
 * Versão Netlify-Ready: Timeout estendido e autenticação flexível para testes.
 */

export const maxDuration = 120; // Aumentado para lidar com gerações complexas em serverless
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { flowId, input } = body;

    const flows: Record<string, any> = {
      conceptExplanationAssistant: conceptExplanationAssistantFlow,
      financialAidDetermination: financialAidDeterminationFlow,
      quizGenerator: quizGeneratorFlow,
      bulkQuestionParser: bulkQuestionParserFlow,
      essayTopicGenerator: essayTopicGeneratorFlow,
      essayEvaluator: essayEvaluatorFlow,
      trailStructureGenerator: trailStructureGeneratorFlow,
      audioSimple: audioSimpleFlow,
    };

    const targetFlow = flows[flowId];

    if (!targetFlow) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `❌ Motor '${flowId}' não localizado no servidor.` 
      }), { status: 404 });
    }

    // Execução do fluxo Genkit (Gemini 2.0 Flash)
    const result = await targetFlow(input);

    return new Response(JSON.stringify({ 
      success: true, 
      result: result 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error(`[AURORA GATEWAY ERROR]:`, error);

    return new Response(JSON.stringify({ 
      success: false,
      error: `⚠️ [FALHA NA ENGINE]: ${error.message || 'Erro de comunicação com o motor Gemini.'}`
    }), { 
      status: 200, // Retornamos 200 para que o frontend possa exibir o erro no balão de chat
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
