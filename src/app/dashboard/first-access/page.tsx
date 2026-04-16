'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  LockKeyhole,
  CheckCircle2,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";

export default function FirstAccessPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Requisitos de senha
  const hasLength = newPassword.length >= 8;
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasLength || !hasSymbol || !hasNumber) {
      setError("A senha não atende aos requisitos mínimos de segurança.");
      return;
    }

    if (!isMatch) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false }
      });

      if (updateError) throw updateError;

      // Se tudo der certo, marca como sucesso
      setSuccess(true);
      toast({
        title: "Senha atualizada com sucesso!",
        description: "Seu acesso seguro foi configurado.",
      });

      // Aguarda 2 segundos para o feedback visual antes de ir para a home
      setTimeout(() => {
        window.location.assign("/dashboard");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Erro ao atualizar senha residencial.");
      setLoading(false);
    }
  };

  // Se o usuário já está logado no Auth, deixamos ele ver a página mesmo que o Perfil demore
  if (authLoading && !user) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-950">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-xl space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 shadow-lg" title="Configuração de Segurança">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Configuração de Segurança</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
            Bem-vindo ao <span className="text-primary">Compromisso!</span>
          </h1>
          <p className="text-white/50 text-sm font-medium italic max-w-md mx-auto">
            Este é seu primeiro acesso. Por favor, defina sua senha definitiva de segurança.
          </p>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-[2.5rem]">
          <CardHeader className="p-8 pb-4 text-center border-b border-dashed border-muted">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <LockKeyhole className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black text-primary italic uppercase">Sua Nova Senha</CardTitle>
          </CardHeader>
          
          <CardContent className="p-8 space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs font-bold uppercase">{error}</AlertDescription>
              </Alert>
            )}

            {success ? (
              <div className="py-10 text-center space-y-4">
                <div className="h-20 w-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto text-green-600 animate-bounce">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-black text-primary italic">Acesso Configurado!</h3>
                <p className="text-sm text-slate-500 font-medium">Você será redirecionado para a plataforma principal...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-primary/60 px-2 tracking-widest">Nova Senha</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-14 bg-muted/30 border-none rounded-2xl font-bold px-6 pr-14 text-lg focus-visible:ring-accent shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase text-primary/60 px-2 tracking-widest">Confirmar Senha</Label>
                    <div className="relative">
                      <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-14 bg-muted/30 border-none rounded-2xl font-bold px-6 pr-14 text-lg focus-visible:ring-accent shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score de Segurança */}
                <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-2xl border border-muted/20">
                  <p className="col-span-2 text-[10px] font-black uppercase text-primary/40 tracking-widest mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3" /> Requisitos de Segurança
                  </p>
                  {[
                    { label: "Mín. 8 caracteres", met: hasLength },
                    { label: "Símbolo especial", met: hasSymbol },
                    { label: "Número incluído", met: hasNumber },
                    { label: "Senhas conferem", met: isMatch },
                  ].map((req, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[10px] font-black uppercase ${req.met ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${req.met ? 'bg-green-600' : 'bg-slate-300'}`} />
                      {req.label}
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-2">
                  <Button 
                    type="submit" 
                    disabled={loading || !isMatch || !hasLength}
                    className="w-full h-16 bg-primary text-white font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] transition-all border-none"
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Ativar Minha Conta"}
                  </Button>
                  
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase italic">
                    <Info className="h-3 w-3 text-primary/30" />
                    Esta senha será seu acesso único ao COMPROMISSO
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <footer className="text-center opacity-40">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Compromisso • Sistema Acadêmico Inteligente</p>
        </footer>
      </div>
    </div>
  );
}
