"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ordenarDuvidasParaProfessor, type Duvida } from "@/lib/lives";
import { FilaDeDuvidas } from "./FilaDeDuvidas";

/**
 * A equipe é pouca gente, então ela assina o Realtime (o aluno não — ver
 * DuvidasDoAluno). A reconsulta de 15 s cobre Realtime caído ou fora da cota.
 */
const RECONSULTAR_MS = 15_000;

export function DuvidasDoProfessor({ liveId }: { liveId: string }) {
  const { toast } = useToast();
  const [duvidas, setDuvidas] = useState<Duvida[] | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("live_messages")
      .select("id, created_at, user_name, content, is_answered, resposta, oculta, is_question")
      .eq("live_id", liveId)
      .eq("is_question", true);
    if (error) {
      setIndisponivel(true);
      return;
    }
    setDuvidas(ordenarDuvidasParaProfessor((data ?? []) as Duvida[]));
  }, [liveId]);

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, RECONSULTAR_MS);
    const canal = supabase
      .channel(`duvidas_${liveId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_messages", filter: `live_id=eq.${liveId}` }, () => carregar())
      .subscribe();
    return () => {
      clearInterval(timer);
      supabase.removeChannel(canal);
    };
  }, [liveId, carregar]);

  const atualizar = async (id: string, campos: Partial<Pick<Duvida, "is_answered" | "resposta" | "oculta">>) => {
    setSalvando(id);
    const { data, error } = await supabase.from("live_messages").update(campos).eq("id", id).select("id");
    setSalvando(null);
    if (error || !data?.length) {
      toast({
        title: "Não foi possível atualizar a dúvida",
        description: error?.message || "Sua conta não tem permissão para moderar dúvidas.",
        variant: "destructive",
      });
      return false;
    }
    carregar();
    return true;
  };

  if (indisponivel) return null;

  return (
    <FilaDeDuvidas
      duvidas={duvidas}
      salvandoId={salvando}
      onRespondidaNaAula={(id) => atualizar(id, { is_answered: true })}
      onResponder={(id, texto) => atualizar(id, { resposta: texto })}
      onOcultar={(id, oculta) => atualizar(id, { oculta })}
    />
  );
}
