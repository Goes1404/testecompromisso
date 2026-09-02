import type { ReactElement } from "react";

export interface FullBleedLoaderProps {
  /** O que está sendo preparado, na voz do produto. Ex.: "Abrindo o material". */
  mensagem: string;
  /** Linha secundária opcional, para explicar uma espera mais longa. */
  detalhe?: string;
}

/**
 * Tela de espera das rotas que ocupam a janela inteira (leitor de livro, prova).
 *
 * Essas rotas são escuras, mas o `loading.tsx` herdado de /dashboard era o
 * esqueleto claro do painel: ao abrir um livro a tela piscava claro → escuro →
 * conteúdo, duas trocas de tema em menos de um segundo. Este componente é usado
 * tanto no `loading.tsx` da rota quanto no estado interno da página, então as
 * duas etapas são pixel a pixel iguais e a transição some.
 */
export function FullBleedLoader({ mensagem, detalhe }: FullBleedLoaderProps): ReactElement {
  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0c] text-white">
      {/* Barra indeterminada no topo: dá sinal de progresso sem fingir uma porcentagem. */}
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-white/5">
        <div className="loader-bar h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      {/* Brasa de fundo — a mesma linguagem das telas escuras do produto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 45%, rgba(255,107,0,0.14) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Anel: um arco em gradiente girando sobre um trilho fixo. */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="loader-ring absolute inset-0 rounded-full" />
          <div className="absolute inset-[7px] rounded-full bg-[#0a0a0c]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(255,107,0,0.9)]" />
          </div>
        </div>

        <div className="space-y-2 px-8 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/90">
            {mensagem}
          </p>
          {detalhe ? (
            <p className="text-[10px] font-bold text-white/35">{detalhe}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
