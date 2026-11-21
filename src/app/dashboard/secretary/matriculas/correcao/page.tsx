"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, Download, Loader2, RotateCcw, Trash2, AlertTriangle, XCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { carregarTudo } from "@/lib/carregar-tudo";
import { Button } from "@/components/ui/button";
import { ANO_MATRICULA, hojeNaEscola } from "@/lib/matricula";
import {
  Marca, LETRAS, Inscrito, Achado, corrigir, acharAluno, linhaDoResultado, Correcao,
} from "@/lib/correcao-gabarito";

/**
 * Correção do Simulado Pré-Etec por foto (admin/staff).
 * 1) foto do gabarito certo → a IA lê e a equipe confere;
 * 2) fotos dos cartões → a IA lê nome, nº e marcações; a tela corrige e acha
 *    o aluno entre os inscritos; 3) Excel com nota e sala.
 * As fotos não são guardadas. O trabalho fica na aba (sessionStorage com a
 * chave `dash_cache_…`, que o signOut apaga) para um recarregar não perder tudo.
 */
type Estado = "lendo" | "lido" | "erro";
interface Cartao {
  id: string;
  arquivo: string;
  estado: Estado;
  erro?: string;
  nomeLido: string | null;
  inscricaoLida: string | null;
  respostas: Marca[];
  inscritoId: string | null;
  confianca: Achado["confianca"];
  alternativas: string[];
}
const CHAVE_CACHE = "dash_cache_correcao_simulado";
const PARALELO = 3;

async function reduzir(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error("Foto inválida")); i.src = url;
    });
    const max = 2000;
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function ler(image: string, tipo: "gabarito" | "aluno", total?: number) {
  const r = await fetch("/api/admin/simulado/ler-cartao", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, tipo, total }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Não deu para ler esta foto.");
  return j as { nome: string | null; inscricao: string | null; respostas: Marca[]; legivel: boolean; observacao: string | null };
}

export default function CorrecaoPorFotoPage() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const podeGerir = userRole === "admin" || userRole === "staff";

  const [inscritos, setInscritos] = useState<Inscrito[] | null>(null);
  const [chave, setChave] = useState<Marca[] | null>(null);
  const [lendoChave, setLendoChave] = useState(false);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const fila = useRef<{ id: string; file: File }[]>([]);
  const ativos = useRef(0);

  // Restaura o trabalho da aba.
  useEffect(() => {
    try {
      const s = sessionStorage.getItem(CHAVE_CACHE);
      if (s) {
        const d = JSON.parse(s);
        if (Array.isArray(d.chave)) setChave(d.chave);
        if (Array.isArray(d.cartoes)) setCartoes(d.cartoes.map((c: Cartao) => (c.estado === "lendo" ? { ...c, estado: "erro", erro: "Leitura interrompida. Envie de novo." } : c)));
      }
    } catch { /* sem cache */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(CHAVE_CACHE, JSON.stringify({ chave, cartoes })); } catch { /* cheio */ }
  }, [chave, cartoes]);

  useEffect(() => {
    if (!user || !podeGerir) return;
    carregarTudo<Inscrito>((de, ate) =>
      supabase.from("matriculas").select("id, numero, protocolo, nome, sala").eq("ano", ANO_MATRICULA)
        .neq("status", "cancelada").order("numero").order("id").range(de, ate),
    ).then((r) => {
      if (r.error) toast({ title: "Não deu para carregar os inscritos", variant: "destructive" });
      setInscritos(r.data);
    });
  }, [user, podeGerir, toast]);

  const porId = useMemo(() => new Map((inscritos ?? []).map((i) => [i.id, i])), [inscritos]);

  const enviarGabarito = async (f: File | undefined) => {
    if (!f) return;
    setLendoChave(true);
    try {
      const r = await ler(await reduzir(f), "gabarito");
      setChave(r.respostas);
      toast({ title: `Gabarito lido: ${r.respostas.length} questões`, description: "Confira as letras abaixo antes de enviar os cartões." });
    } catch (e) {
      toast({ title: "Não deu para ler o gabarito", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLendoChave(false);
    }
  };

  const atualizar = (id: string, x: Partial<Cartao>) => setCartoes((cs) => cs.map((c) => (c.id === id ? { ...c, ...x } : c)));

  const proximo = useCallback(() => {
    while (ativos.current < PARALELO && fila.current.length) {
      const item = fila.current.shift()!;
      ativos.current++;
      (async () => {
        try {
          const r = await ler(await reduzir(item.file), "aluno", chave?.length);
          const achado = acharAluno({ nome: r.nome, inscricao: r.inscricao }, inscritos ?? []);
          atualizar(item.id, {
            estado: "lido", nomeLido: r.nome, inscricaoLida: r.inscricao, respostas: r.respostas,
            inscritoId: achado.inscrito?.id ?? null, confianca: achado.confianca, alternativas: achado.alternativas.map((a) => a.id),
            erro: r.legivel ? undefined : (r.observacao || "Foto difícil de ler: confira as respostas."),
          });
        } catch (e) {
          atualizar(item.id, { estado: "erro", erro: (e as Error).message });
        } finally {
          ativos.current--;
          proximo();
        }
      })();
    }
  }, [chave, inscritos]);

  const enviarCartoes = (files: FileList | null) => {
    if (!files?.length || !chave) return;
    const novos: Cartao[] = Array.from(files).map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`, arquivo: f.name, estado: "lendo", nomeLido: null, inscricaoLida: null,
      respostas: [], inscritoId: null, confianca: "nenhum", alternativas: [],
    }));
    setCartoes((cs) => [...novos, ...cs]);
    novos.forEach((c, i) => fila.current.push({ id: c.id, file: files[i] }));
    proximo();
  };

  const linhas = useMemo(() => cartoes.map((c) => ({
    c,
    inscrito: c.inscritoId ? porId.get(c.inscritoId) ?? null : null,
    correcao: chave && c.estado === "lido" ? corrigir(chave, c.respostas) : null,
  })), [cartoes, porId, chave]);

  const repetidos = useMemo(() => {
    const n = new Map<string, number>();
    for (const l of linhas) if (l.inscrito) n.set(l.inscrito.id, (n.get(l.inscrito.id) ?? 0) + 1);
    return n;
  }, [linhas]);

  const resumo = useMemo(() => ({
    total: linhas.length,
    lendo: linhas.filter((l) => l.c.estado === "lendo").length,
    erro: linhas.filter((l) => l.c.estado === "erro").length,
    conferir: linhas.filter((l) => l.c.estado === "lido" && (!l.inscrito || l.c.confianca === "parecido" || (repetidos.get(l.inscrito.id) ?? 0) > 1)).length,
  }), [linhas, repetidos]);

  const baixarExcel = async () => {
    const XLSX = await import("xlsx");
    const ordenadas = linhas.filter((l) => l.correcao).sort((a, b) => b.correcao!.acertos - a.correcao!.acertos);
    const ws = XLSX.utils.json_to_sheet(ordenadas.map((l) => linhaDoResultado({ nomeLido: l.c.nomeLido, inscrito: l.inscrito, correcao: l.correcao, respostas: l.c.respostas })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    if (chave) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([Object.fromEntries(chave.map((m, i) => [`Q${i + 1}`, m ?? "anulada"]))]), "Gabarito");
    XLSX.writeFile(wb, `simulado-etec-resultados-${hojeNaEscola()}.xlsx`);
  };

  if (!podeGerir) return <p className="p-8 text-center font-bold text-slate-500">Esta tela é da coordenação e da secretaria.</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-24">
      <header>
        <Link href="/dashboard/secretary/matriculas" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-orange-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Simulado Etec
        </Link>
        <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white mt-1">Correção por foto</h1>
        <p className="text-sm text-slate-500">Envie a foto do gabarito certo e depois as fotos dos cartões. As fotos não ficam guardadas.</p>
      </header>

      {/* 1. Gabarito */}
      <section className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">1. Gabarito certo {chave && <span className="text-sm font-bold text-slate-500">({chave.length} questões)</span>}</h2>
          <label className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-black cursor-pointer">
            {lendoChave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {chave ? "Trocar foto do gabarito" : "Enviar foto do gabarito"}
            <input type="file" accept="image/*" className="hidden" disabled={lendoChave}
              onChange={(e) => { enviarGabarito(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        {chave && (
          <>
            <p className="text-xs text-slate-500">Confira cada letra com o gabarito impresso. Toque para corrigir. &quot;Anulada&quot; conta certo para todos.</p>
            <GradeDeRespostas valores={chave} onChange={(i, m) => setChave((k) => k && k.map((x, j) => (j === i ? m : x)))} opcaoVazia="Anulada" />
          </>
        )}
      </section>

      {/* 2. Cartões */}
      <section className={`rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm ${chave ? "" : "opacity-50"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">2. Cartões dos alunos</h2>
          <div className="flex flex-wrap gap-2">
            <label className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl text-white text-sm font-black ${chave && inscritos ? "bg-orange-500 hover:bg-orange-600 cursor-pointer" : "bg-slate-300 cursor-not-allowed"}`}>
              <Camera className="h-4 w-4" /> Enviar fotos dos cartões
              <input type="file" accept="image/*" multiple className="hidden" disabled={!chave || !inscritos}
                onChange={(e) => { enviarCartoes(e.target.files); e.target.value = ""; }} />
            </label>
            <Button variant="outline" onClick={baixarExcel} disabled={!linhas.some((l) => l.correcao)} className="h-11 rounded-xl font-black text-sm">
              <Download className="h-4 w-4 mr-2" /> Baixar Excel
            </Button>
            <Button variant="outline" onClick={() => { if (confirm("Apagar todas as leituras desta tela?")) { setCartoes([]); fila.current = []; } }}
              disabled={!cartoes.length} className="h-11 rounded-xl font-black text-sm text-red-600">
              <Trash2 className="h-4 w-4 mr-2" /> Limpar
            </Button>
          </div>
        </div>
        {!chave && <p className="text-sm text-slate-500">Envie primeiro o gabarito certo.</p>}
        {resumo.total > 0 && (
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            {resumo.total} cartão(ões){resumo.lendo ? ` · lendo ${resumo.lendo}…` : ""}
            {resumo.conferir ? <span className="text-amber-700"> · {resumo.conferir} para conferir</span> : ""}
            {resumo.erro ? <span className="text-red-600"> · {resumo.erro} com erro</span> : ""}
          </p>
        )}

        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {linhas.map(({ c, inscrito, correcao }) => {
            const repetido = inscrito && (repetidos.get(inscrito.id) ?? 0) > 1;
            const opcoes = [...c.alternativas.map((id) => porId.get(id)).filter(Boolean) as Inscrito[],
              ...(inscritos ?? []).filter((i) => !c.alternativas.includes(i.id))];
            return (
              <li key={c.id} className="py-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-6 shrink-0">
                    {c.estado === "lendo" ? <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      : c.estado === "erro" ? <XCircle className="h-5 w-5 text-red-500" />
                      : !inscrito || c.confianca === "parecido" || repetido ? <AlertTriangle className="h-5 w-5 text-amber-500" />
                      : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 truncate">{c.arquivo}{c.nomeLido ? ` · lido: “${c.nomeLido}”` : ""}{c.inscricaoLida ? ` · nº ${c.inscricaoLida}` : ""}</p>
                    {c.estado === "lido" ? (
                      <select
                        value={c.inscritoId ?? ""} onChange={(e) => atualizar(c.id, { inscritoId: e.target.value || null, confianca: e.target.value ? "nome" : "nenhum" })}
                        className="mt-1 w-full max-w-md h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm font-bold"
                        aria-label="Aluno deste cartão"
                      >
                        <option value="">— Não achei: escolher o aluno —</option>
                        {opcoes.map((i) => <option key={i.id} value={i.id}>{i.nome} · nº {i.protocolo.split("-").pop()}{i.sala ? ` · sala ${i.sala}` : ""}</option>)}
                      </select>
                    ) : c.estado === "erro" ? <p className="text-sm font-bold text-red-600">{c.erro}</p> : <p className="text-sm text-slate-500">Lendo a foto…</p>}
                    {c.estado === "lido" && (c.confianca === "parecido" || repetido || c.erro) && (
                      <p className="text-xs font-bold text-amber-700 mt-0.5">
                        {repetido ? "Este aluno aparece em mais de um cartão. " : ""}{c.confianca === "parecido" ? "Nome parecido: confira. " : ""}{c.erro ?? ""}
                      </p>
                    )}
                  </div>
                  {correcao && <span className="text-xl font-black tabular-nums">{correcao.acertos}<span className="text-sm text-slate-400">/{correcao.total}</span></span>}
                  {c.estado === "lido" && (
                    <button type="button" onClick={() => setAberto(aberto === c.id ? null : c.id)} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1">
                      Respostas <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto === c.id ? "rotate-180" : ""}`} />
                    </button>
                  )}
                  {c.estado === "erro" && (
                    <button type="button" onClick={() => setCartoes((cs) => cs.filter((x) => x.id !== c.id))} className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold inline-flex items-center gap-1">
                      <RotateCcw className="h-3.5 w-3.5" /> Tirar (envie a foto de novo)
                    </button>
                  )}
                </div>
                {aberto === c.id && chave && correcao && (
                  <GradeDeRespostas valores={c.respostas} correcao={correcao}
                    onChange={(i, m) => atualizar(c.id, { respostas: c.respostas.map((x, j) => (j === i ? m : x)) })} opcaoVazia="Branco" />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function GradeDeRespostas({ valores, onChange, correcao, opcaoVazia }: {
  valores: Marca[]; onChange: (i: number, m: Marca) => void; correcao?: Correcao; opcaoVazia: string;
}) {
  const cor = (i: number) => {
    const r = correcao?.porQuestao[i];
    return r === "certa" ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10" : r === "errada" ? "border-red-300 bg-red-50 dark:bg-red-500/10"
      : r ? "border-amber-300 bg-amber-50 dark:bg-amber-500/10" : "border-slate-200 dark:border-slate-700";
  };
  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
      {valores.map((m, i) => (
        <label key={i} className={`rounded-lg border px-1.5 py-1 text-center ${cor(i)}`}>
          <span className="block text-[10px] font-bold text-slate-500">{i + 1}</span>
          <select value={m ?? ""} onChange={(e) => onChange(i, (e.target.value || null) as Marca)}
            className="w-full bg-transparent text-sm font-black text-center" aria-label={`Questão ${i + 1}`}>
            <option value="">{opcaoVazia === "Anulada" ? "Anul." : "—"}</option>
            {LETRAS.map((l) => <option key={l} value={l}>{l}</option>)}
            <option value="*">2+</option>
          </select>
        </label>
      ))}
    </div>
  );
}
