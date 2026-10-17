import { ExternalLink } from "lucide-react";
import { urlDoPlayer, linkDoVideo } from "@/lib/lives";
import { CARTAO } from "./pecas";

/**
 * O aulão embutido na plataforma. É um iframe simples, sem a API JS do
 * YouTube: não há o que controlar daqui, e a API custaria um script a mais no
 * celular do aluno em rede móvel.
 *
 * - `referrerPolicy` precisa mandar a origem: sem referrer o YouTube mostra o
 *   erro 153 no lugar do vídeo.
 * - Sem `autoplay`: o navegador do celular bloqueia som automático, e o aluno
 *   tocaria num vídeo mudo achando que a aula está sem áudio.
 * - Para transmissão agendada que ainda não começou, o próprio YouTube mostra
 *   a contagem regressiva — não precisa de tela de espera aqui.
 */
export function PlayerDoYoutube({
  videoId,
  titulo,
  telaCheia = false,
}: {
  videoId: string | null | undefined;
  titulo: string;
  /**
   * Modo tela cheia da sala (`SalaDoAluno`): o vídeo ocupa o pai inteiro, sem
   * cartão. A árvore é a MESMA dos dois jeitos (só as classes mudam) para o
   * iframe não ser recriado — recriar recarregaria o vídeo do começo.
   */
  telaCheia?: boolean;
}) {
  const src = urlDoPlayer(videoId);
  const link = linkDoVideo(videoId);
  if (!src || !link) return null;

  return (
    <div className={telaCheia ? "absolute inset-0 bg-black" : `${CARTAO} p-1 md:p-2 md:space-y-1.5`}>
      <div className={telaCheia ? "absolute inset-0 bg-black" : "relative w-full aspect-video rounded-[1.1rem] overflow-hidden bg-black"}>
        <iframe
          src={src}
          title={titulo}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={`${telaCheia ? "hidden" : "hidden md:flex"} items-center justify-center gap-1.5 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-colors`}
      >
        Vídeo travando? Abrir no app do YouTube <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
