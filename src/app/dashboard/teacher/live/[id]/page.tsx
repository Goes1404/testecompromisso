
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
import { ChatDaAula } from "@/components/live/ChatDaAula";
import { TransmissaoDoProfessor } from "@/components/live/TransmissaoDoProfessor";
import { EstudioCarregando, EstudioDoProfessor } from "@/components/live/EstudioDoProfessor";
import { useVerificacaoDoVideo } from "@/components/live/useVerificacaoDoVideo";
import { VerificacaoDoVideo } from "@/components/live/VerificacaoDoVideo";
import { bloqueiaAbertura, mensagemDaVerificacao } from "@/lib/live-video";

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

  // Confere com o YouTube se o vídeo abre para o aluno. Roda ao abrir o
  // estúdio e de novo na hora de abrir a sala.
  const video = useVerificacaoDoVideo(live?.youtube_id, !!live && live.status !== 'completed');

  const toggleLiveStatus = async () => {
    if (isUpdating || !live) return;
    const { para } = proximoStatus(live.status);

    // Abrir a sala com vídeo do YouTube: pergunta de novo ao YouTube, porque
    // o professor pode ter mudado a visibilidade desde a última conferência.
    // Só o "não" definitivo (privado, sem incorporação, apagado) barra; se o
    // YouTube não responder, a aula não fica refém disso e a sala abre.
    if (para === 'live' && live.youtube_id && !live.transmissao_sessao) {
      setIsUpdating(true);
      const v = await video.verificar();
      setIsUpdating(false);
      if (v && bloqueiaAbertura(v)) {
        const { titulo, descricao } = mensagemDaVerificacao(v);
        toast({ title: `Sala não aberta: ${titulo.toLowerCase()}`, description: descricao, variant: 'destructive' });
        return;
      }
      if (v && !v.ok) {
        const { titulo, descricao } = mensagemDaVerificacao(v);
        toast({ title: titulo, description: descricao });
      }
    }

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
      // `no_ar_desde`: é dele que a agenda do aluno conta a validade da aula
      // no ar (ver `estaNaAgenda`), não do horário agendado.
      .update(para === 'live' ? { status: para, no_ar_desde: new Date().toISOString() } : { status: para })
      .eq('id', liveId)
      .select('id');

    if (!error && data?.length) {
      setLive((atual: any) => ({ ...atual, status: para }));
      // Encerrou: tira a transmissão pela plataforma da sala dos alunos. Em
      // separado do status de propósito — sem a migration da transmissão, esta
      // escrita falha sozinha e o encerramento (que gera a chamada) não.
      if (para === 'completed') {
        supabase
          .from('lives')
          .update({ transmissao_sessao: null, transmissao_faixas: [], transmissao_desde: null })
          .eq('id', liveId)
          .then(() => {});
      }
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
      transmissao={<TransmissaoDoProfessor liveId={liveId} aulaNoAr={live.status === 'live'} />}
      chat={<ChatDaAula liveId={liveId} noAr={live.status === 'live'} equipe altura="h-[340px] lg:h-[max(260px,calc(100dvh-26rem))]" />}
      chamada={<PainelDaChamada liveId={liveId} status={live.status ?? null} />}
      video={<VerificacaoDoVideo verificacao={video.verificacao} verificando={video.verificando} onVerificar={() => video.verificar()} />}
      videoVerificado={!!video.verificacao?.ok}
    />
  );
}
