"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QUALIDADE, SERVIDORES_ICE, type EstadoDaTransmissao, type NomeDaFaixa } from "@/lib/transmissao";

export type Fontes = { camera: boolean; microfone: boolean };

type Local = { tela: MediaStream | null; camera: MediaStream | null };

/**
 * Transmissão do professor pela plataforma: captura a tela (e, se escolhido,
 * câmera e microfone), publica as faixas no Cloudflare Realtime pela rota
 * `/api/live/transmissao` e mantém o estado para o estúdio desenhar.
 *
 * - Parar o compartilhamento pela barra do navegador também para a transmissão.
 * - Fechar a aba avisa o servidor (`keepalive`), e a sala dos alunos volta a
 *   "aguardando o professor".
 */
export function useTransmissaoDoProfessor(liveId: string) {
  const [estado, setEstado] = useState<EstadoDaTransmissao>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [local, setLocal] = useState<Local>({ tela: null, camera: null });
  const [desde, setDesde] = useState<number | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const sessao = useRef<string | null>(null);
  const capturas = useRef<MediaStream[]>([]);

  const avisarServidor = useCallback(
    (acao: "parar", keepalive = false) =>
      fetch("/api/live/transmissao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, liveId, sessao: sessao.current }),
        keepalive,
      }).catch(() => {}),
    [liveId],
  );

  const desmontar = useCallback(() => {
    capturas.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    capturas.current = [];
    pc.current?.close();
    pc.current = null;
    setLocal({ tela: null, camera: null });
    setDesde(null);
  }, []);

  const parar = useCallback(async () => {
    const tinha = !!sessao.current;
    desmontar();
    setEstado("parado");
    setErro(null);
    if (tinha) await avisarServidor("parar");
    sessao.current = null;
  }, [avisarServidor, desmontar]);

  const iniciar = useCallback(
    async (fontes: Fontes) => {
      setErro(null);
      setEstado("preparando");
      try {
        // 1. Captura. A tela primeiro: é ela que abre o seletor do navegador.
        const tela = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 15, max: 30 }, width: { max: 1920 }, height: { max: 1080 } },
          audio: true, // som da aba/janela, se o professor marcar no seletor
        });
        capturas.current.push(tela);
        let mic: MediaStream | null = null;
        let cam: MediaStream | null = null;
        if (fontes.microfone) {
          mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          capturas.current.push(mic);
        }
        if (fontes.camera) {
          cam = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360, frameRate: 15 } });
          capturas.current.push(cam);
        }
        setLocal({ tela, camera: cam });
        setEstado("conectando");

        // 2. Conexão com o Cloudflare.
        const conexao = new RTCPeerConnection({ iceServers: SERVIDORES_ICE, bundlePolicy: "max-bundle" });
        pc.current = conexao;
        const publicar: { faixa: MediaStreamTrack; nome: NomeDaFaixa }[] = [];
        const vTela = tela.getVideoTracks()[0];
        if (vTela) {
          try {
            vTela.contentHint = "detail"; // texto de slide nítido > movimento fluido
          } catch {}
          publicar.push({ faixa: vTela, nome: "tela" });
        }
        const aTela = tela.getAudioTracks()[0];
        if (aTela) publicar.push({ faixa: aTela, nome: "audio-tela" });
        const aMic = mic?.getAudioTracks()[0];
        if (aMic) publicar.push({ faixa: aMic, nome: "audio-mic" });
        const vCam = cam?.getVideoTracks()[0];
        if (vCam) publicar.push({ faixa: vCam, nome: "camera" });

        const transceptores = publicar.map(({ faixa, nome }) => {
          const t = conexao.addTransceiver(faixa, { direction: "sendonly" });
          const q = nome === "tela" ? QUALIDADE.tela : nome === "camera" ? QUALIDADE.camera : null;
          if (q) {
            const p = t.sender.getParameters();
            p.encodings = [{ ...(p.encodings?.[0] ?? {}), maxBitrate: q.maxBitrate, maxFramerate: q.maxFramerate }];
            t.sender.setParameters(p).catch(() => {});
          }
          return { t, nome };
        });

        const oferta = await conexao.createOffer();
        await conexao.setLocalDescription(oferta);
        const resp = await fetch("/api/live/transmissao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "publicar",
            liveId,
            sdp: conexao.localDescription?.sdp,
            faixas: transceptores.map(({ t, nome }) => ({ mid: t.mid, nome })),
          }),
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(json?.mensagem || "Não foi possível começar a transmissão.");
        await conexao.setRemoteDescription({ type: "answer", sdp: json.sdp });
        // A sessão gravada no banco é a desta transmissão (ver `parar`).
        sessao.current = json.sessao ?? null;

        conexao.addEventListener("connectionstatechange", () => {
          if (conexao.connectionState === "connected") {
            setEstado("no_ar");
            setDesde((d) => d ?? Date.now());
          }
          if (conexao.connectionState === "failed") {
            setEstado("erro");
            setErro("A conexão com o serviço de vídeo caiu. Clique em Transmitir de novo.");
          }
        });

        // Parar pela barra "Parar compartilhamento" do navegador.
        vTela?.addEventListener("ended", () => {
          parar();
        });
      } catch (e: any) {
        desmontar();
        if (e?.name === "NotAllowedError") {
          setEstado("parado");
          setErro("Você cancelou ou não permitiu o compartilhamento.");
          return;
        }
        setEstado("erro");
        setErro(e?.message || "Não foi possível começar a transmissão.");
      }
    },
    [desmontar, liveId, parar],
  );

  // Fechou a aba ou saiu do estúdio: avisa o servidor.
  useEffect(() => {
    const aoSair = () => {
      if (sessao.current) avisarServidor("parar", true);
    };
    window.addEventListener("pagehide", aoSair);
    return () => {
      window.removeEventListener("pagehide", aoSair);
      aoSair();
      desmontar();
    };
  }, [avisarServidor, desmontar]);

  return { estado, erro, local, desde, iniciar, parar };
}
