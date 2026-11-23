"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, Minus, RotateCcw, Search, X, Hourglass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FundoDeGabarito } from "@/components/matricula/FundoDeGabarito";
import { hojeNaEscola } from "@/lib/matricula";
import { QuestaoDoResultado, ResultadoPublico, contagemDoResultado, faixaDaNota } from "@/lib/simulado-resultado";

/**
 * Resultado do Simulado Pré-Etec, público (sem login). O aluno procura pelo
 * nome completo (ou nº de inscrição) + data de nascimento, igual à consulta da
 * inscrição, e vê a nota e o gabarito questão a questão. A página só desenha:
 * quem acha o aluno e corrige é o servidor.
 */
export default function ResultadoDoSimuladoPage() {
  const [busca, setBusca] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoPublico | null>(null);

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busca.trim().length < 1 || !nascimento) {
      setErro("Preencha o nome completo (ou o número de inscrição) e a data de nascimento.");
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const r = await fetch("/api/matricula/resultado", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ busca, nascimento }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErro(j.error || "Não deu para consultar agora. Tente de novo.");
      else { setResultado(j.resultado); window.scrollTo({ top: 0 }); }
    } catch {
      setErro("Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setCarregando(false);
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
            <span className="block text-[1.65rem] sm:text-3xl text-white/90">Resultado</span>
            <span className="block text-[2.6rem] sm:text-5xl">Simulado <span className="whitespace-nowrap">Pré-Etec</span> 2026</span>
          </h1>
        </div>
      </header>

      <main className="relative max-w-xl mx-auto px-4 -mt-10 pb-16">
        <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-[0_24px_60px_-20px_rgba(124,45,18,0.35)] ring-1 ring-orange-900/5 dark:ring-white/10 p-5 sm:p-8">
          {resultado ? (
            <div className="space-y-6">
              <Resultado r={resultado} />
              <Button type="button" variant="outline" onClick={() => { setResultado(null); setBusca(""); setNascimento(""); }}
                className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider">
                <RotateCcw className="h-4 w-4 mr-2" /> Nova consulta
              </Button>
            </div>
          ) : (
            <form onSubmit={consultar} className="space-y-5">
              <div>
                <h2 className="text-xl font-black italic tracking-tight text-slate-900 dark:text-white">Ver minha nota</h2>
                <p className="text-sm text-slate-500 mt-1">Sua nota e o gabarito, questão por questão.</p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nome completo do aluno ou número de inscrição</span>
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="name" placeholder="Como foi escrito na ficha, ou o número (ex.: 0012)" className="h-12 rounded-xl" />
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
                {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-5 w-5 mr-2" /> Ver resultado</>}
              </Button>
              <p className="text-xs text-slate-500 text-center">
                É aluno do cursinho? A nota também está na plataforma, em Simulados.
              </p>
            </form>
          )}
        </div>
        <p className="mt-6 max-w-md mx-auto text-center text-xs text-slate-500 dark:text-slate-400">
          Este é o resultado do simulado do cursinho. Não é o resultado oficial do Vestibulinho ETEC.
        </p>
      </main>
    </div>
  );
}

function Resultado({ r }: { r: ResultadoPublico }) {
  if (!r.lancado) {
    return (
      <div className="space-y-5 text-center">
        <h2 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white">Olá, {r.primeiro_nome}!</h2>
        <div className="rounded-[2rem] p-6 bg-amber-50 text-amber-900 border-2 border-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/30">
          <Hourglass className="h-10 w-10 mx-auto opacity-80" />
          <p className="text-2xl font-black italic tracking-tight mt-2">Sua nota ainda não saiu</p>
          <p className="mt-2 text-sm font-semibold opacity-90">
            Achamos a sua inscrição (nº {r.numero}), mas a nota ainda não foi lançada. Volte mais tarde.
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Se você fez a prova e a nota não aparecer, procure a secretaria do cursinho.
        </p>
      </div>
    );
  }

  const n = contagemDoResultado(r.questoes);
  const pct = r.total ? Math.round((r.acertos / r.total) * 100) : 0;
  const faixa = faixaDaNota(r.acertos, r.total);
  const frase = faixa === "alta" ? "Mandou muito bem!" : faixa === "media" ? "Bom caminho. Veja abaixo o que revisar." : "Agora é revisar o que errou. Veja abaixo.";

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-black italic tracking-tight text-slate-900 dark:text-white text-center">Olá, {r.primeiro_nome}!</h2>

      <div className="rounded-[2rem] p-6 text-center text-white bg-[linear-gradient(160deg,#fb923c_0%,#f97316_45%,#c2410c_100%)] shadow-[0_18px_40px_-16px_rgba(194,65,12,0.6)]">
        <p className="text-base font-bold text-white/90">Você acertou</p>
        {/* A nota como uma bolinha de gabarito preenchida — o mesmo desenho da sala na inscrição. */}
        <div className="relative mx-auto mt-3 h-36 w-36">
          <span className="absolute inset-0 rounded-full border-[3px] border-white/45" />
          <span className="absolute inset-2.5 rounded-full bg-white flex flex-col items-center justify-center shadow-[inset_0_-6px_0_rgba(234,88,12,0.12)]">
            <span className="text-6xl font-black italic tracking-tighter leading-none tabular-nums text-orange-600">{r.acertos}</span>
            <span className="text-sm font-black text-orange-900/60 tabular-nums">de {r.total}</span>
          </span>
        </div>
        <p className="mt-3 text-lg font-black italic">{pct}% da prova</p>
        <p className="text-sm font-semibold text-white/85">{frase}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Conta rotulo="Certas" valor={n.certas} classe="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30" />
        <Conta rotulo="Erradas" valor={n.erradas + n.anuladas} classe="bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-500/30" />
        <Conta rotulo="Em branco" valor={n.brancos} classe="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700" />
      </dl>

      <section aria-labelledby="titulo-gabarito" className="space-y-3">
        <div>
          <h3 id="titulo-gabarito" className="text-lg font-black italic tracking-tight text-slate-900 dark:text-white">Gabarito, questão por questão</h3>
          <p className="text-xs text-slate-500 mt-0.5">A letra grande é a que você marcou. Onde errou, a certa aparece embaixo.</p>
        </div>
        <ol className="grid grid-cols-5 gap-1.5">
          {r.questoes.map((q) => <Questao key={q.n} q={q} />)}
        </ol>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <li className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-600" /> certa</li>
          <li className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5 text-red-600" /> errada</li>
          <li className="inline-flex items-center gap-1"><Minus className="h-3.5 w-3.5 text-slate-400" /> em branco</li>
        </ul>
        {n.anuladas > 0 && (
          <p className="text-xs text-slate-500">
            Em {n.anuladas} questão(ões) havia mais de uma alternativa marcada no cartão: contam como erradas.
          </p>
        )}
        {r.questoes.some((q) => q.gabarito === null) && (
          <p className="text-xs text-slate-500">Questão anulada vale ponto para todos.</p>
        )}
      </section>

      <div className="rounded-2xl border-2 border-dashed border-orange-300 p-4 flex items-center justify-around text-center">
        <div>
          <span className="text-xs font-semibold text-slate-500">Número de inscrição</span>
          <p className="text-2xl font-black tracking-widest tabular-nums text-slate-900 dark:text-white">{r.numero}</p>
        </div>
        {r.sala && (
          <div>
            <span className="text-xs font-semibold text-slate-500">Sala da prova</span>
            <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{r.sala}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Conta({ rotulo, valor, classe }: { rotulo: string; valor: number; classe: string }) {
  return (
    <div className={`rounded-2xl border-2 py-3 ${classe}`}>
      <dd className="text-3xl font-black italic tabular-nums leading-none">{valor}</dd>
      <dt className="text-xs font-bold mt-1">{rotulo}</dt>
    </div>
  );
}

function Questao({ q }: { q: QuestaoDoResultado }) {
  const certa = q.resultado === "certa";
  const branco = q.resultado === "branco";
  const anulada = q.gabarito === null;
  const cor = certa ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100 dark:border-emerald-500/40"
    : branco ? "border-slate-200 bg-slate-50 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
    : "border-red-300 bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-100 dark:border-red-500/40";
  const Icone = certa ? Check : branco ? Minus : X;
  const marcada = q.marcada === "*" ? "2+" : q.marcada ?? "–";
  const fala = anulada ? `Questão ${q.n}: anulada, vale ponto`
    : certa ? `Questão ${q.n}: certa, ${q.marcada}`
    : branco ? `Questão ${q.n}: em branco, a certa é ${q.gabarito}`
    : `Questão ${q.n}: errada, você marcou ${q.marcada === "*" ? "mais de uma" : q.marcada}, a certa é ${q.gabarito}`;
  return (
    <li aria-label={fala} className={`rounded-xl border-2 px-1 pt-1 pb-1.5 text-center ${cor}`}>
      <span aria-hidden="true" className="flex items-center justify-between text-[10px] font-bold opacity-70">
        <span className="tabular-nums">{q.n}</span>
        <Icone className="h-3 w-3" />
      </span>
      <span aria-hidden="true" className="block text-xl font-black leading-tight">{anulada && !q.marcada ? "–" : marcada}</span>
      <span aria-hidden="true" className="block text-[10px] font-bold leading-tight h-3">
        {anulada ? "anulada" : !certa ? `certa: ${q.gabarito}` : ""}
      </span>
    </li>
  );
}
