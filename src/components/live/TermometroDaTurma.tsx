"use client";

import { useEffect, useState } from "react";
import { Activity, MessagesSquare, Users } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { REACOES } from "@/lib/live-chat";
import { CARTAO, Rotulo } from "./pecas";

export type Termometro = {
  na_sala: number;
  passaram: number;
  esperados: number;
  reacoes_minuto: Record<string, number>;
  mensagens_5min: number;
};

/** 15 s: o professor olha de relance; mais que isso é carga sem uso. */
const ATUALIZAR_A_CADA_MS = 15_000;

/**
 * Termômetro da turma no estúdio (17/10): quantos alunos estão com a sala
 * aberta agora, e se a turma está reagindo e escrevendo. Antes o professor não
 * tinha como saber se alguém estava acompanhando. Busca `termometro_da_live()`
 * só com a aula no ar; sem a função no banco, não aparece.
 */
export function TermometroDaTurma({ liveId, noAr }: { liveId: string; noAr: boolean }) {
  const [dados, setDados] = useState<Termometro | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);

  useEffect(() => {
    if (!noAr) return;
    let vivo = true;
    const carregar = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const { data, error } = await supabase.rpc("termometro_da_live", { p_live: liveId });
      if (!vivo) return;
      if (error) {
        setIndisponivel(true);
        return;
      }
      setDados(data as Termometro);
    };
    carregar();
    const t = setInterval(carregar, ATUALIZAR_A_CADA_MS);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [liveId, noAr]);

  if (!noAr || indisponivel) return null;
  return <PainelDoTermometro dados={dados} />;
}

/** O termômetro, só desenho (a prévia `/dev/live-preview?tela=estudio` usa este). */
export function PainelDoTermometro({ dados }: { dados: Termometro | null }) {
  if (!dados) return <section className={`${CARTAO} h-28 animate-pulse`} aria-busy="true" aria-label="Carregando o termômetro" />;

  const pct = dados.esperados > 0 ? Math.min(100, Math.round((dados.na_sala / dados.esperados) * 100)) : 0;
  const reacoes = REACOES.map((e) => ({ e, n: dados.reacoes_minuto?.[e] ?? 0 })).filter((x) => x.n > 0);
  const totalReacoes = reacoes.reduce((s, x) => s + x.n, 0);

  return (
    <section className={`${CARTAO} p-4 space-y-3`} aria-label="Termômetro da turma">
      <div className="flex items-center justify-between gap-2">
        <Rotulo className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-orange-400" /> Termômetro da turma
        </Rotulo>
        <span className="text-[10px] font-semibold text-white/35">atualiza a cada 15 s</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-white text-sm font-black flex items-center gap-1.5">
            <Users className="h-4 w-4 text-white/60" />
            <span className="text-2xl italic tabular-nums">{dados.na_sala}</span>
            <span className="text-white/55 font-semibold">na sala agora</span>
          </p>
          <span className="text-[11px] font-semibold text-white/45 tabular-nums">de {dados.esperados} · {pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] font-medium text-white/40">{dados.passaram} já passaram pela sala nesta aula.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Reações · 1 min</p>
          {totalReacoes === 0 ? (
            <p className="text-xs font-semibold text-white/45 mt-1">Nenhuma ainda</p>
          ) : (
            <p className="text-sm mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {reacoes.map((x) => (
                <span key={x.e} className="tabular-nums text-white font-black">
                  {x.e} {x.n}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-white/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Chat · 5 min</p>
          <p className="text-sm font-black text-white mt-1 flex items-center gap-1.5 tabular-nums">
            <MessagesSquare className="h-3.5 w-3.5 text-white/50" /> {dados.mensagens_5min}{" "}
            <span className="text-white/45 font-semibold text-xs">{dados.mensagens_5min === 1 ? "mensagem" : "mensagens"}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
