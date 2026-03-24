"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { Loader2, BookOpen, Sparkles } from "lucide-react";

/**
 * Raiz do Dashboard: Redirecionamento instantâneo baseado no papel (role).
 * Removidos delays para performance fluida na apresentação.
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

      // Redirecionamento atômico
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
    <div className="h-screen w-full flex flex-col items-center justify-center bg-brand-gradient gap-6 relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center shadow-2xl animate-pulse">
          <BookOpen className="h-8 w-8 text-accent" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-accent/60" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 italic">
            Sincronizando...
          </p>
        </div>
      </div>
    </div>
  );
}