
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
        // Busca apenas lives futuras ou acontecendo agora
        const { data, error } = await supabase
          .from('lives')
          .select('*')
          .in('status', ['live', 'scheduled'])
          .gte('start_time', new Date(Date.now() - 3600000).toISOString()) // Mostra até 1h após o início
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
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20 px-2 md:px-4">
      <div className="space-y-1 px-1">
        <h1 className="text-2xl md:text-4xl font-black text-primary italic leading-none uppercase tracking-tighter">Centro de Transmissões</h1>
        <p className="text-muted-foreground text-xs md:text-lg font-medium italic">Aprenda em tempo real com os melhores mentores da sua rede.</p>
      </div>

      {liveNow.length > 0 && (
        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-2 px-2">
            <div className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
            <h2 className="text-sm md:text-xl font-black text-red-600 uppercase tracking-widest italic">Acontecendo Agora</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {liveNow.map((live) => (
              <Card key={live.id} className="border-none shadow-2xl bg-slate-950 text-white rounded-[2rem] md:rounded-[3rem] overflow-hidden group border-l-8 border-red-600 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl" />
                <CardContent className="p-6 md:p-10 space-y-6 md:space-y-8 relative z-10">
                  <div className="flex justify-between items-start">
                    <Badge className="bg-red-600 text-white border-none px-4 h-8 font-black flex items-center gap-2 animate-pulse text-[9px] md:text-[11px] rounded-full">
                      <Signal className="h-3.5 w-3.5" /> AO VIVO
                    </Badge>
                    <div className="text-right">
                      <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Mentor Responsável</p>
                      <p className="font-black italic text-accent text-xs md:text-lg">{live.teacher_name || "Mentor da Rede"}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl md:text-3xl font-black italic leading-tight group-hover:text-accent transition-colors truncate">{live.title}</h3>
                    <p className="text-xs md:text-base text-slate-400 line-clamp-2 italic font-medium leading-relaxed">{live.description}</p>
                  </div>
                  <Button 
                    asChild 
                    className="w-full bg-white text-slate-950 hover:bg-accent hover:text-accent-foreground font-black h-12 md:h-16 rounded-xl md:rounded-2xl shadow-xl transition-all border-none disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    disabled={!live.meet_link}
                  >
                     <a href={live.meet_link || '#' } target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3">
                        <span className="text-sm md:text-lg">ENTRAR NA SALA AGORA</span>
                        <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                     </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 md:space-y-6">
        <h2 className="text-sm md:text-xl font-black text-primary italic px-2 uppercase tracking-widest flex items-center gap-3">
          <Calendar className="h-5 w-5 text-accent" /> Próximas Sessões
        </h2>
        {upcoming.length === 0 && liveNow.length === 0 ? (
          <Card className="border-none shadow-xl bg-white rounded-[2rem] md:rounded-[3rem] p-12 md:p-20 text-center opacity-50 border-dashed border-4">
            <MonitorPlay className="h-16 w-16 md:h-24 md:w-24 mx-auto mb-6 text-muted-foreground/30" />
            <p className="font-black italic text-lg md:text-2xl text-primary uppercase">Silêncio no Estúdio</p>
            <p className="text-xs md:text-base text-muted-foreground mt-3 font-medium italic">Nenhuma mentoria agendada para as próximas horas.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {upcoming.map((live) => (
              <Card key={live.id} className="border-none shadow-lg bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500 border-l-8 border-primary/5 group">
                <CardContent className="p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
                  <div className="flex items-center gap-5 md:gap-10 w-full md:w-auto">
                    <div className="h-16 w-16 md:h-24 md:w-24 rounded-2xl md:rounded-[2rem] bg-slate-50 text-primary flex flex-col items-center justify-center shadow-inner shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                      <span className="text-[8px] md:text-[10px] font-black uppercase opacity-60">{format(new Date(live.start_time), 'MMM', { locale: ptBR })}</span>
                      <span className="text-xl md:text-4xl font-black italic leading-none">{format(new Date(live.start_time), 'dd')}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-[8px] md:text-[10px] border-accent/20 text-accent font-black uppercase px-2 h-5">AGENDADA</Badge>
                      </div>
                      <h3 className="font-black text-primary italic text-lg md:text-2xl leading-none truncate group-hover:text-accent transition-colors">{live.title}</h3>
                      <p className="text-[10px] md:text-sm text-muted-foreground font-bold uppercase mt-2 tracking-tight">Com o Mentor {live.teacher_name || "Especialista"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full md:w-auto gap-6 md:gap-12 border-t md:border-t-0 pt-4 md:pt-0 border-muted/10">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 text-primary font-black italic text-sm md:text-2xl">
                        <Clock className="h-4 w-4 md:h-6 md:w-6 text-accent" />
                        {format(new Date(live.start_time), 'HH:mm')}
                      </div>
                      <span className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Horário Previsto</span>
                    </div>
                    <Button asChild variant="outline" className="rounded-xl md:rounded-2xl border-2 border-primary/10 font-black h-12 md:h-16 px-6 md:px-10 text-[10px] md:text-sm uppercase shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all">
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
