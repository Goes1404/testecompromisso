"use client";

import { useState } from "react";
import { ArrowRight, GraduationCap, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { FOCOS, normalizarFoco, type Foco } from "@/lib/lives";

/**
 * Primeiro passo de quem entra sem foco (17/10): escolher ENEM ou ETEC.
 *
 * Desde a migration `20261017090000_lives_por_foco`, as aulas ao vivo são
 * separadas pelo foco (`profiles.exam_target`). Quem está com "Não informado"
 * não vê aula nenhuma — eram 65 alunos ativos em 17/10, sem sala nem foco no
 * cadastro. Mesmo molde do `PhoneGate`, e por cima dele (z maior): o foco vem
 * antes do telefone. Só aluno; equipe nunca é bloqueada.
 */
const OPCOES: Record<Foco, { titulo: string; texto: string }> = {
  ETEC: { titulo: "ETEC", texto: "Vestibulinho da ETEC" },
  ENEM: { titulo: "ENEM", texto: "ENEM e vestibulares" },
};

export function FocoGate() {
  const { user, profile, userRole, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [escolha, setEscolha] = useState<Foco | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (userRole !== "student" || !profile || normalizarFoco(profile.exam_target)) return null;

  const salvar = async () => {
    if (!user || !escolha) return;
    setSalvando(true);
    try {
      // .select() confirma a gravação: com 0 linhas (RLS), o aluno ficaria
      // preso aqui achando que salvou.
      const { data, error } = await supabase
        .from("profiles")
        .update({ exam_target: escolha })
        .eq("id", user.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Não foi possível salvar. Fale com a secretaria.");
      toast({ title: `Foco ${escolha} salvo!`, description: "Agora você vê as aulas da sua turma." });
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[310] flex flex-col bg-[#040406] overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-30%] right-[-15%] w-[130%] aspect-square rounded-full blur-[120px]"
          style={{ background: "radial-gradient(ellipse, rgba(234,88,12,0.18) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
              <ShieldCheck className="h-4 w-4 text-white/70" />
            </div>
            <span className="text-white/50 font-black text-[10px] uppercase tracking-[0.3em]">Compromisso</span>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-7 py-5 flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/80">Primeiro passo</p>
                <p className="text-base font-black text-white italic leading-tight">Qual é o seu foco?</p>
              </div>
            </div>

            <div className="p-7 space-y-6">
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                As aulas ao vivo são separadas por foco. Escolha para qual prova você estuda no cursinho.
              </p>

              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Foco">
                {FOCOS.slice()
                  .reverse()
                  .map((f) => {
                    const ativo = escolha === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        onClick={() => setEscolha(f)}
                        disabled={salvando}
                        className={`h-24 rounded-2xl border-2 px-3 text-left transition-all active:scale-95 ${
                          ativo ? "border-orange-500 bg-orange-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                        }`}
                      >
                        <span className="block text-2xl font-black italic text-gray-900">{OPCOES[f].titulo}</span>
                        <span className="block text-[11px] font-bold text-gray-500 mt-1 leading-snug">{OPCOES[f].texto}</span>
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !escolha}
                className="w-full h-14 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Salvar e continuar <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="text-[10px] text-gray-400 font-medium text-center">
                Escolheu errado? A secretaria corrige depois.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="mt-5 w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
