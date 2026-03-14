
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 🔒 CONFIGURAÇÃO INDUSTRIAL SUPABASE - COMPROMISSO 360
 * Versão 7.0: Otimizado para evitar conflitos de Web Locks em multi-abas.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder')
)

// Cliente Singleton com proteção de concorrência
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'compromisso-auth-lock', // Chave única para evitar conflitos com outros apps no mesmo domínio
  },
  global: {
    headers: { 'x-application-name': 'compromisso-360' }
  }
});

/**
 * 🛠️ safeExecute: Wrapper para chamadas Supabase que trata AbortError (Lock Broken).
 * Se o lock for roubado por outra aba/processo, ele tenta novamente.
 */
export async function safeExecute<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isLockError = error?.message?.includes('Lock broken') || error?.name === 'AbortError';
    if (isLockError && retries > 0) {
      console.warn(`[SUPABASE LOCK]: Lock quebrado. Tentando novamente em ${delay}ms... (${retries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return safeExecute(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
