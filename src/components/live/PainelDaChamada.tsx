"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Loader2, Users } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { formatarDuracao, PRESENCA_MINIMA } from "@/lib/lives";

type Aluno = { id: string; nome: string; sala: string | null; segundos: number; presente: boolean };
type Resumo = {
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

  if (indisponivel) {
    return (
      <div className="bg-white rounded-[2rem] p-6 shadow-2xl text-sm text-slate-600 font-medium">
        A chamada automática ainda não está ativa no banco. A aula funciona normalmente, mas sem lista de presença.
      </div>
    );
  }

  if (!resumo) {
    return (
      <div className="bg-white rounded-[2rem] p-6 shadow-2xl flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const garantidos = resumo.alunos.filter((a) => a.presente).length;
  const meta = Math.round(PRESENCA_MINIMA * 100);
  const encerrada = status === "completed";

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-black italic text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-500" /> Chamada automática
          </h2>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Presente quem ficar {meta}% da aula com a sala aberta. Aula no ar há {formatarDuracao(resumo.segundos_da_aula)}.
          </p>
        </div>
        {encerrada && resumo.chamada_id && (
          <Link
            href={`/dashboard/teacher/attendance/${resumo.chamada_id}`}
            className="h-10 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            Ver chamada gerada
          </Link>
        )}
      </div>

      {encerrada && !resumo.chamada_id && (
        <p className="text-xs font-bold text-amber-700 bg-amber-50 rounded-xl p-3">
          Nenhuma chamada foi gerada: a aula ficou menos de 10 minutos no ar. Se ela aconteceu de verdade, reabra e encerre de novo depois.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { rotulo: "Esperados", valor: resumo.esperados, cor: "text-slate-900" },
          { rotulo: "Entraram", valor: resumo.alunos.length, cor: "text-blue-600" },
          { rotulo: encerrada ? "Presentes" : `Já com ${meta}%`, valor: garantidos, cor: "text-green-600" },
        ].map((c) => (
          <div key={c.rotulo} className="rounded-2xl bg-slate-50 py-3 flex flex-col items-center">
            <span className={`text-2xl font-black leading-none tabular-nums ${c.cor}`}>{c.valor}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1 text-center">{c.rotulo}</span>
          </div>
        ))}
      </div>

      {resumo.alunos.length === 0 ? (
        <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
          <Users className="h-4 w-4" /> Nenhum aluno entrou na sala ainda.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto -mx-1">
          {resumo.alunos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2 px-1">
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-800 truncate">{a.nome}</span>
                <span className="block text-[10px] font-bold text-slate-500">{a.sala ? `Sala ${a.sala}` : "Sem sala"}</span>
              </span>
              <span className="text-xs font-black tabular-nums text-slate-600">{formatarDuracao(a.segundos)}</span>
              {a.presente ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-label="Presente" />
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" aria-label="Ainda não" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
