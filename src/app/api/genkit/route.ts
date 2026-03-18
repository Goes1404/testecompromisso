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
 * Versão 8.0: Diagnóstico em Tempo Real para Ambiente de Teste.
 */

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Permite usuários de teste ou autenticados
    const isTestUser = user?.id?.includes('00000000');
    
    if (!user && !isTestUser) {
      return NextResponse.json({ error: "🔒 Acesso negado à Engine Aurora. Autentique-se." }, { status: 401 });
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
    // Reporta o erro real para o chat em ambiente de teste
    console.error(`[AURORA ERROR]:`, error);

    return NextResponse.json(
      { 
        success: false,
        error: `⚠️ [ERRO AURORA]: ${error.message || 'Falha interna no motor de IA.'}`, 
        details: error?.stack || 'Sem rastreamento disponível.'
      }, 
      { status: 200 }
    );
  }
}
