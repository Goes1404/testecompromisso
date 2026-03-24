"use client";

import { LoginForm } from "@/app/login/LoginForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden bg-login-gradient">
      {/* Partículas luminosas de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[300px] h-[300px] bg-[#FF6B00]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-[#FF6B00]/8 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF6B00]/3 rounded-full blur-[200px]" />
      </div>

      {/* Grid sutil de fundo */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,107,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,107,0,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Botão de Voltar */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50">
        <Button asChild className="bg-white/10 text-white hover:bg-white/20 font-bold uppercase text-[10px] tracking-[0.15em] gap-2 rounded-xl backdrop-blur-md transition-all active:scale-95 border border-white/10 h-10 px-4 md:px-6">
          <Link href="/">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Início</span>
            <span className="sm:hidden">Início</span>
          </Link>
        </Button>
      </div>
      
      <LoginForm />
    </div>
  );
}