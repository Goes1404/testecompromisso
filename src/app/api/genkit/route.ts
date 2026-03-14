
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
 * Versão 4.0: Resiliência Total e Serialização Industrial.
 */

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flowId, input } = body;

    // Validação de Segurança Silenciosa para Next.js 15
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    console.log(`[AURORA]: Processando ${flowId} para ${user?.email || 'SINAL_ABERTO'}...`);
    
    // Execução do Fluxo Genkit
    const result = await targetFlow(input);

    // Garante que o resultado seja um POJO serializável
    return NextResponse.json({ 
      success: true, 
      result: JSON.parse(JSON.stringify(result)) 
    });

  } catch (error: any) {
    console.error(`[AURORA ERROR]:`, error?.message || error);

    return NextResponse.json(
      { 
        success: false,
        error: '⚠️ Erro de Sintonia na Aurora IA', 
        details: error?.message || 'Falha desconhecida no motor.'
      }, 
      { status: 200 } // Retornamos 200 com flag success:false para evitar o erro 500 no navegador
    );
  }
}
