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
  
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!isSupabaseConfigured) {
      setAuthError("Erro: Conexão pendente.");
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
        setAuthError("Credenciais inválidas.");
        return;
      }

      if (data.user) {
        setIsRedirecting(true);
        // Redirecionamento forçado via window.location para garantir que o Next.js 15
        // limpe o cache de rota e carregue o dashboard do zero.
        window.location.assign("/dashboard");
      }

    } catch (err: any) {
      setLoading(false);
      setAuthError("Erro de sincronização.");
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500 z-10 relative">
      
      {isRedirecting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 mb-6">
            <BookOpen className="h-8 w-8 text-accent animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Entrando...</p>
          </div>
        </div>
      )}

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
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Compro<span className="text-accent">misso</span>
          </h1>
          <p className="text-white/60 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3 text-accent" />
            Portal Santana de Parnaíba
          </p>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-[2rem]">
        <CardHeader className="space-y-1 pb-6 pt-8 text-center bg-primary/5 border-b border-dashed">
          <CardTitle className="text-xl font-black text-primary italic uppercase">Acesso Restrito</CardTitle>
          <CardDescription className="text-xs font-medium italic">Insira suas credenciais oficiais.</CardDescription>
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
              <Label htmlFor="email" className="text-[10px] font-black uppercase text-primary/40 px-2">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-muted/30 border-none rounded-xl font-bold" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="Senha" className="text-[10px] font-black uppercase text-primary/40 px-2">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-muted/30 border-none rounded-xl font-bold" required disabled={loading} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/95 text-white font-black h-14 text-sm shadow-xl rounded-xl transition-all border-none">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Acessar Portal <ChevronRight className="h-5 w-5 ml-1 text-accent" /></>}
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