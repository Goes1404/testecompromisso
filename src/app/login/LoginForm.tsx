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
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";

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
        // Check if user must change password
        if (data.user.user_metadata?.must_change_password) {
          setMustChangePassword(true);
          setLoading(false);
          return;
        }

        setIsRedirecting(true);
        // Hard redirect para limpar caches de Web Locks do navegador
        window.location.assign("/dashboard");
      }

    } catch (err: any) {
      setLoading(false);
      setAuthError("Falha crítica na autenticação.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false }
      });

      if (error) throw error;

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

  if (mustChangePassword) {
    return (
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500 z-10 relative">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-white uppercase italic">Primeiro Acesso</h1>
          <p className="text-white/70 text-xs">Por segurança, altere sua senha padrão para continuar.</p>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2rem]">
          <CardHeader className="space-y-1 pb-6 pt-8 text-center bg-accent/10 border-b border-dashed">
            <CardTitle className="text-xl font-black text-primary italic uppercase">Nova Senha</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pt-8 space-y-6">
            {authError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-[10px] font-bold uppercase">{authError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-primary/40 px-2">Nova Senha de Segurança</Label>
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
                <Label className="text-[10px] font-black uppercase text-primary/40 px-2">Confirmar Nova Senha</Label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="h-12 bg-muted/30 border-none rounded-xl font-bold" 
                  required 
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground font-black h-14 text-sm shadow-xl rounded-xl transition-all border-none">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar e Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (

    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500 z-10 relative">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-xl bg-white p-2">
          <Image 
            src={logoUrl} 
            alt="Logo" 
            fill 
            unoptimized
            className="object-contain p-1"
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">
            Compro<span className="text-accent">misso</span>
          </h1>
          <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3 text-accent" />
            Rede Santana de Parnaíba
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
              <Label htmlFor="password" title="Senha" className="text-[10px] font-black uppercase text-primary/40 px-2">Senha de Segurança</Label>
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
