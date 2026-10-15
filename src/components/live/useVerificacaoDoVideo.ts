"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { verificacaoIndisponivel, type Verificacao } from "@/lib/live-video";

/**
 * Confere, pelo servidor, se o vídeo do YouTube da aula abre para os alunos.
 *
 * Roda sozinho quando o estúdio abre com link e aula ainda não encerrada, e
 * de novo quando o link muda. `verificar()` é para o botão "Verificar de
 * novo" e para o passo de abrir a sala, que sempre pergunta de novo: o
 * professor pode ter mexido na visibilidade no YouTube Studio desde então.
 */
export function useVerificacaoDoVideo(videoId: string | null | undefined, ativo: boolean) {
  const [verificacao, setVerificacao] = useState<Verificacao | null>(null);
  const [verificando, setVerificando] = useState(false);
  const emCurso = useRef<Promise<Verificacao> | null>(null);

  const verificar = useCallback(async (): Promise<Verificacao | null> => {
    if (!videoId) return null;
    if (emCurso.current) return emCurso.current;
    setVerificando(true);
    const promessa = (async () => {
      try {
        const r = await fetch("/api/live/verificar-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });
        const json = r.ok ? await r.json().catch(() => null) : null;
        const v: Verificacao = json?.verificacao && typeof json.verificacao.ok === "boolean" ? json.verificacao : verificacaoIndisponivel();
        setVerificacao(v);
        return v;
      } catch {
        const v = verificacaoIndisponivel();
        setVerificacao(v);
        return v;
      } finally {
        setVerificando(false);
        emCurso.current = null;
      }
    })();
    emCurso.current = promessa;
    return promessa;
  }, [videoId]);

  useEffect(() => {
    setVerificacao(null);
    if (!videoId || !ativo) return;
    verificar();
  }, [videoId, ativo, verificar]);

  return { verificacao, verificando, verificar };
}
