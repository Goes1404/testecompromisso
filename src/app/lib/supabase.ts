import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 🔒 CONFIGURAÇÃO INDUSTRIAL SUPABASE - COMPROMISSO 360
 * Versão Ultra-Resiliente: Cliente único com motor de re-tentativa para Web Locks.
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
    storageKey: 'educore-360-auth-v1',
    flowType: 'pkce',
    lockType: 'auto'
  }
});

/**
 * Motor de Execução Seguro com Re-tentativa (Retry Logic)
 * Protege contra o erro "Lock broken by another request" comum no Next.js 15.
 */
export async function safeExecute<T = any>(fn: () => Promise<any>): Promise<{ data: T | null; error: any }> {
  let retries = 3;
  let delay = 500;

  while (retries > 0) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      const isLockError = error?.message?.includes('Lock broken') || 
                         error?.name === 'AbortError' || 
                         error?.message?.includes('steal');
      
      if (isLockError && retries > 1) {
        console.warn(`[SUPABASE LOCK] Conflito detectado. Re-tentando em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        delay *= 2;
        continue;
      }
      return { data: null, error };
    }
  }
  return { data: null, error: 'Max retries reached' };
}
