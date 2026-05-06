import { supabase } from '@/app/lib/supabase';

export const XP_PER_CORRECT_QUESTION = 5;
export const XP_PER_SIMULADO_COMPLETE = 20;
export const XP_PER_EXAM_COMPLETE = 50;

export const XP_LEVELS = [
  { level: 1, minXP: 0, label: 'Iniciante' },
  { level: 2, minXP: 100, label: 'Estudante' },
  { level: 3, minXP: 300, label: 'Dedicado' },
  { level: 4, minXP: 600, label: 'Avançado' },
  { level: 5, minXP: 1000, label: 'Expert' },
  { level: 6, minXP: 1500, label: 'Mestre' },
  { level: 7, minXP: 2500, label: 'Lendário' },
];

export type BadgeType =
  | 'first_question'
  | 'questions_10'
  | 'questions_50'
  | 'questions_100'
  | 'perfect_simulado'
  | 'streak_7';

export const BADGE_META: Record<BadgeType, { label: string; description: string; icon: string }> = {
  first_question:  { label: 'Primeiro Passo',      description: 'Respondeu a 1ª questão',           icon: '🎯' },
  questions_10:    { label: 'Dez Questões',         description: 'Respondeu 10 questões no total',   icon: '📝' },
  questions_50:    { label: 'Meio Século',          description: 'Respondeu 50 questões no total',   icon: '⚡' },
  questions_100:   { label: 'Centenário',           description: 'Respondeu 100 questões no total',  icon: '🏆' },
  perfect_simulado:{ label: 'Gabarito Perfeito',    description: '100% de acerto em um simulado',    icon: '💎' },
  streak_7:        { label: '7 Dias Seguidos',      description: 'Estudou 7 dias consecutivos',      icon: '🔥' },
};

export function getLevel(xp: number) {
  let current = XP_LEVELS[0];
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.minXP) current = lvl;
  }
  const nextIdx = XP_LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = XP_LEVELS[nextIdx] ?? null;
  const progressPct = next
    ? Math.round(((xp - current.minXP) / (next.minXP - current.minXP)) * 100)
    : 100;
  return { current, next, progressPct, xp };
}

export async function awardXP(userId: string, points: number): Promise<number> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_points')
    .eq('id', userId)
    .single();

  const currentXP = (profile?.xp_points as number) ?? 0;
  const newXP = currentXP + points;

  await supabase
    .from('profiles')
    .update({ xp_points: newXP })
    .eq('id', userId);

  return newXP;
}

export async function checkAndAwardBadges(
  userId: string,
  opts: {
    totalAnswered?: number;
    isPerfectSimulado?: boolean;
  }
): Promise<BadgeType[]> {
  const earned: BadgeType[] = [];

  const badge = async (type: BadgeType) => {
    const { error } = await supabase
      .from('user_badges')
      .insert({ user_id: userId, badge_type: type })
      .select()
      .single();
    if (!error) earned.push(type);
  };

  const { totalAnswered = 0, isPerfectSimulado = false } = opts;

  if (totalAnswered >= 1)   await badge('first_question');
  if (totalAnswered >= 10)  await badge('questions_10');
  if (totalAnswered >= 50)  await badge('questions_50');
  if (totalAnswered >= 100) await badge('questions_100');
  if (isPerfectSimulado)    await badge('perfect_simulado');

  return earned;
}

export async function getTotalAnswered(userId: string): Promise<number> {
  const { count } = await supabase
    .from('student_question_answers')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', userId);
  return count ?? 0;
}
