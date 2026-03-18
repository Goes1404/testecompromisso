
import { NextRequest, NextResponse } from 'next/request';
import { conceptExplanationAssistantFlow } from '@/ai/flows/concept-explanation-assistant';
import { financialAidDeterminationFlow } from '@/ai/flows/financial-aid-determination';
import { quizGeneratorFlow } from '@/ai/flows/quiz-generator';
import { bulkQuestionParserFlow } from '@/ai/flows/bulk-question-parser';
import { essayTopicGeneratorFlow } from '@/ai/flows/essay-topic-generator';
import { essayEvaluatorFlow } from '@/ai/flows/essay-evaluator';
import { trailStructureGeneratorFlow } from '@/ai/flows/trail-structure-generator';
import { audioSimpleFlow } from '@/ai/flows/audio-simple-flow';
import { createClient } from '@/utils/supabase/server';

/**
 * 🚀 GATEWAY DE INTELIGÊNCIA AURORA - COMPROMISSO 360
 * Versão 11.0: Diagnóstico detalhado de permissão para ambiente de teste.
 */

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Verificação de autenticação industrial para Next.js 15
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("[AURORA AUTH]: Acesso negado. Sessão não identificada.");
      return new Response(JSON.stringify({ 
        success: false,
        error: "🔒 Acesso negado. A Engine Aurora não identificou seu login. Por favor, saia e entre novamente no portal."
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

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
      return new Response(JSON.stringify({ error: `❌ Motor '${flowId}' não localizado.` }), { status: 404 });
    }

    // Execução do fluxo Genkit (Gemini 2.0 Flash)
    const result = await targetFlow(input);

    return new Response(JSON.stringify({ 
      success: true, 
      result: result 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(`[AURORA CRITICAL ERROR]:`, error);

    return new Response(JSON.stringify({ 
      success: false,
      error: `⚠️ [FALHA NA ENGINE]: ${error.message || 'Houve uma oscilação no motor de IA. Verifique sua chave API.'}`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
