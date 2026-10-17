import Link from "next/link";
import { ChevronRight, Clapperboard, Play, Radio, Tv } from "lucide-react";
import { quandoE, rotuloDasTurmas } from "@/lib/lives";
import type { AulaNaTela } from "./SalaDoAluno";
import { CARTAO, Rotulo, SeloDeStatus } from "./pecas";

type Aula = AulaNaTela & { id: string };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Lista do aluno (`/dashboard/live`), só desenho. */
export function ListaDeAulas({ aulas, carregando }: { aulas: Aula[]; carregando: boolean }) {
  const noAr = aulas.filter((a) => a.status === "live");
  const proximas = aulas.filter((a) => a.status === "scheduled");
  // Gravadas: a mais recente primeiro (a lista vem em ordem de horário).
  const gravadas = aulas
    .filter((a) => a.status === "completed")
    .sort((x, y) => (y.start_time ?? "").localeCompare(x.start_time ?? ""));

  return (
    <div className="pb-28 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className={`${CARTAO} relative overflow-hidden p-5 rounded-[2rem]`}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 85% 5%, rgba(239,68,68,0.18) 0%, transparent 60%), radial-gradient(ellipse at 5% 95%, rgba(255,107,0,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="h-3 w-3 text-red-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">Ao vivo</p>
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">Aulões</h1>
            <p className="text-white/60 text-xs font-semibold mt-1">Assista aqui dentro. Sua presença conta sozinha.</p>
          </div>
          <div className="flex flex-col items-center bg-red-500/10 border border-red-500/20 rounded-2xl px-3 py-2 min-w-[52px] shrink-0">
            <span className="text-lg font-black text-red-400 leading-none">{carregando ? "–" : noAr.length}</span>
            <span className="text-[7px] font-bold text-red-400/70 uppercase tracking-wider mt-0.5">No ar</span>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="space-y-3" aria-busy="true" aria-label="Carregando aulas">
          <div className={`${CARTAO} h-40 animate-pulse`} />
          <div className={`${CARTAO} h-20 animate-pulse`} />
          <div className={`${CARTAO} h-20 animate-pulse`} />
        </div>
      ) : aulas.length === 0 ? (
        <div className={`${CARTAO} flex flex-col items-center gap-2 py-12 px-6 text-center`}>
          <div className="h-12 w-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center mb-1">
            <Tv className="h-6 w-6" />
          </div>
          <p className="text-sm font-black italic text-white">Nenhuma aula ao vivo marcada</p>
          <p className="text-xs font-medium text-white/45 max-w-xs leading-relaxed">
            Quando um professor agendar um aulão para a sua turma, ele aparece aqui.
          </p>
        </div>
      ) : (
        <>
          {noAr.length > 0 && (
            <section className="space-y-2" aria-label="Aulas no ar agora">
              <Rotulo className="!text-muted-foreground px-1">Agora</Rotulo>
              {noAr.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/live/${a.id}`}
                  className={`${CARTAO} block p-4 space-y-3 border-red-500/30 transition-transform active:scale-[0.99] touch-manipulation`}
                  style={{ boxShadow: "0 0 0 1px rgba(239,68,68,0.15), 0 16px 40px -20px rgba(239,68,68,0.55)" }}
                >
                  <div className="flex items-center gap-2">
                    <SeloDeStatus status="live" />
                    <span className="text-[10px] font-bold text-white/45 truncate">{rotuloDasTurmas(a.turmas)}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black italic text-white leading-tight">{a.title}</h2>
                    {a.teacher_name && <p className="text-xs font-semibold text-white/55 mt-0.5">com {a.teacher_name}</p>}
                  </div>
                  <span className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-500/25">
                    <Play className="h-4 w-4 fill-current" /> Assistir agora
                  </span>
                </Link>
              ))}
            </section>
          )}

          {proximas.length > 0 && (
            <section className="space-y-2" aria-label="Próximas aulas">
              <Rotulo className="!text-muted-foreground px-1">Próximas</Rotulo>
              {proximas.map((a) => {
                const d = a.start_time ? new Date(a.start_time) : null;
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/live/${a.id}`}
                    className={`${CARTAO} flex items-center gap-3 p-3 transition-colors hover:border-white/20 active:scale-[0.99] touch-manipulation`}
                  >
                    <div className="w-12 shrink-0 rounded-xl bg-white/5 py-1.5 flex flex-col items-center">
                      <span className="text-lg font-black italic text-white leading-none">{d ? String(d.getDate()).padStart(2, "0") : "–"}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-orange-400 mt-0.5">{d ? MESES[d.getMonth()] : ""}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-black italic text-white leading-snug line-clamp-2">{a.title}</h2>
                      <p className="text-[11px] font-black text-orange-300/90 mt-0.5">{quandoE(a.start_time)}</p>
                      {a.teacher_name && (
                        <p className="text-[11px] font-semibold text-white/50 leading-snug break-words">{a.teacher_name}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                  </Link>
                );
              })}
            </section>
          )}

          {gravadas.length > 0 && (
            <section className="space-y-2" aria-label="Aulas gravadas">
              <Rotulo className="!text-muted-foreground px-1">Gravadas · assista quando quiser</Rotulo>
              {gravadas.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/live/${a.id}`}
                  className={`${CARTAO} flex items-center gap-3 p-3 transition-colors hover:border-white/20 active:scale-[0.99] touch-manipulation`}
                >
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5 text-white/70 flex items-center justify-center">
                    <Clapperboard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black italic text-white leading-snug line-clamp-2">{a.title}</h2>
                    <p className="text-[11px] font-semibold text-white/50 leading-snug break-words">
                      {[a.teacher_name, quandoE(a.start_time)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
