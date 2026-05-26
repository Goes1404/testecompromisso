import { supabase } from '@/app/lib/supabase';

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

const toISODate = (d: Date) => d.toISOString().split('T')[0];

export async function getStreak(userId: string): Promise<StreakData> {
  const { data } = await supabase
    .from('study_streaks')
    .select('current_streak, longest_streak, last_activity_date')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    current_streak: data?.current_streak ?? 0,
    longest_streak: data?.longest_streak ?? 0,
    last_activity_date: data?.last_activity_date ?? null,
  };
}

/**
 * Atualiza a ofensiva do aluno. Chame ao final de uma atividade de estudo
 * (resposta de questão, simulado, redação). Idempotente: chamadas no
 * mesmo dia mantêm o mesmo valor de streak.
 */
export async function bumpStreak(userId: string): Promise<StreakData> {
  const today = toISODate(new Date());
  const yesterday = toISODate(new Date(Date.now() - 86_400_000));

  const current = await getStreak(userId);

  if (current.last_activity_date === today) return current;

  const wasYesterday = current.last_activity_date === yesterday;
  const newStreak = wasYesterday ? current.current_streak + 1 : 1;
  const newLongest = Math.max(newStreak, current.longest_streak);

  const { error } = await supabase.from('study_streaks').upsert(
    {
      user_id: userId,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('[streak] bump failed:', error.message);
    return current;
  }

  return { current_streak: newStreak, longest_streak: newLongest, last_activity_date: today };
}

export function isStreakAtRisk(lastActivity: string | null): boolean {
  if (!lastActivity) return false;
  const today = toISODate(new Date());
  const yesterday = toISODate(new Date(Date.now() - 86_400_000));
  return lastActivity !== today && lastActivity !== yesterday;
}
