"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, Eye, Loader2, MessageCircleQuestion, PenLine } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ordenarDuvidasParaProfessor, type Duvida } from "@/lib/lives";

/**
 * A equipe é pouca gente, então ela assina o Realtime (o aluno não — ver
 * DuvidasDoAluno). A reconsulta de 15 s cobre Realtime caído ou fora da cota.
 */
const RECONSULTAR_MS = 15_000;

type Aba = "pendentes" | "respondidas" | "ocultas";

export function DuvidasDoProfessor({ liveId }: { liveId: string }) {
  const { toast } = useToast();
  const [duvidas, setDuvidas] = useState<Duvida[] | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [aba, setAba] = useState<Aba>("pendentes");
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
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

  const lista = duvidas ?? [];
  const contagem = {
    pendentes: lista.filter((d) => !d.oculta && !d.is_answered).length,
    respondidas: lista.filter((d) => !d.oculta && d.is_answered).length,
    ocultas: lista.filter((d) => d.oculta).length,
  };
  const visiveis = lista.filter((d) =>
    aba === "ocultas" ? d.oculta : !d.oculta && (aba === "respondidas" ? d.is_answered : !d.is_answered),
  );

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl space-y-4">
      <div>
        <h2 className="text-lg md:text-xl font-black italic text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-orange-500" /> Dúvidas dos alunos
        </h2>
        <p className="text-[11px] text-slate-500 font-medium mt-1">
          Cada aluno vê só as próprias dúvidas e a sua resposta. Responder na aula ou por escrito avisa o aluno.
        </p>
      </div>

      <div className="flex gap-1.5">
        {(["pendentes", "respondidas", "ocultas"] as Aba[]).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={`h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              aba === a ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {a} ({contagem[a]})
          </button>
        ))}
      </div>

      {duvidas === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-slate-500 font-medium py-4">
          {aba === "pendentes" ? "Nenhuma dúvida esperando resposta." : "Nada aqui."}
        </p>
      ) : (
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {visiveis.map((d) => (
            <li key={d.id} className="rounded-2xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-black text-slate-800 truncate">{d.user_name || "Aluno"}</span>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {new Date(d.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{d.content}</p>
              {d.resposta && (
                <p className="text-xs text-green-800 bg-green-50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words">
                  <span className="font-black">Sua resposta: </span>
                  {d.resposta}
                </p>
              )}

              {respondendo === d.id ? (
                <div className="space-y-2">
                  <textarea
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    autoFocus
                    placeholder="Resposta para este aluno…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-400 resize-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRespondendo(null)}
                      className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!resposta.trim() || salvando === d.id}
                      onClick={async () => {
                        if (await atualizar(d.id, { resposta: resposta.trim() })) setRespondendo(null);
                      }}
                      className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white disabled:opacity-40"
                    >
                      Enviar resposta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {!d.oculta && !d.is_answered && (
                    <button
                      type="button"
                      disabled={salvando === d.id}
                      onClick={() => atualizar(d.id, { is_answered: true })}
                      className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1.5"
                    >
                      <Check className="h-3 w-3" /> Respondi na aula
                    </button>
                  )}
                  {!d.oculta && (
                    <button
                      type="button"
                      onClick={() => {
                        setRespondendo(d.id);
                        setResposta(d.resposta ?? "");
                      }}
                      className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
                    >
                      <PenLine className="h-3 w-3" /> {d.resposta ? "Editar resposta" : "Responder por escrito"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={salvando === d.id}
                    onClick={() => atualizar(d.id, { oculta: !d.oculta })}
                    className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center gap-1.5"
                  >
                    {d.oculta ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {d.oculta ? "Mostrar" : "Ocultar"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
