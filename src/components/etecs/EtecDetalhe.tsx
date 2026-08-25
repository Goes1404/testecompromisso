'use client';

import { useState } from 'react';
import { MapPin, Navigation, GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Etec } from '@/components/etecs/tipos';

const CHAVE_MAPS = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Foto da fachada via Street View Static. Sem chave configurada, placeholder. */
function fotoUrl(e: Etec): string | null {
  if (!CHAVE_MAPS) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=640x360&location=${e.lat},${e.lng}&fov=80&key=${CHAVE_MAPS}`;
}

/** URL universal de rotas do Google Maps — abre o app no celular, sem chave. */
function comoChegarUrl(e: Etec): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}&travelmode=transit`;
}

export function EtecDetalhe({ etec, onFechar }: { etec: Etec; onFechar: () => void }) {
  const [fotoQuebrou, setFotoQuebrou] = useState(false);
  const foto = fotoUrl(etec);

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1000] md:inset-y-0 md:left-auto md:right-0 md:w-96 md:bottom-auto">
      <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden md:m-4 max-h-[70vh] md:max-h-full overflow-y-auto">
        {/* Foto */}
        <div className="relative h-40 bg-gradient-to-br from-violet-600 to-indigo-700">
          {foto && !fotoQuebrou ? (
            // eslint-disable-next-line @next/next/no-img-element -- host externo dinâmico, sem otimização do Next
            <img
              src={foto}
              alt={`Fachada da ${etec.nome}`}
              className="h-full w-full object-cover"
              onError={() => setFotoQuebrou(true)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-white/80">
              <GraduationCap className="h-12 w-12" />
            </div>
          )}
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-black italic leading-tight">{etec.nome}</h2>
            <p className="text-xs text-muted-foreground font-medium mt-1 flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {etec.endereco}
            </p>
          </div>

          <Button asChild className="w-full rounded-2xl font-black text-xs uppercase tracking-wider">
            <a href={comoChegarUrl(etec)} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-4 w-4 mr-2" /> Como chegar
            </a>
          </Button>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Cursos oferecidos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {etec.cursos.map((c) => (
                <span
                  key={c}
                  className="text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-3 py-1"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
