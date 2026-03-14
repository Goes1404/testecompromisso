
'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Loader2, Sparkles, AlertCircle, BookOpen } from "lucide-react";
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
  const { toast } = useToast();
  const router = useRouter();
  
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!isSupabaseConfigured) {
      setAuthError("Erro de Configuração: NEXT_PUBLIC_SUPABASE_URL não detectada no ambiente.");
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
        setIsRedirecting(true);
        // Redirecionamento instantâneo via window.location para limpar o estado pesado da SPA e entrar na área autenticada
        window.location.href = "/dashboard";
      }

    } catch (err: any) {
      setLoading(false);
      setAuthError("Erro de comunicação com o servidor.");
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 z-10 relative">
      
      {isRedirecting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-white animate-in fade-in duration-300">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 shadow-2xl mb-6 animate-pulse">
            <BookOpen className="h-10 w-10 text-accent" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Autenticando Rede...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative h-20 w-20 overflow-hidden rounded-2xl shadow-xl bg-white p-2 border-4 border-white/10">
          <Image 
            src={logoUrl} 
            alt="Logo Santana de Parnaíba" 
            fill 
            unoptimized
            className="object-contain p-1"
          />
        </div>
        <div className="space-y-2">
          <h1 className="font-headline text-4xl font-black tracking-tighter text-white drop-shadow-lg uppercase italic">
            Compro<span className="text-accent">misso</span>
          </h1>
          <p className="text-white/70 font-medium flex items-center justify-center gap-2 italic">
            <Sparkles className="h-4 w-4 text-accent" />
            Portal de Acesso Industrial
          </p>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden backdrop-blur-md bg-white/95 rounded-[2rem]">
        <CardHeader className="space-y-1 pb-6 pt-8 text-center bg-primary/5 border-b border-dashed">
          <CardTitle className="text-2xl font-black text-primary italic uppercase">Entrar no Sistema</CardTitle>
          <CardDescription className="font-medium text-muted-foreground italic">Identidade Unificada Santana de Parnaíba.</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pt-8 space-y-6">
          
          {authError && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-bold italic">{authError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-primary/60">E-mail Corporativo ou Aluno</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-white rounded-lg border-muted/20" placeholder="seu@email.com" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" title="Senha" className="font-bold text-primary/60">Senha de Segurança</Label>
                <Link href="#" className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">Recuperar</Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-white rounded-lg border-muted/20" placeholder="••••••••" required disabled={loading} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-black h-14 text-base shadow-xl rounded-xl transition-all">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Acessar Portal <ChevronRight className="h-5 w-5 ml-1 text-accent" /></>}
            </Button>
          </form>

          <div className="pt-6 text-center border-t border-dashed">
            <p className="text-xs font-medium text-muted-foreground italic">
              Ainda não possui conta? <Link href="/register" className="text-primary font-black uppercase text-[10px] tracking-widest hover:text-accent transition-colors">Criar Cadastro</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
