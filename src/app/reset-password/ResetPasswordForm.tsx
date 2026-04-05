
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Requisitos de senha
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= 8;

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Sessão Inválida",
          description: "Sessão de recuperação não identificada. Por favor, solicite um novo link.",
          variant: "destructive",
        });
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setAuthChecked(true);
      }
    }
    checkSession();
  }, [router, toast]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (!hasUpperCase || !hasNumber || !hasSpecial || !isLongEnough) {
      toast({ title: "A senha não atende aos requisitos de segurança", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Senha atualizada!",
        description: "Sua nova senha foi salva. Redirecionando para o login...",
      });
      
      setTimeout(() => router.push("/login?message=password-reset-success"), 2000);
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex flex-col items-center gap-4 bg-white/5 backdrop-blur-lg p-12 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase text-white tracking-[0.3em] animate-pulse italic">
          Validando Sessão Segura...
        </p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
      <CardHeader className="p-8 pb-4 text-center">
        <div className="mx-auto h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-primary/10">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-black text-primary italic uppercase tracking-tight">Nova Senha</CardTitle>
        <CardDescription className="font-bold italic text-sm">Crie uma credencial forte para sua conta.</CardDescription>
      </CardHeader>
      
      <CardContent className="p-8 pt-2">
        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Sua nova senha forte"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 bg-slate-50 border-none rounded-2xl font-bold pr-12 focus-visible:ring-primary shadow-inner"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Input
              type="password"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-primary shadow-inner"
              required
            />
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Padrão de Segurança</p>
            {[
              { label: "Mínimo 8 caracteres", check: isLongEnough },
              { label: "Uma letra maiúscula", check: hasUpperCase },
              { label: "Um número", check: hasNumber },
              { label: "Um caractere especial", check: hasSpecial },
            ].map(req => (
              <div key={req.label} className="flex items-center gap-3">
                {req.check ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-200 shrink-0" />
                )}
                <span className={`text-[11px] font-bold ${req.check ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-xs italic border-none"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gravar Nova Senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
