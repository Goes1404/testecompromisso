'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
        <h1 className="text-2xl md:text-[22px] font-bold text-[#002f6c] mb-1 leading-tight">
          Área restrita do Compromisso <span className="font-normal italic">(Colégio e Curso)</span>
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Estudante, responsável e educador.
        </p>
      </div>

      <form onSubmit={handleLogin} className="w-full space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-[11px] text-gray-500 font-normal uppercase tracking-wide">Identificação</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="seu@compromisso.com"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full h-12 bg-[#edf2f7] border-0 rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-white transition-all text-sm font-medium" 
            required 
            disabled={loading} 
          />
        </div>

        <div className="space-y-1 mt-6">
          <Label htmlFor="password" className="text-[11px] text-gray-500 font-normal uppercase tracking-wide">Senha</Label>
          <Input 
            id="password" 
            type="password" 
            placeholder="••••••••"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full h-12 bg-white border border-gray-300 rounded focus-visible:ring-2 focus-visible:ring-primary transition-all text-sm font-medium" 
            required 
            disabled={loading} 
          />
        </div>

        {authError && (
          <p className="text-[#e53e3e] text-sm mt-2">{authError}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-[#002f6c] hover:bg-[#001f4d] active:scale-95 text-white font-bold h-12 rounded transition-all mt-6">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
        </Button>

        <div className="flex justify-center flex-wrap items-center gap-4 mt-8 text-xs font-medium">
          <Link 
            href="/forgot-password"
            className="text-[#3182ce] hover:underline px-4 py-2 border border-gray-200 rounded transition-colors hover:bg-gray-50"
          >
            Esqueceu a senha?
          </Link>
          <Link 
            href="#"
            className="text-[#3182ce] hover:underline px-4 py-2 border border-gray-200 rounded transition-colors hover:bg-gray-50"
          >
            Como acessar
          </Link>
        </div>
      </form>
    </div>
  );
}
