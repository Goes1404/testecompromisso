import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 🔒 CONFIGURAÇÃO INDUSTRIAL SUPABASE - COMPROMISSO 360
 * Versão Estabilizada com Resiliência contra "Lock Broken"
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder')
)

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'educore-360-v1', 
  }
});

/**
 * 🛡️ safeExecute: Utilitário para tratar AbortError (Lock Broken) no Next.js 15 / Netlify.
 * Realiza re-tentativas automáticas se uma requisição for abortada por conflito de abas.
 */
export async function safeExecute<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isAbortError = error?.name === 'AbortError' || error?.message?.includes('steal');
    if (isAbortError && retries > 0) {
      // Espera curta antes da re-tentativa (Exponential Backoff)
      await new Promise(resolve => setTimeout(resolve, 300 * (4 - retries)));
      return safeExecute(fn, retries - 1);
    }
    throw error;
  }
}
