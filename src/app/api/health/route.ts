import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { ai, AURORA_MODEL } from '../../ai/genkit';

/**
 * 🏥 DIAGNÓSTICO DE INFRAESTRUTURA - COMPROMISSO 360
 * Verifica a saúde do Supabase e da Engine Aurora no ambiente de deploy.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    supabase: { status: 'unknown', details: '' },
    genkit: { status: 'unknown', details: '', model: AURORA_MODEL },
  };

  // 1. Testar Conexão Supabase
  if (!isSupabaseConfigured) {
    diagnostics.supabase = { status: 'error', details: 'NEXT_PUBLIC_SUPABASE_URL ou ANON_KEY ausentes no ambiente.' };
  } else {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      diagnostics.supabase = { status: 'ok', details: 'Banco de dados conectado.' };
    } catch (e: any) {
      diagnostics.supabase = { status: 'error', details: e.message || 'Falha ao consultar tabela de perfis.' };
    }
  }

  // 2. Testar Motor de IA (Gemini)
  try {
    const response = await ai.generate({
      model: AURORA_MODEL,
      prompt: 'ping',
      config: { maxOutputTokens: 2 }
    });
    
    if (response.text) {
      diagnostics.genkit = { status: 'ok', details: 'Sinal operacional.', model: AURORA_MODEL };
    } else {
      throw new Error("Resposta nula recebida da Engine.");
    }
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('leaked') || msg.includes('403')) {
      diagnostics.genkit = { status: 'error', details: 'CHAVE VAZADA: Gere uma nova chave no AI Studio.', model: AURORA_MODEL };
    } else {
      diagnostics.genkit = { status: 'error', details: `Falha de sinal: ${msg}`, model: AURORA_MODEL };
    }
  }

  const allOk = diagnostics.supabase.status === 'ok' && diagnostics.genkit.status === 'ok';

  return NextResponse.json(diagnostics, { status: allOk ? 200 : 207 });
}
