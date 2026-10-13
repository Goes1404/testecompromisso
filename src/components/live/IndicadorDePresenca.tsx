import { CheckCircle2, Timer } from "lucide-react";
import { formatarDuracao, PRESENCA_MINIMA, situacaoDaPresenca } from "@/lib/lives";
import { CARTAO, Rotulo } from "./pecas";

/**
 * Mostra ao aluno quanto do tempo dele já contou. Sem isso, a regra dos 60%
 * vira surpresa na chamada; com ela, o aluno sabe que fechar a aba custa
 * presença. A marca na barra mostra onde fica a meta.
 */
export function IndicadorDePresenca({ segundos, segundosDaAula }: { segundos: number; segundosDaAula: number }) {
  const { porcentagem, presente } = situacaoDaPresenca(segundos, segundosDaAula);
  const meta = Math.round(PRESENCA_MINIMA * 100);

  return (
    <section className={`${CARTAO} p-4 space-y-3`} aria-label="Sua presença">
      <div className="flex items-center justify-between gap-3">
        <Rotulo>Sua presença</Rotulo>
        <span className="text-[11px] font-black text-white/80 tabular-nums">
          {formatarDuracao(segundos)} <span className="text-white/40">de {formatarDuracao(segundosDaAula)}</span>
        </span>
      </div>

      <div className="relative">
        <div
          className="h-2.5 rounded-full bg-white/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={porcentagem}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${porcentagem}% da aula`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${presente ? "bg-emerald-500" : "bg-orange-500"}`}
            style={{ width: `${porcentagem}%` }}
          />
        </div>
        <div className="absolute -top-1 bottom-[-4px] w-0.5 rounded-full bg-white/60" style={{ left: `${meta}%` }} aria-hidden />
      </div>

      <p className={`flex items-start gap-2 text-xs font-bold leading-snug ${presente ? "text-emerald-400" : "text-white/70"}`}>
        {presente ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Timer className="h-4 w-4 shrink-0 text-orange-400" />}
        {presente
          ? "Presença garantida até agora. Continue até o fim."
          : `Conta presença quem fica ${meta}% da aula com esta página aberta.`}
      </p>
      <p className="text-[10px] font-medium text-white/40 leading-snug">
        Fechar a página ou bloquear o celular pausa a contagem.
      </p>
    </section>
  );
}
