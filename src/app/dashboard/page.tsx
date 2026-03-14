
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { Loader2, BookOpen, Sparkles } from "lucide-react";

/**
 * Raiz do Dashboard: Gerencia o tráfego de entrada e distribui os usuários
 * para as suas respectivas áreas de trabalho com base no perfil carregado.
 * Otimizado para redirecionamento instantâneo.
 */
export default function DashboardRoot() {
  const { userRole, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
        return;
      }

      // Redirecionamento instantâneo baseado no papel (role)
      if (userRole === 'admin') {
        router.replace("/dashboard/admin/home");
      } else if (userRole === 'teacher') {
        router.replace("/dashboard/teacher/home");
      } else {
        router.replace("/dashboard/home");
      }
    }
  }, [userRole, loading, user, router]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-blue-gradient gap-6 relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-4">
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
    </div>
  );
}
