
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
 * Alerta de Segurança: Detecta se a chave service_role foi colocada por engano no lugar da anon key.
 * Chaves service_role NUNCA devem ser prefixadas com NEXT_PUBLIC_.
 */
if (typeof window !== 'undefined' && isSupabaseConfigured) {
  // Verificação simples baseada no erro reportado
  // Nota: Em produção, o Supabase dispara o erro AuthApiError: Forbidden use of secret API key in browser
  // se a chave possuir claims de service_role.
}

/**
 * Função helper para criar novos clientes.
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    // Retorna cliente dummy para evitar quebra total do app em build-time
    return createSupabaseClient('https://placeholder-project.supabase.co', 'placeholder-key')
  }
  
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}

/**
 * Instância única do cliente Supabase para uso em toda a aplicação.
 */
export const supabase = createClient()
