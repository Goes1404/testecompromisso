"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Radio, Volume2, VolumeX } from "lucide-react";
import { SERVIDORES_ICE, destinoDaFaixa, faixasDaAula, type NomeDaFaixa } from "@/lib/transmissao";
import { CARTAO } from "./pecas";

type Estado = "conectando" | "assistindo" | "aguardando";

/**
 * O aluno assistindo à transmissão feita pela plataforma (Cloudflare
 * Realtime). Mesmo formato 16:9 do player do YouTube, para a sala não mudar.
 *
 * - Abre a própria sessão pela rota `/api/live/transmissao` (`assistir` →
 *   oferta do Cloudflare → resposta do aluno → `responder`).
 * - A tela do professor vai no vídeo grande; a câmera, no canto.
 * - O vídeo começa MUDO (o celular bloqueia som automático) com um botão
 *   "Ativar som" bem visível.
 * - Caiu? Tenta de novo sozinho, a cada 4 s. Professor parou? Fica em
 *   "aguardando" e volta quando ele recomeçar (a sala relê a aula e muda a
 *   `sessaoDoProfessor`).
 */
export function PlayerDaPlataforma({
  liveId,
  sessaoDoProfessor,
  faixas: faixasBrutas,
  titulo,
}: {
  liveId: string;
  sessaoDoProfessor: string;
  faixas: unknown;
  titulo: string;
}) {
  const principal = useRef<HTMLVideoElement>(null);
  const canto = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<Estado>("conectando");
  const [mudo, setMudo] = useState(true);
  const [temCanto, setTemCanto] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const publicadas = faixasDaAula(faixasBrutas);
  const chavePublicadas = publicadas.map((f) => f.nome).join(",");

  useEffect(() => {
    let vivo = true;
    let conexao: RTCPeerConnection | null = null;
    let retentar: ReturnType<typeof setTimeout> | null = null;
    const deNovo = (ms: number) => {
      if (!vivo) return;
      retentar = setTimeout(() => vivo && setTentativa((t) => t + 1), ms);
    };

    (async () => {
      setEstado((e) => (e === "assistindo" ? e : "conectando"));
      try {
        const r = await fetch("/api/live/transmissao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "assistir", liveId }),
        });
        const j = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (!r.ok) {
          setEstado("aguardando");
          return deNovo(r.status === 409 ? 6000 : 10000);
        }

        const porMid = new Map<string, NomeDaFaixa>((j.faixas as { mid: string; nome: NomeDaFaixa }[]).map((f) => [f.mid, f.nome]));
        const fluxoPrincipal = new MediaStream();
        const fluxoCanto = new MediaStream();
        conexao = new RTCPeerConnection({ iceServers: SERVIDORES_ICE, bundlePolicy: "max-bundle" });
        conexao.ontrack = (ev) => {
          const nome = porMid.get(ev.transceiver.mid ?? "") ?? (ev.track.kind === "audio" ? "audio-mic" : "tela");
          const destino = destinoDaFaixa(nome, publicadas);
          if (destino === "canto") {
            fluxoCanto.addTrack(ev.track);
            if (canto.current) canto.current.srcObject = fluxoCanto;
            setTemCanto(true);
          } else {
            fluxoPrincipal.addTrack(ev.track);
            if (principal.current && principal.current.srcObject !== fluxoPrincipal) principal.current.srcObject = fluxoPrincipal;
          }
        };
        conexao.onconnectionstatechange = () => {
          const s = conexao?.connectionState;
          if (s === "connected") setEstado("assistindo");
          if (s === "failed" || s === "closed") {
            setEstado("aguardando");
            deNovo(4000);
          }
        };

        await conexao.setRemoteDescription({ type: "offer", sdp: j.sdp });
        const resposta = await conexao.createAnswer();
        await conexao.setLocalDescription(resposta);
        const r2 = await fetch("/api/live/transmissao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acao: "responder", sessao: j.sessao, assinatura: j.assinatura, sdp: conexao.localDescription?.sdp }),
        });
        if (!r2.ok) throw new Error("responder");
      } catch {
        if (!vivo) return;
        setEstado("aguardando");
        deNovo(5000);
      }
    })();

    return () => {
      vivo = false;
      if (retentar) clearTimeout(retentar);
      conexao?.close();
      setTemCanto(false);
    };
    // `chavePublicadas` muda quando o professor troca câmera/microfone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, sessaoDoProfessor, chavePublicadas, tentativa]);

  const alternarSom = () => {
    const v = principal.current;
    if (!v) return;
    v.muted = !v.muted;
    setMudo(v.muted);
    v.play().catch(() => {});
  };

  return (
    <div className={`${CARTAO} p-1 md:p-2`}>
      <div className="relative w-full aspect-video rounded-[1.1rem] overflow-hidden bg-black">
        <video
          ref={principal}
          autoPlay
          playsInline
          muted={mudo}
          aria-label={titulo}
          className="absolute inset-0 h-full w-full object-contain"
        />
        <video
          ref={canto}
          autoPlay
          playsInline
          muted
          aria-hidden
          className={`absolute bottom-2 right-2 w-[26%] min-w-[84px] aspect-video rounded-lg object-cover ring-2 ring-black/60 ${temCanto ? "" : "hidden"}`}
        />

        {estado !== "assistindo" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center px-6">
            {estado === "conectando" ? (
              <Loader2 className="h-6 w-6 text-white/60 animate-spin" />
            ) : (
              <Radio className="h-6 w-6 text-red-400 animate-pulse" />
            )}
            <p className="text-sm font-black italic text-white">
              {estado === "conectando" ? "Conectando à transmissão…" : "Aguardando o professor transmitir"}
            </p>
            <p className="text-[11px] text-white/50 font-medium">Deixe esta tela aberta: a imagem aparece sozinha.</p>
          </div>
        )}

        {estado === "assistindo" && (
          <button
            type="button"
            onClick={alternarSom}
            className={`absolute left-2 bottom-2 h-10 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 touch-manipulation ${
              mudo ? "bg-orange-500 text-white shadow-lg" : "bg-black/60 text-white/80"
            }`}
          >
            {mudo ? <><VolumeX className="h-4 w-4" /> Ativar som</> : <><Volume2 className="h-4 w-4" /> Som ligado</>}
          </button>
        )}
      </div>
    </div>
  );
}
