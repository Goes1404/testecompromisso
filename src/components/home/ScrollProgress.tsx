"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import type { ReactElement } from "react";

/**
 * Fio de progresso no topo da vitrine.
 *
 * A parte de cima da página não dava nenhum retorno de rolagem — o que se via
 * ao arrastar era a barra do navegador. Este fio mostra o quanto falta da
 * página com uma propriedade que o compositor anima sozinho (`scaleX`), sem
 * refazer layout a cada quadro.
 */
export function ScrollProgress(): ReactElement | null {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const largura = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  if (reduceMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: largura }}
      className="fixed inset-x-0 top-0 z-[100] h-0.5 origin-left bg-gradient-to-r from-primary via-amber-400 to-primary"
    />
  );
}
