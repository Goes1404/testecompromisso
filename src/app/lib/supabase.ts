
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Configuração Industrial do Cliente Supabase.
 * As variáveis devem ser configuradas no painel do Netlify/Vercel.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Verifica se as credenciais do Supabase estão configuradas.
 * Bloqueia URLs de placeholder para evitar erros silenciosos.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
)

/**
 * Instância única do cliente Supabase.
 */
export const supabase = createClient()

/**
 * Função helper para criar novos clientes.
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    // Retorna cliente dummy para evitar quebra total do app em build-time
    return createSupabaseClient('https://placeholder-project.supabase.co', 'placeholder-key')
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}
