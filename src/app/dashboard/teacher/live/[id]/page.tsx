
"use client";

export const runtime = 'edge';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Signal,
  ChevronLeft,
  Loader2,
  Power,
  ExternalLink,
  Youtube,
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { linkExternoSeguro, proximoStatus, rotuloDasTurmas, rotuloDoStatus, urlDoPlayer } from "@/lib/lives";
import { PlayerDoYoutube } from "@/components/live/PlayerDoYoutube";
import { PainelDaChamada } from "@/components/live/PainelDaChamada";
import Link from "next/link";

/**
 * Studio Master - Visão do Mentor/Professor (Educori 360)
 * Atualizado para Next.js 15.
 */
export default function TeacherLiveStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: liveId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!liveId || !user) return;
    
    async function loadStudioData() {
      try {
        const { data, error } = await supabase
          .from('lives')
          .select('*')
          .eq('id', liveId)
          .single();

        if (error) throw error;
        setLive(data);

      } catch (e) {
        toast({ title: "Erro ao acessar estúdio", variant: "destructive" });
        router.back();
      } finally {
        setLoading(false);
      }
    }

    loadStudioData();

    const channel = supabase
      .channel(`live_studio_${liveId}`)
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

  const toggleLiveStatus = async () => {
    if (isUpdating || !live) return;
    const { para } = proximoStatus(live.status);

    // Encerrar gera a chamada de centenas de alunos: um clique sem querer no
    // meio da aula marcaria falta para quem ainda não chegou aos 60%.
    if (
      para === 'completed' &&
      !window.confirm('Encerrar a aula gera a chamada: presente quem ficou 60% do tempo com a sala aberta. Encerrar agora?')
    ) {
      return;
    }
    setIsUpdating(true);

    // `.select()` porque, sem policy de escrita, o UPDATE "dá certo" sem
    // tocar em linha nenhuma — e o professor acharia que abriu a sala.
    const { data, error } = await supabase
      .from('lives')
      .update({ status: para })
      .eq('id', liveId)
      .select('id');

    if (!error && data?.length) {
      setLive((atual: any) => ({ ...atual, status: para }));
      toast({ title: `Aula ${rotuloDoStatus(para).toLowerCase()}` });
    } else {
      toast({
        title: "Erro ao mudar status",
        description: error?.message || "Sua conta não tem permissão para alterar aulas ao vivo. Fale com a coordenação.",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-red-600" />
      <p className="text-[10px] font-black text-white/65 uppercase tracking-[0.3em]">Sincronizando Studio Master...</p>
    </div>
  );

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-700 pb-4">
      {/* Barra de Comando Industrial */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-slate-950 p-6 rounded-3xl text-white shadow-2xl border-b-4 border-red-600 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10 rounded-full h-12 w-12">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase leading-none">{live?.title}</h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em] mt-1 uppercase">CONSOLE DE TRANSMISSÃO · {rotuloDasTurmas(live?.turmas)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {linkExternoSeguro(live?.meet_link) && (
            <Button asChild variant="outline" className="h-12 rounded-2xl border-white/20 bg-transparent hover:bg-white/10 text-white font-black px-6 gap-2">
              <a href={linkExternoSeguro(live?.meet_link)!} target="_blank" rel="noopener noreferrer">
                ABRIR MEU GOOGLE MEET <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}

          <Button 
            onClick={toggleLiveStatus} 
            disabled={isUpdating}
            className={`${live?.status === 'live' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white font-black h-12 px-8 rounded-2xl gap-2 transition-all shadow-xl uppercase`}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            {proximoStatus(live?.status).rotulo}
          </Button>

          <Badge className={`${live?.status === 'live' ? 'bg-red-600 animate-pulse' : 'bg-slate-700'} text-white font-black border-none px-6 h-12 rounded-2xl flex items-center gap-3`}>
            <Signal className="h-4 w-4" /> {live?.status === 'live' ? 'AO VIVO' : rotuloDoStatus(live?.status).toUpperCase()}
          </Badge>
        </div>
      </div>

      {urlDoPlayer(live?.youtube_id) ? (
        <Card className="bg-slate-950 rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-6 shadow-2xl border-none space-y-4">
          <PlayerDoYoutube videoId={live.youtube_id} titulo={live.title || 'Aula ao vivo'} />
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed px-1">
            É isto que os alunos veem. A transmissão em si é feita pelo YouTube Studio, no computador: abra a
            transmissão lá, comece a transmitir e depois clique em <b className="text-white">Abrir para alunos</b> aqui.
          </p>
        </Card>
      ) : (
        <Card className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-none flex flex-col items-center text-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <Youtube className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-lg">
            <h2 className="text-xl md:text-2xl font-black italic text-slate-900 uppercase tracking-tight">Falta o link do YouTube</h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Sem ele, os alunos só têm o Meet, que no plano grátis aceita 100 pessoas e corta em 60 minutos.
              Crie a transmissão como <b>Não listada</b> no YouTube Studio, pelo computador, e cole o link em Editar.
            </p>
          </div>
          <Button asChild className="h-12 rounded-2xl font-black px-8 uppercase tracking-widest text-xs">
            <Link href="/dashboard/teacher/live">Voltar e editar a aula</Link>
          </Button>
        </Card>
      )}
      <PainelDaChamada liveId={liveId} status={live?.status ?? null} />
    </div>
  );
}
