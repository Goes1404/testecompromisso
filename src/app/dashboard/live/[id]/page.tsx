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
import { PlayerDaPlataforma } from "@/components/live/PlayerDaPlataforma";
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
    // Sem Realtime aqui de propósito (regra 14 do CLAUDE.md): o Supabase
    // aceita 200 conexões no Free e 500 no Pro, e um aulão tem ~855 alunos.
    // Quem ficasse de fora tentaria reconectar a aula inteira. A sala relê a
    // aula por intervalo (abaixo) e pelo sinal de presença.
  }, [liveId, user, router, toast]);

  const presenca = usePresencaNaLive(liveId, !!live && live.status !== 'completed');

  // O sinal de presença traz o status da aula. Se ele diverge do que a tela
  // tem (Realtime fora do ar ou acima da cota), ou se a aula está no ar e o
  // vídeo ainda não chegou, relê a aula: é assim que o vídeo e o "ao vivo"
  // aparecem sem o aluno recarregar a página.
  useEffect(() => {
    if (!presenca?.status || !live) return;
    if (presenca.status === live.status && !(presenca.status === 'live' && !live.youtube_id && !live.transmissao_sessao)) return;
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

  // Relê a aula por intervalo, conforme o estado:
  // - agendada: a cada 15 s, para pegar o "abriu" (o sinal de presença, a cada
  //   60 s, também traz o status — isto só encurta a espera);
  // - no ar sem vídeo (esperando o professor começar): a cada 6 s;
  // - no ar com vídeo: a cada 20 s, só para notar se ele parou ou trocou de
  //   transmissão;
  // - encerrada: nada.
  // Cada leitura custa ~0,1 ms no banco (medido em 15/10); é mais barato que
  // ~855 websockets disputando 200 vagas.
  const status = live?.status as string | undefined;
  const esperandoVideo = status === 'live' && !live?.youtube_id && !live?.transmissao_sessao;
  const intervaloDaReleitura =
    status === 'live' ? (esperandoVideo ? 6_000 : 20_000) : status === 'scheduled' ? 15_000 : 0;
  useEffect(() => {
    if (!intervaloDaReleitura || !liveId) return;
    const reler = () =>
      supabase
        .from('lives')
        .select('*')
        .eq('id', liveId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setLive(data);
        });
    const t = setInterval(() => {
      if (document.hidden) return;
      reler();
    }, intervaloDaReleitura);
    // Voltou do bloqueio de tela ou de outro app: olha na hora.
    const aoVoltar = () => {
      if (!document.hidden) reler();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervaloDaReleitura, liveId]);

  if (loading || !live) return <SalaCarregando />;

  return (
    <SalaDoAluno
      aula={live}
      presenca={presenca}
      onVoltar={() => router.push('/dashboard/live')}
      duvidas={<DuvidasDoAluno liveId={liveId} noAr={live.status === 'live'} />}
      // Chat nosso, dentro da plataforma (funciona no celular). O do YouTube só
      // entra se a migration do chat ainda não estiver no banco.
      videoDaPlataforma={
        live.status === 'live' && live.transmissao_sessao ? (
          <PlayerDaPlataforma
            liveId={liveId}
            sessaoDoProfessor={live.transmissao_sessao}
            faixas={live.transmissao_faixas}
            titulo={live.title || 'Aula ao vivo'}
          />
        ) : null
      }
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
