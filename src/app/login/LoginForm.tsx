'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Loader2, Sparkles, AlertCircle, Eye, EyeOff, Mail, Lock } from "lucide-react";
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
      // IMPORTANTE: Usamos getUser() em vez de getSession() para evitar loops de redirecionamento
      // e garantir que os metadados (como must_change_password) estejam sempre atualizados.
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        setAuthError("E-mail ou senha incorretos.");
        return;
      }

        // Geração de Chave Única de Sessão (Anti-Compartilhamento)
        const sessionId = crypto.randomUUID();
        localStorage.setItem('comp_session_id', sessionId);
        
        // Atualiza a chave ativa no banco (usando o campo bio como trava temporária)
        await supabase.from('profiles').update({ bio: sessionId }).eq('id', data.user.id);

        if (data.user.user_metadata?.must_change_password) {
          setIsRedirecting(true);
          window.location.assign("/dashboard/first-access");
          return;
        }

        setIsRedirecting(true);
        window.location.assign("/dashboard");
    } catch (err: any) {
      setLoading(false);
      setAuthError("Falha crítica na autenticação.");
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

  return (

    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500 z-10 relative">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative h-20 w-52 transition-transform hover:scale-105 duration-500 rounded-2xl overflow-hidden bg-white shadow-lg border border-white/20">
          <Image 
            src={logoUrl} 
            alt="Logo Compromisso" 
            fill 
            unoptimized
            priority
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
              <Label htmlFor="email" className="text-[10px] font-black uppercase text-primary/40 px-2 tracking-widest">Email de acesso</Label>
              <div className="relative group">
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@compromisso.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="h-14 bg-white border-2 border-slate-100 rounded-2xl font-bold pl-12 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all shadow-sm group-hover:border-slate-200" 
                  required 
                  disabled={loading} 
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/20 group-hover:text-primary/40 transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <Label htmlFor="password" title="Senha" className="text-[10px] font-black uppercase text-primary/40">Senha de Segurança</Label>
              </div>
              <div className="relative group">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="h-14 bg-white border-2 border-slate-100 rounded-2xl font-bold px-12 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all shadow-sm group-hover:border-slate-200" 
                  required 
                  disabled={loading} 
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/20 group-hover:text-primary/40 transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link 
                  href="/forgot-password"
                  className="text-[10px] font-black uppercase text-primary/70 hover:text-primary transition-all underline decoration-transparent hover:decoration-primary/50 underline-offset-4"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/95 text-white font-black h-14 text-sm shadow-xl rounded-xl transition-all border-none">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Acesso ao portal <ChevronRight className="h-5 w-5 ml-1 text-accent" /></>}
            </Button>
          </form>

          <div className="pt-6 text-center border-t border-dashed">
            <p className="text-xs font-medium text-muted-foreground italic">
              Ainda não tem conta? <Link href="/register" className="text-primary font-black uppercase text-[10px] tracking-widest">Criar Cadastro</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
