"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck, Loader2, PlusCircle, Shuffle, Printer, Download, Copy, Trash2, Users,
  DoorOpen, Search, UserPlus, Settings2, Save, AlertTriangle, CalendarDays, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { carregarTudo, bateComBusca, nomeParaMostrar } from "@/lib/carregar-tudo";
import { exportToCsv } from "@/lib/export-csv";
import {
  SimuladoPresencial, SalaDoSimulado, InscricaoNaSecretaria, RascunhoDoSimulado, RASCUNHO_VAZIO, PUBLICOS,
  faseDoSimulado, diaDoSimulado, instante, rascunhoDe, validarSimulado, ocupacao, lugaresNoSorteio,
  salasEmLote, numeroDeInscricao, ondeFica, listasDasSalasHtml, listaDaPortariaHtml, imprimir,
  recadoDeInscricao, LinhaDaLista,
} from "@/lib/simulado-presencial";

const ROTULO_DA_FASE = {
  em_breve: "Inscrições ainda não abriram",
  inscricoes: "Inscrições abertas",
  aguardando_sala: "Inscrições encerradas — sala ainda escondida",
  sala_divulgada: "Salas visíveis para os alunos",
} as const;

type Aluno = { id: string; name: string | null; full_name: string | null; email: string | null; sala: string | null; exam_target: string | null };

/**
 * Simulado presencial — tela da coordenação/secretaria (admin e staff).
 *
 * Configura o simulado e as salas, acompanha as inscrições, inscreve quem
 * aparece no balcão, sorteia as salas e imprime as listas. Quem decide é o
 * banco: o sorteio é `sortear_salas_do_simulado()` e a RLS só deixa admin/staff
 * ler as inscrições.
 */
export default function SimuladoPresencialGestaoPage() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const podeGerir = userRole === "admin" || userRole === "staff";

  const [simulados, setSimulados] = useState<SimuladoPresencial[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [salas, setSalas] = useState<SalaDoSimulado[]>([]);
  const [inscricoes, setInscricoes] = useState<InscricaoNaSecretaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const [editando, setEditando] = useState<"novo" | "atual" | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoDoSimulado>(RASCUNHO_VAZIO);

  const atual = simulados.find((s) => s.id === selecionado) ?? null;

  const erro = useCallback((titulo: string, e: any) => {
    toast({ title: titulo, description: e?.message ?? String(e), variant: "destructive" });
  }, [toast]);

  const buscarSimulados = useCallback(async (escolher?: string) => {
    const { data, error } = await supabase.from("simulados_presenciais").select("*").order("aplicado_em", { ascending: false });
    if (error) { erro("Não deu para carregar os simulados", error); return; }
    const lista = (data as SimuladoPresencial[]) || [];
    setSimulados(lista);
    setSelecionado((prev) => escolher ?? (prev && lista.some((s) => s.id === prev) ? prev : lista[0]?.id ?? null));
  }, [erro]);

  const buscarDetalhes = useCallback(async (id: string) => {
    const [{ data: s, error: e1 }, { data: i, error: e2 }] = await Promise.all([
      supabase.from("simulado_salas").select("*").eq("simulado_id", id),
      carregarTudo<InscricaoNaSecretaria>((de, ate) =>
        supabase.from("simulado_inscricoes").select("*").eq("simulado_id", id).order("numero").order("id").range(de, ate)),
    ]);
    if (e1 || e2) { erro("Não deu para carregar as inscrições", e1 || e2); return; }
    setSalas((s as SalaDoSimulado[]) || []);
    setInscricoes(i);
  }, [erro]);

  useEffect(() => {
    if (!user || !podeGerir) { setCarregando(false); return; }
    (async () => { try { await buscarSimulados(); } finally { setCarregando(false); } })();
  }, [user, podeGerir, buscarSimulados]);

  useEffect(() => {
    if (selecionado) buscarDetalhes(selecionado);
    else { setSalas([]); setInscricoes([]); }
  }, [selecionado, buscarDetalhes]);

  /* ── Simulado: criar / editar ───────────────────────────────────────── */
  const salvarSimulado = async () => {
    const v = validarSimulado(rascunho);
    if ("erro" in v) { toast({ title: v.erro, variant: "destructive" }); return; }
    setOcupado("salvar");
    try {
      if (editando === "novo") {
        const { data, error } = await supabase.from("simulados_presenciais")
          .insert({ ...v.registro, criado_por: user!.id }).select("id").single();
        if (error) throw error;
        await buscarSimulados(data.id);
        toast({ title: "Simulado criado", description: "Agora cadastre as salas." });
      } else if (atual) {
        const { data, error } = await supabase.from("simulados_presenciais").update(v.registro).eq("id", atual.id).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("Sem permissão para alterar este simulado.");
        await buscarSimulados(atual.id);
        toast({ title: "Simulado salvo" });
      }
      setEditando(null);
    } catch (e) { erro("Não deu para salvar", e); } finally { setOcupado(null); }
  };

  const alternarAtivo = async () => {
    if (!atual) return;
    if (atual.ativo && !confirm("Esconder este simulado dos alunos? As inscrições continuam guardadas.")) return;
    const { data, error } = await supabase.from("simulados_presenciais").update({ ativo: !atual.ativo }).eq("id", atual.id).select("id");
    if (error || !data?.length) { erro("Não deu para alterar", error ?? "Sem permissão"); return; }
    await buscarSimulados(atual.id);
  };

  /* ── Sorteio ────────────────────────────────────────────────────────── */
  const sortear = async (soSemSala: boolean) => {
    if (!atual) return;
    const divulgado = faseDoSimulado(atual) === "sala_divulgada";
    let forcar = false;
    if (!soSemSala) {
      const jaSorteado = !!atual.sorteado_em;
      const msg = divulgado && jaSorteado
        ? "ATENÇÃO: as salas já estão visíveis para os alunos. Sortear de novo muda a sala de TODO MUNDO, inclusive de quem já anotou. Continuar?"
        : jaSorteado
        ? "Refazer o sorteio? Todos os alunos mudam de sala."
        : `Sortear ${inscricoes.length} inscritos em ${salas.filter((s) => !s.reserva).length} salas?`;
      if (!confirm(msg)) return;
      forcar = divulgado && jaSorteado;
    }
    setOcupado(soSemSala ? "encaixar" : "sortear");
    try {
      const { data, error } = await supabase.rpc("sortear_salas_do_simulado", {
        p_simulado: atual.id, p_so_sem_sala: soSemSala, p_forcar: forcar,
      });
      if (error) throw error;
      const r = data as { alocados: number; sem_lugar: number };
      toast({
        title: soSemSala ? `${r.alocados} aluno(s) encaixado(s)` : `Sorteio feito: ${r.alocados} aluno(s) com sala`,
        description: r.sem_lugar > 0 ? `${r.sem_lugar} ficaram sem lugar — cadastre mais salas e use "Encaixar quem está sem sala".` : undefined,
        variant: r.sem_lugar > 0 ? "destructive" : undefined,
      });
      await Promise.all([buscarSimulados(atual.id), buscarDetalhes(atual.id)]);
    } catch (e) { erro("O sorteio não foi feito", e); } finally { setOcupado(null); }
  };

  /* ── Listas ─────────────────────────────────────────────────────────── */
  const nomeDaSala = useMemo(() => new Map(salas.map((s) => [s.id, s])), [salas]);
  const linhas: LinhaDaLista[] = useMemo(() => inscricoes.map((i) => {
    const sa = i.sala_id ? nomeDaSala.get(i.sala_id) : undefined;
    return { numero: i.numero, nome: i.nome, turma: i.turma, sala: sa?.nome ?? null, predio: sa?.predio ?? null, carteira: i.carteira };
  }), [inscricoes, nomeDaSala]);

  const abrir = (html: string) => {
    if (!imprimir(html)) toast({ title: "O navegador bloqueou a janela de impressão", description: "Libere pop-ups para este site.", variant: "destructive" });
  };

  const baixarCsv = () => {
    if (!atual) return;
    exportToCsv(`inscritos-${atual.aplicado_em}`, [...linhas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [
      { header: "Inscrição", accessor: (l) => numeroDeInscricao(l.numero) },
      { header: "Nome", accessor: (l) => l.nome },
      { header: "Turma", accessor: (l) => l.turma },
      { header: "Sala", accessor: (l) => l.sala },
      { header: "Prédio", accessor: (l) => l.predio },
      { header: "Carteira", accessor: (l) => l.carteira },
    ]);
  };

  const copiarRecado = async () => {
    if (!atual) return;
    const link = `${window.location.origin}/dashboard/student/simulado-presencial`;
    try {
      await navigator.clipboard.writeText(recadoDeInscricao(atual, link));
      toast({ title: "Recado copiado", description: "Cole no WhatsApp das turmas." });
    } catch (e) { erro("Não deu para copiar", e); }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  if (carregando) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  }
  if (!podeGerir) {
    return <p className="p-8 text-center font-bold text-slate-500">Esta tela é da coordenação e da secretaria.</p>;
  }

  const fase = atual ? faseDoSimulado(atual) : null;
  const lugares = lugaresNoSorteio(salas);
  const semSala = inscricoes.filter((i) => !i.sala_id).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <header className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Prova presencial</span>
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white">Simulado Presencial</h1>
          <p className="text-sm text-slate-500 font-medium">Inscrição dos alunos, sorteio de salas e listas para o dia.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {simulados.length > 0 && (
            <select
              value={selecionado ?? ""}
              onChange={(e) => setSelecionado(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 font-bold text-sm"
            >
              {simulados.map((s) => (
                <option key={s.id} value={s.id}>{s.titulo} — {diaDoSimulado(s.aplicado_em)}{s.ativo ? "" : " (oculto)"}</option>
              ))}
            </select>
          )}
          <Button onClick={() => { setRascunho(RASCUNHO_VAZIO); setEditando("novo"); }} className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest">
            <PlusCircle className="h-4 w-4 mr-2" /> Novo simulado
          </Button>
        </div>
      </header>

      {editando && (
        <FormularioDoSimulado
          novo={editando === "novo"}
          rascunho={rascunho}
          onChange={setRascunho}
          onCancelar={() => setEditando(null)}
          onSalvar={salvarSimulado}
          salvando={ocupado === "salvar"}
        />
      )}

      {!atual && !editando && (
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center shadow-2xl">
          <ClipboardCheck className="h-10 w-10 mx-auto text-slate-300" />
          <p className="mt-3 font-black italic text-slate-700 dark:text-slate-200">Nenhum simulado presencial cadastrado.</p>
          <p className="text-sm text-slate-500">Clique em "Novo simulado" para abrir as inscrições.</p>
        </div>
      )}

      {atual && !editando && (
        <>
          {/* Resumo */}
          <section className="rounded-[2.5rem] shadow-2xl bg-slate-900 text-white p-6 md:p-8 space-y-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <span className={`inline-flex items-center rounded-full px-3 h-7 text-[10px] font-black uppercase tracking-wider ${fase === "inscricoes" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/80"}`}>
                  {atual.ativo ? ROTULO_DA_FASE[fase!] : "Oculto para os alunos"}
                </span>
                <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter mt-2">{atual.titulo}</h2>
                <p className="text-sm text-white/70 font-semibold flex items-center gap-1.5 mt-1">
                  <CalendarDays className="h-4 w-4" /> {diaDoSimulado(atual.aplicado_em)}{atual.horario ? ` · ${atual.horario}` : ""}{atual.local ? ` · ${atual.local}` : ""}
                </p>
                <p className="text-xs text-white/60 mt-2 leading-relaxed">
                  Inscrições {instante(atual.inscricao_abre)} → {instante(atual.inscricao_fecha)} · sala visível em {instante(atual.salas_divulgadas_em)} · público: {PUBLICOS.find((p) => p.valor === atual.publico)?.rotulo}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => { setRascunho(rascunhoDe(atual)); setEditando("atual"); }} className="h-10 rounded-xl font-black text-[11px] uppercase tracking-wider">
                  <Settings2 className="h-4 w-4 mr-1.5" /> Editar
                </Button>
                <Button variant="secondary" onClick={copiarRecado} className="h-10 rounded-xl font-black text-[11px] uppercase tracking-wider">
                  <Copy className="h-4 w-4 mr-1.5" /> Recado p/ WhatsApp
                </Button>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 h-10">
                  <Switch checked={atual.ativo} onCheckedChange={alternarAtivo} />
                  <span className="text-[11px] font-black uppercase tracking-wider">{atual.ativo ? "Visível" : "Oculto"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Numero rotulo="Inscritos" valor={inscricoes.length} />
              <Numero rotulo="Lugares no sorteio" valor={lugares} alerta={lugares < inscricoes.length} />
              <Numero rotulo="Sem sala" valor={semSala} alerta={!!atual.sorteado_em && semSala > 0} />
              <Numero rotulo="Sorteado em" texto={atual.sorteado_em ? instante(atual.sorteado_em) : "ainda não"} />
            </div>

            {lugares < inscricoes.length && (
              <p className="flex items-start gap-2 text-sm font-bold text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                Faltam {inscricoes.length - lugares} lugares nas salas do sorteio. Quem sobrar fica sem sala.
              </p>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button onClick={() => sortear(false)} disabled={!!ocupado || inscricoes.length === 0} className="h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest">
                {ocupado === "sortear" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shuffle className="h-4 w-4 mr-2" /> {atual.sorteado_em ? "Refazer sorteio" : "Sortear salas"}</>}
              </Button>
              {atual.sorteado_em && (
                <Button onClick={() => sortear(true)} disabled={!!ocupado || semSala === 0} variant="secondary" className="h-12 rounded-xl font-black text-xs uppercase tracking-widest">
                  {ocupado === "encaixar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" /> Encaixar quem está sem sala ({semSala})</>}
                </Button>
              )}
              <Button onClick={() => abrir(listasDasSalasHtml(atual, salas, linhas))} disabled={!atual.sorteado_em} variant="secondary" className="h-12 rounded-xl font-black text-xs uppercase tracking-widest">
                <Printer className="h-4 w-4 mr-2" /> Listas por sala
              </Button>
              <Button onClick={() => abrir(listaDaPortariaHtml(atual, linhas))} disabled={inscricoes.length === 0} variant="secondary" className="h-12 rounded-xl font-black text-xs uppercase tracking-widest">
                <Printer className="h-4 w-4 mr-2" /> Lista da portaria
              </Button>
              <Button onClick={baixarCsv} disabled={inscricoes.length === 0} variant="secondary" className="h-12 rounded-xl font-black text-xs uppercase tracking-widest">
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
          </section>

          <Tabs defaultValue="inscritos">
            <TabsList className="h-12 rounded-2xl">
              <TabsTrigger value="inscritos" className="rounded-xl font-black text-xs uppercase tracking-wider"><Users className="h-4 w-4 mr-1.5" /> Inscritos</TabsTrigger>
              <TabsTrigger value="salas" className="rounded-xl font-black text-xs uppercase tracking-wider"><DoorOpen className="h-4 w-4 mr-1.5" /> Salas ({salas.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="inscritos">
              <Inscritos
                simulado={atual}
                salas={salas}
                inscricoes={inscricoes}
                onMudou={() => buscarDetalhes(atual.id)}
              />
            </TabsContent>
            <TabsContent value="salas">
              <Salas simulado={atual} salas={salas} inscricoes={inscricoes} onMudou={() => buscarDetalhes(atual.id)} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

/* ── Peças ───────────────────────────────────────────────────────────── */
function Numero({ rotulo, valor, texto, alerta }: { rotulo: string; valor?: number; texto?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${alerta ? "bg-amber-500/20 border border-amber-400/40" : "bg-white/5 border border-white/10"}`}>
      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/60">{rotulo}</span>
      {texto !== undefined
        ? <p className="text-sm font-black mt-1">{texto}</p>
        : <p className="text-3xl font-black tabular-nums">{valor}</p>}
    </div>
  );
}

const CARTAO = "rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-7";
const ROTULO = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500";

function FormularioDoSimulado({ novo, rascunho, onChange, onCancelar, onSalvar, salvando }: {
  novo: boolean; rascunho: RascunhoDoSimulado; onChange: (r: RascunhoDoSimulado) => void;
  onCancelar: () => void; onSalvar: () => void; salvando: boolean;
}) {
  const set = <K extends keyof RascunhoDoSimulado>(k: K, v: RascunhoDoSimulado[K]) => onChange({ ...rascunho, [k]: v });
  return (
    <section className={`${CARTAO} space-y-5`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black italic tracking-tighter">{novo ? "Novo simulado presencial" : "Editar simulado"}</h2>
        <button onClick={onCancelar} className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1 md:col-span-2"><span className={ROTULO}>Título</span>
          <Input value={rascunho.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Simulado ETEC — 14/11" className="h-11 rounded-xl" />
        </label>
        <label className="space-y-1"><span className={ROTULO}>Dia da prova</span>
          <Input type="date" value={rascunho.aplicado_em} onChange={(e) => set("aplicado_em", e.target.value)} className="h-11 rounded-xl" />
        </label>
        <label className="space-y-1"><span className={ROTULO}>Horário (texto livre)</span>
          <Input value={rascunho.horario} onChange={(e) => set("horario", e.target.value)} placeholder="8h às 12h — portões fecham 7h50" className="h-11 rounded-xl" />
        </label>
        <label className="space-y-1"><span className={ROTULO}>Local</span>
          <Input value={rascunho.local} onChange={(e) => set("local", e.target.value)} placeholder="Endereço da escola" className="h-11 rounded-xl" />
        </label>
        <label className="space-y-1"><span className={ROTULO}>Quem faz</span>
          <select value={rascunho.publico} onChange={(e) => set("publico", e.target.value as any)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold">
            {PUBLICOS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
          </select>
        </label>
        <label className="space-y-1"><span className={ROTULO}>Inscrições abrem (hora de Brasília)</span>
          <Input type="datetime-local" value={rascunho.inscricao_abre} onChange={(e) => set("inscricao_abre", e.target.value)} className="h-11 rounded-xl" />
        </label>
        <label className="space-y-1"><span className={ROTULO}>Inscrições fecham</span>
          <Input type="datetime-local" value={rascunho.inscricao_fecha} onChange={(e) => set("inscricao_fecha", e.target.value)} className="h-11 rounded-xl" />
        </label>
        <label className="space-y-1 md:col-span-2"><span className={ROTULO}>Sala aparece para o aluno em</span>
          <Input type="datetime-local" value={rascunho.salas_divulgadas_em} onChange={(e) => set("salas_divulgadas_em", e.target.value)} className="h-11 rounded-xl" />
          <span className="text-xs text-slate-500">Sorteie antes dessa hora. Até lá só a equipe vê a sala de cada aluno.</span>
        </label>
        <label className="space-y-1 md:col-span-2"><span className={ROTULO}>Instruções para o aluno (uma por linha)</span>
          <Textarea value={rascunho.instrucoes} onChange={(e) => set("instrucoes", e.target.value)} rows={4} className="rounded-xl" />
          <span className="text-xs text-slate-500">RG original, ficha e caneta preta já aparecem sempre na ficha.</span>
        </label>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" onClick={onCancelar} className="h-11 rounded-xl font-black text-xs uppercase tracking-widest">Cancelar</Button>
        <Button onClick={onSalvar} disabled={salvando} className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
        </Button>
      </div>
    </section>
  );
}

function Salas({ simulado, salas, inscricoes, onMudou }: {
  simulado: SimuladoPresencial; salas: SalaDoSimulado[]; inscricoes: InscricaoNaSecretaria[]; onMudou: () => void;
}) {
  const { toast } = useToast();
  const [qtd, setQtd] = useState("8");
  const [cap, setCap] = useState("40");
  const [prefixo, setPrefixo] = useState("Sala");
  const [predio, setPredio] = useState("");
  const [reserva, setReserva] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const lista = ocupacao(salas, inscricoes);

  const adicionar = async () => {
    const q = parseInt(qtd, 10), c = parseInt(cap, 10);
    if (!(q >= 1 && q <= 60) || !(c >= 1 && c <= 500)) {
      toast({ title: "Quantidade de 1 a 60 salas e capacidade de 1 a 500.", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const novas = salasEmLote(salas, q, c, prefixo, predio || null, reserva).map((s) => ({ ...s, simulado_id: simulado.id }));
    const { error } = await supabase.from("simulado_salas").insert(novas);
    setSalvando(false);
    if (error) { toast({ title: "Não deu para criar as salas", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${novas.length} sala(s) criada(s)` });
    onMudou();
  };

  const alterar = async (s: SalaDoSimulado, mudanca: Partial<SalaDoSimulado>) => {
    const { data, error } = await supabase.from("simulado_salas").update(mudanca).eq("id", s.id).select("id");
    if (error || !data?.length) { toast({ title: "Não deu para alterar a sala", description: error?.message, variant: "destructive" }); return; }
    onMudou();
  };

  const apagar = async (s: OcupacaoLinha) => {
    if (!confirm(s.ocupadas > 0 ? `${s.nome} tem ${s.ocupadas} aluno(s). Apagar deixa todos eles sem sala. Continuar?` : `Apagar ${s.nome}?`)) return;
    const { data, error } = await supabase.from("simulado_salas").delete().eq("id", s.id).select("id");
    if (error || !data?.length) { toast({ title: "Não deu para apagar", description: error?.message, variant: "destructive" }); return; }
    onMudou();
  };

  return (
    <div className="space-y-4 mt-4">
      <section className={`${CARTAO} space-y-3`}>
        <h3 className="font-black italic tracking-tight">Adicionar salas</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <label className="space-y-1"><span className={ROTULO}>Quantas</span><Input inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} className="h-11 rounded-xl" /></label>
          <label className="space-y-1"><span className={ROTULO}>Lugares cada</span><Input inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} className="h-11 rounded-xl" /></label>
          <label className="space-y-1"><span className={ROTULO}>Nome</span><Input value={prefixo} onChange={(e) => setPrefixo(e.target.value)} className="h-11 rounded-xl" /></label>
          <label className="space-y-1"><span className={ROTULO}>Prédio</span><Input value={predio} onChange={(e) => setPredio(e.target.value)} placeholder="opcional" className="h-11 rounded-xl" /></label>
          <label className="flex items-center gap-2 h-11"><Switch checked={reserva} onCheckedChange={setReserva} /><span className="text-xs font-bold">Reserva</span></label>
          <Button onClick={adicionar} disabled={salvando} className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest col-span-2 md:col-span-1">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlusCircle className="h-4 w-4 mr-1.5" /> Criar</>}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          <b>Reserva</b> = sala para quem chega sem inscrição ou sem documento (ex.: as 3 do prédio do fundo). Fica fora do sorteio.
          A ordem das salas é a ordem em que o sorteio enche.
        </p>
      </section>

      <section className={CARTAO}>
        {lista.length === 0 ? (
          <p className="text-center text-sm font-bold text-slate-500 py-6">Nenhuma sala cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left">
                <th className={`${ROTULO} pb-2 pr-2`}>Ordem</th><th className={`${ROTULO} pb-2 pr-2`}>Sala</th><th className={`${ROTULO} pb-2 pr-2`}>Prédio</th>
                <th className={`${ROTULO} pb-2 pr-2`}>Lugares</th><th className={`${ROTULO} pb-2 pr-2`}>Ocupação</th><th className={`${ROTULO} pb-2 pr-2`}>Reserva</th><th />
              </tr></thead>
              <tbody>
                {lista.map((s) => (
                  <LinhaDaSala key={`${s.id}-${s.nome}-${s.capacidade}-${s.ordem}-${s.predio}`} s={s} onAlterar={(m) => alterar(s, m)} onApagar={() => apagar(s)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type OcupacaoLinha = ReturnType<typeof ocupacao>[number];

function LinhaDaSala({ s, onAlterar, onApagar }: { s: OcupacaoLinha; onAlterar: (m: Partial<SalaDoSimulado>) => void; onApagar: () => void }) {
  const [nome, setNome] = useState(s.nome);
  const [predio, setPredio] = useState(s.predio ?? "");
  const [cap, setCap] = useState(String(s.capacidade));
  const [ordem, setOrdem] = useState(String(s.ordem));
  const salvarSeMudou = () => {
    const m: Partial<SalaDoSimulado> = {};
    if (nome.trim() && nome.trim() !== s.nome) m.nome = nome.trim();
    if ((predio.trim() || null) !== s.predio) m.predio = predio.trim() || null;
    const c = parseInt(cap, 10); if (c >= 1 && c <= 500 && c !== s.capacidade) m.capacidade = c;
    const o = parseInt(ordem, 10); if (Number.isFinite(o) && o !== s.ordem) m.ordem = o;
    if (Object.keys(m).length) onAlterar(m);
  };
  const cheia = s.ocupadas > s.capacidade;
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="py-2 pr-2"><Input value={ordem} onChange={(e) => setOrdem(e.target.value)} onBlur={salvarSeMudou} inputMode="numeric" className="h-9 w-16 rounded-lg" /></td>
      <td className="py-2 pr-2"><Input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={salvarSeMudou} className="h-9 min-w-[7rem] rounded-lg font-bold" /></td>
      <td className="py-2 pr-2"><Input value={predio} onChange={(e) => setPredio(e.target.value)} onBlur={salvarSeMudou} className="h-9 min-w-[6rem] rounded-lg" /></td>
      <td className="py-2 pr-2"><Input value={cap} onChange={(e) => setCap(e.target.value)} onBlur={salvarSeMudou} inputMode="numeric" className="h-9 w-20 rounded-lg" /></td>
      <td className={`py-2 pr-2 font-black tabular-nums ${cheia ? "text-red-600" : ""}`}>{s.ocupadas}/{s.capacidade}</td>
      <td className="py-2 pr-2"><Switch checked={s.reserva} onCheckedChange={(v) => onAlterar({ reserva: v })} /></td>
      <td className="py-2 text-right">
        <button onClick={onApagar} className="h-9 w-9 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 inline-flex items-center justify-center" aria-label={`Apagar ${s.nome}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function Inscritos({ simulado, salas, inscricoes, onMudou }: {
  simulado: SimuladoPresencial; salas: SalaDoSimulado[]; inscricoes: InscricaoNaSecretaria[]; onMudou: () => void;
}) {
  const { toast } = useToast();
  const [busca, setBusca] = useState("");
  const [filtroSala, setFiltroSala] = useState<string>("todas");
  const [adicionando, setAdicionando] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[] | null>(null);
  const [buscaAluno, setBuscaAluno] = useState("");
  const [inscrevendo, setInscrevendo] = useState<string | null>(null);

  const salaPorId = useMemo(() => new Map(salas.map((s) => [s.id, s])), [salas]);
  const ordenadas = useMemo(() => [...salas].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })), [salas]);
  const inscritosIds = useMemo(() => new Set(inscricoes.map((i) => i.user_id)), [inscricoes]);

  const visiveis = useMemo(() => inscricoes
    .filter((i) => filtroSala === "todas" || (filtroSala === "sem" ? !i.sala_id : i.sala_id === filtroSala))
    .filter((i) => bateComBusca({ name: i.nome }, busca) || numeroDeInscricao(i.numero).includes(busca.trim()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [inscricoes, filtroSala, busca]);

  const abrirAdicionar = async () => {
    setAdicionando(true);
    if (alunos) return;
    const { data, error } = await carregarTudo<Aluno>((de, ate) =>
      supabase.from("profiles").select("id, name, full_name, email, sala, exam_target")
        .eq("role", "student").is("arquivado_em", null).order("name").order("id").range(de, ate));
    if (error) { toast({ title: "Não deu para carregar os alunos", description: String((error as any)?.message ?? error), variant: "destructive" }); return; }
    setAlunos(data);
  };

  const candidatos = useMemo(() => {
    if (!alunos || buscaAluno.trim().length < 2) return [];
    return alunos.filter((a) => bateComBusca(a, buscaAluno)).slice(0, 12);
  }, [alunos, buscaAluno]);

  const inscrever = async (a: Aluno) => {
    setInscrevendo(a.id);
    const { data, error } = await supabase.rpc("inscrever_aluno_no_simulado", { p_simulado: simulado.id, p_user: a.id });
    setInscrevendo(null);
    if (error) { toast({ title: "Não deu para inscrever", description: error.message, variant: "destructive" }); return; }
    toast({
      title: `${nomeParaMostrar(a)} inscrito(a) — nº ${numeroDeInscricao(Number(data))}`,
      description: simulado.sorteado_em ? 'Use "Encaixar quem está sem sala" para dar uma sala a ele(a).' : undefined,
    });
    onMudou();
  };

  const mover = async (i: InscricaoNaSecretaria, salaId: string) => {
    const destino = salaId === "" ? null : salaId;
    let carteira: number | null = null;
    if (destino) {
      const naSala = inscricoes.filter((x) => x.sala_id === destino);
      const sa = salaPorId.get(destino);
      if (sa && naSala.length >= sa.capacidade && !confirm(`${sa.nome} já está cheia (${naSala.length}/${sa.capacidade}). Colocar mesmo assim?`)) return;
      carteira = naSala.reduce((m, x) => Math.max(m, x.carteira ?? 0), 0) + 1;
    }
    const { data, error } = await supabase.from("simulado_inscricoes").update({ sala_id: destino, carteira }).eq("id", i.id).select("id");
    if (error || !data?.length) { toast({ title: "Não deu para mudar a sala", description: error?.message, variant: "destructive" }); return; }
    onMudou();
  };

  const remover = async (i: InscricaoNaSecretaria) => {
    if (!confirm(`Cancelar a inscrição nº ${numeroDeInscricao(i.numero)} de ${i.nome}?`)) return;
    const { data, error } = await supabase.from("simulado_inscricoes").delete().eq("id", i.id).select("id");
    if (error || !data?.length) { toast({ title: "Não deu para cancelar", description: error?.message, variant: "destructive" }); return; }
    onMudou();
  };

  return (
    <div className="space-y-4 mt-4">
      <section className={`${CARTAO} space-y-3`}>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou nº de inscrição" className="h-11 pl-9 rounded-xl" />
          </div>
          <select value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold">
            <option value="todas">Todas as salas</option>
            <option value="sem">Sem sala</option>
            {ordenadas.map((s) => <option key={s.id} value={s.id}>{ondeFica(s.nome, s.predio)}</option>)}
          </select>
          <Button onClick={() => (adicionando ? setAdicionando(false) : abrirAdicionar())} variant={adicionando ? "outline" : "default"} className="h-11 rounded-xl font-black text-xs uppercase tracking-widest">
            <UserPlus className="h-4 w-4 mr-2" /> {adicionando ? "Fechar" : "Inscrever aluno"}
          </Button>
        </div>

        {adicionando && (
          <div className="rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 p-4 space-y-3">
            <p className="text-xs font-bold text-orange-900 dark:text-orange-100">Balcão: inscreve o aluno mesmo fora do prazo de inscrição.</p>
            <Input autoFocus value={buscaAluno} onChange={(e) => setBuscaAluno(e.target.value)} placeholder={alunos ? "Nome do aluno (2+ letras)" : "Carregando alunos..."} disabled={!alunos} className="h-11 rounded-xl bg-white dark:bg-slate-900" />
            {candidatos.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight">{a.full_name || nomeParaMostrar(a)}</p>
                  <p className="text-xs text-slate-500">{[a.sala && `Sala ${a.sala}`, a.exam_target].filter(Boolean).join(" · ") || "sem turma"}</p>
                </div>
                {inscritosIds.has(a.id) ? (
                  <span className="text-[10px] font-black uppercase text-emerald-600 shrink-0">Já inscrito</span>
                ) : (
                  <Button size="sm" onClick={() => inscrever(a)} disabled={inscrevendo === a.id} className="rounded-lg font-black text-[11px] shrink-0">
                    {inscrevendo === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Inscrever"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={CARTAO}>
        <p className={`${ROTULO} mb-3`}>{visiveis.length} de {inscricoes.length} inscritos</p>
        {visiveis.length === 0 ? (
          <p className="text-center text-sm font-bold text-slate-500 py-6">Ninguém aqui.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visiveis.map((i) => (
              <li key={i.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-tight">
                    <span className="tabular-nums text-slate-400 mr-2">{numeroDeInscricao(i.numero)}</span>{i.nome}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[i.turma && `Turma ${i.turma}`, i.foco, i.origem === "secretaria" && "inscrito pela secretaria", i.carteira && `carteira ${i.carteira}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={i.sala_id ?? ""} onChange={(e) => mover(i, e.target.value)} className={`h-10 rounded-xl border px-2 text-sm font-semibold bg-background ${i.sala_id ? "border-input" : "border-amber-400 text-amber-700"}`}>
                    <option value="">Sem sala</option>
                    {ordenadas.map((s) => <option key={s.id} value={s.id}>{ondeFica(s.nome, s.predio)}</option>)}
                  </select>
                  <button onClick={() => remover(i)} className="h-10 w-10 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 inline-flex items-center justify-center" aria-label={`Cancelar inscrição de ${i.nome}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
