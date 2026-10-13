
"use client";

export const runtime = 'edge';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { proximoStatus, rotuloDoStatus } from "@/lib/lives";
import { PainelDaChamada } from "@/components/live/PainelDaChamada";
import { DuvidasDoProfessor } from "@/components/live/DuvidasDoProfessor";
import { EstudioCarregando, EstudioDoProfessor } from "@/components/live/EstudioDoProfessor";

/** Estúdio do professor: busca a aula e troca o status. O desenho é do EstudioDoProfessor. */
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
      // Entrou no ar: avisa os alunos das turmas da aula. A rota só envia uma
      // vez por live, então reabrir depois de encerrar não repete o push.
      if (para === 'live') {
        fetch('/api/push/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'live', liveId, event: 'ao_vivo' }),
        }).catch(() => {});
      }
    } else {
      toast({
        title: "Erro ao mudar status",
        description: error?.message || "Sua conta não tem permissão para alterar aulas ao vivo. Fale com a coordenação.",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  if (loading || !live) return <EstudioCarregando />;

  return (
    <EstudioDoProfessor
      aula={live}
      atualizando={isUpdating}
      onTrocarStatus={toggleLiveStatus}
      onVoltar={() => router.push('/dashboard/teacher/live')}
      duvidas={<DuvidasDoProfessor liveId={liveId} />}
      chamada={<PainelDaChamada liveId={liveId} status={live.status ?? null} />}
    />
  );
}
