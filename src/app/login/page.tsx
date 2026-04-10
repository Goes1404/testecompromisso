"use client";

import { LoginForm } from "@/app/login/LoginForm";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden bg-white">
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Lado da Imagem */}
        <div className="hidden md:flex md:w-1/2 relative bg-gray-900 border-b-2 md:border-b-0 border-primary">
          <Image 
            src="/images/hero_study.png"
            alt="Estudantes"
            fill
            className="object-cover"
            priority
          />
        </div>
        
        {/* Lado do Login */}
        <div className="w-full md:w-1/2 flex flex-col bg-white relative">
          <div className="flex justify-end p-4 md:p-8 w-full z-10">
            <Link href="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
              Voltar para o site do Compromisso
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <LoginForm />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-[#002f6c] text-white text-xs py-4 text-center">
        <p>Copyright © 1997-2026 Colégio Compromisso. Todos os direitos reservados.</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <Link href="#" className="hover:underline">Política de Privacidade</Link>
          <span>|</span>
          <Link href="#" className="hover:underline">Acessibilidade</Link>
        </div>
      </footer>
    </div>
  );
}