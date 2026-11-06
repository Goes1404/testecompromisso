"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { CartaoDoSimulado } from "@/components/simulado/CartaoDoSimulado";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { SimuladoDoAluno, numeroDeInscricao } from "@/lib/simulado-presencial";

/**
 * Inscrição no simulado presencial e ficha do aluno.
 *
 * Tudo que decide (janela, público, número, sala) vem do banco por
 * `simulados_presenciais_do_aluno()`; a sala só chega depois da data de
 * divulgação, mesmo que a secretaria já tenha sorteado.
 */
export default function SimuladoPresencialPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lista, setLista] = useState<SimuladoDoAluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [inscrevendo, setInscrevendo] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("simulados_presenciais_do_aluno");
      if (error) throw error;
      setLista((data as SimuladoDoAluno[]) || []);
    } catch (e: any) {
      toast({ title: "Não deu para carregar o simulado", description: e.message, variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => { if (user) buscar(); }, [user, buscar]);

  const inscrever = async (s: SimuladoDoAluno) => {
    setInscrevendo(s.id);
    try {
      const { data, error } = await supabase.rpc("inscrever_no_simulado", { p_simulado: s.id });
      if (error) throw error;
      toast({ title: "Inscrição feita!", description: `Seu número é ${numeroDeInscricao(Number(data))}.` });
      await buscar();
    } catch (e: any) {
      toast({ title: "Não deu para fazer a inscrição", description: e.message, variant: "destructive" });
    } finally {
      setInscrevendo(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <header className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Prova presencial</span>
        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white">Simulado</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Inscrição obrigatória pela plataforma. A sala de cada aluno é sorteada.
        </p>
      </header>

      {lista.length === 0 && (
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-2xl">
          <ClipboardCheck className="h-10 w-10 mx-auto text-slate-300" />
          <p className="mt-3 font-black italic text-slate-700 dark:text-slate-200">Nenhum simulado presencial marcado agora.</p>
          <p className="text-sm text-slate-500 mt-1">Quando abrir uma inscrição, ela aparece aqui e no seu painel.</p>
        </div>
      )}

      {lista.map((s) => (
        <CartaoDoSimulado key={s.id} s={s} inscrevendo={inscrevendo === s.id} onInscrever={() => inscrever(s)} />
      ))}
    </div>
  );
}
