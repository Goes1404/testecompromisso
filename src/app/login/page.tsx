"use client";

import { LoginForm } from "@/app/login/LoginForm";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden bg-white">
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="hidden md:flex md:w-1/2 relative bg-orange-600 border-b-2 md:border-b-0 border-orange-600 overflow-hidden">
          <Image 
            src="/images/login_hero.jpg"
            alt="Estudantes"
            fill
            className="object-cover brightness-[0.85] contrast-[1.1] saturate-[1.1] transition-transform duration-700 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-orange-600/40 to-transparent mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 bg-orange-900/10 pointer-events-none" />
        </div>
        
        {/* Lado do Login */}
        <div className="w-full md:w-1/2 flex flex-col bg-white relative">
          <div className="flex justify-end p-4 md:p-8 w-full z-10">
            <Link 
              href="/" 
              className="group flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors font-medium bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-full border border-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left group-hover:-translate-x-1 transition-transform">
                <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
              </svg>
              Voltar para o site
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