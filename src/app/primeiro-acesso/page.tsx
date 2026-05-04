'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ArrowLeft, Search, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, GraduationCap, ArrowRight, Calendar, School, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Step = 'search' | 'reset' | 'register' | 'success';

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [userFound, setUserFound] = useState<{ id: string; email: string; name: string } | null>(null);
  
  // Form fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [examTarget, setExamTarget] = useState('ENEM');
  const [birthDate, setBirthDate] = useState('');
  const [institution, setInstitution] = useState('');
  const [classroom, setClassroom] = useState('');

  // --- ACTIONS ---
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/student/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', fullName })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      if (data.found && data.user) {
        setUserFound(data.user);
        setStep('reset');
      } else {
        setStep('register');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar aluno.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFound) return;
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!birthDate) {
      setError('Por favor, informe sua data de nascimento.');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/student/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', userId: userFound.id, newPassword: password, birthDate })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);
      
      setStep('success');
      setTimeout(() => router.push('/login'), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/student/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'register', 
          fullName, 
          examTarget, 
          password,
          institution,
          classroom
        })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setUserFound({ id: '', email: data.email, name: fullName });
      setStep('success');
      setTimeout(() => router.push('/login'), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDERS ---

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* BACKGROUND DECORATION */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />

        {/* LEFT PANEL: BRANDING & HERO */}
        <div className="hidden lg:flex lg:w-[45%] relative bg-[#001533] items-center justify-center p-16 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.pattern')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-orange-900/20" />
          
          <div className="relative z-10 w-full max-w-md space-y-12">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-orange-400 font-bold text-sm tracking-widest uppercase">
              <Sparkles size={16} />
              Educação de Elite
            </div>
            
            <div className="space-y-6">
              <h2 className="text-6xl font-black text-white leading-[1.1] tracking-tighter italic">
                Sua porta <br />
                de entrada <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-orange-400">
                  para o futuro.
                </span>
              </h2>
              <p className="text-indigo-100/60 text-xl font-medium leading-relaxed">
                O Compromisso é mais que uma escola, é onde seus sonhos ganham forma. Comece sua jornada agora.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-4">
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-white font-black text-lg">Seguro e Rápido</p>
                  <p className="text-indigo-100/40 text-sm">Acesso imediato à plataforma</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <p className="text-white font-black text-lg">Foco Total</p>
                  <p className="text-indigo-100/40 text-sm">Conteúdo planejado para você</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 opacity-10 mix-blend-luminosity grayscale pointer-events-none">
            <Image src="/images/login_hero.jpg" alt="Estudantes" fill className="object-cover" />
          </div>
        </div>
        
        {/* RIGHT PANEL: INTERACTIVE FORM */}
        <div className="w-full lg:w-[55%] flex flex-col items-center justify-center p-6 md:p-12 lg:p-24 relative">
          
          {/* NAVIGATION HEADER */}
          <div className="absolute top-10 right-10 left-10 flex justify-between items-center z-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#001533] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">C</span>
              </div>
              <span className="text-[#001533] font-black text-sm uppercase tracking-widest hidden sm:block">Compromisso</span>
            </div>
            <Link 
              href="/login" 
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all bg-slate-50 hover:bg-indigo-50 px-6 py-3 rounded-2xl border border-slate-100 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Entrar
            </Link>
          </div>

          <div className="w-full max-w-md space-y-10 relative">
            
            {/* STEP 1: SEARCH */}
            {step === 'search' && (
              <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <div className="space-y-4 mb-12">
                  <h1 className="text-5xl font-black text-[#001533] tracking-tighter italic">Quem é você?</h1>
                  <p className="text-slate-500 text-lg font-medium leading-tight">Esqueceu o e-mail ou é seu primeiro dia? Digite seu nome completo para começarmos.</p>
                </div>

                <form onSubmit={handleSearch} className="space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="searchName" className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 ml-1">Seu Nome de Registro</Label>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-orange-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors z-10" />
                      <Input
                        id="searchName"
                        placeholder="Ex: Maria Carolina Silva"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-20 pl-14 bg-white border-slate-100 rounded-2xl text-xl font-black text-slate-800 placeholder:text-slate-200 focus:border-indigo-200 transition-all shadow-sm relative z-0"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-600 animate-in fade-in slide-in-from-top-2">
                      <AlertCircle size={24} />
                      <p className="text-sm font-black italic">{error}</p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={isLoading || !fullName} 
                    className="w-full h-20 bg-[#001533] hover:bg-[#00254d] text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-indigo-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    {isLoading ? <Loader2 className="animate-spin h-7 w-7" /> : (
                      <span className="flex items-center gap-3">
                        Localizar meu Acesso
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* STEP 2: RESET PASSWORD */}
            {step === 'reset' && userFound && (
              <div className="animate-in fade-in zoom-in-95 duration-700">
                <div className="space-y-8 mb-10">
                  <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-5xl font-black text-[#001533] tracking-tighter italic leading-none">Te encontramos!</h1>
                    <p className="text-slate-500 text-lg font-medium">Olá, <span className="text-indigo-600 font-black">{userFound.name.split(' ')[0]}</span>. Vamos configurar sua senha.</p>
                  </div>
                  
                  <div className="p-8 bg-gradient-to-br from-indigo-50 to-white rounded-[2.5rem] border border-indigo-100 shadow-sm relative overflow-hidden group">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">E-mail Gerado pela Escola</p>
                    <p className="text-2xl font-black text-indigo-900 break-all leading-tight italic">{userFound.email}</p>
                  </div>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 ml-1">Pergunta de Segurança: Data de Nascimento</Label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-orange-500 transition-colors z-10" />
                      <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="h-16 pl-12 bg-slate-50 border-slate-100 rounded-2xl font-black text-lg focus:bg-white transition-all" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nova Senha de Acesso</Label>
                      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-16 bg-slate-50 border-slate-100 rounded-2xl font-black text-lg focus:bg-white transition-all" required placeholder="••••••••" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirme a Senha</Label>
                      <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-16 bg-slate-50 border-slate-100 rounded-2xl font-black text-lg focus:bg-white transition-all" required placeholder="••••••••" />
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-sm font-black italic text-center">{error}</p>}

                  <Button type="submit" disabled={isLoading} className="w-full h-20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200">
                    {isLoading ? <Loader2 className="animate-spin h-7 w-7" /> : 'Salvar Senha e Entrar'}
                  </Button>
                </form>
              </div>
            )}

            {/* STEP 3: NEW REGISTER */}
            {step === 'register' && (
              <div className="animate-in fade-in slide-in-from-right-12 duration-700">
                <div className="space-y-8 mb-10">
                  <div className="w-24 h-24 bg-orange-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-orange-200">
                    <AlertCircle className="h-12 w-12 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-5xl font-black text-[#001533] tracking-tighter italic leading-none">Primeiro dia?</h1>
                    <p className="text-slate-500 text-lg font-medium">Não localizamos <span className="text-orange-600 font-black">{fullName}</span>. Vamos criar sua conta agora!</p>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Onde você estuda atualmente?</Label>
                    <div className="relative group">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-orange-500 transition-colors z-10" />
                      <Input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Ex: E.E. Machado de Assis" className="h-16 pl-12 bg-slate-50 border-slate-100 rounded-2xl font-black text-lg" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sua Sala no Cursinho</Label>
                      <div className="relative group">
                        <DoorOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-orange-500 transition-colors z-10" />
                        <Input value={classroom} onChange={e => setClassroom(e.target.value)} placeholder="Opcional" className="h-16 pl-12 bg-slate-50 border-slate-100 rounded-2xl font-black text-lg" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Foco</Label>
                      <Select value={examTarget} onValueChange={setExamTarget}>
                        <SelectTrigger className="h-16 bg-slate-50 border-slate-100 rounded-2xl font-black text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                          <SelectItem value="ENEM" className="rounded-xl font-bold py-3">ENEM</SelectItem>
                          <SelectItem value="ETEC" className="rounded-xl font-bold py-3">ETEC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Senha</Label>
                      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-16 bg-slate-50 border-slate-100 rounded-2xl font-black" required />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar</Label>
                      <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-16 bg-slate-50 border-slate-100 rounded-2xl font-black" required />
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-sm font-black italic text-center">{error}</p>}

                  <Button type="submit" disabled={isLoading} className="w-full h-20 bg-orange-600 hover:bg-orange-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-200">
                    {isLoading ? <Loader2 className="animate-spin h-7 w-7" /> : 'Criar minha Conta Agora'}
                  </Button>
                </form>
              </div>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 'success' && (
              <div className="text-center space-y-10 animate-in zoom-in duration-1000">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[60px] opacity-20 animate-pulse" />
                  <div className="w-32 h-32 bg-emerald-500 rounded-[3rem] flex items-center justify-center relative shadow-2xl shadow-emerald-200">
                    <CheckCircle2 className="h-16 w-16 text-white" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-5xl font-black text-[#001533] italic tracking-tighter">Bem-vindo(a)!</h2>
                  <p className="text-slate-500 text-lg font-medium">Acesso configurado com sucesso. Prepare-se!</p>
                </div>
                <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-3">Seu e-mail de login exclusivo</p>
                  <p className="text-2xl font-black text-[#001533] italic">{userFound?.email}</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Loader2 size={18} className="animate-spin text-indigo-600" />
                  <p className="text-sm font-black text-indigo-600 uppercase tracking-[0.3em]">Entrando no sistema...</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      
      <footer className="bg-white py-8 text-center border-t border-slate-50">
        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">
          Copyright © 1997-2026 Colégio Compromisso • Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
