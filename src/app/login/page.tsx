
"use client";

import { LoginForm } from "@/app/login/LoginForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden bg-blue-gradient">
      {/* Botão de Voltar para a Home - Colorido e Responsivo */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50">
        <Button asChild className="bg-white text-primary hover:bg-white/90 font-black uppercase text-[10px] tracking-[0.2em] gap-2 rounded-xl shadow-2xl transition-all active:scale-95 border-none h-10 px-4 md:px-6">
          <Link href="/">
            <ChevronLeft className="h-4 w-4 text-accent" />
            <span className="hidden sm:inline">Voltar ao Início</span>
            <span className="sm:hidden">Início</span>
          </Link>
        </Button>
      </div>

      {/* Camada de textura leve para substituir imagens pesadas da Wikipedia */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0,transparent_100%)]"></div>
      
      <LoginForm />
    </div>
  );
}
