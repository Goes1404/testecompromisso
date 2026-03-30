
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Sparkles, AlertCircle, CheckCircle2, Lock, Key } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<"email" | "reset">("email");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && window.location.href.includes("type=recovery"))) {
        setStep("reset");
      }
    });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get("type") === "recovery" || window.location.hash.includes("type=recovery")) {
        setStep("reset");
      }
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError("Banco de dados não configurado.");
      setLoading(false);
      return;
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      // 1. Verificar se o e-mail existe e qual o papel do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, profile_type')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        // PADRÃO DE MERCADO: Não confirmar se o e-mail existe para evitar enumeração de usuários.
        // Simulamos o sucesso para o usuário, mas não enviamos nada se não existir.
        setSuccess(true);
        setLoading(false);
        return;
      }

      // PADRÃO DE MERCADO: Envio do e-mail oficial de Reset para todos
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/forgot-password?type=recovery`,
      });
      
      if (resetError) throw resetError;
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro ao processar solicitação.");
    } finally {
      setLoading(false);
    }
  };


  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthColor = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"][strength];
  const strengthText = ["Muito Fraca", "Fraca", "Média", "Forte", "Excelente"][strength];

  if (success) {
    return (
      <Card className="w-full max-w-md border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2rem] p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-primary italic uppercase">Sucesso!</h2>
          <p className="text-sm text-primary/60 font-medium">
            Verifique seu e-mail para seguir as instruções e acessar o sistema.
          </p>
        </div>
        <Button asChild className="w-full bg-primary hover:bg-primary/95 text-white font-black h-14 rounded-xl shadow-xl transition-all border-none">
          <a href="/login">Ir para o Login</a>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2rem]">
      <CardHeader className="space-y-1 pb-6 pt-8 text-center bg-primary/5 border-b border-dashed">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-accent" />
          </div>
        </div>
        <CardTitle className="text-xl font-black text-primary italic uppercase">
          {step === "email" && "Recuperar Acesso"}
          {step === "reset" && "Nova Senha"}
        </CardTitle>
        <CardDescription className="text-xs font-medium italic">
          {step === "email" && "Insira seu e-mail corporativo para identificarmos sua conta."}
          {step === "reset" && "Defina sua nova senha de acesso."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pt-8 space-y-6 pb-8">
        {error && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-[10px] font-bold uppercase">{error}</AlertDescription>
          </Alert>
        )}

        {step === "email" && (
          <form onSubmit={handleIdentify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase text-primary/40 px-2">E-mail Cadastrado</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seuemail@exemplo.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="pl-12 h-14 bg-muted/30 border-none rounded-xl font-bold" 
                  required 
                  disabled={loading} 
                />
              </div>
            </div>
            <Button type="submit" disabled={loading || !email} className="w-full bg-primary hover:bg-primary/95 text-white font-black h-14 text-sm shadow-xl rounded-xl transition-all border-none">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verificar Conta"}
            </Button>
            <div className="pt-2">
                <Button asChild variant="ghost" className="w-full text-[10px] font-black uppercase text-primary/40 h-10 rounded-xl">
                    <a href="/login">Lembrei minha senha / Voltar</a>
                </Button>
            </div>
          </form>
        )}


        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-[10px] font-black uppercase text-primary/40 px-2">Nova Senha</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="h-14 bg-muted/30 border-none rounded-xl font-bold" 
                required 
                disabled={loading} 
              />
              {newPassword && (
                <div className="px-2 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                    <span className="text-primary/40">Segurança da Senha</span>
                    <span className={strength > 2 ? "text-emerald-500" : "text-orange-500"}>{strengthText}</span>
                  </div>
                  <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${strengthColor} transition-all duration-500`}
                      style={{ width: `${(strength / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase text-primary/40 px-2">Confirmar Nova Senha</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="h-14 bg-muted/30 border-none rounded-xl font-bold" 
                required 
                disabled={loading} 
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/95 text-white font-black h-14 text-sm shadow-xl rounded-xl transition-all border-none">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Redefinir e Entrar"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
