
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

      {/* Imagem de Fundo Atualizada para Igreja Matriz */}
      <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Igreja_Matriz_de_Santana_de_Parna%C3%ADba.jpg/1280px-Igreja_Matriz_de_Santana_de_Parna%C3%ADba.jpg')] bg-cover bg-center grayscale opacity-10"></div>
      
      <LoginForm />
    </div>
  );
}
