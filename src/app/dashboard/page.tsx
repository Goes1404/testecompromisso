"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { Loader2, BookOpen, Sparkles } from "lucide-react";

/**
 * Raiz do Dashboard: Gerencia o tráfego de entrada e distribui os usuários
 * para as suas respectivas áreas de trabalho com base no perfil carregado.
 */
export default function DashboardRoot() {
  const { userRole, loading, user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só age quando o carregamento inicial (sessão + perfil) terminar de fato
    if (!loading) {
      if (!user) {
        // Se não houver usuário, volta para o login
        router.replace("/login");
        return;
      }

      // Se houver usuário, redireciona baseado no papel (role)
      // Pequeno delay para garantir que a transição de UI seja fluida
      const redirectTimeout = setTimeout(() => {
        if (userRole === 'admin') {
          router.replace("/dashboard/admin/home");
        } else if (userRole === 'teacher') {
          router.replace("/dashboard/teacher/home");
        } else {
          router.replace("/dashboard/home");
        }
      }, 150);

      return () => clearTimeout(redirectTimeout);
    }
  }, [userRole, loading, user, router, profile]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-primary gap-6">
      <div className="relative">
        <div className="h-20 w-20 rounded-[2.5rem] bg-white/5 flex items-center justify-center shadow-2xl animate-pulse">
          <BookOpen className="h-10 w-10 text-accent" />
        </div>
        <Sparkles className="absolute -top-3 -right-3 h-8 w-8 text-accent animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-accent/60" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 italic">
          Autenticando Acesso Industrial
        </p>
      </div>
    </div>
  );
}