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
import { ChatDoYoutube } from "@/components/live/ChatDoYoutube";
import { ChatDaAula } from "@/components/live/ChatDaAula";
import { chaveDoCache, gravarCache, lerCache } from "@/lib/cache-da-sessao";

/** A sala guardada vale por 6 h (uma aula longa e o intervalo). */
const VALIDADE_DA_SALA_MS = 6 * 3_600_000;

export default function StudentLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: liveId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const chave = chaveDoCache(user?.id, "live", liveId);
  // Voltar para a sala abre com a aula que já estava na tela; a consulta
  // confirma por trás. Antes, cada volta mostrava o esqueleto de novo.
  const [live, setLiveNaTela] = useState<any>(() => lerCache(chave, VALIDADE_DA_SALA_MS));
  const [loading, setLoading] = useState(() => lerCache(chave, VALIDADE_DA_SALA_MS) === null);
  const setLive = (dado: any) => {
    setLiveNaTela(dado);
    if (dado) gravarCache(chave, dado);
  };

  useEffect(() => {
    if (!liveId || !user) return;
    if (!live) {
      const guardada = lerCache<any>(chave, VALIDADE_DA_SALA_MS);
      if (guardada) {
        setLiveNaTela(guardada);
        setLoading(false);
      }
    }

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
        // Com a aula já na tela (cache), uma falha de rede não expulsa o aluno
        // da sala: a próxima consulta (presença, 60 s) tenta de novo. Só sai
        // quando o banco diz que a aula não existe (PGRST116) ou não há nada.
        if (error?.code === 'PGRST116' || !lerCache(chave, VALIDADE_DA_SALA_MS)) {
          toast({ title: "Aula não encontrada", variant: "destructive" });
          router.push('/dashboard/live');
        }
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
      // Chat nosso, dentro da plataforma (funciona no celular). O do YouTube só
      // entra se a migration do chat ainda não estiver no banco.
      chat={
        <ChatDaAula
          liveId={liveId}
          noAr={live.status === 'live'}
          equipe={false}
          // Ocupa o espaço que a sala der: no celular, o resto da tela abaixo
          // do vídeo; no computador, a coluna da direita inteira.
          preencher
          reserva={live.youtube_id ? <ChatDoYoutube videoId={live.youtube_id} noAr={live.status === 'live'} /> : null}
        />
      }
    />
  );
}
