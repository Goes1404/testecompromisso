
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
 * 🚀 GATEWAY DE INTELIGÊNCIA AURORA - COMPROMISSO 360
 * Versão 5.0: Resiliência Máxima e Depuração Verbosa.
 */

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flowId, input } = body;

    // Log de Entrada para Depuração no Console do Servidor
    console.log(`[AURORA REQ]: ${flowId}`, JSON.stringify(input).substring(0, 100));

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
      return NextResponse.json({ error: `Motor '${flowId}' não localizado.` }, { status: 404 });
    }

    // Execução do Fluxo Genkit
    const result = await targetFlow(input);

    // Log de Saída
    console.log(`[AURORA RES]: Sucesso para ${flowId}`);

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
      { status: 200 } // Retornamos 200 para capturar o erro no frontend sem travar o Next.js
    );
  }
}
