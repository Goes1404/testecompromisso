import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Garante que a questão do dia do público existe. O agendamento é self-healing:
 * não há cron nem painel — o primeiro aluno do dia dispara a criação no servidor
 * (RPC idempotente `ensure_daily_question`). Devolve true se há questão para
 * hoje após a chamada; false se a RPC falhou ou não achou questão elegível
 * (nesses casos o chamador mantém o estado vazio de sempre).
 */
export async function garantirQuestaoDoDia(
  supabase: SupabaseClient,
  audience: 'etec' | 'enem',
): Promise<boolean> {
  const { data, error } = await supabase.rpc('ensure_daily_question', { p_audience: audience });
  if (error) return false;
  return data !== null;
}
