"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { carregarTudo } from "@/lib/carregar-tudo";
import { PainelDeMatriculas, AcoesDoPainel, LinhaDoHistorico } from "@/components/matricula/PainelDeMatriculas";
import { ANO_MATRICULA, Matricula, SalaDaMatricula, TurmaDaMatricula, hojeNaEscola } from "@/lib/matricula";

/**
 * Matrículas 2027 — planilha da equipe (admin/staff).
 * Busca e grava; o desenho é `PainelDeMatriculas` (prévia em /dev/matriculas-preview).
 * Toda escrita volta com `.select()`: sem policy o Supabase devolve 0 linhas
 * em vez de erro, e a tela diria "salvo" sem ter salvo.
 */
export default function MatriculasPage() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const podeGerir = userRole === "admin" || userRole === "staff";

  const [turma, setTurma] = useState<TurmaDaMatricula | null>(null);
  const [salas, setSalas] = useState<SalaDaMatricula[]>([]);
  const [lista, setLista] = useState<Matricula[]>([]);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "sem_banco" | "erro">("carregando");

  const falhou = useCallback((titulo: string, e: unknown) => {
    toast({ title: titulo, description: (e as any)?.message ?? String(e ?? ""), variant: "destructive" });
  }, [toast]);

  const carregar = useCallback(async () => {
    const [t, s, l] = await Promise.all([
      supabase.from("matricula_turmas").select("*").eq("ano", ANO_MATRICULA).maybeSingle(),
      supabase.from("matricula_salas").select("*").eq("ano", ANO_MATRICULA).order("sala"),
      carregarTudo<Matricula>((de, ate) =>
        supabase.from("matriculas").select("*").eq("ano", ANO_MATRICULA).order("numero").order("id").range(de, ate)),
    ]);
    const erro = t.error || s.error || l.error;
    if (erro) {
      const semTabela = (erro as any)?.code === "42P01" || (erro as any)?.code === "PGRST205" || /does not exist|schema cache/i.test((erro as any)?.message ?? "");
      setEstado(semTabela ? "sem_banco" : "erro");
      if (!semTabela) falhou("Não deu para carregar as matrículas", erro);
      return;
    }
    if (!t.data) { setEstado("sem_banco"); return; }
    setTurma(t.data as TurmaDaMatricula);
    setSalas((s.data as SalaDaMatricula[]) ?? []);
    setLista(l.data);
    setEstado("pronto");
  }, [falhou]);

  useEffect(() => {
    if (user && podeGerir) carregar();
  }, [user, podeGerir, carregar]);

  const acoes = useMemo<AcoesDoPainel>(() => ({
    atualizar: async (m, mudanca) => {
      const { data, error } = await supabase.from("matriculas").update(mudanca).eq("id", m.id).select("*");
      if (error || !data?.length) { falhou("Não deu para salvar", error ?? "Sem permissão."); return false; }
      setLista((ls) => ls.map((x) => (x.id === m.id ? (data[0] as Matricula) : x)));
      return true;
    },
    apagar: async (m) => {
      const { data, error } = await supabase.from("matriculas").delete().eq("id", m.id).select("id");
      if (error || !data?.length) { falhou("Não deu para apagar", error ?? "Sem permissão."); return false; }
      setLista((ls) => ls.filter((x) => x.id !== m.id));
      toast({ title: `Inscrição ${m.protocolo} apagada` });
      return true;
    },
    historico: async (m) => {
      const { data, error } = await supabase.from("matriculas_historico")
        .select("campo, de, para, por_nome, em").eq("matricula_id", m.id).order("em", { ascending: false }).limit(100);
      if (error) throw error;
      return (data as LinhaDoHistorico[]) ?? [];
    },
    registrarNoBalcao: async (f) => {
      try {
        const r = await fetch("/api/admin/matriculas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return { erro: j.error || "Não deu para registrar.", erros: j.erros };
        await carregar();
        return { protocolo: j.protocolo };
      } catch {
        return { erro: "Sem conexão." };
      }
    },
    sortear: async (foco, refazer) => {
      const { data, error } = await supabase.rpc("sortear_salas_matricula", { p_ano: ANO_MATRICULA, p_foco: foco, p_refazer: refazer });
      if (error) { falhou("As vagas não foram preenchidas", error); return; }
      const r = data as { alocados: number; espera: number };
      toast({
        title: `${foco}: ${r.alocados} aluno(s) com sala nova`,
        description: r.espera ? `${r.espera} na lista de espera. Aumente a capacidade ou crie salas e toque em Preencher vagas de novo para chamar os próximos.` : undefined,
      });
      await carregar();
    },
    salvarSala: async (sala, mudanca) => {
      const { data, error } = await supabase.from("matricula_salas").update(mudanca).eq("ano", ANO_MATRICULA).eq("sala", sala).select("*");
      if (error || !data?.length) { falhou("Não deu para mudar a sala", error ?? "Sem permissão."); await carregar(); return false; }
      setSalas((ss) => ss.map((s) => (s.sala === sala ? (data[0] as SalaDaMatricula) : s)));
      return true;
    },
    criarSala: async (s) => {
      const { data, error } = await supabase.from("matricula_salas").insert(s).select("*");
      if (error || !data?.length) { falhou("Não deu para criar a sala", error ?? "Sem permissão."); return false; }
      setSalas((ss) => [...ss, data[0] as SalaDaMatricula]);
      return true;
    },
    apagarSala: async (sala) => {
      const { data, error } = await supabase.from("matricula_salas").delete().eq("ano", ANO_MATRICULA).eq("sala", sala).select("sala");
      if (error || !data?.length) { falhou("Não deu para apagar a sala", error ?? "Sem permissão."); return false; }
      setSalas((ss) => ss.filter((s) => s.sala !== sala));
      return true;
    },
    salvarTurma: async (mudanca) => {
      const { data, error } = await supabase.from("matricula_turmas").update({ ...mudanca, updated_at: new Date().toISOString() })
        .eq("ano", ANO_MATRICULA).select("*");
      if (error || !data?.length) { falhou("Não deu para salvar", error ?? "Sem permissão."); return false; }
      setTurma(data[0] as TurmaDaMatricula);
      return true;
    },
  }), [carregar, falhou, toast]);

  if (!podeGerir) return <p className="p-8 text-center font-bold text-slate-500">Esta tela é da coordenação e da secretaria.</p>;
  if (estado === "carregando") return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  if (estado === "sem_banco") {
    return (
      <div className="max-w-xl mx-auto mt-10 rounded-[2.5rem] border border-amber-300 bg-amber-50 p-8 text-amber-900 space-y-2">
        <AlertTriangle className="h-8 w-8" />
        <p className="font-black italic text-xl">Falta preparar o banco</p>
        <p className="text-sm">A migration <code>20261116120000_matriculas_2027.sql</code> ainda não foi aplicada no Supabase. Sem ela, a ficha online mostra "fora do ar" e esta tela fica vazia.</p>
      </div>
    );
  }
  if (estado === "erro" || !turma) return <p className="p-8 text-center font-bold text-slate-500">Não deu para carregar. Recarregue a página.</p>;

  return (
    <PainelDeMatriculas
      turma={turma} salas={salas} lista={lista} hoje={hojeNaEscola()} acoes={acoes}
      origem={typeof window !== "undefined" ? window.location.origin : ""}
    />
  );
}
