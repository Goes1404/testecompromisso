"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Mic, MonitorUp, Radio, Square, AlertTriangle } from "lucide-react";
import { podeTransmitirAqui, rotuloDoEstado, type EstadoDaTransmissao } from "@/lib/transmissao";
import { useTransmissaoDoProfessor, type Fontes } from "./useTransmissaoDoProfessor";
import { CARTAO, Rotulo } from "./pecas";

/** Vídeo local (prévia do professor). */
function Previa({ stream, className, muted = true }: { stream: MediaStream | null; className: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

function tempo(desde: number | null, agora: number): string {
  if (!desde) return "";
  const s = Math.max(0, Math.floor((agora - desde) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`;
}

/** Desenho do painel (sem estado de conexão: tudo chega por props). */
export function PainelDeTransmissao({
  estado,
  erro,
  tela,
  camera,
  desde,
  aulaNoAr,
  bloqueio,
  onIniciar,
  onParar,
}: {
  estado: EstadoDaTransmissao;
  erro: string | null;
  tela: MediaStream | null;
  camera: MediaStream | null;
  desde: number | null;
  aulaNoAr: boolean;
  /** Motivo para não poder transmitir daqui (celular), ou null. */
  bloqueio: string | null;
  onIniciar: (f: Fontes) => void;
  onParar: () => void;
}) {
  const [fontes, setFontes] = useState<Fontes>({ camera: false, microfone: true });
  const [agora, setAgora] = useState(Date.now());
  const transmitindo = estado === "no_ar" || estado === "conectando";
  useEffect(() => {
    if (estado !== "no_ar") return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [estado]);

  if (transmitindo || estado === "preparando") {
    return (
      <section className={`${CARTAO} p-1.5 md:p-2 space-y-2`} aria-label="Sua transmissão">
        <div className="relative w-full aspect-video rounded-[1.1rem] overflow-hidden bg-black">
          {tela ? (
            <Previa stream={tela} className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-semibold">
              Escolha a tela, janela ou aba no seletor do navegador…
            </div>
          )}
          {camera && (
            <Previa stream={camera} className="absolute bottom-3 right-3 w-[22%] min-w-[96px] aspect-video rounded-lg object-cover ring-2 ring-black/60" />
          )}
          <span
            className={`absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              estado === "no_ar" ? "bg-red-500 text-white" : "bg-white/15 text-white"
            }`}
          >
            {estado === "no_ar" ? <Radio className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {rotuloDoEstado(estado)} {estado === "no_ar" && <span className="tabular-nums">{tempo(desde, agora)}</span>}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1">
          <p className="text-[11px] font-semibold text-white/55 leading-snug max-w-md">
            {aulaNoAr
              ? "Os alunos estão vendo esta tela na sala. Para trocar de janela, pare e comece de novo."
              : "Os alunos só veem depois que você clicar em Abrir para alunos."}
          </p>
          <button
            type="button"
            onClick={onParar}
            className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Square className="h-3.5 w-3.5 fill-current" /> Parar transmissão
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`${CARTAO} p-4 md:p-5 space-y-4`} aria-label="Transmitir pela plataforma">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
          <MonitorUp className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <Rotulo className="!text-orange-400/80">Transmitir pela plataforma</Rotulo>
          <p className="text-sm font-black italic text-white leading-snug mt-0.5">Compartilhe sua tela direto para os alunos</p>
          <p className="text-xs text-white/55 font-medium leading-relaxed mt-1">
            Sem YouTube, Meet ou Teams: os alunos assistem aqui dentro, com o chat, com menos de 1 segundo de atraso.
          </p>
        </div>
      </div>

      {bloqueio ? (
        <p className="text-xs font-semibold text-amber-300/90 rounded-xl bg-amber-500/10 px-3 py-2.5">{bloqueio}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {([
              { chave: "microfone", rotulo: "Microfone", icone: Mic },
              { chave: "camera", rotulo: "Câmera no canto", icone: Camera },
            ] as const).map((o) => (
              <label
                key={o.chave}
                className={`h-10 px-3 rounded-xl border text-[11px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer select-none ${
                  fontes[o.chave] ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-white/45"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-orange-500 h-4 w-4"
                  checked={fontes[o.chave]}
                  onChange={(e) => setFontes((f) => ({ ...f, [o.chave]: e.target.checked }))}
                />
                <o.icone className="h-3.5 w-3.5" /> {o.rotulo}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onIniciar(fontes)}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20"
          >
            <MonitorUp className="h-4 w-4" /> Transmitir minha tela
          </button>
          <p className="text-[10px] text-white/40 font-medium leading-snug">
            Para os alunos ouvirem o som de um vídeo, escolha uma <b>aba do Chrome</b> no seletor e marque <b>Compartilhar áudio da aba</b>.
          </p>
        </>
      )}

      {erro && (
        <p className="flex items-start gap-2 text-xs font-semibold text-red-300 rounded-xl bg-red-500/10 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
        </p>
      )}
    </section>
  );
}

/** Container do estúdio: liga o hook ao painel. */
export function TransmissaoDoProfessor({ liveId, aulaNoAr }: { liveId: string; aulaNoAr: boolean }) {
  const t = useTransmissaoDoProfessor(liveId);
  const [bloqueio, setBloqueio] = useState<string | null>(null);
  useEffect(() => {
    setBloqueio(podeTransmitirAqui(navigator as any, navigator.userAgent));
  }, []);
  return (
    <PainelDeTransmissao
      estado={t.estado}
      erro={t.erro}
      tela={t.local.tela}
      camera={t.local.camera}
      desde={t.desde}
      aulaNoAr={aulaNoAr}
      bloqueio={bloqueio}
      onIniciar={t.iniciar}
      onParar={t.parar}
    />
  );
}
