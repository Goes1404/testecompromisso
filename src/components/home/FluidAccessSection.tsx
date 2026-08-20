"use client";

import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, KeyRound, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactElement } from "react";

export interface FluidAccessSectionProps {
  /** Navega para uma rota interna (ex.: /login) exibindo o overlay de transição. */
  onNavigate: (path: string) => void;
}

/**
 * Seção de acesso fluido: painel de vidro com CTA polido levando ao /login,
 * além dos fluxos reais de primeiro acesso e recuperação de senha.
 */
export function FluidAccessSection({ onNavigate }: FluidAccessSectionProps): ReactElement {
  const reduceMotion = useReducedMotion();

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // O formulário é apenas a porta de entrada — nenhum dado é enviado daqui.
    onNavigate("/login");
  };

  return (
    <section className="relative overflow-hidden bg-gray-950 py-24 border-t border-white/5">
      <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />
      <div className="absolute inset-0 noise pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/15 blur-[120px] rounded-full pointer-events-none hidden md:block" />

      <div className="relative z-10 max-w-3xl mx-auto px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="gradient-border relative rounded-[2.5rem] bg-white/[0.04] backdrop-blur-2xl p-8 md:p-12 shadow-2xl noise"
        >
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px] bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" /> Acesso ao Portal
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic leading-tight">
              Pronto para entrar?
            </h2>
            <p className="text-sm text-gray-400 font-medium max-w-md mx-auto leading-relaxed">
              Alunos do Compromisso já têm acesso liberado. Entre com seu usuário e continue
              exatamente de onde parou.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <LockKeyhole className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="Seu e-mail ou usuário"
                aria-label="Seu e-mail ou usuário"
                className="h-14 w-full rounded-full bg-white/[0.05] border border-white/15 pl-12 pr-5 text-sm font-bold text-white placeholder:text-gray-500 outline-none transition-all duration-300 focus:border-primary/60 focus:bg-white/[0.08] focus:shadow-[0_0_30px_rgba(255,107,0,0.2)]"
              />
            </div>
            <Button
              type="submit"
              className="btn-shimmer h-14 px-8 bg-primary hover:bg-[#e06000] text-white font-black text-sm rounded-full glow-orange-strong border-none transition-[transform,box-shadow] active:scale-95 group shrink-0"
            >
              <span className="flex items-center gap-2">
                Entrar no Portal
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </form>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-center">
            <Link
              href="/primeiro-acesso"
              className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" /> É meu primeiro acesso
            </Link>
            <Link
              href="/forgot-password"
              className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
