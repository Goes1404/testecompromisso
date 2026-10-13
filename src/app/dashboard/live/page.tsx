"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MonitorPlay, Clock, Loader2, ArrowRight, Signal, Calendar, User } from "lucide-react";
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
        // Promise.race garante que o loading sempre resolva, mesmo que o fetch
        // fique pendurado (ex.: service worker antigo interceptando a request),
        // o que travava a tela em "Carregando aulas..." para sempre.
        const query = supabase
          .from('lives')
          .select('*')
          .in('status', ['live', 'scheduled'])
          .gte('start_time', new Date(Date.now() - 3600000).toISOString())
          .order('start_time', { ascending: true });

        const { data, error } = await Promise.race([
          query,
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Tempo esgotado ao sintonizar o estúdio.')), 12_000)
          ),
        ]);

        if (error) throw error;
        setLives(data || []);
      } catch (err) {
        console.error("Erro ao buscar lives:", err);
        // Em caso de erro/timeout, mostramos a tela vazia em vez de travar.
        setLives([]);
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
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Carregando aulas...</p>
      </div>
    );
  }

  const liveNow = lives.filter(l => l.status === 'live');
  const upcoming = lives.filter(l => l.status === 'scheduled');

  // Layout pensado primeiro para o celular (360px): nada de texto gigante em
  // linha com selo, nada de `truncate` em título (o aluno precisa ler qual é a
  // aula) e botão sempre na largura toda, fácil de acertar com o polegar.
  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700 md:px-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-primary italic leading-none uppercase tracking-tighter">Aulas ao Vivo</h1>
          {liveNow.length > 0 && (
            <Badge className="bg-red-600 text-white border-none font-black text-[10px] px-3 py-1 shadow-sm animate-pulse">
              {liveNow.length === 1 ? "1 NO AR" : `${liveNow.length} NO AR`}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm md:text-xl font-medium italic">Mentorias e sessões de redação em tempo real.</p>
      </div>

      {liveNow.length > 0 && (
        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <h2 className="text-base md:text-2xl font-black text-red-600 uppercase tracking-wider italic">Acontecendo agora</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
            {liveNow.map((live) => (
              <Card key={live.id} className="border-none shadow-2xl bg-slate-950 text-white rounded-[2rem] md:rounded-[3rem] overflow-hidden border-l-8 md:border-l-[12px] border-red-600 relative">
                <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-red-600/15 rounded-full blur-[100px]" />
                <CardContent className="p-5 sm:p-8 md:p-12 space-y-5 md:space-y-8 relative z-10">
                  <Badge className="bg-red-600 text-white border-none px-3 h-8 font-black inline-flex items-center gap-2 text-[11px] rounded-full shadow-lg">
                    <Signal className="h-4 w-4" /> AO VIVO
                  </Badge>

                  <div className="space-y-3">
                    <h3 className="text-xl sm:text-2xl md:text-4xl font-black italic leading-tight tracking-tight uppercase break-words">{live.title}</h3>
                    {live.description && (
                      <p className="text-sm md:text-lg text-slate-400 line-clamp-3 italic font-medium leading-relaxed">{live.description}</p>
                    )}
                    <p className="flex items-center gap-2 text-sm md:text-base font-bold text-accent min-w-0">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate">{live.teacher_name || "Mentor da Rede"}</span>
                    </p>
                  </div>

                  <Button
                    asChild
                    className="w-full h-14 md:h-20 whitespace-normal bg-white text-slate-950 hover:bg-accent hover:text-accent-foreground font-black rounded-2xl md:rounded-[2rem] shadow-xl border-none text-base md:text-2xl"
                  >
                    <Link href={`/dashboard/live/${live.id}`} className="flex items-center justify-center gap-3">
                      ENTRAR NA AULA
                      <ArrowRight className="!h-5 !w-5 md:!h-7 md:!w-7" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 md:h-8 md:w-8 text-accent shrink-0" />
          <h2 className="text-base md:text-3xl font-black text-primary italic uppercase tracking-wider">Próximas aulas</h2>
        </div>

        {upcoming.length === 0 && liveNow.length === 0 ? (
          <Card className="border-none shadow-xl bg-white rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-20 text-center flex flex-col items-center gap-5 md:gap-8">
            <div className="h-16 w-16 md:h-24 md:w-24 rounded-[1.5rem] md:rounded-[2.5rem] bg-slate-50 flex items-center justify-center shadow-inner">
              <MonitorPlay className="h-8 w-8 md:h-12 md:w-12 text-primary/30" />
            </div>
            <div className="space-y-2">
              <p className="font-black italic text-xl md:text-3xl text-primary uppercase tracking-tighter">Nenhuma aula marcada</p>
              <p className="text-sm md:text-lg text-muted-foreground font-medium italic">Quando um professor agendar uma live, você recebe uma notificação.</p>
            </div>
          </Card>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground italic font-medium px-1">Nenhuma outra aula marcada por enquanto.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {upcoming.map((live) => {
              const inicio = new Date(live.start_time);
              return (
                <Card key={live.id} className="border-none shadow-xl bg-white rounded-[1.75rem] md:rounded-[3rem] overflow-hidden border-l-8 border-accent/30">
                  <CardContent className="p-4 sm:p-6 md:p-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="h-16 w-16 md:h-28 md:w-28 rounded-2xl md:rounded-[2rem] bg-primary/5 text-primary flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] md:text-sm font-black uppercase opacity-60 tracking-widest leading-none">{format(inicio, 'MMM', { locale: ptBR }).replace('.', '')}</span>
                        <span className="text-2xl md:text-5xl font-black italic leading-none mt-1">{format(inicio, 'dd')}</span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3 className="font-black text-primary italic text-base sm:text-lg md:text-3xl leading-snug uppercase tracking-tight line-clamp-3 break-words">{live.title}</h3>
                        <p className="flex items-center gap-1.5 text-sm md:text-lg font-black text-accent">
                          <Clock className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                          <span className="capitalize">{format(inicio, "EEE", { locale: ptBR }).replace('.', '')}</span>
                          <span>· {format(inicio, 'HH:mm')}</span>
                        </p>
                        <p className="text-xs md:text-base text-muted-foreground font-bold truncate">
                          {live.teacher_name || "Mentor da Rede"}
                        </p>
                      </div>
                    </div>

                    <Button asChild variant="outline" className="w-full md:w-auto h-12 md:h-16 px-6 md:px-10 rounded-2xl border-2 border-primary/15 font-black text-sm md:text-base uppercase shrink-0 hover:bg-primary hover:text-white hover:border-primary">
                      <Link href={`/dashboard/live/${live.id}`}>Ver detalhes</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
