import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ChevronRight, Loader2, Pencil, Radio, Trash2, Tv, Youtube } from "lucide-react";
import { agruparAgenda, quandoE, rotuloDasTurmas } from "@/lib/lives";
import type { AulaNaTela } from "./SalaDoAluno";
import { CARTAO, Rotulo, SeloDeStatus } from "./pecas";

type Aula = AulaNaTela & { id: string };

/** Cabeçalho da agenda do professor, no molde do Mural. */
export function CabecalhoDaAgenda({ noAr, proximas, botao }: { noAr: number; proximas: number; botao: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className={`${CARTAO} relative overflow-hidden p-5 rounded-[2rem]`}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 85% 5%, rgba(255,107,0,0.18) 0%, transparent 60%), radial-gradient(ellipse at 5% 95%, rgba(239,68,68,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="h-3 w-3 text-orange-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/80">Ao vivo</p>
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">Aulões</h1>
            <p className="text-white/60 text-xs font-semibold mt-1">Agende, transmita pelo YouTube e a chamada sai sozinha.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="flex flex-col items-center bg-red-500/10 border border-red-500/20 rounded-2xl px-3 py-2 min-w-[52px]">
              <span className="text-lg font-black text-red-400 leading-none">{noAr}</span>
              <span className="text-[7px] font-bold text-red-400/70 uppercase tracking-wider mt-0.5">No ar</span>
            </div>
            <div className="flex flex-col items-center bg-orange-500/10 border border-orange-500/20 rounded-2xl px-3 py-2 min-w-[52px]">
              <span className="text-lg font-black text-orange-400 leading-none">{proximas}</span>
              <span className="text-[7px] font-bold text-orange-400/70 uppercase tracking-wider mt-0.5">Próximas</span>
            </div>
          </div>
        </div>
      </div>
      {botao}
    </div>
  );
}

function CartaoDaAgenda({
  aula,
  excluindo,
  onEditar,
  onExcluir,
}: {
  aula: Aula;
  excluindo: boolean;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const noAr = aula.status === "live";
  const encerrada = aula.status === "completed";

  return (
    <div
      className={`${CARTAO} p-3.5 space-y-3 ${noAr ? "border-red-500/30" : ""}`}
      style={noAr ? { boxShadow: "0 0 0 1px rgba(239,68,68,0.15), 0 16px 40px -20px rgba(239,68,68,0.55)" } : undefined}
    >
      <Link href={`/dashboard/teacher/live/${aula.id}`} className="flex items-start gap-3 group">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <SeloDeStatus status={aula.status} />
            <span className="text-[10px] font-bold text-white/50">{quandoE(aula.start_time)}</span>
          </div>
          <h2 className={`text-sm font-black italic leading-snug line-clamp-2 group-hover:text-orange-300 transition-colors ${encerrada ? "text-white/60" : "text-white"}`}>
            {aula.title}
          </h2>
          <p className="text-[11px] font-semibold text-white/45 truncate">{rotuloDasTurmas(aula.turmas)}</p>
          {!encerrada &&
            (aula.youtube_id ? (
              <p className="text-[10px] font-bold text-white/55 flex items-center gap-1.5">
                <Youtube className="h-3 w-3 text-red-400" /> Transmissão do YouTube pronta
              </p>
            ) : (
              <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" /> Sem link do YouTube: só cabem 100 no Meet
              </p>
            ))}
        </div>
        <ChevronRight className="h-4 w-4 text-white/30 shrink-0 mt-1" />
      </Link>

      <div className="flex items-center gap-1.5 pt-3 border-t border-white/5">
        <button
          type="button"
          onClick={onExcluir}
          disabled={excluindo}
          aria-label="Excluir aula"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
        >
          {excluindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={onEditar}
          className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/70 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <Pencil className="h-3 w-3" /> Editar
        </button>
        <Link
          href={`/dashboard/teacher/live/${aula.id}`}
          className={`ml-auto h-8 px-4 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
            noAr
              ? "bg-red-500 text-white hover:bg-red-600"
              : encerrada
                ? "bg-white/10 text-white/80 hover:bg-white/15"
                : "bg-orange-500 text-white hover:bg-orange-600"
          }`}
        >
          {noAr ? "Voltar ao estúdio" : encerrada ? "Ver chamada e dúvidas" : "Abrir estúdio"}
        </Link>
      </div>
    </div>
  );
}

/** A lista da agenda, agrupada (no ar, próximas, anteriores). */
export function ListaDaAgenda({
  aulas,
  carregando,
  excluindoId,
  onEditar,
  onExcluir,
}: {
  aulas: Aula[];
  carregando: boolean;
  excluindoId: string | null;
  onEditar: (aula: Aula) => void;
  onExcluir: (aula: Aula) => void;
}) {
  if (carregando) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Carregando a agenda">
        <div className={`${CARTAO} h-36 animate-pulse`} />
        <div className={`${CARTAO} h-36 animate-pulse`} />
      </div>
    );
  }

  if (aulas.length === 0) {
    return (
      <div className={`${CARTAO} flex flex-col items-center gap-2 py-12 px-6 text-center`}>
        <div className="h-12 w-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center mb-1">
          <Tv className="h-6 w-6" />
        </div>
        <p className="text-sm font-black italic text-white">Nenhuma aula agendada</p>
        <p className="text-xs font-medium text-white/45 max-w-xs leading-relaxed">
          Agende um aulão, cole o link da transmissão do YouTube e escolha as turmas.
        </p>
      </div>
    );
  }

  const { noAr, proximas, anteriores } = agruparAgenda(aulas);
  const grupos = [
    { titulo: "No ar", lista: noAr },
    { titulo: "Próximas", lista: proximas },
    { titulo: "Anteriores", lista: anteriores },
  ].filter((g) => g.lista.length > 0);

  return (
    <div className="space-y-5">
      {grupos.map((g) => (
        <section key={g.titulo} className="space-y-2" aria-label={g.titulo}>
          <Rotulo className="!text-muted-foreground px-1">{g.titulo}</Rotulo>
          {g.lista.map((a) => (
            <CartaoDaAgenda
              key={a.id}
              aula={a}
              excluindo={excluindoId === a.id}
              onEditar={() => onEditar(a)}
              onExcluir={() => onExcluir(a)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
