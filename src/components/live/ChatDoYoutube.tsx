"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MessagesSquare, Youtube } from "lucide-react";
import { ehNavegadorDeCelular, linkDoChatEmJanela, linkDoVideo, urlDoChatEmbutido } from "@/lib/lives";
import { CARTAO } from "./pecas";

type Ambiente = { dominio: string; celular: boolean };

/**
 * O chat da aula é o chat ao vivo do próprio YouTube: o comentário vai para
 * lá, e o professor lê tudo no YouTube Studio enquanto transmite.
 *
 * - Computador: o chat vem embutido aqui (`live_chat?embed_domain=…`). O aluno
 *   comenta com a conta do YouTube logada no navegador.
 * - Celular: o YouTube NÃO libera chat embutido no navegador do celular (ajuda
 *   oficial). Em vez de um quadro quebrado, um botão abre o chat no YouTube.
 *
 * Por que não um chat nosso que "repassa" para o YouTube pela API: a mensagem
 * sairia com o nome do canal do cursinho, não do aluno, e a cota grátis da API
 * cobre ~500 mensagens por dia — pouco para um aulão de ~855 alunos.
 *
 * O ambiente (domínio e celular) só existe no navegador, então é lido depois
 * de montar; `ambiente` permite fixar os dois na prévia de desenho.
 */
export function ChatDoYoutube({
  videoId,
  noAr,
  ambiente: fixo,
}: {
  videoId: string | null | undefined;
  noAr: boolean;
  ambiente?: Ambiente;
}) {
  const [lido, setLido] = useState<Ambiente | null>(null);
  useEffect(() => {
    if (fixo) return;
    setLido({ dominio: window.location.hostname, celular: ehNavegadorDeCelular(navigator.userAgent) });
  }, [fixo]);
  const ambiente = fixo ?? lido;

  const linkDoApp = linkDoVideo(videoId);
  if (!linkDoApp) return null;

  const cabecalho = (
    <div className="flex items-center justify-between gap-3 px-4 pt-4">
      <div className="flex items-center gap-2 min-w-0">
        <MessagesSquare className="h-4 w-4 text-orange-400 shrink-0" />
        <h2 className="text-sm font-black italic text-white truncate">Chat da aula</h2>
        <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-red-500/15 text-red-300 text-[9px] font-black uppercase tracking-widest shrink-0">
          <Youtube className="h-3 w-3" /> YouTube
        </span>
      </div>
    </div>
  );

  if (!noAr) {
    return (
      <section className={`${CARTAO} pb-4`} aria-label="Chat da aula">
        {cabecalho}
        <p className="mx-4 mt-3 text-xs text-white/50 font-medium rounded-xl bg-white/5 px-3 py-2.5">
          O chat abre quando a aula estiver no ar.
        </p>
      </section>
    );
  }

  // Antes de saber o ambiente, um esqueleto do tamanho do chat (evita pulo).
  if (!ambiente) return <section className={`${CARTAO} h-[420px] animate-pulse`} aria-busy="true" />;

  if (ambiente.celular) {
    return (
      <section className={`${CARTAO} pb-4 space-y-3`} aria-label="Chat da aula">
        {cabecalho}
        <p className="mx-4 text-xs text-white/65 font-medium leading-relaxed">
          No celular, o YouTube só mostra o chat da transmissão dentro do app dele.
        </p>
        <a
          href={linkDoApp}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-4 flex items-center justify-center gap-2 h-12 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest transition-all touch-manipulation"
        >
          <Youtube className="h-4 w-4" /> Comentar no YouTube
        </a>
        <p className="mx-4 text-[10px] text-amber-300/90 font-semibold leading-snug">
          Sua presença só conta com esta página aberta. Comente e volte para cá.
        </p>
      </section>
    );
  }

  const src = urlDoChatEmbutido(videoId, ambiente.dominio);
  const janela = linkDoChatEmJanela(videoId);
  return (
    <section className={`${CARTAO} overflow-hidden`} aria-label="Chat da aula">
      {cabecalho}
      {src && (
        <iframe
          src={src}
          title="Chat ao vivo do YouTube"
          className="mt-3 block w-full h-[440px] lg:h-[520px] border-0 bg-[#0f0f0f]"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-t border-white/5">
        <p className="text-[10px] text-white/45 font-medium leading-snug">
          Você comenta com a sua conta do YouTube, e quem assiste vê o seu nome de lá. Chat em branco? Entre no YouTube neste navegador.
        </p>
        {janela && (
          <a
            href={janela}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            Janela <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
