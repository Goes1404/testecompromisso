'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

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
        email: email.trim(),
        password,
      });

      if (error) {
        setLoading(false);
        setAuthError("Usuário ou senha inválidos.");
        return;
      }

      const sessionId = crypto.randomUUID();
      localStorage.setItem('comp_session_id', sessionId);
      await supabase.from('profiles').update({ bio: sessionId }).eq('id', data.user.id);

      if (data.user.user_metadata?.must_change_password) {
        window.location.assign("/dashboard/first-access");
        return;
      }

      window.location.assign("/dashboard");
    } catch (err: any) {
      setLoading(false);
      setAuthError("Falha crítica na autenticação.");
    }
  };

  return (
    <div className="w-full max-w-[400px] flex flex-col items-center animate-in fade-in zoom-in duration-500">
      <div className="mb-4 w-48 relative h-16 pointer-events-none">
        <Image 
          src={logoUrl} 
          alt="Logo Compromisso" 
          fill 
          unoptimized
          className="object-contain"
        />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-[22px] font-bold text-[#002f6c] mb-1 leading-tight uppercase italic tracking-tighter">
          Portal do Aluno <span className="font-normal italic">(SIAC)</span>
        </h1>
        <p className="text-sm text-gray-400 font-medium">
          Acesse sua jornada de alto desempenho.
        </p>
      </div>

      <form onSubmit={handleLogin} className="w-full space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">E-mail de Acesso</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="seu.nome@compromisso.com"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full h-12 bg-white border-2 border-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all text-sm font-bold shadow-sm" 
            required 
            disabled={loading} 
          />
        </div>

        <div className="space-y-1 mt-6">
          <Label htmlFor="password" className="text-[11px] text-gray-500 font-bold uppercase tracking-widest ml-1">Senha</Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full h-12 bg-white border-2 border-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all text-sm font-bold pr-12 shadow-sm" 
              required 
              disabled={loading} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {authError && (
          <div className="flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100 mt-4">
             <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
             <p className="text-red-700 text-xs font-bold uppercase">{authError}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-black h-14 rounded-xl shadow-lg shadow-orange-600/20 transition-all mt-8 text-lg uppercase italic tracking-wider">
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Entrar no Portal"}
        </Button>

        <div className="flex justify-center flex-wrap items-center gap-4 mt-10 text-[10px] font-black uppercase tracking-widest">
          <Link 
            href="/forgot-password"
            className="text-slate-400 hover:text-orange-600 transition-colors"
          >
            Esqueceu seus dados de acesso?
          </Link>
        </div>
      </form>
    </div>
  );
}
