import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { ai } from '@/ai/genkit';

/**
 * @fileOverview API de Diagnóstico Blindada.
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
    diagnostics.supabase = { status: 'error', details: 'Configuração NEXT_PUBLIC_SUPABASE_URL ou ANON_KEY ausente.' };
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    diagnostics.genkit = { status: 'error', details: 'Chave de API não configurada no ambiente.' };
  } else {
    try {
      // Teste minimalista com o identificador padrão estável
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
      if (msg.includes('API key expired') || msg.includes('API_KEY_INVALID')) {
        diagnostics.genkit = { status: 'error', details: 'Chave INVÁLIDA ou EXPIROU. Gere uma nova no Google AI Studio.' };
      } else if (msg.includes('not found') || msg.includes('404')) {
        diagnostics.genkit = { status: 'error', details: 'Modelo não localizado. Se a chave for do GCP, verifique se a "Generative Language API" está ATIVADA.' };
      } else {
        diagnostics.genkit = { status: 'error', details: `Falha no motor: ${msg.substring(0, 100)}` };
      }
    }
  }

  const allOk = diagnostics.supabase.status === 'ok' && diagnostics.genkit.status === 'ok';

  return NextResponse.json(diagnostics, { status: allOk ? 200 : 207 });
}
