'use client';

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import type { Etec } from '@/components/etecs/tipos';

// Os PNGs default do Leaflet quebram no bundler do Next; um divIcon em CSS puro
// evita asset externo e ainda deixa o marker com a cara da plataforma.
const icone = (ativa: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${ativa ? 22 : 16}px;height:${ativa ? 22 : 16}px;border-radius:9999px;
      background:${ativa ? '#f59e0b' : '#7c3aed'};border:3px solid white;
      box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [ativa ? 22 : 16, ativa ? 22 : 16],
    iconAnchor: [ativa ? 11 : 8, ativa ? 11 : 8],
  });

function VoarPara({ etec }: { etec: Etec | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (etec) map.flyTo([etec.lat, etec.lng], 14, { duration: 0.6 });
  }, [etec, map]);
  return null;
}

export default function MapaEtecs({ etecs, selecionada, onSelecionar }: {
  etecs: Etec[];
  selecionada: string | null;
  onSelecionar: (codigo: string) => void;
}) {
  const ativa = etecs.find((e) => e.codigo === selecionada);
  return (
    <MapContainer
      center={[-23.47, -46.85]}
      zoom={11}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {etecs.map((e) => (
        <Marker
          key={e.codigo}
          position={[e.lat, e.lng]}
          icon={icone(e.codigo === selecionada)}
          eventHandlers={{ click: () => onSelecionar(e.codigo) }}
        />
      ))}
      <VoarPara etec={ativa} />
    </MapContainer>
  );
}
