
'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Loader2, Sparkles, AlertCircle, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import Image from "next/image";
import placeholderData from "@/app/lib/placeholder-images.json";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const logoImg = placeholderData.placeholderImages.find(img => img.id === "prefeitura-logo");
  const bgImg = placeholderData.placeholderImages.find(img => img.id === "santana-landmark");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
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
        const { data: profile } = await supabase.from('profiles').select('profile_type').eq('id', data.user.id).single();
        const role = (profile?.profile_type || 'student').toLowerCase();
        
        if (['admin', 'gestor', 'coordenador'].includes(role)) window.location.href = "/dashboard/admin/home";
        else if (['teacher', 'mentor', 'professor'].includes(role)) window.location.href = "/dashboard/teacher/home";
        else window.location.href = "/dashboard/home";
      }

    } catch (err: any) {
      setLoading(false);
      setAuthError("Erro de rede.");
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 z-10 relative">
      <div 
        className="bg-santana-fixed" 
        style={{ backgroundImage: `url('${bgImg?.imageUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Igreja_Matriz_de_Santana_de_Parna%C3%ADba.jpg/1280px-Igreja_Matriz_de_Santana_de_Parna%C3%ADba.jpg"}')` }} 
      />

      {isRedirecting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-white animate-in fade-in duration-300">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-2xl mb-6 animate-bounce">
            <BookOpen className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-black italic tracking-tighter mb-2">Compromisso</h2>
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Sintonizando Rede...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 text-center">
        <Link href="/" className="relative h-20 w-20 overflow-hidden rounded-2xl shadow-xl transition-all duration-500 hover:scale-110 bg-white p-2">
          <Image 
            src={logoImg?.imageUrl || "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG"} 
            alt="Logo Santana de Parnaíba" 
            fill 
            unoptimized
            className="object-contain p-2"
          />
        </Link>
        <div className="space-y-2">
          <h1 className="font-headline text-4xl font-black tracking-tighter text-white drop-shadow-lg uppercase italic">
            Compro<span className="text-accent">misso</span>
          </h1>
          <p className="text-white/70 font-medium flex items-center justify-center gap-2 italic">
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
            Portal de Acesso Institucional
          </p>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden backdrop-blur-2xl bg-white/95 rounded-[2rem]">
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
              <Label htmlFor="email" className="font-bold text-primary/60">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-white rounded-lg border-muted/20" placeholder="seu@email.com" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" title="Senha" className="font-bold text-primary/60">Senha</Label>
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
