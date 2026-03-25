import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 🔒 CONFIGURAÇÃO INDUSTRIAL SUPABASE - COMPROMISSO 360
 * Versão Estabilizada: Cliente único singleton para evitar erros de Web Locks.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

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
    flowType: 'pkce'
  }
});

/**
 * Utilitário para execução de consultas.
 * Simplificado para evitar delays excessivos no login.
 */
export async function safeExecute<T = any>(fn: () => Promise<any>): Promise<{ data: T | null; error: any }> {
  try {
    const result = await fn();
    return result;
  } catch (error: any) {
    console.error('[SUPABASE ERROR]', error);
    return { data: null, error };
  }
}
