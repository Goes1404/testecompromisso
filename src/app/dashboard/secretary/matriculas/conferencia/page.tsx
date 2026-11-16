"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { carregarTudo } from "@/lib/carregar-tudo";
import { ConferenciaRapida } from "@/components/matricula/ConferenciaRapida";
import { ANO_MATRICULA, Matricula, hojeNaEscola, StatusMatricula } from "@/lib/matricula";

/**
 * Conferência rápida (dia da prova): busca e grava; o desenho é
 * `ConferenciaRapida` (prévia em /dev/matriculas-preview?tela=conferencia).
 * Confirmar só muda o status — a sala continua a que o aluno printou.
 * A lista é relida a cada 60 s e ao voltar para a aba, porque mais de uma
 * pessoa da secretaria pode estar conferindo ao mesmo tempo.
 */
export default function ConferenciaPage() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const podeGerir = userRole === "admin" || userRole === "staff";
  const [lista, setLista] = useState<Matricula[] | null>(null);

  const carregar = useCallback(async () => {
    const r = await carregarTudo<Matricula>((de, ate) =>
      supabase.from("matriculas").select("*").eq("ano", ANO_MATRICULA).order("numero").order("id").range(de, ate));
    if (r.error) {
      toast({ title: "Não deu para carregar as inscrições", description: (r.error as any)?.message, variant: "destructive" });
      setLista((l) => l ?? []);
      return;
    }
    setLista(r.data);
  }, [toast]);

  useEffect(() => {
    if (!user || !podeGerir) return;
    carregar();
    const t = setInterval(() => { if (document.visibilityState === "visible") carregar(); }, 60_000);
    const aoVoltar = () => { if (document.visibilityState === "visible") carregar(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [user, podeGerir, carregar]);

  const mudarStatus = useCallback(async (m: Matricula, status: StatusMatricula, titulo: string) => {
    // .select(): sem policy o Supabase devolve 0 linhas em vez de erro.
    const { data, error } = await supabase.from("matriculas").update({ status }).eq("id", m.id).select("*");
    if (error || !data?.length) {
      toast({ title: "Não deu para salvar", description: error?.message ?? "Sem permissão.", variant: "destructive" });
      return false;
    }
    setLista((ls) => (ls ?? []).map((x) => (x.id === m.id ? (data[0] as Matricula) : x)));
    toast({ title: titulo });
    return true;
  }, [toast]);

  if (!podeGerir) return <p className="p-8 text-center font-bold text-slate-500">Esta tela é da coordenação e da secretaria.</p>;
  if (!lista) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;

  return (
    <ConferenciaRapida
      lista={lista} hoje={hojeNaEscola()} onRecarregar={carregar}
      onConfirmar={(m) => mudarStatus(m, "confirmada", `${m.nome.split(" ")[0]} confirmado(a)${m.sala ? ` · Sala ${m.sala}` : ""}`)}
      onDesfazer={(m) => mudarStatus(m, "recebida", "Confirmação desfeita")}
    />
  );
}
