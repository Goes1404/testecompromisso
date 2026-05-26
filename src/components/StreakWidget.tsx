'use client';

import { useEffect, useState } from 'react';
import { Flame, Trophy, AlertTriangle } from 'lucide-react';
import { getStreak, isStreakAtRisk, StreakData } from '@/lib/streak';

type Props = { userId: string };

export function StreakWidget({ userId }: Props) {
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    let alive = true;
    getStreak(userId).then(s => { if (alive) setStreak(s); }).catch(() => {});
    return () => { alive = false; };
  }, [userId]);

  if (!streak) {
    return <div className="h-32 rounded-[2rem] bg-muted/20 animate-pulse" />;
  }

  const current = streak.current_streak;
  const longest = streak.longest_streak;
  const atRisk = isStreakAtRisk(streak.last_activity_date);
  const isActive = current > 0 && !atRisk;

  return (
    <div className="gradient-border bg-white rounded-[2.5rem] shadow-xl overflow-hidden group">
      <div className={`p-6 space-y-4 relative ${isActive ? 'bg-gradient-to-br from-orange-500 via-rose-500 to-red-600 text-white' : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white'}`}>
        <div className="absolute -right-8 -top-8 opacity-20 pointer-events-none">
          <Flame className="h-40 w-40" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/10 backdrop-blur-sm">
            <Flame className={`h-5 w-5 ${isActive ? 'text-yellow-200' : 'text-white/40'}`} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Ofensiva</p>
            <p className="text-xl font-black italic leading-none">
              {current === 0 ? 'Comece hoje!' : atRisk ? 'Ofensiva em risco' : `${current} ${current === 1 ? 'dia' : 'dias'}`}
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-3 pt-2">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Atual</p>
            <p className="text-3xl font-black flex items-baseline gap-1">
              {current}
              <span className="text-xs font-bold text-white/70">{current === 1 ? 'dia' : 'dias'}</span>
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1 flex items-center gap-1">
              <Trophy className="h-2.5 w-2.5" /> Recorde
            </p>
            <p className="text-3xl font-black flex items-baseline gap-1">
              {longest}
              <span className="text-xs font-bold text-white/70">{longest === 1 ? 'dia' : 'dias'}</span>
            </p>
          </div>
        </div>

        {atRisk && current > 0 && (
          <div className="relative flex items-start gap-2 p-3 bg-yellow-400/20 border border-yellow-300/30 rounded-2xl backdrop-blur-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-200 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-yellow-50 leading-tight">
              Estude hoje para não perder seus {current} dias!
            </p>
          </div>
        )}

        {current === 0 && (
          <p className="relative text-[11px] font-bold text-white/70 leading-tight">
            Responda 1 questão por dia para construir sua ofensiva. 🔥
          </p>
        )}
      </div>
    </div>
  );
}
