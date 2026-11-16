"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2, Loader2, CalendarClock, IdCard, Sunrise, MessageCircle, Lock, Camera, Search, ClipboardList, Hourglass, XCircle, RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormularioDaFicha, RespostaDoEnvio } from "@/components/matricula/FormularioDaFicha";
import { FundoDeGabarito } from "@/components/matricula/FundoDeGabarito";
import { ANO_MATRICULA, AVISO_DA_PROVA, Ficha, instante, SituacaoDaFicha, SituacaoDaInscricao, textoDaSituacao, hojeNaEscola } from "@/lib/matricula";

type Janela = { ano: number; situacao: SituacaoDaFicha | "indisponivel"; abre_em?: string; fecha_em?: string };
type Aba = "ficha" | "consulta";
type Recebida = { protocolo: string; inscricao: SituacaoDaInscricao | null };

/**
 * Ficha de inscrição pública (sem login). Duas abas no mesmo link: preencher a
 * ficha e consultar a inscrição. A sala sai na hora (o banco escolhe a sala do
 * foco com menos alunos); a página só desenha — a API e o banco decidem.
 */
export default function FichaDeInscricaoPage() {
  const [janela, setJanela] = useState<Janela | null>(null);
  const [aba, setAba] = useState<Aba>("ficha");
  const [recebida, setRecebida] = useState<Recebida | null>(null);

  useEffect(() => {
    fetch("/api/matricula", { cache: "no-store" })
      .then((r) => r.json())
      .then(setJanela)
      .catch(() => setJanela({ ano: ANO_MATRICULA, situacao: "indisponivel" }));
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("consultar")) setAba("consulta");
  }, []);

  const enviar = async (f: Ficha): Promise<RespostaDoEnvio> => {
    try {
      const r = await fetch("/api/matricula", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { erro: j.error || "Não deu para enviar agora. Tente de novo.", erros: j.erros };
      setRecebida({ protocolo: j.protocolo, inscricao: j.inscricao ?? null });
      window.scrollTo({ top: 0 });
      return { protocolo: j.protocolo };
    } catch {
      return { erro: "Sem conexão. Confira a internet e tente de novo." };
    }
  };

  return (
    <div className="papel-quadriculado min-h-[100dvh]">
      <header className="relative isolate overflow-hidden bg-[linear-gradient(160deg,#fb923c_0%,#f97316_38%,#ea580c_72%,#c2410c_100%)] text-white">
        <FundoDeGabarito className="-z-10" />
        <div className="max-w-xl mx-auto px-5 pt-6 pb-16">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <span className="h-10 w-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                <Image src="/images/logocompromisso.png" alt="" width={32} height={32} className="object-contain" />
              </span>
              <span className="font-black tracking-tight leading-tight">Cursinho Compromisso</span>
            </Link>
            <Link href="/login" className="shrink-0 whitespace-nowrap text-xs font-bold bg-white/15 border border-white/35 backdrop-blur-sm rounded-full px-3.5 h-9 flex items-center hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              Já sou aluno
            </Link>
          </div>
          <p className="mt-10 text-sm font-semibold text-white/85">Cursinho Compromisso em Santana de Parnaíba</p>
          <h1 className="mt-1 font-black italic tracking-tighter leading-[0.9] drop-shadow-[0_2px_12px_rgba(124,45,18,0.35)]">
            <span className="block text-[1.65rem] sm:text-3xl text-white/90">Inscrição para</span>
            <span className="block text-[2.6rem] sm:text-5xl">Simulado <span className="whitespace-nowrap">Pré-Etec</span></span>
          </h1>
          {janela?.situacao === "aberta" && janela.fecha_em && !recebida && aba === "ficha" && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-orange-950/20 px-3 h-8 text-sm font-semibold text-white">
              <CalendarClock className="h-4 w-4" /> Inscrições até {instante(janela.fecha_em)}
            </p>
          )}
        </div>
      </header>

      <main className="relative max-w-xl mx-auto px-4 -mt-10 pb-16">
        <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-[0_24px_60px_-20px_rgba(124,45,18,0.35)] ring-1 ring-orange-900/5 dark:ring-white/10 p-5 sm:p-8">
          {!janela ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
          ) : recebida ? (
            <TelaDaSituacao protocolo={recebida.protocolo} inscricao={recebida.inscricao} nova />
          ) : (
            <div className="space-y-6">
              <Abas aba={aba} onTrocar={setAba} />
              {aba === "consulta" ? (
                <Consulta />
              ) : janela.situacao === "aberta" ? (
                <FormularioDaFicha onEnviar={enviar} />
              ) : (
                <Fechada janela={janela} onConsultar={() => setAba("consulta")} />
              )}
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 max-w-sm mx-auto">
          Os dados são usados só para a inscrição e o contato sobre as aulas, e ficam com a secretaria do cursinho.
        </p>
      </main>
    </div>
  );
}

function Abas({ aba, onTrocar }: { aba: Aba; onTrocar: (a: Aba) => void }) {
  const item = (valor: Aba, rotulo: string, Icone: typeof Search) => (
    <button
      type="button" role="tab" aria-selected={aba === valor} onClick={() => onTrocar(valor)}
      className={`flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${
        aba === valor ? "bg-white text-orange-600 shadow dark:bg-slate-800 dark:text-orange-300" : "text-slate-500 dark:text-slate-400"}`}
    >
      <Icone className="h-4 w-4 shrink-0" /> {rotulo}
    </button>
  );
  return (
    <div role="tablist" className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950">
      {item("ficha", "Fazer inscrição", ClipboardList)}
      {item("consulta", "Consultar", Search)}
    </div>
  );
}

/** Consulta pelo mesmo link: nome completo (ou protocolo) + data de nascimento. */
function Consulta() {
  const [busca, setBusca] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [achada, setAchada] = useState<SituacaoDaInscricao | null>(null);

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busca.trim().length < 1 || !nascimento) {
      setErro("Preencha o nome completo (ou o protocolo) e a data de nascimento.");
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const r = await fetch("/api/matricula/consulta", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ busca, nascimento }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErro(j.error || "Não deu para consultar agora. Tente de novo.");
      else setAchada(j.inscricao);
    } catch {
      setErro("Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setCarregando(false);
    }
  };

  if (achada) {
    return (
      <div className="space-y-6">
        <TelaDaSituacao protocolo={achada.protocolo} inscricao={achada} />
        <Button type="button" variant="outline" onClick={() => { setAchada(null); setBusca(""); setNascimento(""); }} className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider">
          <RotateCcw className="h-4 w-4 mr-2" /> Nova consulta
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={consultar} className="space-y-5">
      <div>
        <h2 className="text-xl font-black italic tracking-tight text-slate-900 dark:text-white">Consultar inscrição</h2>
        <p className="text-sm text-slate-500 mt-1">Veja a sua sala ou o seu lugar na lista de espera.</p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nome completo do aluno ou protocolo</span>
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="name" placeholder="Como foi escrito na ficha, ou 2027-0001" className="h-12 rounded-xl" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Data de nascimento do aluno</span>
        <Input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} max={hojeNaEscola()} className="h-12 rounded-xl" />
      </label>
      {erro && (
        <p role="alert" className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-200">
          {erro}
        </p>
      )}
      <Button type="submit" disabled={carregando} className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-widest shadow-lg">
        {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-5 w-5 mr-2" /> Consultar</>}
      </Button>
    </form>
  );
}

/** Sala (ou fila) + protocolo, com o pedido de print. Serve à inscrição nova e à consulta. */
function TelaDaSituacao({ protocolo, inscricao, nova }: { protocolo: string; inscricao: SituacaoDaInscricao | null; nova?: boolean }) {
  const s = inscricao ?? { status: "recebida" as const, sala: null, posicao: null, foco: null, primeiro_nome: "" };
  const t = inscricao ? textoDaSituacao(inscricao) : textoDaSituacao({ status: "recebida", sala: null, posicao: null, foco: "ETEC" });
  const comSala = !!s.sala && (s.status === "recebida" || s.status === "confirmada");
  const Icone = s.status === "espera" ? Hourglass : s.status === "cancelada" ? XCircle : CheckCircle2;

  return (
    <div className="space-y-5 text-center">
      <div className="rounded-2xl bg-slate-900 text-white p-4 flex items-center gap-3 text-left dark:bg-orange-500/15 dark:border dark:border-orange-500/40">
        <span className="h-11 w-11 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
          <Camera className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="font-black text-base leading-tight">Tire um print desta tela agora</p>
          <p className="text-xs text-white/75 mt-0.5">Ela é o seu comprovante. Mostre na secretaria e no primeiro dia de aula.</p>
        </div>
      </div>

      <div>
        {nova && (
          <h2 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">
            Inscrição recebida{s.primeiro_nome ? `, ${s.primeiro_nome}` : ""}!
          </h2>
        )}
        {!nova && s.primeiro_nome && (
          <h2 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">Olá, {s.primeiro_nome}!</h2>
        )}
      </div>

      <div className={`rounded-[2rem] p-6 ${comSala ? "bg-[linear-gradient(160deg,#fb923c_0%,#f97316_45%,#c2410c_100%)] text-white shadow-[0_18px_40px_-16px_rgba(194,65,12,0.6)]"
        : s.status === "cancelada" ? "bg-red-50 text-red-900 border-2 border-red-200 dark:bg-red-500/10 dark:text-red-100"
        : "bg-amber-50 text-amber-900 border-2 border-amber-200 dark:bg-amber-500/10 dark:text-amber-100"}`}>
        {comSala ? (
          <>
            <p className="text-base font-bold text-white/90">Sua sala{s.foco ? ` de ${s.foco}` : ""}</p>
            {/* A sala como uma bolinha de gabarito preenchida — o mesmo desenho do topo. */}
            <div className="relative mx-auto mt-3 h-36 w-36">
              <span className="absolute inset-0 rounded-full border-[3px] border-white/45" />
              <span className="absolute inset-2.5 rounded-full bg-white flex items-center justify-center shadow-[inset_0_-6px_0_rgba(234,88,12,0.12)]">
                <span className="text-7xl font-black italic tracking-tighter leading-none tabular-nums text-orange-600">{s.sala}</span>
              </span>
            </div>
          </>
        ) : (
          <>
            <Icone className="h-10 w-10 mx-auto opacity-80" />
            <p className="text-2xl font-black italic tracking-tight mt-2">{t.titulo}</p>
            {s.foco && <p className="mt-1 text-sm font-bold opacity-80">{s.foco}</p>}
          </>
        )}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 -mt-1">{t.frase}</p>

      {s.status !== "cancelada" && s.foco === "ETEC" && (
        <div className="rounded-2xl bg-sky-50 border-2 border-sky-200 p-4 flex items-center gap-3 text-left dark:bg-sky-500/10 dark:border-sky-500/30">
          <span className="h-11 w-11 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
            <Sunrise className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-black text-sky-950 dark:text-sky-100 leading-tight">{AVISO_DA_PROVA.titulo}</p>
            <p className="text-sm text-sky-900/80 dark:text-sky-100/80 mt-0.5">{AVISO_DA_PROVA.texto}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-dashed border-orange-300 p-4">
        <span className="text-xs font-semibold text-slate-500">Protocolo</span>
        <p className="text-3xl font-black tracking-widest tabular-nums text-slate-900 dark:text-white">{protocolo}</p>
      </div>

      {s.status !== "cancelada" && (
        <ol className="text-left space-y-3">
          {s.status !== "confirmada" && (
            <>
              <Passo icone={MessageCircle} titulo="A secretaria chama no WhatsApp">
                Para marcar a confirmação da matrícula.
              </Passo>
              <Passo icone={IdCard} titulo="Confirmação na secretaria">
                Leve o RG original do aluno. Menor de 18 anos vai com o responsável, que assina.
              </Passo>
            </>
          )}
          <Passo icone={Search} titulo="Consulte quando quiser">
            Neste mesmo link, em &quot;Consultar&quot;, com o nome completo e a data de nascimento (ou o protocolo).
          </Passo>
        </ol>
      )}
    </div>
  );
}

function Passo({ icone: Icone, titulo, children }: { icone: typeof Search; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="h-9 w-9 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
        <Icone className="h-5 w-5" />
      </span>
      <div>
        <p className="font-black text-slate-900 dark:text-white leading-tight">{titulo}</p>
        <p className="text-sm text-slate-500">{children}</p>
      </div>
    </li>
  );
}

function Fechada({ janela, onConsultar }: { janela: Janela; onConsultar: () => void }) {
  const texto =
    janela.situacao === "antes" && janela.abre_em ? `As inscrições abrem em ${instante(janela.abre_em)}.`
      : janela.situacao === "encerrada" ? "As inscrições pela internet terminaram. Procure a secretaria do cursinho: ainda pode haver lista de espera."
      : janela.situacao === "pausada" ? "As inscrições estão pausadas no momento. Volte em breve ou procure a secretaria."
      : "A inscrição está fora do ar agora. Tente de novo mais tarde.";
  return (
    <div className="text-center py-8 space-y-3">
      <Lock className="h-10 w-10 text-slate-300 mx-auto" />
      <p className="font-black italic text-lg text-slate-800 dark:text-slate-100">Inscrições fechadas</p>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{texto}</p>
      <button type="button" onClick={onConsultar} className="text-sm font-black text-orange-600 underline underline-offset-4">
        Já me inscrevi: consultar minha sala
      </button>
    </div>
  );
}
