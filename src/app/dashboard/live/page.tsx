
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MonitorPlay, Clock, Loader2, ArrowRight, Signal, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function LiveClassesPage() {
  const [lives, setLives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLives() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('lives')
          .select('*')
          .in('status', ['live', 'scheduled'])
          .order('start_time', { ascending: true });

        if (error) throw error;
        setLives(data || []);
      } catch (err) {
        console.error("Erro ao buscar lives:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLives();

    const channel = supabase
      .channel('live_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lives' }, () => {
        fetchLives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sintonizando Satélite...</p>
      </div>
    );
  }

  const liveNow = lives.filter(l => l.status === 'live');
  const upcoming = lives.filter(l => l.status === 'scheduled');

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20 px-2">
      <div className="space-y-1 px-1">
        <h1 className="text-2xl md:text-3xl font-black text-primary italic leading-none uppercase tracking-tighter">Centro de Transmissões</h1>
        <p className="text-muted-foreground text-xs md:text-base font-medium italic">Aprenda em tempo real em nossas salas virtuais.</p>
      </div>

      {liveNow.length > 0 && (
        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-2 px-2">
            <div className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
            <h2 className="text-sm md:text-xl font-black text-red-600 uppercase tracking-widest italic">Acontecendo Agora</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {liveNow.map((live) => (
              <Card key={live.id} className="border-none shadow-2xl bg-slate-950 text-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden group border-l-4 border-red-600">
                <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-red-600 text-white border-none px-3 py-1 font-black flex items-center gap-2 animate-pulse text-[8px] md:text-[10px]">
                      <Signal className="h-3 w-3" /> AO VIVO
                    </Badge>
                    <div className="text-right">
                      <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase">Mentor</p>
                      <p className="font-bold italic text-blue-400 text-xs md:text-base">{live.teacher_name || "Mentor da Rede"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg md:text-2xl font-black italic leading-tight group-hover:text-blue-400 transition-colors truncate">{live.title}</h3>
                    <p className="text-[10px] md:sm text-slate-400 line-clamp-2 italic">{live.description}</p>
                  </div>
                  <Button 
                    asChild 
                    className="w-full bg-white text-slate-950 hover:bg-blue-400 hover:text-white font-black h-12 md:h-14 rounded-xl md:rounded-2xl shadow-xl transition-all border-none disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!live.meet_link}
                  >
                     <a href={live.meet_link || '#' } target="_blank" rel="noopener noreferrer">
                        {live.meet_link ? 'Entrar na Sala' : 'Link Indisponível'}
                        <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                     </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 md:space-y-6">
        <h2 className="text-sm md:text-xl font-black text-primary italic px-2 uppercase tracking-widest">Próximas Sessões</h2>
        {upcoming.length === 0 && liveNow.length === 0 ? (
          <Card className="border-none shadow-xl bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-10 md:p-12 text-center opacity-50 border-dashed border-2">
            <MonitorPlay className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="font-black italic text-sm md:text-lg text-primary">Nenhuma aula agendada no momento.</p>
            <p className="text-xs text-muted-foreground mt-2">Fique atento ao mural de avisos para novas datas.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {upcoming.map((live) => (
              <Card key={live.id} className="border-none shadow-lg bg-white rounded-2xl md:rounded-3xl overflow-hidden hover:shadow-xl transition-all border-l-4 border-primary/10">
                <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                  <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                    <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-blue-50 text-blue-600 flex flex-col items-center justify-center shadow-inner shrink-0">
                      <span className="text-[7px] md:text-[8px] font-black uppercase">{format(new Date(live.start_time), 'MMM', { locale: ptBR })}</span>
                      <span className="text-base md:text-xl font-black italic">{format(new Date(live.start_time), 'dd')}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-primary italic text-sm md:text-lg leading-none truncate">{live.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Com {live.teacher_name || "Mentor"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-8">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-primary font-black italic text-xs md:text-base">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 text-accent" />
                        {format(new Date(live.start_time), 'HH:mm')}
                      </div>
                      <span className="text-[7px] md:text-[8px] font-black text-muted-foreground uppercase">Horário</span>
                    </div>
                    <Button asChild variant="outline" className="rounded-lg md:rounded-xl border-2 font-black h-10 md:h-12 px-4 md:px-6 text-[10px] md:text-sm uppercase">
                      <Link href={`/dashboard/live/${live.id}`}>Ver Detalhes</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
