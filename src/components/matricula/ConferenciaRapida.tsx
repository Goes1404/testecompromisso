"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, CheckCircle2, Hourglass, IdCard, Loader2, RefreshCw, Search, Undo2, Users, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Matricula, buscarNaConferencia, placarDaConferencia, idade, dataBR, formatarCelular, statusParaMostrar,
} from "@/lib/matricula";

/**
 * Conferência rápida do dia da prova: a secretaria digita o protocolo (ou o
 * nome), confere o RG (e o responsável, se for menor) e confirma com um toque.
 * A sala não muda — é a mesma que o aluno viu e printou na inscrição.
 * Só desenha; quem grava é a página (`/dashboard/secretary/matriculas/conferencia`).
 */
export function ConferenciaRapida({
  lista, hoje, onConfirmar, onDesfazer, onRecarregar, voltar = "/dashboard/secretary/matriculas",
}: {
  lista: Matricula[];
  hoje: string;
  onConfirmar: (m: Matricula) => Promise<boolean>;
  onDesfazer: (m: Matricula) => Promise<boolean>;
  onRecarregar: () => Promise<void>;
  voltar?: string;
}) {
  const [termo, setTermo] = useState("");
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);
  const [recarregando, setRecarregando] = useState(false);
  const [ultima, setUltima] = useState<{ nome: string; sala: number | null; foco: string } | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  const achadas = useMemo(() => buscarNaConferencia(lista, termo), [lista, termo]);
  const escolhida = useMemo(
    () => lista.find((m) => m.id === escolhidaId) ?? (achadas.length === 1 ? achadas[0] : null),
    [lista, escolhidaId, achadas],
  );
  const placar = useMemo(() => placarDaConferencia(lista), [lista]);

  useEffect(() => { setEscolhidaId(null); }, [termo]);

  const proximo = () => {
    setTermo("");
    setEscolhidaId(null);
    requestAnimationFrame(() => campo.current?.focus());
  };

  const recarregar = async () => {
    setRecarregando(true);
    try { await onRecarregar(); } finally { setRecarregando(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={voltar} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-orange-600">
            <ArrowLeft className="h-3.5 w-3.5" /> Planilha
          </Link>
          <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white mt-1">Conferência rápida</h1>
          <p className="text-sm text-slate-500">Digite o protocolo do print (ex.: 12) ou o nome. Confira o RG e confirme.</p>
        </div>
        <Button variant="outline" onClick={recarregar} disabled={recarregando} className="h-10 rounded-xl shrink-0" aria-label="Atualizar a lista">
          <RefreshCw className={`h-4 w-4 ${recarregando ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {(["ETEC", "ENEM"] as const).map((f) => (
          <div key={f} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">{f}</span>
            <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
              {placar[f].confirmadas}<span className="text-base text-slate-400"> / {placar[f].comSala}</span>
            </p>
            <span className="text-[11px] font-semibold text-slate-500">confirmados / com sala</span>
          </div>
        ))}
      </div>

      {ultima && (
        <p role="status" className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold p-3 flex items-center gap-2 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-100">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {ultima.nome} confirmado(a){ultima.sala ? ` · Sala ${ultima.sala} (${ultima.foco})` : ""}.
        </p>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          ref={campo} autoFocus value={termo} onChange={(e) => setTermo(e.target.value)}
          inputMode="search" autoComplete="off" placeholder="Protocolo ou nome"
          className="h-16 pl-12 rounded-2xl text-xl font-bold"
          aria-label="Protocolo ou nome do aluno"
        />
      </div>

      {termo.trim() && !escolhida && (
        achadas.length ? (
          <ul className="space-y-2">
            {achadas.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setEscolhidaId(m.id)}
                  className="w-full text-left rounded-2xl border-2 border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-4 hover:border-orange-400 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-black text-slate-900 dark:text-white leading-tight">{m.nome}</span>
                    <span className="block text-xs text-slate-500 font-mono">{m.protocolo} · {dataBR(m.nascimento)}</span>
                  </span>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300 whitespace-nowrap">{m.foco} · {statusParaMostrar(m)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-sm font-bold text-slate-500 py-6">Nenhuma inscrição com esse protocolo ou nome.</p>
        )
      )}

      {escolhida && (
        <CartaoDaConferencia
          key={`${escolhida.id}-${escolhida.status}`} m={escolhida} hoje={hoje}
          onConfirmar={async () => {
            const ok = await onConfirmar(escolhida);
            if (ok) { setUltima({ nome: escolhida.nome, sala: escolhida.sala, foco: escolhida.foco }); proximo(); }
          }}
          onDesfazer={() => onDesfazer(escolhida)}
          onProximo={proximo}
        />
      )}
    </div>
  );
}

function CartaoDaConferencia({ m, hoje, onConfirmar, onDesfazer, onProximo }: {
  m: Matricula; hoje: string; onConfirmar: () => Promise<void>; onDesfazer: () => Promise<boolean>; onProximo: () => void;
}) {
  const anos = idade(m.nascimento, hoje);
  const menor = anos < 18;
  const [rg, setRg] = useState(false);
  const [resp, setResp] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const pode = m.status === "recebida" && !!m.sala;
  const liberado = rg && (!menor || resp);

  const confirmar = async () => {
    setSalvando(true);
    try { await onConfirmar(); } finally { setSalvando(false); }
  };

  return (
    <section className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5">
      <div className="flex items-start gap-4">
        <div className={`h-24 w-24 rounded-3xl flex flex-col items-center justify-center shrink-0 ${
          m.sala ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-85">Sala</span>
          <span className="text-5xl font-black italic leading-none tabular-nums">{m.sala ?? "—"}</span>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xl font-black leading-tight text-slate-900 dark:text-white">{m.nome}</p>
          <p className="text-sm text-slate-500">
            <span className="font-mono">{m.protocolo}</span> · nasc. {dataBR(m.nascimento)} ({anos} anos)
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="rounded-full bg-slate-900 text-white px-2.5 h-6 inline-flex items-center text-[11px] font-black dark:bg-white dark:text-slate-900">{m.foco}</span>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 h-6 inline-flex items-center text-[11px] font-black dark:bg-slate-800 dark:text-slate-200">{statusParaMostrar(m)}</span>
            {menor && <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 h-6 inline-flex items-center text-[11px] font-black">Menor de 18</span>}
          </div>
        </div>
      </div>

      {m.status === "confirmada" && (
        <Aviso cor="verde" icone={CheckCircle2} titulo="Já confirmada">
          Esta matrícula já foi confirmada. A sala é a {m.sala ?? "—"}.
        </Aviso>
      )}
      {m.status === "espera" && (
        <Aviso cor="ambar" icone={Hourglass} titulo="Lista de espera: não tem sala ainda">
          Não confirme aqui. Quando abrir vaga, use &quot;Preencher vagas&quot; na planilha.
        </Aviso>
      )}
      {m.status === "cancelada" && (
        <Aviso cor="vermelho" icone={XCircle} titulo="Inscrição cancelada">
          Para reativar, mude o status na planilha (ela volta sem sala).
        </Aviso>
      )}
      {m.status === "recebida" && !m.sala && (
        <Aviso cor="ambar" icone={Hourglass} titulo="Sem sala">
          Esta inscrição ainda não tem sala. Use &quot;Preencher vagas&quot; na planilha antes de confirmar.
        </Aviso>
      )}

      {pode && (
        <div className="space-y-2">
          <Conferir marcado={rg} onChange={setRg} icone={IdCard}>
            RG original conferido: nome e nascimento batem com a ficha
          </Conferir>
          {menor && (
            <Conferir marcado={resp} onChange={setResp} icone={Users}>
              Responsável presente e assinou
              {m.resp_nome && (
                <span className="block text-xs font-semibold text-slate-500 mt-0.5">
                  Na ficha: {m.resp_nome}{m.resp_parentesco ? ` (${m.resp_parentesco})` : ""}{m.resp_celular ? ` · ${formatarCelular(m.resp_celular)}` : ""}
                </span>
              )}
            </Conferir>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {pode && (
          <Button onClick={confirmar} disabled={!liberado || salvando}
            className="flex-1 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base uppercase tracking-wider shadow-lg">
            {salvando ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Check className="h-6 w-6 mr-2" /> Confirmar · Sala {m.sala}</>}
          </Button>
        )}
        {m.status === "confirmada" && (
          <Button variant="outline" onClick={() => { if (confirm(`Desfazer a confirmação de ${m.nome}? A sala continua a mesma.`)) onDesfazer(); }}
            className="h-12 rounded-2xl font-black text-xs uppercase tracking-wider">
            <Undo2 className="h-4 w-4 mr-2" /> Desfazer confirmação
          </Button>
        )}
        <Button variant="outline" onClick={onProximo} className={`${pode ? "sm:w-auto" : "flex-1"} h-12 sm:h-16 rounded-2xl font-black text-xs uppercase tracking-wider`}>
          Próximo aluno
        </Button>
      </div>
      {pode && !liberado && (
        <p className="text-xs text-slate-500 text-center -mt-2">
          Marque {menor ? "as duas conferências" : "a conferência do RG"} para liberar o botão.
        </p>
      )}
    </section>
  );
}

function Conferir({ marcado, onChange, icone: Icone, children }: {
  marcado: boolean; onChange: (v: boolean) => void; icone: typeof IdCard; children: React.ReactNode;
}) {
  return (
    <button type="button" role="checkbox" aria-checked={marcado} onClick={() => onChange(!marcado)}
      className={`w-full flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
        marcado ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
      <span className={`h-7 w-7 shrink-0 rounded-lg border-2 flex items-center justify-center ${marcado ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
        {marcado ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : <Icone className="h-4 w-4 text-slate-400" />}
      </span>
      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{children}</span>
    </button>
  );
}

function Aviso({ cor, icone: Icone, titulo, children }: {
  cor: "verde" | "ambar" | "vermelho"; icone: typeof IdCard; titulo: string; children: React.ReactNode;
}) {
  const c = cor === "verde" ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
    : cor === "ambar" ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"
    : "bg-red-50 border-red-200 text-red-900 dark:bg-red-500/10 dark:text-red-100";
  return (
    <div className={`rounded-2xl border p-4 flex gap-3 ${c}`}>
      <Icone className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-black leading-tight">{titulo}</p>
        <p className="text-sm mt-0.5 opacity-90">{children}</p>
      </div>
    </div>
  );
}
