"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Loader2, MessageCircleQuestion, PenLine } from "lucide-react";
import type { Duvida } from "@/lib/lives";
import { CARTAO } from "./pecas";

type Aba = "pendentes" | "respondidas" | "ocultas";
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "pendentes", rotulo: "Pendentes" },
  { id: "respondidas", rotulo: "Respondidas" },
  { id: "ocultas", rotulo: "Ocultas" },
];

/**
 * Fila de dúvidas do professor, só desenho. Os dados e as gravações vêm de
 * `DuvidasDoProfessor`. A lista chega já ordenada
 * (`ordenarDuvidasParaProfessor`).
 */
export function FilaDeDuvidas({
  duvidas,
  salvandoId,
  onRespondidaNaAula,
  onResponder,
  onOcultar,
}: {
  duvidas: Duvida[] | null;
  salvandoId: string | null;
  onRespondidaNaAula: (id: string) => void;
  onResponder: (id: string, texto: string) => Promise<boolean>;
  onOcultar: (id: string, oculta: boolean) => void;
}) {
  const [aba, setAba] = useState<Aba>("pendentes");
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");

  const lista = duvidas ?? [];
  const contagem: Record<Aba, number> = {
    pendentes: lista.filter((d) => !d.oculta && !d.is_answered).length,
    respondidas: lista.filter((d) => !d.oculta && d.is_answered).length,
    ocultas: lista.filter((d) => d.oculta).length,
  };
  const visiveis = lista.filter((d) =>
    aba === "ocultas" ? d.oculta : !d.oculta && (aba === "respondidas" ? d.is_answered : !d.is_answered),
  );

  return (
    <section className={`${CARTAO} p-4 md:p-5 space-y-3`} aria-label="Dúvidas dos alunos">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black italic text-white flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-orange-400" /> Dúvidas dos alunos
          </h2>
          <p className="text-[10px] font-semibold text-white/45 mt-0.5">
            Cada aluno vê só as próprias dúvidas e a sua resposta.
          </p>
        </div>
        {contagem.pendentes > 0 && (
          <span className="shrink-0 h-6 min-w-6 px-2 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center tabular-nums">
            {contagem.pendentes}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/5" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`h-8 px-1 rounded-lg text-[10px] font-black uppercase tracking-normal sm:tracking-wider truncate transition-all ${
              aba === a.id ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
            }`}
          >
            {a.rotulo} <span className="tabular-nums opacity-70">{contagem[a.id]}</span>
          </button>
        ))}
      </div>

      {duvidas === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : visiveis.length === 0 ? (
        <p className="text-xs font-medium text-white/45 text-center py-8">
          {aba === "pendentes" ? "Nenhuma dúvida esperando resposta." : "Nada por aqui."}
        </p>
      ) : (
        <ul className="space-y-2 max-h-[65vh] overflow-y-auto pr-0.5 -mr-0.5">
          {visiveis.map((d) => (
            <li key={d.id} className={`rounded-xl border p-3 space-y-2 ${d.oculta ? "bg-white/[0.02] border-white/5 opacity-70" : "bg-white/[0.04] border-white/10"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-black text-white/85 truncate">{d.user_name || "Aluno"}</span>
                <span className="text-[10px] font-bold text-white/35 shrink-0 tabular-nums">
                  {new Date(d.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm text-white/90 whitespace-pre-wrap break-words leading-snug">{d.content}</p>

              {d.resposta && respondendo !== d.id && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Sua resposta</p>
                  <p className="text-xs text-emerald-100 whitespace-pre-wrap break-words leading-snug">{d.resposta}</p>
                </div>
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
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/60 resize-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRespondendo(null)}
                      className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!resposta.trim() || salvandoId === d.id}
                      onClick={async () => {
                        if (await onResponder(d.id, resposta.trim())) setRespondendo(null);
                      }}
                      className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-35 flex items-center gap-1.5"
                    >
                      {salvandoId === d.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      Enviar resposta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    disabled={salvandoId === d.id}
                    onClick={() => onOcultar(d.id, !d.oculta)}
                    aria-label={d.oculta ? "Mostrar dúvida" : "Ocultar dúvida"}
                    title={d.oculta ? "Mostrar dúvida" : "Ocultar dúvida"}
                    className={`mr-auto h-8 rounded-lg text-[10px] font-black uppercase tracking-wider text-white/45 hover:text-white/80 hover:bg-white/5 flex items-center justify-center gap-1.5 transition-colors ${d.oculta ? "px-3" : "w-8"}`}
                  >
                    {d.oculta ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {d.oculta && "Mostrar"}
                  </button>
                  {!d.oculta && !d.is_answered && (
                    <button
                      type="button"
                      disabled={salvandoId === d.id}
                      onClick={() => onRespondidaNaAula(d.id)}
                      className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      <span className="sm:hidden">Respondida</span>
                      <span className="hidden sm:inline">Respondi na aula</span>
                    </button>
                  )}
                  {!d.oculta && (
                    <button
                      type="button"
                      onClick={() => {
                        setRespondendo(d.id);
                        setResposta(d.resposta ?? "");
                      }}
                      className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/80 hover:bg-white/15 flex items-center gap-1.5 transition-colors"
                    >
                      <PenLine className="h-3 w-3" /> {d.resposta ? "Editar" : "Responder"}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
