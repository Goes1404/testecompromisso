"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ExternalLink, Info, Lock, MessagesSquare, Mic } from "lucide-react";
import { linkDoVideo, linkExternoSeguro, quandoE, rotuloDasTurmas, urlDoPlayer } from "@/lib/lives";
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

type Aba = "chat" | "duvida" | "info";

/**
 * A sala do aluno, só desenho. A página (`/dashboard/live/[id]`) busca a aula,
 * manda o sinal de presença e entrega tudo pronto aqui.
 *
 * Formato de app de live (14/10), nos dois tamanhos de tela:
 * - **Celular:** a página NÃO rola. Vídeo em cima, abas logo abaixo, e a aba
 *   ocupa o resto da tela — o chat estica até o campo de digitar. Antes a
 *   página rolava e o chat rolava dentro dela: o dedo que começava em cima do
 *   chat mexia no chat, o que começava fora mexia na página, e arrastar
 *   "travava" no meio. Pauta, Meet e a presença detalhada ficam na aba Info.
 * - **Computador:** vídeo e pauta à esquerda (rola só essa coluna), chat na
 *   coluna da direita do topo ao fim da tela.
 *
 * A rota é "full bleed" (layout sem padding e sem barra inferior): o respiro
 * é daqui.
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
  /** Chat ao vivo da aula (`ChatDaAula` com `preencher`). */
  chat?: ReactNode;
  onVoltar: () => void;
}) {
  const encerrada = aula.status === "completed";
  const noAr = aula.status === "live";
  const temVideo = !!urlDoPlayer(aula.youtube_id);
  const meetLink = linkExternoSeguro(aula.meet_link);
  const temChat = !!chat && !encerrada;
  const [aba, setAba] = useState<Aba>(temChat ? "chat" : "info");
  // No computador não existe a aba Info (o conteúdo dela fica à esquerda).
  const abaAtiva: Aba = !temChat && aba !== "info" ? "info" : aba;

  const abas: { id: Aba; rotulo: string; icone: typeof Lock; soCelular?: boolean }[] = [
    ...(temChat
      ? ([
          { id: "chat", rotulo: "Chat", icone: MessagesSquare },
          { id: "duvida", rotulo: "Dúvida", icone: Lock },
        ] as const)
      : []),
    { id: "info", rotulo: "Info", icone: Info, soCelular: true },
  ];

  const meet = meetLink && !encerrada && (
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
        className="shrink-0 h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
      >
        Meet <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );

  const pauta = aula.description?.trim() && (
    <section className={`${CARTAO} p-4 space-y-1.5`} aria-label="Pauta da aula">
      <Rotulo>Pauta</Rotulo>
      <p className="text-sm text-white/80 font-medium leading-relaxed whitespace-pre-wrap break-words">{aula.description}</p>
    </section>
  );

  const presencaCompleta = noAr && presenca && (
    <IndicadorDePresenca segundos={presenca.segundos} segundosDaAula={presenca.segundosDaAula} />
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 p-2.5 sm:p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[minmax(0,1fr)] lg:gap-4 lg:p-6">
      {/* ── Coluna principal: cabeçalho e vídeo (no computador, também pauta e Meet) ── */}
      <div className="shrink-0 space-y-2.5 lg:space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        <header className={`${CARTAO} relative overflow-hidden px-2.5 py-2 md:p-4`}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 90% 0%, rgba(255,107,0,0.16) 0%, transparent 60%)" }}
          />
          <div className="relative flex items-center gap-2.5">
            <button
              type="button"
              onClick={onVoltar}
              aria-label="Voltar para a lista de aulas"
              className="h-10 w-10 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center touch-manipulation"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm md:text-xl font-black italic tracking-tight text-white leading-tight break-words">
                {aula.title || "Aula ao vivo"}
              </h1>
              <p className="text-[11px] font-semibold text-white/50 mt-0.5 leading-snug">
                {aula.teacher_name || "Aula ao vivo"}
                {/* Turma e horário só a partir do tablet: no celular cada linha
                    a menos aqui é uma mensagem a mais no chat. */}
                <span className="hidden sm:inline">
                  {[rotuloDasTurmas(aula.turmas), quandoE(aula.start_time)].filter(Boolean).map((t) => ` · ${t}`).join("")}
                </span>
              </p>
            </div>
            <SeloDeStatus status={aula.status} />
          </div>
        </header>

        {temVideo ? (
          <PlayerDoYoutube videoId={aula.youtube_id} titulo={aula.title || "Aula ao vivo"} />
        ) : (
          <PalcoDeEspera status={aula.status} inicio={aula.start_time} meetLink={meetLink} />
        )}

        <div className="hidden lg:block space-y-4">
          {meet}
          {pauta}
        </div>
      </div>

      {/* ── Coluna do chat: no celular, o resto da tela ── */}
      <aside className="flex-1 min-h-[260px] lg:min-h-0 flex flex-col gap-2.5 lg:gap-3">
        {noAr && presenca && (
          <>
            <BarraDePresenca segundos={presenca.segundos} segundosDaAula={presenca.segundosDaAula} onDetalhes={() => setAba("info")} />
            <div className="hidden lg:block">{presencaCompleta}</div>
          </>
        )}

        {abas.length > 1 && (
          <div
            className={`${CARTAO} shrink-0 grid gap-1 p-1 rounded-2xl ${temChat ? "grid-cols-3 lg:grid-cols-2" : "grid-cols-1"}`}
            role="tablist"
            aria-label="Chat, dúvida ou informações"
          >
            {abas.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={abaAtiva === t.id}
                onClick={() => setAba(t.id)}
                className={`h-10 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 touch-manipulation ${
                  abaAtiva === t.id ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
                } ${t.soCelular ? "lg:hidden" : ""}`}
              >
                <t.icone className="h-3.5 w-3.5" /> {t.rotulo}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col">
          {temChat && (
            // O chat fica montado mesmo em outra aba: trocar de aba e voltar
            // não recarrega nada nem perde a posição da rolagem.
            // (No computador a aba Info não existe: lá o chat aparece no lugar dela.)
            <div className={`flex-1 min-h-0 flex-col ${abaAtiva === "chat" ? "flex" : abaAtiva === "info" ? "hidden lg:flex" : "hidden"}`}>{chat}</div>
          )}
          {temChat && abaAtiva === "duvida" && (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-[1.5rem]">{duvidas}</div>
          )}
          {abaAtiva === "info" && (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2.5 lg:hidden rounded-[1.5rem]">
              {presencaCompleta}
              {temVideo && linkDoVideo(aula.youtube_id) && (
                <a
                  href={linkDoVideo(aula.youtube_id)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${CARTAO} flex items-center justify-center gap-1.5 h-11 text-[11px] font-black uppercase tracking-widest text-white/70`}
                >
                  Vídeo travando? Abrir no app do YouTube <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {meet}
              {pauta}
              {!presencaCompleta && !meet && !pauta && (
                <p className={`${CARTAO} p-4 text-xs text-white/50 font-medium`}>
                  {encerrada ? "Esta aula já terminou." : "O professor não colocou pauta para esta aula."}
                </p>
              )}
            </div>
          )}
          {abaAtiva === "info" && encerrada && (
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <p className="text-xs text-white/50 font-medium">Esta aula já terminou.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/**
 * Presença numa linha (celular). A versão completa, com a explicação da
 * regra, fica na aba Info — tocar aqui leva até ela.
 */
function BarraDePresenca({
  segundos,
  segundosDaAula,
  onDetalhes,
}: {
  segundos: number;
  segundosDaAula: number;
  onDetalhes: () => void;
}) {
  const pct = segundosDaAula > 0 ? Math.min(100, Math.round((segundos / segundosDaAula) * 100)) : 0;
  const ok = pct >= 60;
  return (
    <button
      type="button"
      onClick={onDetalhes}
      className={`${CARTAO} lg:hidden shrink-0 flex items-center gap-3 px-3.5 py-2 text-left touch-manipulation`}
      aria-label={`Sua presença: ${pct}% da aula. Toque para ver detalhes.`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-white/45 shrink-0">Presença</span>
      <span className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <span className={`absolute inset-y-0 left-0 rounded-full ${ok ? "bg-emerald-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-y-0 w-0.5 bg-white/60" style={{ left: "60%" }} aria-hidden />
      </span>
      <span className={`text-[11px] font-black tabular-nums shrink-0 ${ok ? "text-emerald-400" : "text-white/80"}`}>{pct}%</span>
    </button>
  );
}

/** Esqueleto no formato da sala, no lugar do antigo "Sintonizando satélite…". */
export function SalaCarregando() {
  return (
    <div
      className="flex-1 min-h-0 flex flex-col gap-2.5 p-2.5 sm:p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 lg:p-6"
      aria-busy="true"
      aria-label="Carregando a aula"
    >
      <div className="space-y-2.5 lg:space-y-4">
        <div className={`${CARTAO} h-[62px] animate-pulse`} />
        <div className={`${CARTAO} aspect-video animate-pulse`} />
      </div>
      <div className={`${CARTAO} flex-1 min-h-[200px] animate-pulse`} />
    </div>
  );
}
