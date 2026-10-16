'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Search, CheckCircle2, AlertCircle,
  GraduationCap, ArrowRight, School,
  Eye, EyeOff, ArrowLeft, Sparkles, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Step = 'search' | 'found' | 'varios' | 'register' | 'success';

const HEADER: Record<Step, { label: string; sub: string; color: string }> = {
  search:   { label: 'Primeiro Acesso', sub: 'Identificação',   color: 'from-indigo-600 to-indigo-700'  },
  found:    { label: 'Primeiro Acesso', sub: 'Conta Localizada', color: 'from-emerald-600 to-emerald-700' },
  varios:   { label: 'Primeiro Acesso', sub: 'Mais de uma conta', color: 'from-amber-500 to-amber-600'   },
  register: { label: 'Primeiro Acesso', sub: 'Criar Conta',     color: 'from-orange-500 to-orange-600'  },
  success:  { label: 'Primeiro Acesso', sub: 'Pronto!',         color: 'from-emerald-600 to-emerald-700' },
};

function PrimeiroAcessoContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [step, setStep] = useState<Step>('search');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  // Sem `id`: a rota deixou de devolver o uuid do perfil, que esta tela nunca usou.
  const [userFound, setUserFound] = useState<{ email: string; name: string } | null>(null);
  // A senha padrão só vem do servidor quando a conta AINDA a usa. `null` =
  // o aluno já criou a própria senha (a tela antiga mostrava a padrão para
  // todo mundo, e 1 em cada 4 levava "e-mail ou senha inválidos").
  const [senhaInicial, setSenhaInicial] = useState<string | null>(null);
  // Duas ou mais contas com o nome exato: a tela não escolhe nenhuma.
  const [quantasContas, setQuantasContas] = useState(0);
  // O aluno pediu conta nova com e-mail diferente (só existe no passo `varios`).
  const [emailDiferente, setEmailDiferente] = useState(false);

  // Register fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [examTarget, setExamTarget] = useState('ENEM');
  const [institution, setInstitution] = useState('');
  const [sala, setSala] = useState('');

  const apiPost = (body: object) =>
    Promise.race([
      fetch('/api/student/primeiro-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo esgotado. Verifique sua conexão e tente novamente.')), 12_000)
      ),
    ]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await apiPost({ action: 'search', fullName });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmailDiferente(false);
      if (data.encontrado === 'um' && data.user) {
        setUserFound(data.user);
        setSenhaInicial(typeof data.senhaInicial === 'string' ? data.senhaInicial : null);
        setStep('found');
      } else if (data.encontrado === 'varios') {
        setQuantasContas(Number(data.quantidade) || 2);
        setStep('varios');
      } else {
        setStep('register');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar aluno.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setError('');
    setIsLoading(true);
    try {
      const res = await apiPost({
        action: 'register', fullName, examTarget, password, institution, classroom: sala, inviteToken,
        permitirEmailDiferente: emailDiferente,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUserFound({ email: data.email, name: fullName });
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  const h = HEADER[step];

  return (
    <div className="min-h-screen w-full bg-gray-950 flex items-start sm:items-center justify-center p-4 py-10 relative overflow-x-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-orange-600/15 rounded-full blur-[100px] pointer-events-none" />

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
                <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter leading-tight">Quem é você?</h1>
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  Digite seu nome completo, igual ao da matrícula, ou o seu login.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nome completo ou login</Label>
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
                <p className="text-[10px] text-gray-400 ml-1 font-medium">Nome inteiro, com todos os sobrenomes. Acento e maiúscula não importam.</p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !fullName.trim()}
                className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest border-none shadow-lg active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <span className="flex items-center gap-2">Localizar meu Acesso <ArrowRight className="h-4 w-4" /></span>
                )}
              </Button>

              <p className="text-center text-xs text-gray-300 font-medium">
                Já tem senha?{' '}
                <Link href="/login" className="inline-flex min-h-11 items-center px-1.5 align-middle text-indigo-500 font-bold hover:underline">Faça login aqui</Link>
              </p>
            </form>
          )}

          {/* ── STEP: FOUND (conta existe → mostrar credenciais) ── */}
          {step === 'found' && userFound && (
            <div className="p-7 space-y-5">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter leading-tight">
                  Olá, {userFound.name.split(' ')[0]}!
                </h1>
                <p className="text-sm text-gray-400 font-medium">Encontramos sua conta. Use as credenciais abaixo para entrar.</p>
              </div>

              <div className="bg-emerald-50 rounded-2xl px-5 py-4 border border-emerald-100 space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Seu e-mail de login</p>
                  <p className="text-sm font-black text-emerald-900 break-all">{userFound.email}</p>
                </div>
                {senhaInicial ? (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Senha inicial</p>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-sm font-black text-emerald-900 tracking-wider">{senhaInicial}</p>
                    </div>
                    <p className="text-[10px] font-semibold text-emerald-700 mt-1">No primeiro login a plataforma pede para você criar a sua senha.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Senha</p>
                    <p className="text-sm font-bold text-emerald-900 leading-snug">Você já criou a sua própria senha. Use ela para entrar.</p>
                  </div>
                )}
              </div>

              {!senhaInicial && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-800 leading-relaxed">Não lembra a senha?</p>
                  <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                    <Link href="/forgot-password" className="font-black underline underline-offset-2">Recupere pelo celular</Link>{' '}
                    ou peça à secretaria um link para criar uma senha nova.
                  </p>
                </div>
              )}

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all"
              >
                <CheckCircle2 className="h-5 w-5" /> Ir para o Login
              </Link>

              <button
                type="button"
                onClick={() => { setStep('search'); setError(''); setFullName(''); setUserFound(null); }}
                className="w-full text-[10px] font-black uppercase text-gray-300 hover:text-gray-500 transition-colors"
              >
                Não sou eu — buscar outro nome
              </button>
            </div>
          )}

          {/* ── STEP: VÁRIAS CONTAS (nome exato em 2+ contas) ── */}
          {step === 'varios' && (
            <div className="p-7 space-y-5">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter leading-tight">
                  Achamos {quantasContas} contas com esse nome
                </h1>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Para não entregar o login de outra pessoa, não escolhemos nenhuma.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 space-y-1">
                <p className="text-xs font-black text-gray-900">Já tenho cadastro</p>
                <p className="text-[11px] font-medium text-gray-600 leading-relaxed">
                  Fale com a secretaria: ela confere qual conta é a sua e passa o seu login. Se souber o login, volte e digite ele no lugar do nome.
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3.5 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-black text-orange-900">Ainda não tenho cadastro</p>
                  <p className="text-[11px] font-medium text-orange-800 leading-relaxed">
                    Crie uma conta nova. Como o nome já existe, o seu login vai ter um número no final.
                  </p>
                </div>
                {inviteToken ? (
                  <Button
                    type="button"
                    onClick={() => { setEmailDiferente(true); setError(''); setStep('register'); }}
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest border-none"
                  >
                    Criar conta nova
                  </Button>
                ) : (
                  <p className="text-[11px] font-bold text-amber-700">Para criar conta, abra o link de convite que a escola enviou.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep('search'); setError(''); }}
                className="w-full min-h-11 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
              >
                Voltar e buscar de novo
              </button>
            </div>
          )}

          {/* ── STEP: REGISTER ── */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="p-7 space-y-5">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-black text-gray-900 italic tracking-tighter leading-tight">
                  Vamos criar<br />sua conta!
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                  {emailDiferente
                    ? <>Conta nova para <strong className="text-orange-600">{fullName}</strong>. O seu login vai ter um número no final e aparece na próxima tela.</>
                    : <>Não encontramos <strong className="text-orange-600">{fullName}</strong>. Preencha os dados abaixo.</>}
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Escola / Instituição</Label>
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
                <p className="text-sm text-gray-400 font-medium">Conta criada com sucesso. Agora é só entrar!</p>
              </div>

              {userFound && (
                <div className="w-full bg-indigo-50 rounded-2xl px-5 py-4 border border-indigo-100 space-y-2 text-left">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Seu e-mail de login</p>
                    <p className="text-base font-black text-indigo-900 break-all">{userFound.email}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Senha escolhida</p>
                    <p className="text-sm font-bold text-indigo-700">A senha que você definiu acima</p>
                  </div>
                </div>
              )}

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Ir para o Login <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

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
