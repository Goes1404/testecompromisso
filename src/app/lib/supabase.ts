import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 🔒 CONFIGURAÇÃO INDUSTRIAL SUPABASE - COMPROMISSO 360
 * Versão 7.5: Otimizada para evitar erros de Web Locks no Next.js 15.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder')
)

// Cliente Singleton com proteção de concorrência e chave de armazenamento única
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'educore-360-v1', 
  },
  global: {
    headers: { 'x-application-name': 'compromisso-360' }
  }
});

/**
 * 🛠️ safeExecute: Wrapper para chamadas Supabase que trata AbortError (Lock Broken).
 */
export async function safeExecute<T = any>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    const result = await fn();
    return result;
  } catch (error: any) {
    const isLockError = error?.message?.includes('Lock broken') || error?.name === 'AbortError';
    if (isLockError && retries > 0) {
      console.warn(`[SUPABASE LOCK]: Tentando recuperar sinal... (${retries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return safeExecute(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}