'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Loader2, Sparkles, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import Image from "next/image";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'verify' | 'verify_otp' | 'newpass'>('verify');
  const [forgotEmail, setForgotEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  const logoUrl = "/images/logocompromisso.png";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!isSupabaseConfigured) {
      setAuthError("Erro: Conexão com banco de dados não configurada.");
      return;
    }

    if (!email || !password) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        setAuthError("E-mail ou senha incorretos.");
        return;
      }

      if (data.user) {
        // Redireciona se for o primeiro acesso (troca de senha obrigatória)
        if (data.user.user_metadata?.must_change_password) {
          setIsRedirecting(true);
          window.location.assign("/dashboard/first-access");
          return;
        }

        setIsRedirecting(true);
        window.location.assign("/dashboard");
      }
    } catch (err: any) {
      setLoading(false);
      setAuthError("Falha crítica na autenticação.");
    }
  };

  const handleForgotPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!forgotEmail) {
      setAuthError("Por favor, informe seu e-mail.");
      return;
    }

    setLoading(true);

    try {
      // 1. Verificar se é aluno ou professor (tentativa de encontrar perfil)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('profile_type')
        .eq('email', forgotEmail)
        .maybeSingle();

      if (profileError || !profile) {
        setLoading(false);
        setAuthError("E-mail não encontrado em nossa base de dados.");
        return;
      }

      if (profile.profile_type === 'teacher' || profile.profile_type === 'admin') {
        // Fluxo Professor: Usa Senha Mestra
        if (masterPassword !== "compromisso2026") {
          setLoading(false);
          setAuthError("Senha padrão/código de segurança incorreto para professor.");
          return;
        }
        setForgotStep('newpass');
      } else {
        // Fluxo Aluno: Envia Código por E-mail (OTP)
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: forgotEmail,
          options: {
            shouldCreateUser: false,
          }
        });

        if (otpError) throw otpError;
        
        setAuthError("Código de verificação enviado! Confira seu e-mail.");
        setForgotStep('verify_otp');
      }
    } catch (err: any) {
      setAuthError(err.message || "Erro ao processar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: forgotEmail,
        token: otpCode,
        type: 'email'
      });

      if (verifyError) throw verifyError;

      // Se verificou, o usuário está logado. Redireciona para o primeiro acesso para trocar senha.
      setIsRedirecting(true);
      window.location.assign("/dashboard/first-access");
    } catch (err: any) {
      setAuthError("Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (newPassword.length < 6) {
      setAuthError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAuthError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          newPassword: newPassword,
          masterPassword: masterPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao resetar senha.");
      }

      setAuthError("Senha resetada com sucesso! Redirecionando...");
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: forgotEmail,
        password: newPassword
      });

      if (signInError) {
        setIsForgotPassword(false);
        setLoading(false);
        return;
      }

      setIsRedirecting(true);
      window.location.assign("/dashboard");
    } catch (err: any) {
      setLoading(false);
      setAuthError(err.message || "Erro ao atualizar senha.");
    }
  };

  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center gap-4 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-sm font-black uppercase italic tracking-widest">Iniciando Sessão...</p>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500 z-10 relative">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-white uppercase italic">Recuperar Acesso</h1>
          <p className="text-white/70 text-xs">Use a senha padrão da instituição para redefinir.</p>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2rem]">
          <CardHeader className="space-y-1 pb-6 pt-8 text-center bg-accent/10 border-b border-dashed">
            <CardTitle className="text-xl font-black text-primary italic uppercase">
              {forgotStep === 'verify' ? 'Verificação' : 'Nova Senha'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pt-8 space-y-6">
            {authError && (
              <Alert variant={authError.includes("sucesso") ? "default" : "destructive"} className={authError.includes("sucesso") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-[10px] font-bold uppercase">{authError}</AlertDescription>
              </Alert>
            )}

            {forgotStep === 'verify' ? (
              <form onSubmit={handleForgotPasswordVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/40 px-2">E-mail Cadastrado</Label>
                  <Input 
                    type="email" 
                    value={forgotEmail} 
                    onChange={(e) => setForgotEmail(e.target.value)} 
                    className="h-12 bg-muted/30 border-none rounded-xl font-bold" 
                    required 
                  />
                </div>
                {/* Mostra campo de senha mestra apenas se for professor ou se o e-mail sugerir */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/40 px-2">Código de Acesso (Professores)</Label>
                  <div className="relative">
                    <Input 
                      type={showMasterPassword ? "text" : "password"} 
                      value={masterPassword} 
                      onChange={(e) => setMasterPassword(e.target.value)} 
                      placeholder="Somente para Professores"
                      className="h-12 bg-muted/30 border-none rounded-xl font-bold pr-12" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPassword(!showMasterPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                    >
                      {showMasterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary text-white font-black h-14 text-sm shadow-xl rounded-xl transition-all">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Prosseguir"}
                </Button>
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(false)} 
                  className="w-full text-[10px] font-black uppercase text-primary/40 hover:text-primary transition-colors py-2"
                >
                  Voltar para o Login
                </button>
              </form>
            ) : forgotStep === 'verify_otp' ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center space-y-2 mb-4">
                  <p className="text-[10px] font-bold text-primary/60 uppercase">Enviamos um código para {forgotEmail}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/40 px-2">Código de 6 Dígitos</Label>
                  <Input 
                    type="text" 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value)} 
                    placeholder="000000"
                    className="h-14 bg-muted/30 border-none rounded-2xl font-black text-center text-2xl tracking-[0.5em]" 
                    required 
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground font-black h-14 text-sm shadow-xl rounded-xl transition-all">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verificar Código"}
                </Button>
                <button 
                  type="button" 
                  onClick={() => setForgotStep('verify')} 
                  className="w-full text-[10px] font-black uppercase text-primary/40 hover:text-primary transition-colors py-2"
                >
                  Mudar E-mail
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/40 px-2">Nova Senha</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="h-12 bg-muted/30 border-none rounded-xl font-bold pr-12" 
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/40 px-2">Confirmar Senha</Label>
                  <div className="relative">
                    <Input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="h-12 bg-muted/30 border-none rounded-xl font-bold pr-12" 
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground font-black h-14 text-sm shadow-xl rounded-xl transition-all">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Redefinir e Entrar"}
                </Button>
                <button 
                  type="button" 
                  onClick={() => setForgotStep('verify')} 
                  className="w-full text-[10px] font-black uppercase text-primary/40 hover:text-primary transition-colors py-2"
                >
                  Alterar E-mail
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (

    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500 z-10 relative">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative h-20 w-52 transition-transform hover:scale-105 duration-500 rounded-2xl overflow-hidden bg-white shadow-lg border border-white/20">
          <Image 
            src={logoUrl} 
            alt="Logo Compromisso" 
            fill 
            unoptimized
            className="object-contain p-3"
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none sr-only">
            Compro<span className="text-accent">misso</span>
          </h1>
          <p className="text-white/90 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
            <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
            Ensino de Elite
          </p>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2rem]">
        <CardHeader className="space-y-1 pb-6 pt-8 text-center bg-primary/5 border-b border-dashed">
          <CardTitle className="text-xl font-black text-primary italic uppercase">Acesso Restrito</CardTitle>
          <CardDescription className="text-xs font-medium italic">Insira suas credenciais para entrar.</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pt-8 space-y-6">
          
          {authError && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-[10px] font-bold uppercase">{authError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase text-primary/40 px-2">E-mail Corporativo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-muted/30 border-none rounded-xl font-bold" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <Label htmlFor="password" title="Senha" className="text-[10px] font-black uppercase text-primary/40">Senha de Segurança</Label>
              </div>
              <div className="relative group">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="h-12 bg-muted/30 border-none rounded-xl font-bold pr-12" 
                  required 
                  disabled={loading} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[10px] font-black uppercase text-primary/70 hover:text-primary transition-all underline decoration-transparent hover:decoration-primary/50 underline-offset-4"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </div>
            <div className="pt-2 text-right">
              <Link href="/forgot-password" title="Esqueci minha senha" className="text-primary/40 hover:text-primary font-black uppercase text-[9px] tracking-widest transition-colors">
                Esqueci minha senha
              </Link>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/95 text-white font-black h-14 text-sm shadow-xl rounded-xl transition-all border-none">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Entrar no Sistema <ChevronRight className="h-5 w-5 ml-1 text-accent" /></>}
            </Button>
          </form>

          <div className="pt-6 text-center border-t border-dashed">
            <p className="text-xs font-medium text-muted-foreground italic">
              Ainda não tem conta? <Link href="/register" className="text-primary font-black uppercase text-[10px] tracking-widest">Criar Cadastro Grátis</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
