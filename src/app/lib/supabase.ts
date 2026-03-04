
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
 * Função helper para criar novos clientes com tratamento de erro de inicialização.
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    // Retorna cliente dummy para evitar quebra total do app em build-time ou configuração ausente
    return createSupabaseClient('https://placeholder-project.supabase.co', 'placeholder-key')
  }
  
  try {
    const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    // Verificação proativa de chave secreta no lado do cliente
    if (typeof window !== 'undefined' && supabaseAnonKey.length > 100) {
      // Chaves service_role costumam ser significativamente maiores ou conter claims de admin.
      // O Supabase disparará o erro no uso, mas alertamos aqui para facilitar o debug.
      console.warn("⚠️ [SEGURANÇA] Possível uso de SERVICE_ROLE_KEY detectado no navegador. Verifique suas variáveis de ambiente.");
    }

    return client;
  } catch (e) {
    console.error("Erro crítico na inicialização do Supabase:", e);
    return createSupabaseClient('https://placeholder-project.supabase.co', 'placeholder-key')
  }
}

/**
 * Instância única do cliente Supabase para uso em toda a aplicação.
 */
export const supabase = createClient()
