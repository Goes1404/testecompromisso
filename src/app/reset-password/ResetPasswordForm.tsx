"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ehMesmaSenha } from "@/lib/auth-erros";
import {
  lerLinkDeSenha,
  mensagemDoErroDoLink,
  requisitosDaSenha,
  senhaAtendeRequisitos,
  TIPO_DO_TOKEN,
  type FinalidadeDoLink,
  type LeituraDoLink,
} from "@/lib/link-de-senha";

/**
 * Tela do link de senha que a secretaria gera (primeiro acesso ou redefinir).
 * Regras do link em `src/lib/link-de-senha.ts`.
 *
 * Duas regras de segurança desta tela:
 *
 * 1. **O formulário só aparece depois de validar ESTE link, nesta visita.**
 *    A versão anterior aceitava qualquer sessão já aberta no navegador. Como o
 *    link nunca validava (ver o arquivo de regras), quem abria o link num
 *    aparelho com outra conta logada — a secretaria testando, o irmão que
 *    também é aluno — via o formulário e trocava a senha de QUEM ESTAVA
 *    LOGADO, não a do aluno do link.
 * 2. **O token só é usado no toque em "Continuar".** A prévia do WhatsApp abre
 *    o endereço para montar o cartão; se a troca fosse automática, a prévia
 *    gastaria o link de uso único antes do aluno.
 *
 * O link de 24 h (`?convite=…`, desde 16/10) funciona várias vezes: quem
 * confere e grava é o servidor (`/api/auth/link-de-senha`), e a tela entra com
 * a senha nova logo depois. O de 1 h (`?token_hash=…`) é de uso único e vira
 * sessão no "Continuar", como antes.
 *
 * Validar o link substitui a sessão aberta sem "sair da conta" antes: o
 * `AuthProvider` manda para `/login` em todo `SIGNED_OUT`, o que interromperia
 * a tela no meio.
 */

type Etapa = "lendo" | "sem-link" | "confirmar" | "validando" | "formulario" | "salvando" | "sucesso" | "invalido";
type Conta = { email: string; nome: string | null };

const TEXTOS: Record<FinalidadeDoLink, { titulo: string; acao: string; sucesso: string }> = {
  "primeiro-acesso": { titulo: "Criar sua senha", acao: "Criar senha", sucesso: "Senha criada!" },
  redefinir: { titulo: "Redefinir sua senha", acao: "Gravar nova senha", sucesso: "Senha redefinida!" },
};

function nomeDe(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): Conta | null {
  if (!user?.email) return null;
  const meta = user.user_metadata ?? {};
  const nome = typeof meta.full_name === "string" && meta.full_name.trim() ? meta.full_name.trim() : null;
  return { email: user.email, nome };
}

const CARTAO = "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-7 sm:p-8 shadow-2xl";

export default function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [etapa, setEtapa] = useState<Etapa>("lendo");
  const [link, setLink] = useState<LeituraDoLink>({ tipo: "nenhum" });
  const [erro, setErro] = useState("");
  const [logadaAntes, setLogadaAntes] = useState<Conta | null>(null);
  const [conta, setConta] = useState<Conta | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);

  const finalidade: FinalidadeDoLink =
    link.tipo === "token" || link.tipo === "sessao" || link.tipo === "convite" ? link.finalidade : "redefinir";
  const textos = TEXTOS[finalidade];
  const req = requisitosDaSenha(senha);
  const senhaOk = senhaAtendeRequisitos(senha);
  const confere = senha === confirmacao && confirmacao.length > 0;

  useEffect(() => {
    const lido = lerLinkDeSenha(window.location.search, window.location.hash);
    setLink(lido);
    if (lido.tipo === "erro") {
      setErro(lido.mensagem);
      setEtapa("invalido");
      return;
    }
    if (lido.tipo === "nenhum") {
      setEtapa("sem-link");
      return;
    }
    // Só para avisar: quem já está logado neste aparelho sai ao continuar.
    supabase.auth.getSession().then(({ data }) => {
      setLogadaAntes(nomeDe(data.session?.user));
      setEtapa("confirmar");
    });
  }, []);

  const pedirAoServidor = async (corpo: Record<string, string>) => {
    const res = await fetch("/api/auth/link-de-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, dados };
  };

  const continuar = async () => {
    if (link.tipo !== "token" && link.tipo !== "sessao" && link.tipo !== "convite") return;
    setEtapa("validando");
    if (link.tipo === "convite") {
      // Só confere de quem é a conta: o link continua valendo, e nada muda até gravar.
      try {
        const { ok, dados } = await pedirAoServidor({ acao: "conferir", token: link.convite });
        if (!ok || !dados?.email) throw new Error(dados?.error || "Não foi possível validar este link.");
        setConta({ email: dados.email, nome: dados.nome ?? null });
        setEtapa("formulario");
      } catch (e: any) {
        setErro(e?.message || mensagemDoErroDoLink(null, null));
        setEtapa("invalido");
      }
      return;
    }
    try {
      const { data, error } =
        link.tipo === "token"
          ? await supabase.auth.verifyOtp({ type: TIPO_DO_TOKEN, token_hash: link.tokenHash })
          : await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
      const quem = nomeDe(data?.user ?? data?.session?.user);
      if (error || !data?.session || !quem) throw error ?? new Error("sem sessão");
      setConta(quem);
      // O token já foi usado: tira do endereço (histórico, captura de tela).
      window.history.replaceState(null, "", "/reset-password");
      setEtapa("formulario");
    } catch (e: any) {
      setErro(mensagemDoErroDoLink(e?.code, e?.message));
      setEtapa("invalido");
    }
  };

  const salvar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!confere) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (!senhaOk) {
      toast({ title: "A senha não atende aos requisitos", variant: "destructive" });
      return;
    }
    setEtapa("salvando");
    if (link.tipo === "convite") {
      try {
        const { ok, status, dados } = await pedirAoServidor({ acao: "gravar", token: link.convite, senha });
        if (!ok) {
          if (status === 410 || status === 403) {
            setErro(dados?.error || mensagemDoErroDoLink(null, null));
            setEtapa("invalido");
            return;
          }
          throw new Error(dados?.error || "Tente de novo em instantes.");
        }
        // A senha já está gravada; entrar é o passo seguinte. Se falhar, o
        // login normal resolve — não desfaz nada.
        const { error } = await supabase.auth.signInWithPassword({ email: dados.email, password: senha });
        setEtapa("sucesso");
        setTimeout(() => router.push(error ? "/login" : "/dashboard/home"), 2500);
      } catch (e: any) {
        setEtapa("formulario");
        toast({ title: "Não foi possível salvar a senha", description: e?.message, variant: "destructive" });
      }
      return;
    }
    try {
      // `must_change_password: false`: o aluno acabou de escolher a senha aqui;
      // mandá-lo à tela de primeiro acesso em seguida pediria a mesma coisa duas
      // vezes. O Promise.race impede a tela de ficar "salvando" para sempre.
      const { error } = await Promise.race([
        supabase.auth.updateUser({ password: senha, data: { must_change_password: false } }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Tempo esgotado. Verifique sua conexão e tente de novo.")), 12_000),
        ),
      ]);
      if (error) throw error;
      setEtapa("sucesso");
      setTimeout(() => router.push("/dashboard/home"), 2500);
    } catch (e: any) {
      setEtapa("formulario");
      toast({
        title: "Não foi possível salvar a senha",
        description: ehMesmaSenha(e) ? "Escolha uma senha diferente da anterior." : e?.message,
        variant: "destructive",
      });
    }
  };

  /* ── Lendo o link / validando ── */
  if (etapa === "lendo" || etapa === "validando") {
    return (
      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-500" aria-busy="true">
        <div className="h-20 w-20 rounded-[1.75rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
          <KeyRound className="h-10 w-10 text-accent" />
        </div>
        <p className="text-white font-black text-lg italic uppercase tracking-widest">
          {etapa === "validando" ? "Validando o link" : "Abrindo"}
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  /* ── Sem link / link inválido ── */
  if (etapa === "sem-link" || etapa === "invalido") {
    return (
      <div className="w-full max-w-sm space-y-7 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-20 w-20 rounded-[1.75rem] bg-red-500/10 border border-red-400/20 flex items-center justify-center mx-auto shadow-2xl">
          <XCircle className="h-10 w-10 text-red-400" />
        </div>
        <div className="space-y-3">
          <p className="text-white font-black text-2xl italic uppercase tracking-tight">
            {etapa === "sem-link" ? "Abra pelo link" : "Link sem validade"}
          </p>
          <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            {etapa === "sem-link"
              ? "Esta página só funciona pelo link que a secretaria envia. Abra o link da mensagem, sem apagar nenhuma parte."
              : erro}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => router.push("/forgot-password")}
            className="w-full bg-accent text-accent-foreground rounded-2xl h-12 font-black uppercase tracking-widest text-xs border-none"
          >
            Recuperar pelo celular
          </Button>
          <Button
            onClick={() => router.push("/login")}
            className="w-full bg-white/10 text-white border border-white/10 hover:bg-white/15 rounded-2xl h-12 font-black uppercase tracking-widest text-xs"
          >
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  /* ── Confirmar (o token só é usado aqui) ── */
  if (etapa === "confirmar") {
    return (
      <div className="w-full max-w-md space-y-7 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="text-center space-y-4">
          <div className="h-20 w-20 rounded-[1.75rem] bg-white/5 border border-white/15 flex items-center justify-center shadow-2xl mx-auto">
            <ShieldCheck className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tight leading-none">{textos.titulo}</h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            {link.tipo === "convite"
              ? "Este link vale por 24 horas e pode ser aberto mais de uma vez. Toque em continuar para ver a conta e escolher a senha."
              : "Este link vale uma vez só e por 1 hora. Toque em continuar para validar e escolher a senha."}
          </p>
        </div>
        <div className={`${CARTAO} space-y-5`}>
          {logadaAntes && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-400/25 p-4 text-left">
              <p className="text-amber-200 text-xs font-bold leading-relaxed">
                Este aparelho está conectado como <span className="font-black break-all">{logadaAntes.email}</span>. Ao
                continuar, essa conta sai daqui e entra a conta do link.
              </p>
            </div>
          )}
          <Button
            onClick={continuar}
            className="w-full h-14 bg-accent text-accent-foreground font-black rounded-2xl shadow-xl shadow-accent/20 uppercase tracking-widest text-xs border-none"
          >
            <span className="flex items-center gap-2">
              Continuar <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Sucesso ── */
  if (etapa === "sucesso") {
    return (
      <div className="w-full max-w-sm space-y-7 text-center animate-in zoom-in duration-500">
        <div className="h-20 w-20 rounded-[1.75rem] bg-green-500/15 border border-green-400/25 flex items-center justify-center mx-auto shadow-2xl">
          <CheckCircle2 className="h-10 w-10 text-green-400" />
        </div>
        <div className="space-y-2">
          <p className="text-white font-black text-3xl italic uppercase">{textos.sucesso}</p>
          <p className="text-white/60 text-sm font-medium">Entrando na plataforma…</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-accent mx-auto" />
      </div>
    );
  }

  /* ── Formulário (só depois de validar este link) ── */
  return (
    <div className="w-full max-w-md space-y-7 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-4">
        <div className="h-20 w-20 rounded-[1.75rem] bg-white/5 border border-white/15 flex items-center justify-center shadow-2xl mx-auto">
          <Lock className="h-10 w-10 text-accent" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tight leading-none">{textos.titulo}</h1>
      </div>

      <div className={`${CARTAO} space-y-6`}>
        {conta && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3.5">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/15 flex items-center justify-center">
              <UserRound className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 text-left">
              {conta.nome && <p className="text-white text-sm font-black leading-tight break-words">{conta.nome}</p>}
              <p className="text-white/60 text-xs font-semibold break-all">{conta.email}</p>
            </div>
          </div>
        )}

        <form onSubmit={salvar} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="nova-senha" className="text-[10px] font-black uppercase tracking-widest text-white/50 px-1">
              Nova senha
            </label>
            <div className="relative">
              <Input
                id="nova-senha"
                type={mostrar ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-14 bg-white/5 border-white/10 text-white text-[16px] placeholder:text-white/30 rounded-2xl font-bold pr-12 focus-visible:ring-1 focus-visible:ring-accent"
                required
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                aria-label={mostrar ? "Esconder senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center text-white/40 hover:text-white/70"
              >
                {mostrar ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmar-senha" className="text-[10px] font-black uppercase tracking-widest text-white/50 px-1">
              Repita a senha
            </label>
            <Input
              id="confirmar-senha"
              type="password"
              autoComplete="new-password"
              placeholder="Digite de novo"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className={`h-14 bg-white/5 border-white/10 text-white text-[16px] placeholder:text-white/30 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-accent ${
                confirmacao.length > 0 ? (confere ? "border-green-500/40" : "border-red-400/40") : ""
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { rotulo: "8+ caracteres", ok: req.tamanho },
              { rotulo: "Maiúscula (A-Z)", ok: req.maiuscula },
              { rotulo: "Número (0-9)", ok: req.numero },
              { rotulo: "Símbolo (!@#…)", ok: req.simbolo },
            ].map((r) => (
              <div
                key={r.rotulo}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${r.ok ? "bg-green-500/10 border-green-500/25" : "bg-white/[0.03] border-white/10"}`}
              >
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${r.ok ? "text-green-400" : "text-white/25"}`} />
                <span className={`text-[10px] font-black uppercase tracking-wide ${r.ok ? "text-green-300" : "text-white/45"}`}>{r.rotulo}</span>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            disabled={etapa === "salvando" || !senhaOk || !confere}
            className="w-full h-14 bg-accent text-accent-foreground font-black rounded-2xl shadow-xl shadow-accent/20 uppercase tracking-widest text-xs border-none disabled:opacity-40"
          >
            {etapa === "salvando" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {textos.acao} <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
