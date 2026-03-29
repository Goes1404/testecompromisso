
"use client";

import { useState } from "react";
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
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      // 1. Verificar se o e-mail existe e qual o papel do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, profile_type')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setError("Erro: E-mail não encontrado na base de dados corporativa.");
        setLoading(false);
        return;
      }

      // 2. Fluxo diferenciado
      const isTeacher = ['teacher', 'professor', 'mentor', 'docente', 'staff'].includes((profile.profile_type || profile.role || '').toLowerCase());

      if (isTeacher) {
        // Professores: Reset padrão por link (ou apenas validação de e-mail conforme pedido)
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/forgot-password?type=recovery`,
        });
        if (resetError) throw resetError;
        setSuccess(true);
      } else {
        // Alunos: Fluxo de Código (OTP)
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          }
        });
        if (otpError) throw otpError;
        setStep("otp");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao processar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'magiclink' // Supabase trata o token de e-mail OTP para login como magiclink ou recovery
      });

      if (verifyError) {
        // Tentar como 'recovery' se 'magiclink' falhar
        const { error: recoveryError } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: 'recovery'
        });
        if (recoveryError) throw new Error("Código inválido ou expirado.");
      }

      setStep("reset");
    } catch (err: any) {
      setError(err.message);
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
          {step === "otp" && "Código de Segurança"}
          {step === "reset" && "Nova Senha"}
        </CardTitle>
        <CardDescription className="text-xs font-medium italic">
          {step === "email" && "Insira seu e-mail corporativo para identificarmos sua conta."}
          {step === "otp" && `Enviamos um código para ${email}`}
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
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-[10px] font-black uppercase text-primary/40 px-2">Código de Verificação</Label>
              <div className="relative group">
                <Key className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                <Input 
                  id="otp" 
                  type="text" 
                  placeholder="000000"
                  value={otpCode} 
                  onChange={(e) => setOtpCode(e.target.value)} 
                  className="pl-12 h-14 bg-muted/30 border-none rounded-xl font-black text-center text-xl tracking-[0.5em]" 
                  maxLength={6}
                  required 
                  disabled={loading} 
                />
              </div>
            </div>
            <Button type="submit" disabled={loading || otpCode.length < 6} className="w-full bg-accent text-accent-foreground font-black h-14 text-sm shadow-xl rounded-xl transition-all border-none">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Código"}
            </Button>
            <button 
              type="button" 
              onClick={() => setStep("email")} 
              className="w-full text-[10px] font-black uppercase text-primary/40 text-center hover:text-primary transition-colors"
            >
              Não recebi o código / Alterar e-mail
            </button>
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
