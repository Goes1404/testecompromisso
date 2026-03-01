
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Verifica se a chave é uma Secret Key (service_role).
 * Chaves service_role geralmente são maiores e contêm payloads que o SDK identifica como proibidos no browser.
 */
const isSecretKey = supabaseAnonKey.length > 100 && (supabaseAnonKey.includes('service_role') || !supabaseAnonKey.includes('anon'));

/**
 * Verifica se as credenciais do Supabase estão configuradas no ambiente de forma segura.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl !== 'SUA_URL_DO_PROJETO_SUPABASE' &&
  !isSecretKey
)

/**
 * Instância única do cliente Supabase.
 * Se a configuração estiver errada (como o uso de uma Secret Key), 
 * o cliente usa um placeholder para evitar crash imediato.
 */
export const supabase = createSupabaseClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co', 
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder'
)

/**
 * Função helper para criar novos clientes se necessário.
 */
export function createClient() {
  return createSupabaseClient(
    isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co', 
    isSupabaseConfigured ? supabaseAnonKey : 'placeholder'
  )
}
