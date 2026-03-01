
'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ChevronRight, Loader2, Sparkles, UserCircle, Users, GraduationCap, AlertCircle, UserPlus, BookOpen, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!email || !password) return;
    
    if (!isSupabaseConfigured) {
      setAuthError("Configuração Inválida: Verifique se você está usando a ANON KEY e não a SERVICE_ROLE KEY no seu ambiente.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        console.error("Erro de Autenticação:", error.message);
        
        if (error.message.includes("secret API key")) {
          setAuthError("Erro de Segurança: Uma chave secreta foi detectada no navegador. Por favor, use a 'anon public' key do Supabase.");
        } else {
          setAuthError("E-mail ou senha incorretos. Verifique os dados informados.");
        }
        return;
      }

      if (data.user) {
        setIsRedirecting(true);
        toast({ title: "Login bem-sucedido!", description: "Sintonizando seu portal..." });
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_type')
          .eq('id', data.user.id)
          .single();

        const role = profile?.profile_type || data.user.user_metadata?.role || 'student';
        
        setTimeout(() => {
          if (role === 'admin') {
            router.push("/dashboard/admin/home");
          } else if (role === 'teacher') {
            router.push("/dashboard/teacher/home");
          } else {
            router.push("/dashboard/home");
          }
        }, 100);
      }

    } catch (err: any) {
      setLoading(false);
      setAuthError("Erro inesperado na conexão. Verifique sua internet.");
    }
  };

  const fillCredentials = (type: 'student' | 'teacher' | 'admin') => {
    const creds = {
      student: { email: "aluno@compromisso.com.br", password: "123456789" },
      teacher: { email: "mentor@compromisso.com.br", password: "123456789" },
      admin: { email: "gestor@compromisso.com.br", password: "123456789" }
    };
    setEmail(creds[type].email);
    setPassword(creds[type].password);
    setAuthError(null);
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 z-10 relative">
      {isRedirecting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary text-white animate-in fade-in duration-300">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-accent text-accent-foreground shadow-2xl mb-6 animate-bounce">
            <BookOpen className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-black italic tracking-tighter mb-2">Compromisso</h2>
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Sintonizando Ambiente...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-2xl rotate-3 hover:rotate-0 transition-all duration-500 group border border-white/10">
          <Shield className="h-12 w-12 group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-2">
          <h1 className="font-headline text-4xl font-black tracking-tighter text-white drop-shadow-lg">
            Compro<span className="text-accent">misso</span>
          </h1>
          <p className="text-white/70 font-medium flex items-center justify-center gap-2 italic">
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
            Portal de Gestão Inteligente
          </p>
        </div>
      </div>

      <Card className="border-none shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl bg-white/95 rounded-[2.5rem]">
        <CardHeader className="space-y-1 pb-6 pt-8 text-center bg-primary/5 border-b border-dashed">
          <CardTitle className="text-2xl font-black text-primary italic">Acesso Restrito</CardTitle>
          <CardDescription className="font-medium text-muted-foreground italic">Entre para continuar seus estudos.</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pt-8 space-y-6">
          {authError && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 animate-in shake-1">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-black uppercase text-[10px] tracking-widest">Falha no Acesso</AlertTitle>
              <AlertDescription className="text-xs font-medium">{authError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-primary/60">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-white rounded-xl border-muted/20" placeholder="seu@email.com" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" title="Senha" className="font-bold text-primary/60">Senha</Label>
                <Link href="#" className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">Esqueceu?</Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-white rounded-xl border-muted/20" placeholder="••••••••" required disabled={loading} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-black h-14 text-base shadow-xl rounded-2xl transition-all">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Entrar na Plataforma <ChevronRight className="h-5 w-5 ml-1" /></>}
            </Button>
          </form>

          <div className="flex flex-col gap-4 pt-2">
            <Button asChild variant="outline" className="h-12 rounded-xl border-dashed border-primary/20 hover:bg-primary/5 text-primary font-black uppercase text-[10px] gap-2 tracking-widest">
              <Link href="/register"><UserPlus className="h-4 w-4" /> Não tem conta? Criar Agora</Link>
            </Button>
          </div>

          <div className="pt-6 space-y-4 border-t border-dashed">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40">
              <Users className="h-3 w-3" /> Contas de Demonstração
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => fillCredentials('student')} className="h-11 rounded-xl text-blue-700 font-black gap-1 text-[9px] justify-center px-2 border-blue-100 hover:bg-blue-50">
                <GraduationCap className="h-3 w-3" /> ALUNO
              </Button>
              <Button variant="outline" onClick={() => fillCredentials('teacher')} className="h-11 rounded-xl text-orange-700 font-black gap-1 text-[9px] justify-center px-2 border-orange-100 hover:bg-orange-50">
                <UserCircle className="h-3 w-3" /> MENTOR
              </Button>
              <Button variant="outline" onClick={() => fillCredentials('admin')} className="h-11 rounded-xl text-red-700 font-black gap-1 text-[9px] justify-center px-2 border-red-100 hover:bg-red-50">
                <ShieldCheck className="h-3 w-3" /> GESTOR
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
