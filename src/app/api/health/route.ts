import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { ai } from '@/ai/genkit';

/**
 * @fileOverview API de Diagnóstico do Compromisso.
 * Verifica a saúde do Supabase e do Genkit utilizando modelos estáveis.
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
    diagnostics.supabase = { status: 'error', details: 'Variáveis NEXT_PUBLIC_SUPABASE_URL ou ANON_KEY ausentes.' };
  } else {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      diagnostics.supabase = { status: 'ok', details: 'Conexão ativa com Supabase.' };
    } catch (e: any) {
      diagnostics.supabase = { status: 'error', details: e.message || 'Erro ao consultar banco de dados.' };
    }
  }

  // 2. Testar Genkit (GEMINI_API_KEY)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    diagnostics.genkit = { status: 'error', details: 'GEMINI_API_KEY não configurada no ambiente.' };
  } else {
    try {
      // Teste de geração utilizando a string direta do modelo para máxima compatibilidade
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: 'Responda apenas "ok"',
        config: { maxOutputTokens: 5 }
      });
      
      if (response.text) {
        diagnostics.genkit = { status: 'ok', details: 'Aurora IA (Gemini 1.5 Flash) operacional.' };
      } else {
        throw new Error("Sem resposta do modelo.");
      }
    } catch (e: any) {
      console.error("[HEALTH CHECK AI ERROR]:", e);
      diagnostics.genkit = { status: 'error', details: 'A chave fornecida é inválida ou o motor da Aurora encontrou um erro de inicialização.' };
    }
  }

  const allOk = diagnostics.supabase.status === 'ok' && diagnostics.genkit.status === 'ok';

  return NextResponse.json(diagnostics, { status: allOk ? 200 : 207 });
}
