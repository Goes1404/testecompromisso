"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2, CalendarClock, IdCard, MessageCircle, Lock } from "lucide-react";
import { FormularioDaFicha, RespostaDoEnvio } from "@/components/matricula/FormularioDaFicha";
import { ANO_MATRICULA, Ficha, instante, SituacaoDaFicha } from "@/lib/matricula";

type Janela = { ano: number; situacao: SituacaoDaFicha | "indisponivel"; abre_em?: string; fecha_em?: string };

/**
 * Ficha de matrícula pública (sem login) — "Matrículas 2027".
 * A página só desenha; a API (`/api/matricula`) e o banco decidem se aceita.
 */
export default function MatriculaPage() {
  const [janela, setJanela] = useState<Janela | null>(null);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/matricula", { cache: "no-store" })
      .then((r) => r.json())
      .then(setJanela)
      .catch(() => setJanela({ ano: ANO_MATRICULA, situacao: "indisponivel" }));
  }, []);

  const enviar = async (f: Ficha): Promise<RespostaDoEnvio> => {
    try {
      const r = await fetch("/api/matricula", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { erro: j.error || "Não deu para enviar agora. Tente de novo.", erros: j.erros };
      setProtocolo(j.protocolo);
      window.scrollTo({ top: 0 });
      return { protocolo: j.protocolo };
    } catch {
      return { erro: "Sem conexão. Confira a internet e tente de novo." };
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <header className="bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white">
        <div className="max-w-xl mx-auto px-5 pt-6 pb-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-10 w-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-lg">
                <Image src="/images/logocompromisso.png" alt="" width={32} height={32} className="object-contain" />
              </span>
              <span className="font-black tracking-tight">Cursinho Compromisso</span>
            </Link>
            <Link href="/login" className="shrink-0 whitespace-nowrap text-[11px] font-black uppercase tracking-wider bg-white/15 border border-white/30 rounded-full px-3 h-8 flex items-center">
              Já sou aluno
            </Link>
          </div>
          <p className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/80">ETEC e ENEM · Santana de Parnaíba</p>
          <h1 className="text-4xl font-black italic tracking-tighter leading-none mt-1">Matrícula {ANO_MATRICULA}</h1>
          {janela?.situacao === "aberta" && janela.fecha_em && !protocolo && (
            <p className="mt-3 text-sm font-semibold text-white/90 flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" /> Inscrições até {instante(janela.fecha_em)}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 -mt-6 pb-16">
        <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8">
          {!janela ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
          ) : protocolo ? (
            <Recebida protocolo={protocolo} />
          ) : janela.situacao === "aberta" ? (
            <FormularioDaFicha onEnviar={enviar} />
          ) : (
            <Fechada janela={janela} />
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          Os dados são usados só para a matrícula e o contato sobre as aulas, e ficam com a secretaria do cursinho.
        </p>
      </main>
    </div>
  );
}

function Recebida({ protocolo }: { protocolo: string }) {
  return (
    <div className="space-y-6 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
      <div>
        <h2 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">Inscrição recebida!</h2>
        <p className="text-sm text-slate-500 mt-1">Tire um print desta tela e guarde o número.</p>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-orange-300 p-5">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Protocolo</span>
        <p className="text-4xl font-black tracking-widest tabular-nums text-slate-900 dark:text-white">{protocolo}</p>
      </div>
      <ol className="text-left space-y-3">
        <Passo icone={MessageCircle} titulo="A secretaria chama no WhatsApp">
          Para marcar a confirmação da matrícula.
        </Passo>
        <Passo icone={IdCard} titulo="Confirmação na secretaria">
          Leve o RG original do aluno. Menor de 18 anos vai com o responsável, que assina.
        </Passo>
        <Passo icone={CheckCircle2} titulo="Sala sorteada">
          Com a matrícula confirmada, o aluno é sorteado para uma sala e recebe o acesso à plataforma antes da primeira aula.
        </Passo>
      </ol>
    </div>
  );
}

function Passo({ icone: Icone, titulo, children }: { icone: any; titulo: string; children: React.ReactNode }) {
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

function Fechada({ janela }: { janela: Janela }) {
  const texto =
    janela.situacao === "antes" && janela.abre_em ? `As inscrições abrem em ${instante(janela.abre_em)}.`
      : janela.situacao === "encerrada" ? "As inscrições pela internet terminaram. Procure a secretaria do cursinho: ainda pode haver lista de espera."
      : janela.situacao === "pausada" ? "As inscrições estão pausadas no momento. Volte em breve ou procure a secretaria."
      : "A inscrição está fora do ar agora. Tente de novo mais tarde.";
  return (
    <div className="text-center py-10 space-y-3">
      <Lock className="h-10 w-10 text-slate-300 mx-auto" />
      <p className="font-black italic text-lg text-slate-800 dark:text-slate-100">Inscrições fechadas</p>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{texto}</p>
    </div>
  );
}
