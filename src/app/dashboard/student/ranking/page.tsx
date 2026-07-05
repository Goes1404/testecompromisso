'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/app/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy, Medal, Crown, Flame, Star,
  Loader2, RefreshCw, Zap, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type RankEntry = {
  student_id:  string;
  full_name:   string;
  avatar_url:  string | null;
  exam_target: string | null;
  weekly_xp:   number;
  total_xp:    number;
  position:    number;
};

function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'h-16 w-16 text-xl' : size === 'md' ? 'h-11 w-11 text-sm' : 'h-8 w-8 text-xs';
  const initials = name?.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
  if (url) return (
    <img src={url} alt={name} className={`${sz} rounded-full object-cover border-2 border-white shadow-md`} />
  );
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-black border-2 border-white shadow-md shrink-0`}>
      {initials}
    </div>
  );
}

function PodiumCard({ entry, place }: { entry: RankEntry; place: 1 | 2 | 3 }) {
  const configs = {
    1: {
      height: 'h-36',
      bg: 'bg-gradient-to-b from-amber-400 to-yellow-600',
      icon: <Crown className="h-6 w-6 text-amber-200" />,
      ring: 'ring-4 ring-amber-400',
      glow: 'shadow-amber-400/40',
      label: '1º',
      avatarSize: 'lg' as const,
    },
    2: {
      height: 'h-24',
      bg: 'bg-gradient-to-b from-slate-300 to-slate-500',
      icon: <Medal className="h-5 w-5 text-slate-200" />,
      ring: 'ring-4 ring-slate-300',
      glow: 'shadow-slate-400/40',
      label: '2º',
      avatarSize: 'md' as const,
    },
    3: {
      height: 'h-20',
      bg: 'bg-gradient-to-b from-amber-700 to-amber-900',
      icon: <Trophy className="h-5 w-5 text-amber-300" />,
      ring: 'ring-4 ring-amber-700',
      glow: 'shadow-amber-700/40',
      label: '3º',
      avatarSize: 'md' as const,
    },
  } as const;

  const c = configs[place];

  return (
    <div className={`flex flex-col items-center gap-2 ${place === 1 ? 'order-2' : place === 2 ? 'order-1' : 'order-3'}`}>
      {/* Avatar */}
      <div className="flex flex-col items-center gap-1.5">
        <div className={`relative ${c.ring} rounded-full shadow-xl ${c.glow}`}>
          <Avatar name={entry.full_name} url={entry.avatar_url} size={c.avatarSize} />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow">
            {c.icon}
          </div>
        </div>
        <p className={`text-xs font-black text-center max-w-[80px] leading-tight truncate ${place === 1 ? 'text-amber-900' : 'text-slate-700'}`}>
          {entry.full_name?.split(' ')[0]}
        </p>
        <div className="flex items-center gap-1 bg-white/80 rounded-full px-2 py-0.5 shadow-sm">
          <Zap className="h-3 w-3 text-amber-500" />
          <span className="text-[11px] font-black text-slate-800">{entry.weekly_xp} XP</span>
        </div>
      </div>

      {/* Degrau do pódio */}
      <div className={`w-24 ${c.height} ${c.bg} rounded-t-2xl flex items-end justify-center pb-3 shadow-lg`}>
        <span className="text-2xl font-black text-white opacity-60">{c.label}</span>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [ranking, setRanking]     = useState<RankEntry[]>([]);
  const [myEntry, setMyEntry]     = useState<RankEntry | null>(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRanking = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rawTarget = (
        profile?.exam_target || user?.user_metadata?.exam_target ||
        profile?.profile_type || 'enem'
      ).toLowerCase();
      const audience = rawTarget.includes('etec') ? 'etec' : 'enem';

      const { data, error } = await supabase
        .from('weekly_ranking')
        .select('student_id, full_name, avatar_url, exam_target, weekly_xp, total_xp, position')
        .eq('exam_target', audience)
        .order('position', { ascending: true })
        .limit(50);

      if (error) throw error;

      const list = (data ?? []) as RankEntry[];
      setRanking(list);
      setMyEntry(list.find(r => r.student_id === user.id) ?? null);
      setLastUpdated(new Date());
    } catch (e: any) {
      toast({ title: 'Erro ao carregar ranking', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, profile, toast]);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  const top3    = ranking.slice(0, 3);
  const rest    = ranking.slice(3);
  const myPos   = myEntry?.position ?? null;

  const weekStart = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  })();

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6 pb-24 animate-in fade-in duration-700">

      {/* ── HERO ── */}
      <section className="aurora-dark relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl border border-white/5">
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none rounded-[2.5rem]" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-500/20 rounded-full blur-[80px]" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary/20 rounded-full blur-[60px]" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 inline-flex items-center gap-1.5">
              <Trophy className="h-2.5 w-2.5" /> Ranking Semanal
            </span>
            <h1 className="text-3xl font-black italic tracking-tighter leading-tight">
              Tabela de<br />
              <span className="text-gradient-brand">Líderes 🏆</span>
            </h1>
            <p className="text-white/40 text-xs font-medium">
              Semana de {weekStart} · Reseta toda segunda-feira
            </p>
          </div>

          {myPos && (
            <div className="shrink-0 text-center bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Você</p>
              <p className="text-3xl font-black leading-none">{myPos}º</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mt-0.5">lugar</p>
            </div>
          )}
        </div>

        {myEntry && (
          <div className="relative z-10 mt-5 flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
            <Avatar name={myEntry.full_name} url={myEntry.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate">{myEntry.full_name?.split(' ')[0]} (você)</p>
              <p className="text-[10px] text-white/50 font-medium">{myEntry.weekly_xp} XP esta semana</p>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-black">{myEntry.total_xp} XP total</span>
            </div>
          </div>
        )}
      </section>

      {/* Refresh */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="font-bold">{ranking.length} alunos no ranking</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRanking}
          disabled={loading}
          className="h-8 rounded-xl text-xs font-black text-muted-foreground hover:text-primary gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        </div>
      ) : ranking.length === 0 ? (
        <div className="py-20 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-200" />
          <p className="font-black italic text-primary text-lg">Ranking ainda vazio</p>
          <p className="text-sm text-muted-foreground mt-1">
            Responda questões para aparecer aqui!
          </p>
        </div>
      ) : (
        <>
          {/* ── PÓDIO ── */}
          {top3.length >= 2 && (
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-[2.5rem] border border-amber-100 p-6 pb-0 shadow-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 text-center mb-6">
                Top 3 da Semana
              </p>
              <div className="flex items-end justify-center gap-3">
                {top3[1] && <PodiumCard entry={top3[1]} place={2} />}
                {top3[0] && <PodiumCard entry={top3[0]} place={1} />}
                {top3[2] && <PodiumCard entry={top3[2]} place={3} />}
              </div>
            </div>
          )}

          {/* ── LISTA ── */}
          {rest.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Classificação Geral
              </p>
              {rest.map((entry, idx) => {
                const isMe = entry.student_id === user?.id;
                return (
                  <div
                    key={entry.student_id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-primary/5 border-primary/20 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    {/* Posição */}
                    <span className={`w-8 text-center text-sm font-black shrink-0 ${
                      isMe ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {entry.position}º
                    </span>

                    <Avatar name={entry.full_name} url={entry.avatar_url} size="sm" />

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black truncate ${isMe ? 'text-primary' : 'text-slate-800'}`}>
                        {entry.full_name}
                        {isMe && <span className="text-[9px] ml-1.5 font-bold text-primary/60">(você)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {entry.total_xp} XP total
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm font-black text-slate-700">{entry.weekly_xp}</span>
                      <span className="text-[9px] font-bold text-slate-400">XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lastUpdated && (
            <p className="text-center text-[9px] text-muted-foreground/40 font-medium">
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
