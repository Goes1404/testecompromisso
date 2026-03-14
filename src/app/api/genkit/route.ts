
import { NextRequest, NextResponse } from 'next/server';
import { conceptExplanationAssistantFlow } from '@/ai/flows/concept-explanation-assistant';
import { financialAidDeterminationFlow } from '@/ai/flows/financial-aid-determination';
import { quizGeneratorFlow } from '@/ai/flows/quiz-generator';
import { bulkQuestionParserFlow } from '@/ai/flows/bulk-question-parser';
import { essayTopicGeneratorFlow } from '@/ai/flows/essay-topic-generator';
import { essayEvaluatorFlow } from '@/ai/flows/essay-evaluator';
import { trailStructureGeneratorFlow } from '@/ai/flows/trail-structure-generator';
import { createClient } from '@/utils/supabase/server';

/**
 * @fileOverview Gateway de API Aurora IA.
 * Corrigido para Next.js 15 (Aguardando inicialização assíncrona do Supabase).
 */

export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    // 1. Inicializar Supabase com suporte a cookies assíncronos (Next 15)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Lógica de Bypass para sessões de teste industriais do Firebase Studio
    const isMockUser = user?.id?.startsWith('00000000-');
    
    if (!user && !isMockUser) {
      return NextResponse.json({ error: 'Unauthorized - Faça login para usar a IA.' }, { status: 401 });
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
    };

    const targetFlow = flows[flowId];

    if (!targetFlow) {
      return NextResponse.json({ error: `Flow ${flowId} not found` }, { status: 404 });
    }

    console.log(`[AURORA IA]: Executando ${flowId} para ${user?.email || 'MOCK_USER'}...`);
    const result = await targetFlow(input);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    const errorMsg = error?.message || 'Erro desconhecido na Engine de IA';
    console.error(`[AURORA CRITICAL]:`, errorMsg);

    return NextResponse.json(
      { 
        error: '⚠️ Erro de Processamento', 
        details: errorMsg
      }, 
      { status: 500 }
    );
  }
}
