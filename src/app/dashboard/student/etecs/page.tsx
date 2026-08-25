'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import etecsData from '@/data/etecs.json';
import { EtecDetalhe } from '@/components/etecs/EtecDetalhe';
import type { Etec } from '@/components/etecs/tipos';
import { School } from 'lucide-react';

// Leaflet toca window: nunca renderizar no servidor (regra do projeto p/ libs assim).
const MapaEtecs = dynamic(() => import('@/components/etecs/MapaEtecs'), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-[2.5rem] bg-muted/20 animate-pulse" />,
});

const etecs = etecsData as Etec[];

export default function EtecsPage() {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const ativa = etecs.find((e) => e.codigo === selecionada) ?? null;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 space-y-4">
      <section className="aurora-dark rounded-[2.5rem] p-6 text-white shadow-2xl">
        <span className="text-[9px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-300 px-3 py-1 rounded-full border border-violet-500/30">
          <School className="inline h-2.5 w-2.5 mr-1" /> Vestibulinho
        </span>
        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter mt-2">
          Mapa das <span className="text-gradient-brand">ETECs</span>
        </h1>
        <p className="text-white/50 text-xs mt-1">
          Toque numa unidade para ver a foto, os cursos e como chegar.
        </p>
      </section>

      <div className="relative h-[65vh] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100">
        <MapaEtecs etecs={etecs} selecionada={selecionada} onSelecionar={setSelecionada} />
        {ativa && <EtecDetalhe etec={ativa} onFechar={() => setSelecionada(null)} />}
      </div>
    </div>
  );
}
