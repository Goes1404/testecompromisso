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
 * Versão 10.0: Proteção contra erros de autenticação em ambiente serverless.
 */

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Verificação de autenticação industrial para Next.js 15
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.warn("[AURORA AUTH]: Acesso negado ou sessão inválida.");
      return new Response(JSON.stringify({ 
        success: false,
        error: "🔒 Acesso negado à Engine Aurora. Por favor, realize o login novamente no portal."
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

    const result = await targetFlow(input);

    return new Response(JSON.stringify({ 
      success: true, 
      result: result 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(`[AURORA CRITICAL ERROR]:`, error);

    return new Response(JSON.stringify({ 
      success: false,
      error: `⚠️ [FALHA NA ENGINE]: ${error.message || 'Erro interno no motor de IA.'}`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
