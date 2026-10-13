"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { LIMITE_DA_DUVIDA, validarDuvida, type Duvida } from "@/lib/lives";
import { QuadroDeDuvidas } from "./QuadroDeDuvidas";

/**
 * Enquanto houver dúvida esperando resposta, reconsulta a cada 30 s. Sem
 * pendência não consulta nada. É consulta e não Realtime de propósito: o
 * Realtime do Supabase não comporta os ~855 alunos de um aulão (200 conexões
 * no Free, 500 no Pro).
 */
const RECONSULTAR_PENDENTES_MS = 30_000;

/** Traduz o erro do banco para o aluno. Os do gatilho já vêm em português. */
function mensagemDeErro(error: { code?: string; message?: string }): string {
  if (error.code === "23514") return `A dúvida precisa ter entre 1 e ${LIMITE_DA_DUVIDA} caracteres.`;
  if (error.code === "P0001" && error.message) return error.message;
  return "Não foi possível enviar agora. Tente de novo em instantes.";
}

/**
 * Dúvidas do aluno para o professor. Privadas: o aluno vê só as dele e a
 * resposta delas (regra de RLS, não só de tela).
 */
export function DuvidasDoAluno({ liveId, noAr }: { liveId: string; noAr: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [duvidas, setDuvidas] = useState<Duvida[] | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("live_messages")
      .select("id, created_at, user_name, content, is_answered, resposta, oculta")
      .eq("live_id", liveId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      // Coluna nova ausente = migration das dúvidas não aplicada: some com o
      // quadro em vez de mostrar um formulário que não grava.
      setIndisponivel(true);
      return;
    }
    setDuvidas((data ?? []) as Duvida[]);
  }, [liveId, user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const temPendente = (duvidas ?? []).some((d) => !d.is_answered);
  useEffect(() => {
    if (!temPendente || !noAr) return;
    const timer = setInterval(carregar, RECONSULTAR_PENDENTES_MS);
    return () => clearInterval(timer);
  }, [temPendente, noAr, carregar]);

  const enviar = async () => {
    if (enviando || !user) return;
    const problema = validarDuvida(texto);
    if (problema) {
      toast({ title: problema, variant: "destructive" });
      return;
    }
    setEnviando(true);
    const { error } = await supabase
      .from("live_messages")
      .insert({ live_id: liveId, user_id: user.id, content: texto.trim() });
    setEnviando(false);
    if (error) {
      toast({ title: "Dúvida não enviada", description: mensagemDeErro(error), variant: "destructive" });
      return;
    }
    setTexto("");
    toast({ title: "Dúvida enviada ao professor" });
    carregar();
  };

  if (indisponivel) return null;

  return (
    <QuadroDeDuvidas
      duvidas={duvidas}
      texto={texto}
      onTexto={setTexto}
      onEnviar={enviar}
      enviando={enviando}
      noAr={noAr}
    />
  );
}
