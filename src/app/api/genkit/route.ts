import { NextRequest, NextResponse } from 'next/server';
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
 * Versão 9.0: Diagnóstico de Autenticação e Suporte Gemini 2.0.
 */

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verificação de segurança industrial
    if (!user) {
      // Log interno para diagnóstico do desenvolvedor
      console.warn("[AURORA AUTH]: Tentativa de acesso sem sessão ativa.");
      return NextResponse.json({ 
        success: false,
        error: "🔒 Acesso negado à Engine Aurora. Sua sessão expirou ou não foi detectada. Por favor, faça login novamente.",
        debug: "Auth session returned null in API Route"
      }, { status: 401 });
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
      return NextResponse.json({ error: `❌ Motor '${flowId}' não localizado no inventário Aurora.` }, { status: 404 });
    }

    const result = await targetFlow(input);

    return NextResponse.json({ 
      success: true, 
      result: result 
    });

  } catch (error: any) {
    console.error(`[AURORA CRITICAL ERROR]:`, error);

    return NextResponse.json(
      { 
        success: false,
        error: `⚠️ [FALHA NA ENGINE]: ${error.message || 'Erro interno no motor de IA.'}`, 
        details: error?.stack || 'Sem rastreamento disponível.'
      }, 
      { status: 200 } // Retornamos 200 para que o JSON chegue ao chat e exiba o balão de erro
    );
  }
}
