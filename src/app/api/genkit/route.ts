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
 * Versão 7.0: Suporte a TTS e Resiliência de Filtros.
 */

export const maxDuration = 120; // Aumentado para 2 min devido ao processamento de áudio
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isTestUser = user?.id?.includes('00000000');
    
    if (!user && !isTestUser) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { flowId, input } = body;

    console.log(`[AURORA REQ]: ${flowId}`);

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
      return NextResponse.json({ error: `Motor '${flowId}' não localizado.` }, { status: 404 });
    }

    const result = await targetFlow(input);

    return NextResponse.json({ 
      success: true, 
      result: result 
    });

  } catch (error: any) {
    console.error(`[AURORA CRITICAL ERROR]:`, error?.message || error);

    return NextResponse.json(
      { 
        success: false,
        error: '⚠️ Falha na Sintonia Aurora', 
        details: error?.message || 'Erro interno no motor.'
      }, 
      { status: 200 }
    );
  }
}
