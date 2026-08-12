'use client';

import type { Arquetipo } from '@/lib/mascote';
import { ARQUETIPOS_LEGADO, ARQUETIPOS_NOVOS } from '@/lib/mascote';
import { MascoteRetrato } from './MascoteRetrato';

/**
 * A escolha do arquétipo.
 *
 * Os quatro 3D vêm primeiro e grandes; os quatro antigos ficam embaixo, numa
 * fileira menor. Não é hierarquia de qualidade — é que os antigos existem para
 * quem já tem um deles adotado e não quer perder o próprio bicho. Quem está
 * escolhendo agora vê primeiro o que o pedido pediu.
 */
export function SeletorArquetipo({
  valor, onChange, compacto = false,
}: {
  valor: Arquetipo;
  onChange: (a: Arquetipo) => void;
  /** Grade apertada, para dentro do cartão da home. */
  compacto?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className={`grid gap-2 ${compacto ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 gap-3'}`}>
        {ARQUETIPOS_NOVOS.map(a => {
          const ativo = valor === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              aria-pressed={ativo}
              className={`rounded-[1.5rem] border-2 transition-all text-left overflow-hidden ${
                compacto ? 'p-1.5' : 'p-3'
              } ${
                ativo
                  ? 'border-orange-500 bg-orange-50 scale-105 shadow-lg'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <MascoteRetrato
                especie={a.id}
                expressao={ativo ? 'feliz' : 'normal'}
                className={`w-full ${compacto ? 'h-14' : 'h-24'}`}
              />
              <p className={`font-black text-slate-700 text-center ${compacto ? 'text-[9px] uppercase tracking-wide' : 'text-xs mt-1'}`}>
                {a.nome}
              </p>
              {!compacto && (
                <p className="text-[10px] font-medium text-slate-400 leading-tight text-center mt-0.5">
                  {a.tagline}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <details className="group">
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 list-none flex items-center gap-1.5">
          <span className="transition-transform group-open:rotate-90" aria-hidden>▸</span>
          Bichinhos clássicos
        </summary>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {ARQUETIPOS_LEGADO.map(a => {
            const ativo = valor === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onChange(a.id)}
                aria-pressed={ativo}
                className={`rounded-2xl border-2 p-1.5 transition-all ${
                  ativo
                    ? 'border-orange-500 bg-orange-50 scale-105'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MascoteRetrato
                  especie={a.id}
                  expressao={ativo ? 'feliz' : 'normal'}
                  className="w-full h-14"
                />
                <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 text-center">
                  {a.nome}
                </p>
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}
