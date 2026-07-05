"use client";

import { motion } from "framer-motion";

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

export function DashboardLoader({ message = "Sincronizando seu ambiente..." }: { message?: string }) {
  const tip = getRandomTip();

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f1729 0%, #1a2540 50%, #0f1729 100%)" }}>

      {/* Partículas de fundo */}
      {[...Array(18)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#ffffff33" : "#3b82f633",
          }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
        />
      ))}

      {/* Anel externo — orbita no eixo Z */}
      <div className="relative flex items-center justify-center" style={{ perspective: "800px" }}>

        <motion.div
          className="absolute rounded-full border border-orange-400/30"
          style={{ width: 220, height: 220 }}
          animate={{ rotateX: 75, rotateZ: 360 }}
          transition={{ rotateZ: { duration: 8, repeat: Infinity, ease: "linear" }, rotateX: { duration: 0 } }}
        />

        {/* Anel médio — orbita no eixo Y */}
        <motion.div
          className="absolute rounded-full border border-blue-400/25"
          style={{ width: 170, height: 170 }}
          animate={{ rotateY: 360, rotateX: 20 }}
          transition={{ rotateY: { duration: 5, repeat: Infinity, ease: "linear" }, rotateX: { duration: 0 } }}
        />

        {/* Anel interno — orbita diagonal */}
        <motion.div
          className="absolute rounded-full border border-white/15"
          style={{ width: 120, height: 120 }}
          animate={{ rotateX: 60, rotateZ: -360 }}
          transition={{ rotateZ: { duration: 3.5, repeat: Infinity, ease: "linear" }, rotateX: { duration: 0 } }}
        />

        {/* Ponto orbital laranja no anel externo */}
        <motion.div
          className="absolute"
          style={{ width: 220, height: 220, transformStyle: "preserve-3d" }}
          animate={{ rotateX: 75, rotateZ: 360 }}
          transition={{ rotateZ: { duration: 8, repeat: Infinity, ease: "linear" }, rotateX: { duration: 0 } }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_12px_4px_rgba(251,146,60,0.6)]" />
        </motion.div>

        {/* Ponto orbital azul no anel médio */}
        <motion.div
          className="absolute"
          style={{ width: 170, height: 170, transformStyle: "preserve-3d" }}
          animate={{ rotateY: 360, rotateX: 20 }}
          transition={{ rotateY: { duration: 5, repeat: Infinity, ease: "linear" }, rotateX: { duration: 0 } }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_3px_rgba(96,165,250,0.5)]" />
        </motion.div>

        {/* Centro: logo pulsante */}
        <motion.div
          className="relative z-10 h-20 w-20 rounded-[1.5rem] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}
          animate={{ scale: [1, 1.08, 1], boxShadow: ["0 0 20px 4px rgba(245,158,11,0.3)", "0 0 40px 12px rgba(245,158,11,0.5)", "0 0 20px 4px rgba(245,158,11,0.3)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-white font-black text-3xl italic select-none">C</span>
        </motion.div>
      </div>

      {/* Texto de carregamento */}
      <div className="mt-14 text-center space-y-3 px-8 max-w-xs">
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-white/80 font-bold text-sm tracking-wide">{message}</p>
          <span className="flex gap-1">
            {[0, 0.2, 0.4].map((d) => (
              <motion.span
                key={d}
                className="h-1.5 w-1.5 rounded-full bg-orange-400"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: d }}
              />
            ))}
          </span>
        </div>

        {/* Dica rotativa */}
        <motion.p
          className="text-white/35 text-[11px] font-medium italic leading-relaxed"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          💡 {tip}
        </motion.p>
      </div>
    </div>
  );
}
