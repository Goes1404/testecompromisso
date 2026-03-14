import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 🔒 CONFIGURAÇÃO INDUSTRIAL SUPABASE - COMPROMISSO 360
 * Versão Estável (Rollback 736a0dc)
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
 * Utilitário de execução segura (Simplificado para estabilidade)
 */
export async function safeExecute<T = any>(fn: () => Promise<T>): Promise<T> {
  return await fn();
}
