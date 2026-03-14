import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { ai } from '@/ai/genkit';

/**
 * @fileOverview API de Diagnóstico Maestro.
 * Verifica a saúde da infraestrutura sem expor chaves.
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
    diagnostics.supabase = { status: 'error', details: 'Configuração do Supabase ausente.' };
  } else {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      diagnostics.supabase = { status: 'ok', details: 'Conexão ativa com Supabase.' };
    } catch (e: any) {
      diagnostics.supabase = { status: 'error', details: e.message || 'Erro ao consultar banco de dados.' };
    }
  }

  // 2. Testar Genkit (Gemini 1.5 Flash)
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: 'ok',
      config: { maxOutputTokens: 2 }
    });
    
    if (response.text) {
      diagnostics.genkit = { status: 'ok', details: 'Aurora IA operacional.' };
    } else {
      throw new Error("Resposta vazia da IA.");
    }
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('404')) {
      diagnostics.genkit = { status: 'error', details: 'Erro 404: Modelo não localizado na API do Google.' };
    } else {
      diagnostics.genkit = { status: 'error', details: `Falha técnica: ${msg.substring(0, 100)}` };
    }
  }

  const allOk = diagnostics.supabase.status === 'ok' && diagnostics.genkit.status === 'ok';

  return NextResponse.json(diagnostics, { status: allOk ? 200 : 207 });
}