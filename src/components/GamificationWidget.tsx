'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { getLevel, BADGE_META, BadgeType, XP_LEVELS } from '@/lib/gamification';
import { Progress } from '@/components/ui/progress';
import { Zap } from 'lucide-react';

type Props = { userId: string };

export function GamificationWidget({ userId }: Props) {
  const [xp, setXp] = useState<number | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);

  useEffect(() => {
    const load = async () => {
      const [profileRes, badgesRes] = await Promise.all([
        supabase.from('profiles').select('xp_points').eq('id', userId).single(),
        supabase.from('user_badges').select('badge_type').eq('user_id', userId),
      ]);
      setXp((profileRes.data?.xp_points as number) ?? 0);
      setEarnedBadges((badgesRes.data ?? []).map((b: any) => b.badge_type as BadgeType));
    };
    load();
  }, [userId]);

  if (xp === null) return null;

  const { current, next, progressPct } = getLevel(xp);
  const allBadges = Object.keys(BADGE_META) as BadgeType[];

  return (
    <div className="bg-white rounded-[2rem] shadow-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Zap className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Seu Progresso</p>
          <p className="text-lg font-black text-primary italic leading-none">
            Nível {current.level} · <span className="text-accent">{current.label}</span>
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-black text-primary">{xp}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">XP Total</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
          <span>{current.minXP} XP</span>
          {next && <span>{next.minXP} XP · {next.label}</span>}
        </div>
        <Progress value={progressPct} className="h-2.5 rounded-full" />
        {next && (
          <p className="text-[10px] text-muted-foreground font-medium text-right">
            Faltam {next.minXP - xp} XP para o próximo nível
          </p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Conquistas</p>
        <div className="grid grid-cols-3 gap-2">
          {allBadges.map(badge => {
            const meta = BADGE_META[badge];
            const earned = earnedBadges.includes(badge);
            return (
              <div
                key={badge}
                title={meta.description}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                  ${earned ? 'bg-accent/5 border-accent/20' : 'bg-muted/20 border-transparent opacity-40 grayscale'}`}
              >
                <span className="text-xl">{meta.icon}</span>
                <span className="text-[8px] font-black text-center leading-tight text-primary">{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
