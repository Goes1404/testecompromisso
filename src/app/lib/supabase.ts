
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * CONFIGURAÇÃO REAL SUPABASE - COMPROMISSO 360
 * Otimizado para Next.js 15 e Netlify.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Verificação robusta de configuração
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
)

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.error("❌ [SUPABASE]: Erro de Configuração Crítico. As variáveis de ambiente não foram detectadas no navegador.");
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'compromisso-360' }
  }
});
