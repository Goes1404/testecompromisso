"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Download, Printer, Shuffle, PlusCircle, Trash2, Copy, ExternalLink, AlertTriangle,
  UserPlus, Loader2, Save, History, Users, DoorOpen, Settings2, MessageCircle, ScanLine, Link2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { normalizarBusca } from "@/lib/carregar-tudo";
import { FormularioDaFicha, RespostaDoEnvio } from "@/components/matricula/FormularioDaFicha";
import {
  Matricula, SalaDaMatricula, TurmaDaMatricula, StatusMatricula, Foco, Ficha,
  STATUS, SERIES, ESCOLA_TIPOS, TURNOS, rotulo, idade, formatarCelular, dataBR, instante,
  repetidas, previaDoSorteio, listaDaParedeHtml, ocupaSala, statusParaMostrar, TEM_SALA, abasDoExcel, listasDasSalasHtml, situacaoDaFicha, recadoDaMatricula,
  paraCampoDeData, doCampoDeData, soDigitos, ehMenor,
} from "@/lib/matricula";

export interface LinhaDoHistorico { campo: string; de: string | null; para: string | null; por_nome: string | null; em: string }

/** O que a tela pede para quem a monta (a página fala com o Supabase; a prévia, com dados de exemplo). */
export interface AcoesDoPainel {
  atualizar: (m: Matricula, mudanca: Partial<Matricula>) => Promise<boolean>;
  apagar: (m: Matricula) => Promise<boolean>;
  historico: (m: Matricula) => Promise<LinhaDoHistorico[]>;
  registrarNoBalcao: (f: Ficha) => Promise<RespostaDoEnvio>;
  sortear: (foco: Foco, refazer: boolean) => Promise<void>;
  salvarSala: (sala: number, mudanca: Partial<SalaDaMatricula>) => Promise<boolean>;
  criarSala: (s: SalaDaMatricula) => Promise<boolean>;
  apagarSala: (sala: number) => Promise<boolean>;
  salvarTurma: (mudanca: Partial<TurmaDaMatricula>) => Promise<boolean>;
}

const CARTAO = "rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-7";
const ROTULO = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500";
const SELECT = "h-9 rounded-lg border border-input bg-background px-2 text-sm font-semibold";

const NOMES_DOS_CAMPOS: Record<string, string> = {
  status: "Status", sala: "Sala", observacoes: "Observações", nome: "Nome", nascimento: "Nascimento",
  celular: "Celular", email: "E-mail", bairro: "Bairro", cidade: "Cidade", foco: "Foco", serie: "Série",
  escola: "Escola", escola_tipo: "Tipo de escola", turno_escola: "Turno", resp_nome: "Responsável",
  resp_parentesco: "Parentesco", resp_celular: "Celular do responsável", aceite_imagem: "Autoriza imagem",
};

type FiltroStatus = "todos" | StatusMatricula | "sem_sala" | "repetidas";

export function PainelDeMatriculas({
  turma, salas, lista, hoje, acoes, origem,
}: {
  turma: TurmaDaMatricula; salas: SalaDaMatricula[]; lista: Matricula[]; hoje: string; acoes: AcoesDoPainel; origem: string;
}) {
  const { toast } = useToast();
  const [busca, setBusca] = useState("");
  const [foco, setFoco] = useState<"todos" | Foco>("todos");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [sala, setSala] = useState<string>("todas");
  const [aberta, setAberta] = useState<Matricula | null>(null);
  const [balcao, setBalcao] = useState(false);

  const rep = useMemo(() => repetidas(lista), [lista]);
  const salasOrd = useMemo(() => [...salas].sort((a, b) => a.sala - b.sala), [salas]);

  const filtrada = useMemo(() => {
    const q = normalizarBusca(busca);
    const qd = soDigitos(busca);
    return lista
      .filter((m) => foco === "todos" || m.foco === foco)
      .filter((m) =>
        status === "todos" ? true
          : status === "sem_sala" ? TEM_SALA.includes(m.status) && !m.sala
          : status === "repetidas" ? rep.has(m.id)
          : m.status === status)
      .filter((m) => sala === "todas" || String(m.sala ?? "") === sala)
      .filter((m) => {
        if (!q) return true;
        if (normalizarBusca(`${m.nome} ${m.protocolo} ${m.escola} ${m.resp_nome ?? ""} ${m.bairro}`).includes(q)) return true;
        return qd.length >= 4 && (m.celular.includes(qd) || (m.resp_celular ?? "").includes(qd));
      })
      .sort((a, b) => b.numero - a.numero);
  }, [lista, busca, foco, status, sala, rep]);

  const conta = useMemo(() => {
    const c = { total: 0, ETEC: 0, ENEM: 0, recebida: 0, confirmada: 0, espera: 0, cancelada: 0, semSala: 0 };
    for (const m of lista) {
      c.total++;
      if (m.status !== "cancelada") c[m.foco]++;
      c[m.status]++;
      if (TEM_SALA.includes(m.status) && !m.sala) c.semSala++;
    }
    return c;
  }, [lista]);

  const baixarExcel = async (somenteFiltro: boolean) => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    for (const aba of abasDoExcel(somenteFiltro ? filtrada : lista, hoje)) {
      const ws = XLSX.utils.json_to_sheet(aba.linhas.length ? aba.linhas : [{ Aviso: "Sem linhas" }]);
      ws["!cols"] = Object.keys(aba.linhas[0] ?? { Aviso: "" }).map((k) => ({ wch: Math.min(40, Math.max(10, k.length + 2)) }));
      XLSX.utils.book_append_sheet(wb, ws, aba.nome.slice(0, 31));
    }
    XLSX.writeFile(wb, `matriculas-${turma.ano}-${hoje}${somenteFiltro ? "-filtro" : ""}.xlsx`);
  };

  /** Link da conferência para os fiscais da porta, sem login, com validade curta. */
  const linkDaPorta = async () => {
    try {
      const r = await fetch("/api/admin/matriculas/link-da-porta", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast({ title: "Não deu para gerar o link", description: j.error, variant: "destructive" }); return; }
      const ate = instante(j.expiraEm);
      try {
        await navigator.clipboard.writeText(j.url);
        toast({ title: "Link da porta copiado", description: `Mande só para os fiscais. Vale até ${ate}.` });
      } catch {
        window.prompt(`Link da porta (vale até ${ate}). Copie e mande só para os fiscais:`, j.url);
      }
    } catch {
      toast({ title: "Sem conexão", variant: "destructive" });
    }
  };

  const imprimirParede = () => {
    const j = window.open("", "_blank");
    if (!j) { toast({ title: "O navegador bloqueou a janela", description: "Libere pop-ups para este site.", variant: "destructive" }); return; }
    j.document.open(); j.document.write(listaDaParedeHtml(lista, salas)); j.document.close();
  };

  const imprimir = () => {
    const j = window.open("", "_blank");
    if (!j) { toast({ title: "O navegador bloqueou a janela", description: "Libere pop-ups para este site.", variant: "destructive" }); return; }
    j.document.open(); j.document.write(listasDasSalasHtml(lista, salas, turma.ano)); j.document.close();
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-24">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Alunos novos</span>
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white">Matrículas {turma.ano}</h1>
          <p className="text-sm text-slate-500 font-medium">
            Ficha online {rotuloDaSituacao(situacaoDaFicha(turma))} · até {instante(turma.fecha_em)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={imprimir} disabled={!lista.length} className="h-11 rounded-xl font-black text-xs uppercase tracking-widest">
            <Printer className="h-4 w-4 mr-2" /> Imprimir listas das salas
          </Button>
          <Button variant="outline" onClick={imprimirParede} disabled={!lista.length} className="h-11 rounded-xl font-black text-xs uppercase tracking-widest">
            <Printer className="h-4 w-4 mr-2" /> Lista para a parede
          </Button>
          <Button variant="outline" onClick={linkDaPorta} className="h-11 rounded-xl font-black text-xs uppercase tracking-widest">
            <Link2 className="h-4 w-4 mr-2" /> Link da porta (sem login)
          </Button>
          <Button asChild className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-xs uppercase tracking-widest">
            <Link href="/dashboard/secretary/matriculas/conferencia"><ScanLine className="h-4 w-4 mr-2" /> Conferência rápida</Link>
          </Button>
          <Button onClick={() => setBalcao(true)} className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest">
            <UserPlus className="h-4 w-4 mr-2" /> Inscrever no balcão
          </Button>
          <Button variant="outline" onClick={() => baixarExcel(false)} disabled={!lista.length} className="h-11 rounded-xl font-black text-xs uppercase tracking-widest">
            <Download className="h-4 w-4 mr-2" /> Excel (tudo)
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Numero rotulo="Inscritos" valor={conta.total} />
        <Numero rotulo="ETEC" valor={conta.ETEC} />
        <Numero rotulo="ENEM" valor={conta.ENEM} />
        <Numero rotulo="Recebidas" valor={conta.recebida} onClick={() => setStatus("recebida")} />
        <Numero rotulo="Confirmadas" valor={conta.confirmada} onClick={() => setStatus("confirmada")} />
        <Numero rotulo="Lista de espera" valor={conta.espera} onClick={() => setStatus("espera")} />
        <Numero rotulo="Repetidas" valor={rep.size} alerta={rep.size > 0} onClick={() => setStatus("repetidas")} />
      </div>

      <Tabs defaultValue="planilha">
        <TabsList className="h-12 rounded-2xl">
          <TabsTrigger value="planilha" className="rounded-xl font-black text-xs uppercase tracking-wider"><Users className="h-4 w-4 mr-1.5" /> Planilha</TabsTrigger>
          <TabsTrigger value="salas" className="rounded-xl font-black text-xs uppercase tracking-wider"><DoorOpen className="h-4 w-4 mr-1.5" /> Salas e vagas</TabsTrigger>
          <TabsTrigger value="ficha" className="rounded-xl font-black text-xs uppercase tracking-wider"><Settings2 className="h-4 w-4 mr-1.5" /> Ficha online</TabsTrigger>
        </TabsList>

        {/* ── Planilha ── */}
        <TabsContent value="planilha" className="space-y-4 mt-4">
          <section className={`${CARTAO} space-y-3`}>
            <div className="flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, protocolo, celular, escola ou responsável" className="h-11 pl-9 rounded-xl" />
              </div>
              <select value={foco} onChange={(e) => setFoco(e.target.value as any)} className={`${SELECT} h-11 rounded-xl`} aria-label="Foco">
                <option value="todos">ETEC e ENEM</option><option value="ETEC">ETEC</option><option value="ENEM">ENEM</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value as FiltroStatus)} className={`${SELECT} h-11 rounded-xl`} aria-label="Status">
                <option value="todos">Todos os status</option>
                {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
                <option value="sem_sala">Sem sala (falta preencher vaga)</option>
                <option value="repetidas">Repetidas</option>
              </select>
              <select value={sala} onChange={(e) => setSala(e.target.value)} className={`${SELECT} h-11 rounded-xl`} aria-label="Sala">
                <option value="todas">Todas as salas</option>
                <option value="">Sem sala</option>
                {salasOrd.map((s) => <option key={s.sala} value={String(s.sala)}>Sala {s.sala} ({s.foco})</option>)}
              </select>
              <Button variant="outline" onClick={() => baixarExcel(true)} disabled={!filtrada.length} className="h-11 rounded-xl font-black text-xs">
                <Download className="h-4 w-4 mr-1.5" /> Excel do filtro
              </Button>
            </div>
            <p className={ROTULO}>{filtrada.length} de {lista.length} inscrições · mais recentes primeiro</p>
          </section>

          <section className="rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {filtrada.length === 0 ? (
              <p className="text-center text-sm font-bold text-slate-500 py-14">
                {lista.length ? "Nenhuma inscrição com esse filtro." : "Ainda não chegou nenhuma inscrição. Divulgue o link da aba \"Ficha online\"."}
              </p>
            ) : (
              <div className="overflow-auto max-h-[calc(100dvh-260px)]">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                    <tr className="text-left">
                      {["Protocolo", "Nome", "Idade", "Foco", "Série", "Escola", "Celular", "Responsável", "Status", "Sala", "Observações"].map((h) => (
                        <th key={h} className={`${ROTULO} px-3 py-3 whitespace-nowrap border-b border-slate-200 dark:border-slate-700`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrada.map((m) => (
                      <LinhaDaPlanilha
                        key={`${m.id}-${m.updated_at}`} m={m} hoje={hoje} salas={salasOrd} repetida={rep.get(m.id)}
                        onAbrir={() => setAberta(m)} onMudar={(x) => acoes.atualizar(m, x)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>

        {/* ── Salas e sorteio ── */}
        <TabsContent value="salas" className="mt-4">
          <SalasESorteio salas={salasOrd} lista={lista} ano={turma.ano} acoes={acoes} onImprimir={imprimir} />
        </TabsContent>

        {/* ── Ficha online ── */}
        <TabsContent value="ficha" className="mt-4">
          <ConfigDaFicha turma={turma} origem={origem} acoes={acoes} />
        </TabsContent>
      </Tabs>

      <DetalheDaMatricula m={aberta} hoje={hoje} salas={salasOrd} acoes={acoes} onFechar={() => setAberta(null)} repetida={aberta ? rep.get(aberta.id) : undefined} />

      <Dialog open={balcao} onOpenChange={setBalcao}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black italic">Inscrição no balcão</DialogTitle>
            <DialogDescription>Vale mesmo com a ficha online fechada. Marque as autorizações depois que o responsável assinar.</DialogDescription>
          </DialogHeader>
          <FormularioDaFicha
            modo="secretaria"
            onEnviar={async (f) => {
              const r = await acoes.registrarNoBalcao(f);
              if ("protocolo" in r) { setBalcao(false); toast({ title: `Inscrição ${r.protocolo} registrada` }); }
              return r;
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function rotuloDaSituacao(s: ReturnType<typeof situacaoDaFicha>) {
  return s === "aberta" ? "aberta" : s === "antes" ? "ainda não abriu" : s === "encerrada" ? "encerrada" : "pausada";
}

function Numero({ rotulo: r, valor, alerta, onClick }: { rotulo: string; valor: number; alerta?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button" onClick={onClick} disabled={!onClick}
      className={`rounded-2xl p-4 text-left border shadow-sm transition-colors ${alerta ? "bg-amber-50 border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/40" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"} ${onClick ? "hover:border-orange-300" : ""}`}
    >
      <span className={ROTULO}>{r}</span>
      <p className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">{valor}</p>
    </button>
  );
}

function Selo({ status, sala }: { status: StatusMatricula; sala: number | null }) {
  const s = STATUS.find((x) => x.valor === status)!;
  return <span className={`inline-flex rounded-full px-2.5 h-6 items-center text-[11px] font-black ${s.cor}`}>{statusParaMostrar({ status, sala })}</span>;
}

function LinhaDaPlanilha({ m, hoje, salas, repetida, onAbrir, onMudar }: {
  m: Matricula; hoje: string; salas: SalaDaMatricula[]; repetida?: string; onAbrir: () => void; onMudar: (x: Partial<Matricula>) => Promise<boolean>;
}) {
  const [obs, setObs] = useState(m.observacoes ?? "");
  const anos = idade(m.nascimento, hoje);
  const td = "px-3 py-2 border-b border-slate-100 dark:border-slate-800 align-middle";
  return (
    <tr className={`hover:bg-orange-50/40 dark:hover:bg-slate-800/40 ${m.status === "cancelada" ? "opacity-50" : ""}`}>
      <td className={`${td} font-mono text-xs text-slate-500 whitespace-nowrap`}>{m.protocolo}</td>
      <td className={`${td} min-w-[220px]`}>
        <button type="button" onClick={onAbrir} className="text-left font-bold text-slate-900 dark:text-white hover:text-orange-600 hover:underline leading-tight">
          {m.nome}
        </button>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {repetida && <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 rounded px-1.5"><AlertTriangle className="h-3 w-3" />{repetida}</span>}
          {m.ex_aluno && <span className="text-[10px] font-black text-sky-700 bg-sky-100 rounded px-1.5">Aluno 2026{m.sala_origem ? ` · sala ${m.sala_origem}` : ""}</span>}
          {m.origem === "secretaria" && <span className="text-[10px] font-black text-slate-600 bg-slate-100 rounded px-1.5">Balcão</span>}
        </div>
      </td>
      <td className={`${td} tabular-nums ${anos < 18 ? "" : "text-slate-500"}`}>{anos}</td>
      <td className={`${td} font-black`}>{m.foco}</td>
      <td className={`${td} whitespace-nowrap text-xs`}>{rotulo(SERIES, m.serie).replace(" do Ensino Médio", " EM").replace(" do Fundamental", " EF")}</td>
      <td className={`${td} text-xs min-w-[140px]`}>{m.escola}</td>
      <td className={`${td} whitespace-nowrap`}>
        <a href={`https://wa.me/55${m.celular}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold text-xs">
          <MessageCircle className="h-3.5 w-3.5" />{formatarCelular(m.celular)}
        </a>
      </td>
      <td className={`${td} text-xs min-w-[150px]`}>
        {m.resp_nome ? <>{m.resp_nome}{m.resp_celular && <span className="block text-slate-500">{formatarCelular(m.resp_celular)}</span>}</> : <span className="text-slate-400">—</span>}
      </td>
      <td className={td}>
        <select value={m.status} onChange={(e) => onMudar({ status: e.target.value as StatusMatricula })} className={SELECT} aria-label={`Status de ${m.nome}`}>
          {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
      </td>
      <td className={td}>
        <select
          value={m.sala ?? ""} disabled={!TEM_SALA.includes(m.status)}
          onChange={(e) => onMudar({ sala: e.target.value ? Number(e.target.value) : null })}
          className={`${SELECT} disabled:opacity-40`} aria-label={`Sala de ${m.nome}`}
          title={!TEM_SALA.includes(m.status) ? "Lista de espera e cancelada não têm sala" : undefined}
        >
          <option value="">—</option>
          {salas.filter((s) => s.foco === m.foco).map((s) => <option key={s.sala} value={s.sala}>Sala {s.sala}{s.reserva ? " (reserva)" : ""}</option>)}
        </select>
      </td>
      <td className={`${td} min-w-[200px]`}>
        <Input
          value={obs} onChange={(e) => setObs(e.target.value)} placeholder="—"
          onBlur={() => { if ((obs.trim() || null) !== (m.observacoes ?? null)) onMudar({ observacoes: obs.trim() || null }); }}
          className="h-9 rounded-lg text-xs"
        />
      </td>
    </tr>
  );
}

function DetalheDaMatricula({ m, hoje, salas, acoes, onFechar, repetida }: {
  m: Matricula | null; hoje: string; salas: SalaDaMatricula[]; acoes: AcoesDoPainel; onFechar: () => void; repetida?: string;
}) {
  const [rascunho, setRascunho] = useState<Matricula | null>(m);
  const [hist, setHist] = useState<LinhaDoHistorico[] | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setRascunho(m);
    setHist(null);
    if (m) acoes.historico(m).then(setHist).catch(() => setHist([]));
  }, [m, acoes]);

  if (!m || !rascunho) return <Sheet open={false} onOpenChange={onFechar}><SheetContent /></Sheet>;
  const set = <K extends keyof Matricula>(k: K, v: Matricula[K]) => setRascunho((r) => (r ? { ...r, [k]: v } : r));

  const mudancas = (): Partial<Matricula> => {
    const campos: (keyof Matricula)[] = ["nome", "nascimento", "celular", "email", "bairro", "cidade", "foco", "serie", "escola",
      "escola_tipo", "turno_escola", "resp_nome", "resp_parentesco", "resp_celular", "aceite_imagem", "observacoes"];
    const x: Partial<Matricula> = {};
    for (const c of campos) {
      let v: any = rascunho[c];
      if (c === "celular" || c === "resp_celular") v = soDigitos(v) || (c === "celular" ? "" : null);
      if (typeof v === "string" && c !== "celular") v = v.trim() || (["email", "resp_nome", "resp_parentesco", "resp_celular", "observacoes"].includes(c) ? null : v);
      if (v !== m[c]) (x as any)[c] = v;
    }
    if (x.foco && m.sala) x.sala = null; // trocou de foco: a sala antiga é do outro foco
    return x;
  };

  const salvar = async () => {
    const x = mudancas();
    if (!Object.keys(x).length) { onFechar(); return; }
    setSalvando(true);
    const ok = await acoes.atualizar(m, x);
    setSalvando(false);
    if (ok) onFechar();
  };

  const apagar = async () => {
    if (!confirm(`Apagar de vez a inscrição ${m.protocolo} de ${m.nome}? Não dá para desfazer. Para desistência, prefira o status "Cancelada".`)) return;
    if (await acoes.apagar(m)) onFechar();
  };

  const T = (k: keyof Matricula, r: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <label className="block space-y-1">
      <span className={ROTULO}>{r}</span>
      <Input value={(rascunho[k] as string | null) ?? ""} onChange={(e) => set(k, e.target.value as any)} className="h-10 rounded-lg" {...extra} />
    </label>
  );
  const S = (k: keyof Matricula, r: string, opcoes: { valor: string; rotulo: string }[]) => (
    <label className="block space-y-1">
      <span className={ROTULO}>{r}</span>
      <select value={(rascunho[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as any)} className={`${SELECT} w-full h-10`}>
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </label>
  );

  return (
    <Sheet open={!!m} onOpenChange={(v) => { if (!v) onFechar(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-black italic text-2xl">{m.nome}</SheetTitle>
          <SheetDescription>
            {m.protocolo} · inscrita em {instante(m.created_at)} pelo {m.origem === "site" ? "site" : "balcão"} · {idade(m.nascimento, hoje)} anos
            {ehMenor(m.nascimento, hoje) ? " (menor)" : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Selo status={m.status} sala={m.sala} />
            {repetida && <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-100 rounded-full px-2.5 h-6"><AlertTriangle className="h-3 w-3" />{repetida}</span>}
            <span className="text-xs text-slate-500">Status e sala mudam na planilha.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">{T("nome", "Nome completo")}</div>
            {T("nascimento", "Nascimento", { type: "date" })}
            {T("celular", "Celular")}
            {T("email", "E-mail")}
            {T("bairro", "Bairro")}
            {T("cidade", "Cidade")}
            {S("foco", "Foco", [{ valor: "ETEC", rotulo: "ETEC" }, { valor: "ENEM", rotulo: "ENEM" }])}
            {S("serie", "Série", SERIES)}
            {T("escola", "Escola")}
            {S("escola_tipo", "Tipo de escola", ESCOLA_TIPOS)}
            {S("turno_escola", "Turno na escola", TURNOS)}
            {T("resp_nome", "Responsável")}
            {T("resp_parentesco", "Parentesco")}
            {T("resp_celular", "Celular do responsável")}
          </div>
          <label className="flex items-center gap-2">
            <Switch checked={rascunho.aceite_imagem} onCheckedChange={(v) => set("aceite_imagem", v)} />
            <span className="text-sm font-semibold">Autoriza uso de imagem</span>
          </label>
          <label className="block space-y-1">
            <span className={ROTULO}>Observações</span>
            <Textarea value={rascunho.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} rows={3} className="rounded-lg" />
          </label>
          <p className="text-xs text-slate-500">
            {m.ja_fez_cursinho ? "Já fez cursinho. " : ""}{m.ex_aluno ? `Está no cursinho este ano${m.sala_origem ? ` (sala ${m.sala_origem})` : ""}. ` : ""}
            {m.como_conheceu ? `Conheceu por: ${m.como_conheceu}.` : ""}
          </p>

          <div className="flex gap-2">
            <Button onClick={salvar} disabled={salvando} className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
            </Button>
            <Button variant="outline" onClick={apagar} className="h-11 rounded-xl text-red-600 border-red-200 hover:bg-red-50" aria-label="Apagar inscrição">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <h3 className={`${ROTULO} flex items-center gap-1.5 mb-2`}><History className="h-3.5 w-3.5" /> Histórico</h3>
            {hist === null ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              : hist.length === 0 ? <p className="text-xs text-slate-500">Nenhuma mudança desde a inscrição.</p>
              : (
                <ul className="space-y-1.5">
                  {hist.map((h, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">{instante(h.em)}</span> · <b>{h.por_nome ?? "sistema"}</b> mudou <b>{NOMES_DOS_CAMPOS[h.campo] ?? h.campo}</b>:{" "}
                      {valorDoHistorico(h.campo, h.de)} → {valorDoHistorico(h.campo, h.para)}
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function valorDoHistorico(campo: string, v: string | null): string {
  if (v === null || v === "") return "vazio";
  if (campo === "status") return rotulo(STATUS, v as StatusMatricula);
  if (campo === "sala") return `Sala ${v}`;
  if (campo === "nascimento") return dataBR(v);
  if (campo.includes("celular")) return formatarCelular(v);
  if (v === "true") return "sim";
  if (v === "false") return "não";
  return v.length > 60 ? `${v.slice(0, 60)}…` : v;
}

function SalasESorteio({ salas, lista, ano, acoes, onImprimir }: {
  salas: SalaDaMatricula[]; lista: Matricula[]; ano: number; acoes: AcoesDoPainel; onImprimir: () => void;
}) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const ocup = useMemo(() => {
    const c = new Map<number, number>();
    for (const m of lista) if (ocupaSala(m)) c.set(m.sala!, (c.get(m.sala!) ?? 0) + 1);
    return c;
  }, [lista]);

  const sortear = async (foco: Foco, refazer: boolean) => {
    const p = previaDoSorteio(foco, lista, salas, refazer);
    const msg = refazer
      ? `ATENÇÃO: refazer ${foco} troca a sala de TODOS os alunos de ${foco}, e eles já viram a sala deles na tela da inscrição (e tiraram print). ${p.entram} ficam com sala e ${p.espera} na lista de espera. Só continue se for avisar todo mundo.`
      : `Preencher as vagas de ${foco}: ${p.entram} aluno(s) ganham sala, pela ordem da fila${p.espera ? `, e ${p.espera} continuam na lista de espera` : ""}. Quem já tem sala não muda. Continuar?`;
    if (!confirm(msg)) return;
    setOcupado(`${foco}-${refazer}`);
    try { await acoes.sortear(foco, refazer); } finally { setOcupado(null); }
  };

  const proxima = salas.reduce((n, s) => Math.max(n, s.sala), 0) + 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(["ETEC", "ENEM"] as Foco[]).map((foco) => {
          const p = previaDoSorteio(foco, lista, salas);
          return (
            <section key={foco} className={`${CARTAO} space-y-4`}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black italic tracking-tighter">{foco}</h2>
                <span className={ROTULO}>
                  {p.salas.length} sala(s) · {p.salas.reduce((t, s) => t + s.capacidade, 0)} lugares
                  {salas.some((s) => s.foco === foco && s.reserva) ? ` · reserva: ${salas.filter((s) => s.foco === foco && s.reserva).map((s) => s.sala).join(", ")}` : ""}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini rotulo="Na fila / sem sala" valor={p.candidatos} />
                <Mini rotulo="Vagas livres" valor={p.vagas} />
                <Mini rotulo="Iriam p/ espera" valor={p.espera} alerta={p.espera > 0} />
              </div>
              <div className="space-y-1.5">
                {p.salas.map((s) => (
                  <div key={s.sala} className="flex items-center gap-3 text-sm">
                    <span className="w-16 font-black">Sala {s.sala}</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                      <div className="absolute inset-y-0 left-0 bg-orange-200 dark:bg-orange-500/30" style={{ width: `${(s.depois / s.capacidade) * 100}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-orange-500" style={{ width: `${(s.agora / s.capacidade) * 100}%` }} />
                    </div>
                    <span className="w-24 text-right tabular-nums text-xs font-bold text-slate-600">
                      {s.agora}{s.depois !== s.agora ? ` → ${s.depois}` : ""} / {s.capacidade}
                    </span>
                  </div>
                ))}
                {!p.salas.length && <p className="text-sm text-slate-500">Nenhuma sala de {foco}. Cadastre abaixo.</p>}
              </div>
              <p className="text-xs text-slate-500">
                Laranja forte = já na sala. Claro = o que &quot;Preencher vagas&quot; colocaria agora. A ficha já põe cada inscrição na sala de {foco} com menos alunos, na hora; quando as salas enchem, quem chega vai para a lista de espera. Se abrir vaga (cancelamento ou sala nova), &quot;Preencher vagas&quot; chama a fila na ordem de inscrição.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => sortear(foco, false)} disabled={!!ocupado || p.candidatos === 0 || !p.salas.length} className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs uppercase tracking-widest">
                  {ocupado === `${foco}-false` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shuffle className="h-4 w-4 mr-2" /> Preencher vagas {p.candidatos ? `(${p.candidatos})` : ""}</>}
                </Button>
                <Button variant="outline" onClick={() => sortear(foco, true)} disabled={!!ocupado || !p.salas.some((s) => s.agora > 0)} className="h-11 rounded-xl font-black text-xs uppercase tracking-widest">
                  {ocupado === `${foco}-true` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refazer tudo"}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <section className={`${CARTAO} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black italic tracking-tighter">Salas de {ano}</h2>
            <p className="text-xs text-slate-500">Sala com aluno não pode ser apagada nem trocar de foco.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onImprimir} disabled={!ocup.size} className="h-10 rounded-xl font-black text-xs">
              <Printer className="h-4 w-4 mr-1.5" /> Listas por sala
            </Button>
            <Button onClick={() => acoes.criarSala({ ano, sala: proxima, foco: "ETEC", capacidade: 40 })} className="h-10 rounded-xl font-black text-xs">
              <PlusCircle className="h-4 w-4 mr-1.5" /> Sala {proxima}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {salas.map((s) => (
            <CartaoDaSala key={`${s.sala}-${s.foco}-${s.capacidade}`} s={s} ocupadas={ocup.get(s.sala) ?? 0} acoes={acoes} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Mini({ rotulo: r, valor, alerta }: { rotulo: string; valor: number; alerta?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${alerta ? "bg-amber-50 dark:bg-amber-500/10" : "bg-slate-50 dark:bg-slate-800/60"}`}>
      <p className="text-2xl font-black tabular-nums">{valor}</p>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{r}</span>
    </div>
  );
}

function CartaoDaSala({ s, ocupadas, acoes }: { s: SalaDaMatricula; ocupadas: number; acoes: AcoesDoPainel }) {
  const [cap, setCap] = useState(String(s.capacidade));
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-lg font-black">
          Sala {s.sala}
          {s.reserva && <span className="ml-2 align-middle text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-100 rounded px-1.5 py-0.5">Reserva</span>}
        </span>
        <button
          type="button" disabled={ocupadas > 0} aria-label={`Apagar sala ${s.sala}`}
          onClick={() => { if (confirm(`Apagar a sala ${s.sala}?`)) acoes.apagarSala(s.sala); }}
          className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <select
          value={s.foco} disabled={ocupadas > 0} onChange={(e) => acoes.salvarSala(s.sala, { foco: e.target.value as Foco })}
          className={`${SELECT} flex-1 disabled:opacity-50`} aria-label={`Foco da sala ${s.sala}`}
        >
          <option value="ETEC">ETEC</option><option value="ENEM">ENEM</option>
        </select>
        <Input
          value={cap} inputMode="numeric" onChange={(e) => setCap(e.target.value)} aria-label={`Lugares da sala ${s.sala}`}
          onBlur={() => { const n = parseInt(cap, 10); if (n >= 1 && n <= 200 && n !== s.capacidade) acoes.salvarSala(s.sala, { capacidade: n }); else setCap(String(s.capacidade)); }}
          className="h-9 w-20 rounded-lg"
        />
      </div>
      <p className={`text-xs font-bold ${ocupadas > s.capacidade ? "text-red-600" : "text-slate-500"}`}>{ocupadas} de {s.capacidade} lugares ocupados</p>
      <label className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
        <span>
          Reserva
          <span className="block font-medium text-slate-400">A ficha não coloca ninguém aqui; só a equipe, à mão.</span>
        </span>
        <Switch checked={!!s.reserva} onCheckedChange={(v) => acoes.salvarSala(s.sala, { reserva: v })} aria-label={`Sala ${s.sala} é reserva`} />
      </label>
    </div>
  );
}

function ConfigDaFicha({ turma, origem, acoes }: { turma: TurmaDaMatricula; origem: string; acoes: AcoesDoPainel }) {
  const { toast } = useToast();
  const [abre, setAbre] = useState(paraCampoDeData(turma.abre_em));
  const [fecha, setFecha] = useState(paraCampoDeData(turma.fecha_em));
  const link = `${origem}/matricula`;

  const salvarDatas = async () => {
    const a = doCampoDeData(abre), f = doCampoDeData(fecha);
    if (!a || !f || new Date(f) <= new Date(a)) { toast({ title: "O fim precisa ser depois do início.", variant: "destructive" }); return; }
    if (await acoes.salvarTurma({ abre_em: a, fecha_em: f })) toast({ title: "Datas salvas" });
  };
  const copiar = async (texto: string, o: string) => {
    try { await navigator.clipboard.writeText(texto); toast({ title: `${o} copiado` }); }
    catch { toast({ title: "Não deu para copiar", variant: "destructive" }); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className={`${CARTAO} space-y-4`}>
        <h2 className="text-xl font-black italic tracking-tighter">Ficha online</h2>
        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4">
          <Switch checked={turma.aberta} onCheckedChange={(v) => acoes.salvarTurma({ aberta: v })} />
          <span>
            <span className="block font-black">{turma.aberta ? "Recebendo inscrições" : "Pausada"}</span>
            <span className="block text-xs text-slate-500">Desligar fecha a ficha na hora, mesmo dentro das datas.</span>
          </span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1"><span className={ROTULO}>Abre em (Brasília)</span>
            <Input type="datetime-local" value={abre} onChange={(e) => setAbre(e.target.value)} className="h-11 rounded-xl" />
          </label>
          <label className="space-y-1"><span className={ROTULO}>Fecha em</span>
            <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-11 rounded-xl" />
          </label>
        </div>
        <Button onClick={salvarDatas} className="h-11 rounded-xl font-black text-xs uppercase tracking-widest"><Save className="h-4 w-4 mr-2" /> Salvar datas</Button>
      </section>

      <section className={`${CARTAO} space-y-4`}>
        <h2 className="text-xl font-black italic tracking-tighter">Divulgar</h2>
        <div className="flex gap-2">
          <Input readOnly value={link} className="h-11 rounded-xl font-mono text-xs" />
          <Button variant="outline" onClick={() => copiar(link, "Link")} className="h-11 rounded-xl" aria-label="Copiar link"><Copy className="h-4 w-4" /></Button>
          <a href="/matricula" target="_blank" rel="noreferrer" className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center" aria-label="Abrir a ficha"><ExternalLink className="h-4 w-4" /></a>
        </div>
        <pre className="whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 font-sans">{recadoDaMatricula(link, turma)}</pre>
        <Button onClick={() => copiar(recadoDaMatricula(link, turma), "Recado")} className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-xs uppercase tracking-widest">
          <MessageCircle className="h-4 w-4 mr-2" /> Copiar recado para o WhatsApp
        </Button>
      </section>
    </div>
  );
}
