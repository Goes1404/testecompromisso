import { ExternalLink } from "lucide-react";
import { urlDoPlayer, linkDoVideo } from "@/lib/lives";

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
export function PlayerDoYoutube({ videoId, titulo }: { videoId: string | null | undefined; titulo: string }) {
  const src = urlDoPlayer(videoId);
  const link = linkDoVideo(videoId);
  if (!src || !link) return null;

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full aspect-video rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        <iframe
          src={src}
          title={titulo}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors px-1"
      >
        Vídeo travando? Abrir no app do YouTube <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
