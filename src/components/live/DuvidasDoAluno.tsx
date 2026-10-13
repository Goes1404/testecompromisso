"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { LIMITE_DA_DUVIDA, validarDuvida, type Duvida } from "@/lib/lives";

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
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-accent" /> Dúvidas para o professor
        </h3>
        <p className="text-[10px] font-medium text-slate-400 mt-0.5">Só o professor vê o que você escreve aqui.</p>
      </div>

      {noAr ? (
        <div className="space-y-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LIMITE_DA_DUVIDA}
            rows={2}
            disabled={enviando}
            placeholder="Escreva sua dúvida…"
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-accent/60 resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold text-slate-500 tabular-nums">
              {texto.trim().length}/{LIMITE_DA_DUVIDA}
            </span>
            <button
              type="button"
              onClick={enviar}
              disabled={enviando || !texto.trim()}
              className="h-10 px-4 rounded-xl bg-accent text-accent-foreground text-[11px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 font-medium">As dúvidas abrem quando a aula estiver no ar.</p>
      )}

      {duvidas && duvidas.length > 0 && (
        <ul className="space-y-2">
          {duvidas.map((d) => (
            <li key={d.id} className="rounded-xl bg-black/20 p-3 space-y-1.5">
              <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">{d.content}</p>
              {d.resposta ? (
                <p className="text-xs text-green-300 bg-green-500/10 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words">
                  <span className="font-black">Professor: </span>
                  {d.resposta}
                </p>
              ) : (
                <span
                  className={`inline-block text-[9px] font-black uppercase tracking-widest rounded-md px-2 py-0.5 ${
                    d.is_answered ? "bg-green-500/15 text-green-300" : "bg-white/10 text-slate-400"
                  }`}
                >
                  {d.is_answered ? "Respondida na aula" : "Aguardando o professor"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
