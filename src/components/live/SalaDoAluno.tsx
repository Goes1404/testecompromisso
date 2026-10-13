"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ExternalLink, Lock, MessagesSquare, Mic } from "lucide-react";
import { linkExternoSeguro, quandoE, rotuloDasTurmas, urlDoPlayer } from "@/lib/lives";
import { PlayerDoYoutube } from "./PlayerDoYoutube";
import { IndicadorDePresenca } from "./IndicadorDePresenca";
import { CARTAO, PalcoDeEspera, Rotulo, SeloDeStatus } from "./pecas";

export type AulaNaTela = {
  title: string | null;
  description?: string | null;
  status: string | null;
  start_time: string | null;
  teacher_name?: string | null;
  youtube_id?: string | null;
  meet_link?: string | null;
  turmas?: string[] | null;
};

/**
 * A sala do aluno, só desenho. A página (`/dashboard/live/[id]`) busca a aula,
 * manda o sinal de presença e entrega tudo pronto aqui.
 *
 * A rota NÃO é "full bleed" (desde 13/10): o layout do dashboard dá o padding
 * e a folga da barra inferior, então esta tela não põe margem de borda.
 */
export function SalaDoAluno({
  aula,
  presenca,
  duvidas,
  chat,
  onVoltar,
}: {
  aula: AulaNaTela;
  presenca: { segundos: number; segundosDaAula: number } | null;
  duvidas: ReactNode;
  /** Chat da aula (o do YouTube). Só aparece quando a aula tem vídeo. */
  chat?: ReactNode;
  onVoltar: () => void;
}) {
  const [aba, setAba] = useState<"chat" | "duvida">("chat");
  const temVideo = !!urlDoPlayer(aula.youtube_id);
  const meetLink = linkExternoSeguro(aula.meet_link);
  const encerrada = aula.status === "completed";
  const noAr = aula.status === "live";
  const temChat = temVideo && !!chat;
  const abaAtiva = temChat ? aba : "duvida";

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-in fade-in duration-500">
      <header className={`${CARTAO} relative overflow-hidden p-3 md:p-4`}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 90% 0%, rgba(255,107,0,0.16) 0%, transparent 60%)" }}
        />
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar para a lista de aulas"
            className="h-10 w-10 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors touch-manipulation"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-xl font-black italic tracking-tight text-white leading-tight line-clamp-2">
              {aula.title || "Aula ao vivo"}
            </h1>
            <p className="text-[11px] font-semibold text-white/50 mt-0.5 leading-snug">
              {[aula.teacher_name, rotuloDasTurmas(aula.turmas), quandoE(aula.start_time)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <SeloDeStatus status={aula.status} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] items-start">
        <div className="space-y-3 min-w-0">
          {temVideo ? (
            <PlayerDoYoutube videoId={aula.youtube_id} titulo={aula.title || "Aula ao vivo"} />
          ) : (
            <PalcoDeEspera status={aula.status} inicio={aula.start_time} meetLink={meetLink} />
          )}

          {temVideo && meetLink && !encerrada && (
            <div className={`${CARTAO} p-3 flex items-center gap-3`}>
              <div className="h-9 w-9 shrink-0 rounded-xl bg-white/5 text-white/70 flex items-center justify-center">
                <Mic className="h-4 w-4" />
              </div>
              <p className="flex-1 text-xs text-white/65 font-medium leading-snug">
                Quer falar com o professor? Há uma sala no Meet com vagas limitadas.
              </p>
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                Meet <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <aside className="space-y-3 min-w-0 lg:row-span-2 lg:sticky lg:top-4">
          {noAr && presenca && <IndicadorDePresenca segundos={presenca.segundos} segundosDaAula={presenca.segundosDaAula} />}
          {!encerrada && temChat && (
            <div className={`${CARTAO} grid grid-cols-2 gap-1 p-1 rounded-2xl`} role="tablist" aria-label="Chat ou dúvida">
              {([
                { id: "chat", rotulo: "Chat da aula", icone: MessagesSquare },
                { id: "duvida", rotulo: "Dúvida privada", icone: Lock },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={abaAtiva === t.id}
                  onClick={() => setAba(t.id)}
                  className={`h-10 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all touch-manipulation ${
                    abaAtiva === t.id ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
                  }`}
                >
                  <t.icone className="h-3.5 w-3.5" /> {t.rotulo}
                </button>
              ))}
            </div>
          )}
          {!encerrada && (abaAtiva === "chat" ? chat : duvidas)}
        </aside>

        {aula.description?.trim() && (
          <section className={`${CARTAO} p-4 space-y-1.5 lg:col-start-1`} aria-label="Pauta da aula">
            <Rotulo>Pauta</Rotulo>
            <p className="text-sm text-white/80 font-medium leading-relaxed whitespace-pre-wrap break-words">
              {aula.description}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/** Esqueleto no formato da sala, no lugar do antigo "Sintonizando satélite…". */
export function SalaCarregando() {
  return (
    <div className="w-full space-y-3 md:space-y-4" aria-busy="true" aria-label="Carregando a aula">
      <div className={`${CARTAO} h-[66px] animate-pulse`} />
      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`${CARTAO} aspect-video animate-pulse`} />
        <div className={`${CARTAO} h-48 animate-pulse`} />
      </div>
    </div>
  );
}
