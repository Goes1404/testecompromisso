import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronLeft, ExternalLink, Loader2, MessagesSquare, Pencil, Power, Youtube } from "lucide-react";
import { linkDoChatEmJanela, linkDoStudio, linkExternoSeguro, proximoStatus, quandoE, rotuloDasTurmas, urlDoPlayer } from "@/lib/lives";
import { PlayerDoYoutube } from "./PlayerDoYoutube";
import type { AulaNaTela } from "./SalaDoAluno";
import { CARTAO, Rotulo, SeloDeStatus } from "./pecas";

const ETAPAS = [
  { status: "scheduled", rotulo: "Agendada" },
  { status: "live", rotulo: "No ar" },
  { status: "completed", rotulo: "Encerrada" },
] as const;

const COR_DA_ACAO: Record<string, string> = {
  live: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25",
  completed: "bg-red-500 hover:bg-red-600 shadow-red-500/25",
};

/**
 * O estúdio do professor, só desenho. A página busca a aula e troca o status;
 * dúvidas e chamada chegam prontas como `duvidas` e `chamada`.
 * Rota "full bleed": o respiro das bordas é daqui.
 */
export function EstudioDoProfessor({
  aula,
  atualizando,
  onTrocarStatus,
  onVoltar,
  duvidas,
  chamada,
}: {
  aula: AulaNaTela;
  atualizando: boolean;
  onTrocarStatus: () => void;
  onVoltar: () => void;
  duvidas: ReactNode;
  chamada: ReactNode;
}) {
  const acao = proximoStatus(aula.status);
  const temVideo = !!urlDoPlayer(aula.youtube_id);
  const studio = linkDoStudio(aula.youtube_id);
  const chatEmJanela = linkDoChatEmJanela(aula.youtube_id);
  const meet = linkExternoSeguro(aula.meet_link);
  const indiceAtual = Math.max(0, ETAPAS.findIndex((e) => e.status === aula.status));

  return (
    <div className="w-full max-w-7xl mx-auto p-3 md:p-6 pb-28 lg:pb-6 space-y-3 md:space-y-4 animate-in fade-in duration-500">
      <header className={`${CARTAO} relative overflow-hidden p-4 md:p-5 space-y-4`}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 90% 0%, rgba(255,107,0,0.16) 0%, transparent 60%)" }}
        />
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar para a agenda"
            className="h-10 w-10 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <Rotulo className="!text-orange-400/80">Estúdio</Rotulo>
            <h1 className="text-lg md:text-2xl font-black italic tracking-tight text-white leading-tight line-clamp-2">
              {aula.title || "Aula ao vivo"}
            </h1>
            <p className="text-[11px] font-semibold text-white/50 mt-0.5 leading-snug">
              {rotuloDasTurmas(aula.turmas)} · {quandoE(aula.start_time)}
            </p>
          </div>
          <div className="hidden sm:block">
            <SeloDeStatus status={aula.status} />
          </div>
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center gap-3">
          <ol className="flex items-center gap-1.5 flex-1" aria-label="Etapas da aula">
            {ETAPAS.map((e, i) => {
              const feita = i < indiceAtual;
              const atual = i === indiceAtual;
              return (
                <li key={e.status} className="flex items-center gap-1.5 flex-1 last:flex-none">
                  <span
                    className={`h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                      atual
                        ? e.status === "live"
                          ? "bg-red-500 text-white"
                          : "bg-white text-[#0d0d0f]"
                        : feita
                          ? "bg-white/10 text-white/70"
                          : "bg-white/5 text-white/35"
                    }`}
                    aria-current={atual ? "step" : undefined}
                  >
                    {feita && <Check className="h-3 w-3" />}
                    {e.rotulo}
                  </span>
                  {i < ETAPAS.length - 1 && <span className={`h-px flex-1 ${feita ? "bg-white/30" : "bg-white/10"}`} />}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={onTrocarStatus}
            disabled={atualizando}
            className={`h-11 px-5 rounded-xl text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.97] disabled:opacity-50 ${
              COR_DA_ACAO[acao.para] && aula.status !== "completed" ? COR_DA_ACAO[acao.para] : "bg-white/10 hover:bg-white/15 shadow-none"
            }`}
          >
            {atualizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            {acao.rotulo}
          </button>
        </div>

        <div className="relative flex flex-wrap gap-1.5">
          {studio && (
            <a href={studio} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/75 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors">
              <Youtube className="h-3.5 w-3.5 text-red-400" /> YouTube Studio <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
          {chatEmJanela && (
            <a href={chatEmJanela} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/75 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors">
              <MessagesSquare className="h-3.5 w-3.5 text-orange-400" /> Chat da aula <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
          {meet && (
            <a href={meet} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/75 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors">
              Meet <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
          <Link href="/dashboard/teacher/live" className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/75 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors">
            <Pencil className="h-3 w-3" /> Editar aula
          </Link>
        </div>
      </header>

      {aula.status === "scheduled" && (
        <section className={`${CARTAO} p-4 md:p-5`} aria-label="Como fazer a aula">
          <Rotulo className="mb-3">Como fazer a aula</Rotulo>
          <ol className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                feito: temVideo,
                texto: temVideo
                  ? "Link do YouTube colado. Os alunos vão assistir aqui dentro."
                  : "Cole o link da transmissão não listada em Editar aula. Sem ele, só cabem 100 no Meet.",
              },
              {
                feito: false,
                texto:
                  "Nas configurações da transmissão: visibilidade Não listada, \"Permitir incorporação\" ligado, chat ativado e público \"Não é conteúdo para crianças\" — senão o YouTube desliga o chat.",
              },
              { feito: false, texto: "No YouTube Studio, pelo computador, comece a transmitir. Os comentários dos alunos aparecem no chat do Studio." },
              { feito: false, texto: "Volte aqui e clique em Abrir para alunos. Ao terminar, Encerrar aula gera a chamada." },
            ].map((p, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-white/[0.04] border border-white/5 p-3">
                <span
                  className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black ${
                    p.feito ? "bg-emerald-500 text-white" : i === 0 ? "bg-amber-500 text-[#0d0d0f]" : "bg-white/10 text-white/70"
                  }`}
                >
                  {p.feito ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <p className="text-xs text-white/70 font-medium leading-snug">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] items-start">
        <div className="space-y-3 min-w-0">
          {temVideo ? (
            <PlayerDoYoutube videoId={aula.youtube_id} titulo={aula.title || "Aula ao vivo"} />
          ) : (
            <div className={`${CARTAO} aspect-video flex flex-col items-center justify-center text-center gap-3 p-6`}>
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <Youtube className="h-6 w-6" />
              </div>
              <p className="text-base font-black italic text-white">Falta o link do YouTube</p>
              <p className="text-xs text-white/50 font-medium max-w-sm leading-relaxed">
                Sem ele, os alunos só têm o Meet, que no plano grátis aceita 100 pessoas e corta em 60 minutos.
              </p>
              <Link href="/dashboard/teacher/live" className="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                <Pencil className="h-3.5 w-3.5" /> Colar o link
              </Link>
            </div>
          )}
        </div>

        <aside className="space-y-3 min-w-0 lg:row-span-2 lg:sticky lg:top-4">{duvidas}</aside>

        <div className="min-w-0 lg:col-start-1">{chamada}</div>
      </div>
    </div>
  );
}

export function EstudioCarregando() {
  return (
    <div className="w-full max-w-7xl mx-auto p-3 md:p-6 space-y-3 md:space-y-4" aria-busy="true" aria-label="Carregando o estúdio">
      <div className={`${CARTAO} h-40 animate-pulse`} />
      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className={`${CARTAO} aspect-video animate-pulse`} />
        <div className={`${CARTAO} h-64 animate-pulse`} />
      </div>
    </div>
  );
}
