import { NextResponse } from 'next/server';
import { gradeEssayFlow } from '@/lib/ai/essay-grading-flow';

/**
 * @fileOverview Rota de API para correção de redação (Endpoint Legado).
 * Encaminha a requisição para o fluxo unificado da Aurora IA.
 */

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const textData = await request.text();
    if (!textData || textData.trim() === '') {
      return NextResponse.json(
        { error: 'Corpo da requisição vazio.' },
        { status: 400 }
      );
    }

    const body = JSON.parse(textData);
    const { theme, text } = body;

    if (!theme || !text) {
      return NextResponse.json(
        { error: 'O tema e o texto da redação são obrigatórios.' },
        { status: 400 }
      );
    }

    // Executa o fluxo de IA unificado
    const result = await gradeEssayFlow(theme, text);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API REDAÇÃO ERROR]:', error);
    return NextResponse.json(
      { error: `Erro na Engine Aurora: ${error.message || 'Falha de comunicação industrial'}` },
      { status: 500 }
    );
  }
}
