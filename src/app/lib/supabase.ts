
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * CONFIGURAÇÃO REAL SUPABASE
 * Certifique-se de que NEXT_PUBLIC_SUPABASE_ANON_KEY contém a chave 'anon public'.
 * O uso da chave 'service_role' aqui causará erro 403 por segurança.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  (supabaseAnonKey && !supabaseAnonKey.includes('placeholder'))
)

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
