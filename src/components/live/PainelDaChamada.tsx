"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { formatarDuracao, PRESENCA_MINIMA } from "@/lib/lives";
import { CARTAO } from "./pecas";

export type Aluno = { id: string; nome: string; sala: string | null; segundos: number; presente: boolean };
export type Resumo = {
  segundos_da_aula: number;
  segundos_para_presenca: number;
  esperados: number;
  chamada_id: string | null;
  alunos: Aluno[];
};

/** O painel não precisa de tempo real fino: 30 s basta e poupa o banco. */
const ATUALIZAR_A_CADA_MS = 30_000;

/**
 * Chamada automática da aula, vista pelo professor.
 *
 * Durante a aula, "presença garantida" é quem já passou de 60% do tempo
 * decorrido ATÉ AGORA — a régua final é aplicada sobre a duração total quando
 * a aula é encerrada, então um aluno pode perder o verde se sair cedo.
 */
export function PainelDaChamada({ liveId, status }: { liveId: string; status: string | null }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      const { data, error } = await supabase.rpc("presencas_da_live", { p_live_id: liveId });
      if (!vivo) return;
      if (error) {
        setIndisponivel(true);
        return;
      }
      setIndisponivel(false);
      setResumo(data as Resumo);
    };
    carregar();
    const timer = status === "live" ? setInterval(carregar, ATUALIZAR_A_CADA_MS) : null;
    return () => {
      vivo = false;
      if (timer) clearInterval(timer);
    };
  }, [liveId, status]);

  return <ResumoDaChamada resumo={resumo} status={status} indisponivel={indisponivel} />;
}

/** O painel da chamada, só desenho. */
export function ResumoDaChamada({
  resumo,
  status,
  indisponivel = false,
}: {
  resumo: Resumo | null;
  status: string | null;
  indisponivel?: boolean;
}) {
  if (indisponivel) {
    return (
      <section className={`${CARTAO} p-4 text-xs text-white/55 font-medium`}>
        A chamada automática ainda não está ativa no banco. A aula funciona normalmente, mas sem lista de presença.
      </section>
    );
  }

  if (!resumo) {
    return <section className={`${CARTAO} h-40 animate-pulse`} aria-busy="true" aria-label="Carregando a chamada" />;
  }

  const garantidos = resumo.alunos.filter((a) => a.presente).length;
  const meta = Math.round(PRESENCA_MINIMA * 100);
  const encerrada = status === "completed";
  const metaEmSegundos = resumo.segundos_para_presenca;

  return (
    <section className={`${CARTAO} p-4 md:p-5 space-y-4`} aria-label="Chamada automática">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black italic text-white flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-orange-400" /> Chamada automática
          </h2>
          <p className="text-[10px] font-semibold text-white/45 mt-0.5">
            Presente quem fica {meta}% da aula com a sala aberta
            {resumo.segundos_da_aula > 0 && <> · no ar há {formatarDuracao(resumo.segundos_da_aula)}</>}
          </p>
        </div>
        {encerrada && resumo.chamada_id && (
          <Link
            href={`/dashboard/teacher/attendance/${resumo.chamada_id}`}
            className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
          >
            Ver chamada <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {encerrada && !resumo.chamada_id && (
        <p className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-snug">
          Nenhuma chamada foi gerada: a aula ficou menos de 10 minutos no ar. Se ela aconteceu de verdade, reabra e encerre de novo depois.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { rotulo: "Esperados", valor: resumo.esperados, cor: "text-white" },
          { rotulo: "Entraram", valor: resumo.alunos.length, cor: "text-sky-300" },
          { rotulo: encerrada ? "Presentes" : `Já com ${meta}%`, valor: garantidos, cor: "text-emerald-400" },
        ].map((c) => (
          <div key={c.rotulo} className="rounded-xl bg-white/5 py-3 flex flex-col items-center">
            <span className={`text-2xl font-black leading-none tabular-nums ${c.cor}`}>{c.valor}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/45 mt-1 text-center">{c.rotulo}</span>
          </div>
        ))}
      </div>

      {resumo.alunos.length === 0 ? (
        <p className="text-xs text-white/45 font-medium flex items-center justify-center gap-2 py-4">
          <Users className="h-4 w-4" /> Nenhum aluno entrou na sala ainda.
        </p>
      ) : (
        <ul className="divide-y divide-white/5 max-h-[45vh] overflow-y-auto">
          {resumo.alunos.map((a) => {
            const fracao = metaEmSegundos > 0 ? Math.min(1, a.segundos / metaEmSegundos) : 0;
            return (
              <li key={a.id} className="flex items-center gap-3 py-2">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white/90 truncate">{a.nome}</span>
                  <span className="mt-1 block h-1 rounded-full bg-white/10 overflow-hidden" aria-hidden>
                    <span
                      className={`block h-full rounded-full ${a.presente ? "bg-emerald-500" : "bg-orange-500/70"}`}
                      style={{ width: `${Math.round(fracao * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="text-[10px] font-bold text-white/40 w-12 text-right shrink-0">{a.sala ? `Sala ${a.sala}` : "—"}</span>
                <span className="text-xs font-black tabular-nums text-white/75 w-14 text-right shrink-0">{formatarDuracao(a.segundos)}</span>
                {a.presente ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-label="Presente" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-white/20 shrink-0" aria-label="Ainda não" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
