"use client";

const TIPS = [
  "Revisão imediata fixa 3× mais o conteúdo.",
  "Questões de anos anteriores do ENEM são ouro.",
  "Estude por blocos de 25 minutos com pausas.",
  "Redação nota 1000: clareza, coerência e proposta.",
  "Matemática do ENEM foca em interpretação, não decoreba.",
];

function getRandomTip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

// Partículas pré-computadas uma vez (evita recalcular a cada render).
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  size: (i * 7) % 4 + 2,
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  bg: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#ffffff33" : "#3b82f633",
  delay: (i % 5) * 0.4,
  dur: 2 + (i % 3),
}));

export function DashboardLoader({ message = "Sincronizando seu ambiente..." }: { message?: string }) {
  const tip = getRandomTip();

  return (
    <div
      className="dl-root fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f1729 0%, #1a2540 50%, #0f1729 100%)" }}
    >
      <style>{`
        @keyframes dl-spin { to { transform: rotate(360deg); } }
        @keyframes dl-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes dl-twinkle { 0%,100% { opacity:.2; transform:scale(1); } 50% { opacity:.8; transform:scale(1.5); } }
        @keyframes dl-pulse { 0%,100% { transform:scale(1); box-shadow:0 0 20px 4px rgba(245,158,11,.3); } 50% { transform:scale(1.08); box-shadow:0 0 40px 12px rgba(245,158,11,.5); } }
        @keyframes dl-dot { 0%,100% { opacity:.3; transform:scale(.8); } 50% { opacity:1; transform:scale(1.2); } }
        @keyframes dl-fade-up { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .dl-stage { perspective: 800px; }
        .dl-ring { position:absolute; border-radius:9999px; top:50%; left:50%; }
        .dl-orbit { position:absolute; border-radius:9999px; top:50%; left:50%; transform-style:preserve-3d; }
        @media (prefers-reduced-motion: reduce) {
          .dl-ring, .dl-orbit, .dl-particle, .dl-center, .dl-dot { animation: none !important; }
        }
      `}</style>

      {/* Partículas de fundo */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="dl-particle absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: p.bg,
            animation: `dl-twinkle ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* Anéis orbitais 3D */}
      <div className="dl-stage relative flex items-center justify-center">
        {/* Anel externo */}
        <div
          className="dl-ring border border-orange-400/30"
          style={{ width: 220, height: 220, margin: "-110px 0 0 -110px", transform: "rotateX(75deg)", animation: "dl-spin 8s linear infinite" }}
        />
        {/* Anel médio */}
        <div
          className="dl-ring border border-blue-400/25"
          style={{ width: 170, height: 170, margin: "-85px 0 0 -85px", transform: "rotateX(20deg)", animation: "dl-spin 5s linear infinite" }}
        />
        {/* Anel interno */}
        <div
          className="dl-ring border border-white/15"
          style={{ width: 120, height: 120, margin: "-60px 0 0 -60px", transform: "rotateX(60deg)", animation: "dl-spin-rev 3.5s linear infinite" }}
        />

        {/* Ponto orbital laranja (externo) */}
        <div
          className="dl-orbit"
          style={{ width: 220, height: 220, margin: "-110px 0 0 -110px", transform: "rotateX(75deg)", animation: "dl-spin 8s linear infinite" }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_12px_4px_rgba(251,146,60,0.6)]" />
        </div>
        {/* Ponto orbital azul (médio) */}
        <div
          className="dl-orbit"
          style={{ width: 170, height: 170, margin: "-85px 0 0 -85px", transform: "rotateX(20deg)", animation: "dl-spin 5s linear infinite" }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_3px_rgba(96,165,250,0.5)]" />
        </div>

        {/* Centro: logo pulsante */}
        <div
          className="dl-center relative z-10 h-20 w-20 rounded-[1.5rem] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)", animation: "dl-pulse 2s ease-in-out infinite" }}
        >
          <span className="text-white font-black text-3xl italic select-none">C</span>
        </div>
      </div>

      {/* Texto de carregamento */}
      <div className="mt-14 text-center space-y-3 px-8 max-w-xs">
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-white/80 font-bold text-sm tracking-wide">{message}</p>
          <span className="flex gap-1">
            {[0, 0.2, 0.4].map((d) => (
              <span
                key={d}
                className="dl-dot h-1.5 w-1.5 rounded-full bg-orange-400"
                style={{ animation: `dl-dot 0.9s ease-in-out ${d}s infinite` }}
              />
            ))}
          </span>
        </div>

        {/* Dica rotativa */}
        <p
          className="text-white/35 text-[11px] font-medium italic leading-relaxed"
          style={{ animation: "dl-fade-up 0.5s ease-out 0.6s both" }}
        >
          💡 {tip}
        </p>
      </div>
    </div>
  );
}
