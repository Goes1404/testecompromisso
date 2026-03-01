import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { ai } from '@/ai/genkit';

/**
 * @fileOverview API de Diagnóstico do Compromisso.
 * Verifica a saúde do Supabase e do Genkit.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    supabase: { status: 'unknown', details: '' },
    genkit: { status: 'unknown', details: '' },
  };

  // 1. Testar Supabase
  if (!isSupabaseConfigured) {
    diagnostics.supabase = { status: 'error', details: 'Variáveis de ambiente não configuradas ou incompletas.' };
  } else {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      diagnostics.supabase = { status: 'ok', details: 'Conexão ativa e permissão de leitura ok.' };
    } catch (e: any) {
      diagnostics.supabase = { status: 'error', details: e.message || 'Erro ao consultar tabela profiles.' };
    }
  }

  // 2. Testar Genkit (Migrado para Gemini 2.5 Flash devido ao limite de taxa do Gemini 3)
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: 'Responda apenas "ok"',
      config: { maxOutputTokens: 5 }
    });
    if (response.text) {
      diagnostics.genkit = { status: 'ok', details: 'Google AI Plugin operacional com Gemini 2.5 Flash.' };
    } else {
      throw new Error("Sem resposta do modelo.");
    }
  } catch (e: any) {
    diagnostics.genkit = { status: 'error', details: e.message || 'Verifique se a GEMINI_API_KEY está correta ou se o limite de taxa foi atingido.' };
  }

  const allOk = diagnostics.supabase.status === 'ok' && diagnostics.genkit.status === 'ok';

  return NextResponse.json(diagnostics, { status: allOk ? 200 : 207 });
}
