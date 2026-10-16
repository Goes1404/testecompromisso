import { CalendarClock, CheckCircle2, ExternalLink, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { quandoE } from "@/lib/lives";

/**
 * Peças visuais das aulas ao vivo. Seguem a linguagem do Mural (cartão escuro
 * sobre o fundo claro do app, laranja da marca, rótulo pequeno em caixa alta),
 * para a funcionalidade não parecer um app à parte.
 *
 * Nada aqui busca dado: tudo chega por props. É o que permite montar a tela
 * com dados de exemplo para revisar o desenho sem login nem banco.
 */

/** Cartão escuro padrão — o mesmo do Mural. */
export const CARTAO = "bg-[#0d0d0f] border border-white/10 rounded-[1.5rem]";

/** Rótulo pequeno de seção, em caixa alta. */
export function Rotulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-black uppercase tracking-[0.25em] text-white/45 ${className}`}>{children}</p>
  );
}

const SELOS = {
  live: { texto: "Ao vivo", classe: "bg-red-500 text-white" },
  scheduled: { texto: "Agendada", classe: "bg-white/10 text-white/75" },
  completed: { texto: "Encerrada", classe: "bg-white/5 text-white/45" },
} as const;

export function SeloDeStatus({ status }: { status: string | null | undefined }) {
  const s = SELOS[(status as keyof typeof SELOS) ?? "scheduled"] ?? SELOS.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest ${s.classe}`}>
      {status === "live" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      )}
      {status === "completed" && <CheckCircle2 className="h-3 w-3" />}
      {s.texto}
    </span>
  );
}

/**
 * O que aparece no lugar do vídeo enquanto ele não existe. Mesmo formato 16:9
 * do player, para a página não pular quando o vídeo chega.
 */
export function PalcoDeEspera({
  status,
  inicio,
  meetLink,
  agora = new Date(),
}: {
  status: string | null | undefined;
  inicio: string | null | undefined;
  meetLink: string | null;
  agora?: Date;
}) {
  const noAr = status === "live";
  const encerrada = status === "completed";
  const quando = quandoE(inicio, agora);
  // Sem vídeo do YouTube e com link do Meet: a aula é no Meet. O palco vira o
  // convite para entrar, em vez de "o vídeo aparece aqui" (não vai aparecer).
  const peloMeet = !!meetLink && !encerrada;
  if (peloMeet) {
    return (
      <div className="relative w-full aspect-video rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden bg-black ring-1 ring-white/10">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(255,107,0,0.22) 0%, transparent 55%)" }}
        />
        <div className="relative h-full flex flex-col items-center justify-center text-center gap-3 p-5">
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${noAr ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white/60"}`}>
            {noAr ? <Radio className="h-5 w-5 animate-pulse" /> : <CalendarClock className="h-5 w-5" />}
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-base md:text-lg font-black italic text-white leading-tight">
              {noAr ? "A aula está no Meet" : `Aula pelo Meet · ${quando}`}
            </p>
            <p className="text-xs text-white/55 font-medium leading-relaxed">
              {noAr
                ? "Toque para entrar. O chat da turma continua aqui na plataforma."
                : "O link já está aqui. Volte na hora da aula e toque para entrar."}
            </p>
          </div>
          <a
            href={meetLink!}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors ${
              noAr ? "bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/20" : "bg-white/10 hover:bg-white/15 text-white"
            }`}
          >
            Entrar no Meet <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }
  const atrasada = !noAr && !encerrada && !!inicio && new Date(inicio).getTime() < agora.getTime();
  const titulo = encerrada
    ? "Esta aula já terminou"
    : noAr
      ? "O professor está abrindo a transmissão"
      : atrasada
        ? "Aguardando o professor começar"
        : `Começa ${quando.charAt(0).toLowerCase()}${quando.slice(1)}`;
  const texto = encerrada
    ? "Não há gravação disponível para esta aula."
    : noAr
      ? "O vídeo aparece aqui sozinho, sem precisar recarregar a página."
      : atrasada
        ? `Estava marcada para ${quando.toLowerCase()}. Deixe esta página aberta: o vídeo aparece aqui.`
        : "Deixe esta página aberta: o vídeo aparece aqui quando a aula começar.";

  return (
    <div className="relative w-full aspect-video rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden bg-black ring-1 ring-white/10">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 80% 0%, rgba(255,107,0,0.22) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(56,189,248,0.10) 0%, transparent 55%)",
        }}
      />
      <div className="relative h-full flex flex-col items-center justify-center text-center gap-3 p-6">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${noAr ? "bg-red-500/15 text-red-400" : "bg-white/10 text-white/60"}`}>
          {noAr ? <Radio className="h-6 w-6 animate-pulse" /> : <CalendarClock className="h-6 w-6" />}
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="text-base md:text-lg font-black italic text-white leading-tight">{titulo}</p>
          <p className="text-xs text-white/55 font-medium leading-relaxed">{texto}</p>
        </div>
        {meetLink && !encerrada && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-black uppercase tracking-widest transition-colors"
          >
            Sala do Meet <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
