
import ResetPasswordForm from "./ResetPasswordForm";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Criar ou redefinir senha | Compromisso",
  description: "Crie ou redefina a senha de acesso à plataforma.",
  // O endereço leva um token de uso único: nada de indexar nem de mandar a
  // URL inteira como referrer para outro site.
  robots: { index: false, follow: false },
  referrer: "same-origin" as const,
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[100dvh] bg-login-gradient flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4 bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/20">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-[10px] font-black uppercase text-white/50 tracking-widest animate-pulse">
            Carregando Formulário Seguro...
          </p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
