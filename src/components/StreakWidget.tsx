'use client';

import { useEffect, useState } from 'react';
import { Flame, Trophy, AlertTriangle, Shield } from 'lucide-react';
import { getStreak, estadoOfensiva, StreakData, EstadoOfensiva } from '@/lib/streak';

type Props = { userId: string };

/** O que a tela diz em cada estado — e o que ela pode honestamente prometer. */
const MENSAGEM: Record<EstadoOfensiva, { titulo: (n: number) => string; nota?: (n: number) => string }> = {
  mantida: {
    titulo: n => `${n} ${n === 1 ? 'dia' : 'dias'}`,
  },
  ultimo_dia: {
    // Aqui a promessa é verdadeira: estudar hoje realmente mantém os dias.
    titulo: n => `${n} ${n === 1 ? 'dia' : 'dias'}`,
    nota: n => `Estude hoje para não perder seus ${n} ${n === 1 ? 'dia' : 'dias'}!`,
  },
  protegida: {
    titulo: n => `${n} ${n === 1 ? 'dia' : 'dias'}`,
    nota: () => 'Você faltou, mas uma proteção segurou sua ofensiva. Estude hoje para seguir de onde parou.',
  },
  perdida: {
    // Antes o widget dizia "estude hoje para não perder seus N dias" aqui —
    // mas nesse ponto os N dias já tinham ido embora, e estudar recomeçava do 1.
    titulo: () => 'Recomeçar',
    nota: n => `Sua ofensiva de ${n} ${n === 1 ? 'dia' : 'dias'} terminou. Estudar hoje começa uma nova.`,
  },
  nenhuma: {
    titulo: () => 'Comece hoje!',
    nota: () => 'Responda 1 questão por dia para construir sua ofensiva. 🔥',
  },
};

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

  const estado = estadoOfensiva(streak);
  // O número que a tela mostra é o que o aluno ainda tem. Numa ofensiva
  // perdida, os dias antigos não contam mais — mostrar 6 ali seria repetir a
  // mentira, só que no número em vez do texto.
  const exibido = estado === 'perdida' ? 0 : streak.current_streak;
  const quente = estado === 'mantida' || estado === 'protegida';
  const msg = MENSAGEM[estado];
  const nota = msg.nota?.(streak.current_streak);

  return (
    <div className="gradient-border bg-white rounded-[2.5rem] shadow-xl overflow-hidden group">
      <div className={`p-6 space-y-4 relative ${quente ? 'bg-gradient-to-br from-orange-500 via-rose-500 to-red-600 text-white' : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white'}`}>
        <div className="absolute -right-8 -top-8 opacity-20 pointer-events-none">
          <Flame className="h-40 w-40" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/10 backdrop-blur-sm">
            <Flame className={`h-5 w-5 ${quente ? 'text-yellow-200' : 'text-white/40'}`} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Ofensiva</p>
            <p className="text-xl font-black italic leading-none">{msg.titulo(streak.current_streak)}</p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-3 pt-2">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Atual</p>
            <p className="text-3xl font-black flex items-baseline gap-1">
              {exibido}
              <span className="text-xs font-bold text-white/70">{exibido === 1 ? 'dia' : 'dias'}</span>
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1 flex items-center gap-1">
              <Trophy className="h-2.5 w-2.5" /> Recorde
            </p>
            <p className="text-3xl font-black flex items-baseline gap-1">
              {streak.longest_streak}
              <span className="text-xs font-bold text-white/70">{streak.longest_streak === 1 ? 'dia' : 'dias'}</span>
            </p>
          </div>
        </div>

        {streak.protections > 0 && (
          <div className="relative flex items-center gap-2 text-[11px] font-bold text-white/80">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            {streak.protections === 1
              ? '1 proteção — cobre um dia perdido'
              : `${streak.protections} proteções — cobrem até ${streak.protections} dias perdidos`}
          </div>
        )}

        {nota && (
          <div className={`relative flex items-start gap-2 p-3 rounded-2xl backdrop-blur-sm ${
            estado === 'ultimo_dia'
              ? 'bg-yellow-400/20 border border-yellow-300/30'
              : 'bg-white/10 border border-white/10'
          }`}>
            {estado === 'ultimo_dia' && <AlertTriangle className="h-4 w-4 text-yellow-200 shrink-0 mt-0.5" />}
            {estado === 'protegida' && <Shield className="h-4 w-4 text-emerald-200 shrink-0 mt-0.5" />}
            <p className={`text-[11px] font-bold leading-tight ${estado === 'ultimo_dia' ? 'text-yellow-50' : 'text-white/85'}`}>
              {nota}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
