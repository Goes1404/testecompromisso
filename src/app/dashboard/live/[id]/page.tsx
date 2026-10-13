"use client";

export const runtime = 'edge';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { usePresencaNaLive } from "@/components/live/usePresencaNaLive";
import { DuvidasDoAluno } from "@/components/live/DuvidasDoAluno";
import { SalaCarregando, SalaDoAluno } from "@/components/live/SalaDoAluno";

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

  const presenca = usePresencaNaLive(liveId, !!live && live.status !== 'completed');

  // O sinal de presença traz o status da aula. Se ele diverge do que a tela
  // tem (Realtime fora do ar ou acima da cota), ou se a aula está no ar e o
  // vídeo ainda não chegou, relê a aula: é assim que o vídeo e o "ao vivo"
  // aparecem sem o aluno recarregar a página.
  useEffect(() => {
    if (!presenca?.status || !live) return;
    if (presenca.status === live.status && !(presenca.status === 'live' && !live.youtube_id)) return;
    supabase
      .from('lives')
      .select('*')
      .eq('id', liveId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLive(data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenca]);

  if (loading || !live) return <SalaCarregando />;

  return (
    <SalaDoAluno
      aula={live}
      presenca={presenca}
      onVoltar={() => router.push('/dashboard/live')}
      duvidas={<DuvidasDoAluno liveId={liveId} noAr={live.status === 'live'} />}
    />
  );
}
