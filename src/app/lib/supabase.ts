import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 🔒 CONFIGURAÇÃO INDUSTRIAL SUPABASE - COMPROMISSO 360
 * Versão Estabilizada - Cliente Único com tratamento de Web Locks.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder')
)

// Configuração otimizada para evitar AbortError: Lock broken
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'educore-360-auth-v1',
    flowType: 'pkce'
  }
});

/**
 * Utilitário para executar comandos do Supabase com re-tentativa automática
 * Protege contra o erro "Lock broken by another request with the 'steal' option"
 */
export async function safeExecute<T = any>(fn: () => Promise<T>): Promise<T> {
  let retries = 3;
  let delay = 200;

  while (retries > 0) {
    try {
      return await fn();
    } catch (error: any) {
      const isLockError = error?.message?.includes('Lock broken') || error?.name === 'AbortError';
      
      if (isLockError && retries > 1) {
        console.warn(`[SUPABASE LOCK] Re-tentando em ${delay}ms... (${retries} tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  return await fn(); // Última tentativa sem captura
}
