"use client";

export const runtime = 'edge';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Loader2,
  Signal,
  ExternalLink,
  MonitorPlay,
  CalendarClock,
  User,
  Video,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function StudentLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: liveId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!liveId || !user) return;

    async function loadLiveData() {
      try {
        const { data, error } = await supabase
          .from('lives')
          .select(`*`)
          .eq('id', liveId)
          .single();

        if (error) throw error;
        setLive(data);

      } catch (error: any) {
        console.error("Erro ao carregar live:", error);
        toast({ title: "Aula não encontrada", variant: "destructive" });
        router.push('/dashboard/live');
      } finally {
        setLoading(false);
      }
    }

    loadLiveData();

    const channel = supabase
      .channel(`live_view_${liveId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lives',
        filter: `id=eq.${liveId}`
      }, (payload) => {
        setLive(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId, user, router, toast]);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-accent" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse text-primary">Abrindo a sala...</p>
    </div>
  );

  const isLiveNow = live?.status === 'live';
  const inicio = live?.start_time ? new Date(live.start_time) : null;
  const quando = inicio
    ? format(inicio, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : null;
  const link: string | null = live?.meet_link || live?.meeting_url || live?.url || null;

  // Antes esta tela era "full bleed" com altura travada e `overflow-hidden`:
  // no celular o cartão do console cortava o ícone em cima e o botão do Meet
  // embaixo, e o título virava "Revisão inten…". Agora é uma página normal,
  // que rola, com o botão de entrar sempre inteiro e na largura toda.
  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700 max-w-4xl mx-auto">
      <div className="flex items-start gap-3 bg-white p-3 md:p-5 rounded-[1.5rem] shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/live')}
          aria-label="Voltar para as aulas"
          className="rounded-full h-11 w-11 shrink-0 bg-primary/5 hover:bg-primary/10"
        >
          <ChevronLeft className="!h-6 !w-6 text-primary" />
        </Button>
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <Badge className={`${isLiveNow ? 'bg-red-600 animate-pulse' : 'bg-slate-500'} text-white border-none px-2.5 h-6 font-black text-[10px] inline-flex items-center gap-1.5 rounded-lg`}>
            {isLiveNow ? (
              <><Signal className="h-3.5 w-3.5" /> AO VIVO</>
            ) : (
              <><CalendarClock className="h-3.5 w-3.5" /> AGENDADA</>
            )}
          </Badge>
          <h1 className="text-base sm:text-lg md:text-2xl font-black text-primary italic leading-snug tracking-tight break-words">{live?.title}</h1>
          <p className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-muted-foreground min-w-0">
            <User className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="truncate">{live?.teacher_name || 'Mentor da Rede'}</span>
          </p>
        </div>
      </div>

      <Card className="bg-slate-950 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border-none relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(30,41,59,1)_0%,rgba(2,6,23,1)_70%)]" />

        <div className="relative z-10 flex flex-col items-center text-center gap-5 md:gap-8 p-5 sm:p-8 md:p-12">
          <div className={`h-20 w-20 md:h-32 md:w-32 rounded-[1.75rem] md:rounded-[2.5rem] bg-white/5 border-2 ${isLiveNow ? 'border-accent/40 shadow-[0_0_60px_rgba(245,158,11,0.18)]' : 'border-white/10'} flex items-center justify-center`}>
            <MonitorPlay className={`h-10 w-10 md:h-16 md:w-16 ${isLiveNow ? 'text-accent' : 'text-white/25'}`} />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white italic leading-tight uppercase tracking-tight">
              {isLiveNow ? 'A aula começou' : 'Aula agendada'}
            </h2>
            <p className="text-sm md:text-base text-slate-400 font-medium leading-relaxed">
              {isLiveNow
                ? link
                  ? 'Toque no botão abaixo para entrar na sala do Google Meet.'
                  : 'O professor ainda está colocando o link da sala. Esta tela atualiza sozinha.'
                : quando
                  ? <>Começa <span className="text-white font-bold">{quando}</span>. Você recebe uma notificação quando entrar no ar.</>
                  : 'Você recebe uma notificação quando entrar no ar.'}
            </p>
          </div>

          {link ? (
            <div className="w-full sm:w-auto flex flex-col items-center gap-3">
              <Button
                asChild
                className={`w-full sm:w-auto sm:min-w-[320px] h-14 md:h-20 px-6 md:px-12 whitespace-normal font-black rounded-2xl md:rounded-[2rem] border-none text-base md:text-xl uppercase ${isLiveNow ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_20px_40px_rgba(245,158,11,0.25)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3">
                  {isLiveNow ? 'Entrar no Google Meet' : 'Abrir link da sala'}
                  <ExternalLink className="!h-5 !w-5 md:!h-6 md:!w-6" />
                </a>
              </Button>
              {!isLiveNow && (
                <p className="text-[11px] font-bold text-white/50">O professor ainda não abriu a sala — pode ser que você fique aguardando.</p>
              )}
            </div>
          ) : (
            <div className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 md:py-6">
              <p className="text-sm font-bold text-slate-400 italic">
                {isLiveNow ? 'Aguardando o link da sala…' : 'O link da sala aparece aqui antes da aula.'}
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl p-5 md:p-10 border-none">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shrink-0">
            <Video className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[10px] md:text-[11px] font-black text-primary/50 uppercase tracking-[0.25em] leading-none">Pauta da aula</h2>
            <p className="text-base md:text-lg font-black text-primary italic mt-1">O que vamos ver</p>
          </div>
        </div>
        <p className="text-sm md:text-lg font-medium text-primary/80 leading-relaxed bg-muted/10 p-4 md:p-6 rounded-2xl border border-muted/20 break-words">
          {live?.description || "Sessão de apoio para tirar dúvidas e aprofundar o conteúdo."}
        </p>
      </Card>
    </div>
  );
}
