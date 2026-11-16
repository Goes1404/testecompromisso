"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConferenciaRapida } from "@/components/matricula/ConferenciaRapida";
import { FICHA_VAZIA, Matricula, hojeNaEscola } from "@/lib/matricula";

/**
 * Conferência da porta SEM login (dia do simulado). A chave do link (`?t=`) é
 * a autorização, gerada pela coordenação na planilha ("Link da porta") e com
 * validade curta. A rota `/api/conferencia` só devolve o que o fiscal precisa:
 * número, nome, nascimento e sala — sem celular nem responsável.
 */
type Linha = Pick<Matricula, "id" | "ano" | "numero" | "protocolo" | "nome" | "nascimento" | "foco" | "status" | "sala" | "sala_origem">;

const completar = (l: Linha): Matricula => ({
  ...FICHA_VAZIA, email: null, serie: "9EF", escola_tipo: "publica", turno_escola: "manha",
  observacoes: null, origem: "site", created_at: "", updated_at: "", ...l,
} as unknown as Matricula);

function Porta() {
  const t = useSearchParams().get("t") ?? "";
  const { toast } = useToast();
  const [lista, setLista] = useState<Matricula[] | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/conferencia?t=${encodeURIComponent(t)}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j.error || "Não deu para abrir a conferência."); return; }
      setErro("");
      setLista((j.lista as Linha[]).map(completar));
    } catch {
      toast({ title: "Sem conexão", description: "Confira a internet e toque em atualizar.", variant: "destructive" });
    }
  }, [t, toast]);

  useEffect(() => {
    carregar();
    const id = setInterval(() => { if (document.visibilityState === "visible") carregar(); }, 60_000);
    return () => clearInterval(id);
  }, [carregar]);

  const mudar = async (m: Matricula, acao: "confirmar" | "desfazer") => {
    try {
      const r = await fetch("/api/conferencia", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, id: m.id, acao }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({ title: "Não deu para salvar", description: j.error, variant: "destructive" });
        if (r.status === 409) carregar();
        return false;
      }
      setLista((ls) => (ls ?? []).map((x) => (x.id === m.id ? completar(j.inscricao) : x)));
      toast({ title: acao === "confirmar" ? `${m.nome.split(" ")[0]} confirmado(a)${m.sala ? ` · Sala ${m.sala}` : ""}` : "Confirmação desfeita" });
      return true;
    } catch {
      toast({ title: "Sem conexão", description: "Tente de novo.", variant: "destructive" });
      return false;
    }
  };

  if (erro) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-3 px-4">
        <Lock className="h-10 w-10 text-slate-300 mx-auto" />
        <p className="font-black italic text-xl text-slate-800">Conferência fechada</p>
        <p className="text-sm text-slate-500">{erro}</p>
      </div>
    );
  }
  if (!lista) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  return (
    <ConferenciaRapida
      lista={lista} hoje={hojeNaEscola()} voltar={null} pedirResponsavel={false} onRecarregar={carregar}
      onConfirmar={(m) => mudar(m, "confirmar")} onDesfazer={(m) => mudar(m, "desfazer")}
    />
  );
}

export default function ConferenciaDaPortaPage() {
  return (
    <div className="papel-quadriculado min-h-[100dvh] px-4 py-6">
      <Suspense fallback={null}><Porta /></Suspense>
    </div>
  );
}
