"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2, Send, Trash2, ChevronDown, UserCheck, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Marca } from "@/lib/correcao-gabarito";
import { Conta, Escolha, LINK_DO_RESULTADO } from "@/lib/simulado-resultado";

/**
 * Passo 3 da correção por foto: lançar as notas.
 *
 * Lançar publica na hora (decisão da coordenação, 23/11): a nota aparece no
 * link público `/resultado` para todo mundo e, para quem tem conta, na
 * plataforma. Por isso há uma conferência antes de gravar: a tela mostra qual
 * conta é de cada aluno e a equipe resolve as dúvidas (aluno com duas contas,
 * homônimo). Nota em conta errada é a nota de um aluno no perfil de outro.
 */
export interface Pronto {
  matricula_id: string;
  nome: string;
  numero: string;
  respostas: Marca[];
  acertos: number;
  total: number;
}
export interface Lancado { matricula_id: string; acertos: number; total: number; perfil_id: string | null; lancado_em: string }
type EscolhaDaTela = Escolha & { lancada: boolean };

const rotuloDaConta = (c: Conta) => `${c.nome}${c.login ? ` · ${c.login}` : ""}${c.sala ? ` · sala ${c.sala}` : ""}${c.usada === false ? " · nunca entrou" : ""}`;

export function LancarNotas({ chave, prontos, foraDoLancamento, lancados, nomeDe, faltaMigration, onMudou }: {
  chave: Marca[] | null;
  prontos: Pronto[];
  /** Cartões que não entram: sem aluno, repetido, nome a conferir ou com erro. */
  foraDoLancamento: number;
  lancados: Lancado[];
  nomeDe: (matriculaId: string) => string;
  faltaMigration: boolean;
  onMudou: () => void;
}) {
  const { toast } = useToast();
  const [escolhas, setEscolhas] = useState<Record<string, EscolhaDaTela> | null>(null);
  const [contaDe, setContaDe] = useState<Record<string, string | null>>({});
  const [ocupado, setOcupado] = useState<"previa" | "lancar" | null>(null);
  const [verTodos, setVerTodos] = useState(false);
  const [verLancadas, setVerLancadas] = useState(false);
  const [apagando, setApagando] = useState<string | null>(null);

  const pedir = async (corpo: unknown) => {
    const r = await fetch("/api/admin/simulado/resultados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Não deu para falar com o servidor.");
    return j;
  };

  const conferir = async () => {
    setOcupado("previa");
    try {
      const j = await pedir({ acao: "previa", ids: prontos.map((p) => p.matricula_id) });
      const e = j.escolhas as Record<string, EscolhaDaTela>;
      setEscolhas(e);
      setContaDe(Object.fromEntries(prontos.map((p) => [p.matricula_id, e[p.matricula_id]?.conta?.id ?? null])));
    } catch (err) {
      toast({ title: "Não deu para conferir as contas", description: (err as Error).message, variant: "destructive" });
    } finally {
      setOcupado(null);
    }
  };

  const lancar = async () => {
    if (!chave) return;
    setOcupado("lancar");
    try {
      const j = await pedir({ acao: "lancar", chave, itens: prontos.map((p) => ({ matricula_id: p.matricula_id, respostas: p.respostas, perfil_id: contaDe[p.matricula_id] ?? null })) });
      toast({
        title: `${j.gravados} nota(s) lançada(s)`,
        description: [`${j.naPlataforma} na plataforma e no link, ${j.soNoLink} só no link.`, ...(j.avisos ?? [])].join(" "),
      });
      setEscolhas(null);
      onMudou();
    } catch (err) {
      toast({ title: "Não deu para lançar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setOcupado(null);
    }
  };

  const apagar = async (id: string) => {
    if (!confirm(`Apagar a nota lançada de ${nomeDe(id)}? Ela some do link e da plataforma.`)) return;
    setApagando(id);
    try {
      await pedir({ acao: "apagar", matricula_id: id });
      toast({ title: "Nota apagada" });
      onMudou();
    } catch (err) {
      toast({ title: "Não deu para apagar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setApagando(null);
    }
  };

  const resumo = useMemo(() => {
    if (!escolhas) return null;
    let comConta = 0, semConta = 0, duvida = 0;
    for (const p of prontos) {
      const e = escolhas[p.matricula_id];
      if (contaDe[p.matricula_id]) comConta++;
      else if (e?.situacao === "duvida") duvida++;
      else semConta++;
    }
    return { comConta, semConta, duvida };
  }, [escolhas, contaDe, prontos]);

  // O endereço só existe no navegador: lido depois de montar, para o servidor e a tela desenharem igual.
  const [link, setLink] = useState(LINK_DO_RESULTADO);
  useEffect(() => { setLink(`${window.location.origin}${LINK_DO_RESULTADO}`); }, []);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); toast({ title: "Link copiado" }); }
    catch { toast({ title: "Copie o link à mão", description: link }); }
  };

  const linhasDaConferencia = escolhas
    ? prontos.filter((p) => verTodos || escolhas[p.matricula_id]?.situacao === "duvida")
    : [];

  return (
    <section className={`rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm ${chave ? "" : "opacity-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">3. Lançar notas</h2>
        {!escolhas && (
          <Button onClick={conferir} disabled={!chave || !prontos.length || !!ocupado || faltaMigration}
            className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm">
            {ocupado === "previa" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
            Conferir e lançar {prontos.length || ""} nota(s)
          </Button>
        )}
      </div>

      {faltaMigration ? (
        <p className="text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Falta aplicar a atualização do banco para guardar as notas. Enquanto isso, use o Excel.
        </p>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Assim que lançar, o aluno já vê a nota e o gabarito: no <strong>link de resultado</strong> (nome completo ou nº de inscrição + nascimento)
          e, quem tem conta, na <strong>plataforma</strong>, em Simulados.
          {foraDoLancamento > 0 && <span className="font-bold text-amber-700"> {foraDoLancamento} cartão(ões) ficam de fora até você conferir acima.</span>}
        </p>
      )}

      {escolhas && resumo && (
        <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-500/30 p-4 space-y-4">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Numero valor={resumo.comConta} rotulo="na plataforma e no link" cor="text-emerald-700" />
            <Numero valor={resumo.semConta} rotulo="só no link (sem conta)" cor="text-slate-700 dark:text-slate-200" />
            <Numero valor={resumo.duvida} rotulo="para você escolher" cor={resumo.duvida ? "text-amber-700" : "text-slate-400"} />
          </dl>

          {resumo.duvida > 0 && (
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Escolha a conta certa de cada aluno abaixo. Se deixar sem escolher, a nota fica só no link.
            </p>
          )}

          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {linhasDaConferencia.map((p) => {
              const e = escolhas[p.matricula_id];
              const candidatos = e?.candidatos?.length ? e.candidatos : e?.conta ? [e.conta] : [];
              return (
                <li key={p.matricula_id} className="py-2.5 space-y-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {p.nome} <span className="font-bold text-slate-400">· nº {p.numero} · {p.acertos}/{p.total}</span>
                  </p>
                  <p className="text-xs text-slate-500">{e?.motivo ?? "Sem conta"}{e?.lancada ? " · já lançada antes" : ""}</p>
                  {candidatos.length > 0 && (
                    <select
                      value={contaDe[p.matricula_id] ?? ""} aria-label={`Conta de ${p.nome}`}
                      onChange={(ev) => setContaDe((c) => ({ ...c, [p.matricula_id]: ev.target.value || null }))}
                      className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm font-bold"
                    >
                      <option value="">Não ligar a nenhuma conta (nota só no link)</option>
                      {candidatos.map((c) => <option key={c.id} value={c.id}>{rotuloDaConta(c)}</option>)}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>

          <button type="button" onClick={() => setVerTodos((v) => !v)} className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
            {verTodos ? "Mostrar só as dúvidas" : `Ver os ${prontos.length} alunos e a conta de cada um`}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${verTodos ? "rotate-180" : ""}`} />
          </button>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={lancar} disabled={!!ocupado} className="w-full sm:w-auto h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm">
              {ocupado === "lancar" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Lançar {prontos.length} nota(s) agora
            </Button>
            <Button variant="outline" onClick={() => setEscolhas(null)} disabled={!!ocupado} className="w-full sm:w-auto h-12 rounded-xl font-black text-sm">
              Voltar
            </Button>
          </div>
        </div>
      )}

      {lancados.length > 0 && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 space-y-3">
          <p className="text-sm font-black text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {lancados.length} nota(s) no ar · {lancados.filter((l) => l.perfil_id).length} também na plataforma
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="flex-1 min-w-0 inline-flex items-center gap-2 h-11 px-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Link2 className="h-4 w-4 shrink-0 text-emerald-700" /> <span className="truncate">{link}</span>
            </span>
            <Button variant="outline" onClick={copiar} className="h-11 rounded-xl font-black text-sm"><Copy className="h-4 w-4 mr-2" /> Copiar link para os alunos</Button>
          </div>
          <button type="button" onClick={() => setVerLancadas((v) => !v)} className="text-xs font-bold text-emerald-900 dark:text-emerald-100 inline-flex items-center gap-1">
            {verLancadas ? "Esconder a lista" : "Ver as notas lançadas (e apagar uma lançada por engano)"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${verLancadas ? "rotate-180" : ""}`} />
          </button>
          {verLancadas && (
            <ul className="divide-y divide-emerald-200/70 dark:divide-emerald-500/20">
              {[...lancados].sort((a, b) => nomeDe(a.matricula_id).localeCompare(nomeDe(b.matricula_id), "pt-BR")).map((l) => (
                <li key={l.matricula_id} className="py-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{nomeDe(l.matricula_id)}</p>
                    <p className="text-xs text-slate-500">{l.acertos}/{l.total} · {l.perfil_id ? "na plataforma e no link" : "só no link"}</p>
                  </div>
                  <button type="button" onClick={() => apagar(l.matricula_id)} disabled={apagando === l.matricula_id}
                    aria-label={`Apagar a nota de ${nomeDe(l.matricula_id)}`}
                    className="h-9 px-3 rounded-lg border border-red-200 text-red-700 text-xs font-bold inline-flex items-center gap-1 bg-white dark:bg-slate-900">
                    {apagando === l.matricula_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Apagar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Numero({ valor, rotulo, cor }: { valor: number; rotulo: string; cor: string }) {
  return (
    <div>
      <dd className={`text-3xl font-black italic tabular-nums leading-none ${cor}`}>{valor}</dd>
      <dt className="text-[11px] font-bold text-slate-500 mt-1 leading-tight">{rotulo}</dt>
    </div>
  );
}
