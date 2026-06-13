'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Search, CheckCircle2, AlertCircle,
  GraduationCap, ArrowRight, Phone, School,
  Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Step = 'search' | 'reset' | 'register' | 'success';

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const HEADER: Record<Step, { label: string; sub: string; color: string }> = {
  search:   { label: 'Primeiro Acesso', sub: 'Identificação',       color: 'from-indigo-600 to-indigo-700'  },
  reset:    { label: 'Primeiro Acesso', sub: 'Configurar Acesso',    color: 'from-emerald-600 to-emerald-700' },
  register: { label: 'Primeiro Acesso', sub: 'Criar Conta',          color: 'from-orange-500 to-orange-600'  },
  success:  { label: 'Primeiro Acesso', sub: 'Pronto!',              color: 'from-emerald-600 to-emerald-700' },
};

function PrimeiroAcessoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [step, setStep] = useState<Step>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [userFound, setUserFound] = useState<{ id: string; email: string; name: string } | null>(null);

  // Reset fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Register fields
  const [examTarget, setExamTarget] = useState('ENEM');
  const [institution, setInstitution] = useState('');
  const [sala, setSala] = useState('');

  // ── ACTIONS ──────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setError('');
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch('/api/student/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', fullName }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.found && data.user) { setUserFound(data.user); setStep('reset'); }
      else setStep('register');
    } catch (err: any) {
      setError(err.name === 'AbortError' ? 'Tempo esgotado. Verifique sua conexão e tente novamente.' : (err.message || 'Erro ao buscar aluno.'));
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFound) return;
    if (!phone.replace(/\D/g, '')) { setError('Informe seu número de celular.'); return; }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setError('');
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch('/api/student/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', userId: userFound.id, newPassword: password, phone: phone.replace(/\D/g, '') }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('success');
      setTimeout(() => router.push('/login'), 4000);
    } catch (err: any) {
      setError(err.name === 'AbortError' ? 'Tempo esgotado. Verifique sua conexão e tente novamente.' : (err.message || 'Erro ao redefinir senha.'));
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setError('');
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch('/api/student/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', fullName, examTarget, password, institution, classroom: sala, inviteToken }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUserFound({ id: '', email: data.email, name: fullName });
      setStep('success');
      setTimeout(() => router.push('/login'), 4000);
    } catch (err: any) {
      setError(err.name === 'AbortError' ? 'Tempo esgotado. Verifique sua conexão e tente novamente.' : (err.message || 'Erro ao criar cadastro.'));
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const h = HEADER[step];

  return (
    <div className="min-h-screen w-full bg-gray-950 flex items-start sm:items-center justify-center p-4 py-10 relative overflow-x-hidden">

      {/* glows */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%]  w-[400px] h-[400px] bg-orange-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* top bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/10 shrink-0">
              <Sparkles className="h-4 w-4 text-white/70" />
            </div>
            <span className="text-white/50 font-black text-[10px] uppercase tracking-[0.3em]">Compromisso</span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="h-3 w-3" />
            Entrar
          </Link>
        </div>

        {/* card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">

          {/* colored header strip */}
          <div className={`bg-gradient-to-r ${h.color} px-7 py-5 flex items-center gap-3`}>
            <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">{h.label}</p>
              <p className="text-base font-black text-white italic leading-tight">{h.sub}</p>
            </div>
          </div>

          {/* ── STEP: SEARCH ── */}
          {step === 'search' && (
            <form onSubmit={handleSearch} className="p-7 space-y-6">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter leading-tight">
                  Quem é você?
                </h1>
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  Digite seu nome completo para localizar seu perfil ou criar sua conta.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Nome Completo
                </Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                  <Input
                    autoFocus
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ex: Maria Carolina Silva"
                    className="h-14 pl-11 bg-gray-50 border-gray-100 rounded-2xl font-bold text-base text-gray-900 placeholder:text-gray-300 focus-visible:ring-indigo-400"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-300 ml-1 font-medium">Use o nome exato como foi cadastrado pela escola.</p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !fullName.trim()}
                className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest border-none shadow-lg active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <span className="flex items-center gap-2">
                    Localizar meu Acesso <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <p className="text-center text-xs text-gray-300 font-medium">
                Já tem senha?{' '}
                <Link href="/login" className="text-indigo-500 font-bold hover:underline">
                  Faça login aqui
                </Link>
              </p>
            </form>
          )}

          {/* ── STEP: RESET ── */}
          {step === 'reset' && userFound && (
            <form onSubmit={handleReset} className="p-7 space-y-5">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter leading-tight">
                  Olá, {userFound.name.split(' ')[0]}!
                </h1>
                <p className="text-sm text-gray-400 font-medium">
                  Encontramos seu perfil. Configure sua senha abaixo.
                </p>
              </div>

              <div className="bg-emerald-50 rounded-2xl px-4 py-3.5 border border-emerald-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Seu e-mail de login</p>
                <p className="text-sm font-black text-emerald-900 break-all">{userFound.email}</p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              {/* phone */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Celular / WhatsApp <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  value={phone}
                  onChange={e => setPhone(maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold text-base focus-visible:ring-emerald-400"
                  required
                />
              </div>

              {/* password */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mín. 8 caracteres"
                    className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold text-base pr-12 focus-visible:ring-emerald-400"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* confirm password */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold text-base pr-12 focus-visible:ring-emerald-400"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* password match indicator */}
              {confirmPassword && (
                <div className={`flex items-center gap-2 text-xs font-bold ml-1 ${password === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {password === confirmPassword ? 'Senhas coincidem' : 'Senhas não coincidem'}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest border-none shadow-lg shadow-emerald-200 active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Salvar e Entrar
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* ── STEP: REGISTER ── */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="p-7 space-y-5">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter leading-tight">
                  Vamos criar<br />sua conta!
                </h1>
                <p className="text-sm text-gray-400 font-medium">
                  Não encontramos{' '}
                  <strong className="text-orange-600">{fullName}</strong>.
                  Preencha os dados abaixo.
                </p>
              </div>

              {!inviteToken && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-700 text-xs font-bold">
                  ⚠️ Cadastro restrito — use o link oficial de convite.
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Escola / Instituição
                </Label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                  <Input
                    autoFocus
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="Ex: E.E. Machado de Assis"
                    className="h-14 pl-11 bg-gray-50 border-gray-100 rounded-2xl font-bold text-base focus-visible:ring-orange-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Sala</Label>
                  <Select value={sala} onValueChange={setSala}>
                    <SelectTrigger className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold text-sm focus-visible:ring-orange-400">
                      <SelectValue placeholder="Nº da sala" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => String(i + 1)).map(n => (
                        <SelectItem key={n} value={n}>Sala {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Foco</Label>
                  <Select value={examTarget} onValueChange={setExamTarget}>
                    <SelectTrigger className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENEM">ENEM</SelectItem>
                      <SelectItem value="ETEC">ETEC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold text-sm pr-10 focus-visible:ring-orange-400"
                      required
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Confirmar</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold text-sm pr-10 focus-visible:ring-orange-400"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {confirmPassword && (
                <div className={`flex items-center gap-2 text-xs font-bold ml-1 ${password === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {password === confirmPassword ? 'Senhas coincidem' : 'Senhas não coincidem'}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !inviteToken}
                className={`w-full h-14 text-white font-black rounded-2xl text-xs uppercase tracking-widest border-none shadow-lg active:scale-95 transition-all ${
                  !inviteToken ? 'bg-gray-300 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
                }`}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar minha Conta'}
              </Button>
            </form>
          )}

          {/* ── STEP: SUCCESS ── */}
          {step === 'success' && (
            <div className="p-7 flex flex-col items-center text-center space-y-6 py-10">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400 rounded-full blur-[40px] opacity-30 scale-150" />
                <div className="h-24 w-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center relative shadow-2xl shadow-emerald-200">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-3xl font-black text-gray-900 italic tracking-tighter">Bem-vindo(a)!</h2>
                <p className="text-sm text-gray-400 font-medium">Acesso configurado. Sua jornada começa agora.</p>
              </div>

              <div className="w-full bg-indigo-50 rounded-2xl px-5 py-4 border border-indigo-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Seu e-mail de login</p>
                <p className="text-base font-black text-indigo-900 break-all">{userFound?.email}</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-indigo-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Entrando no sistema...</span>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <p className="text-center text-[9px] font-black text-white/15 uppercase tracking-[0.3em]">
          © 1997–2026 Colégio Compromisso
        </p>
      </div>
    </div>
  );
}

export default function PrimeiroAcessoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    }>
      <PrimeiroAcessoContent />
    </Suspense>
  );
}
