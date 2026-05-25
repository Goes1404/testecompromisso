
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Calculator,
  Sparkles,
  Loader2,
  HandHeart,
  AlertCircle,
} from "lucide-react";

interface EligibilityResult {
  isEligible: boolean;
  message: string;
  reason: string;
}

export default function ExemptionSimulatorPage() {
  const [familyIncome, setFamilyIncome] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [hasCadUnico, setHasCadUnico] = useState("");

  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulation = () => {
    setIsLoading(true);
    setResult(null);

    setTimeout(() => {
      const income = parseFloat(familyIncome);
      const minimumWage = 1412;

      if (hasCadUnico === "yes" && schoolType === "public" && income <= 1.5 * minimumWage) {
        setResult({
          isEligible: true,
          message: "Parabéns! Você tem alta probabilidade de ser elegível!",
          reason:
            "Você atende aos critérios principais: inscrição no CadÚnico, estudou em escola pública e possui renda familiar per capita de até 1,5 salário mínimo.",
        });
      } else if (schoolType === "public" && income <= 1.5 * minimumWage) {
        setResult({
          isEligible: true,
          message: "Você provavelmente é elegível!",
          reason:
            "Você atende aos critérios de renda e de ter cursado o ensino médio em escola pública. A inscrição no CadÚnico pode acelerar seu processo.",
        });
      } else {
        setResult({
          isEligible: false,
          message: "Pouco provável que você seja elegível.",
          reason:
            "Com base nos dados fornecidos, você não atende aos critérios principais de renda familiar ou tipo de escola exigidos pela maioria dos programas de isenção.",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Hero ── */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 10%, rgba(16,185,129,0.13) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(255,107,0,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <HandHeart className="h-3 w-3 text-emerald-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/70">
              Apoio Social
            </p>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
            Simulador de Isenção
          </h1>
          <p className="text-white/40 text-xs font-semibold mt-1">
            Descubra se você tem direito à isenção da taxa
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-400/70" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
              Preencha os dados
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/55 ml-1">
              Renda mensal total da família
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/55 text-sm font-bold pointer-events-none">
                R$
              </span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="2100,50"
                value={familyIncome}
                onChange={(e) => setFamilyIncome(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 text-sm font-bold text-white placeholder:text-white/55 outline-none focus:border-emerald-500/40 transition-all"
              />
            </div>
            <p className="text-[9px] text-white/55 font-medium ml-1">
              Salário mínimo de referência: R$ 1.412,00
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/55 ml-1">
              Cursou todo o ensino médio em escola pública?
            </label>
            <Select value={schoolType} onValueChange={setSchoolType}>
              <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/8 text-white font-bold text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 bg-[#1a1a1f]">
                <SelectItem value="public" className="font-bold text-white/70">Sim, escola pública</SelectItem>
                <SelectItem value="private" className="font-bold text-white/70">Não, escola privada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/55 ml-1">
              Família inscrita no CadÚnico?
            </label>
            <Select value={hasCadUnico} onValueChange={setHasCadUnico}>
              <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/8 text-white font-bold text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 bg-[#1a1a1f]">
                <SelectItem value="yes" className="font-bold text-white/70">Sim</SelectItem>
                <SelectItem value="no" className="font-bold text-white/70">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSimulation}
            disabled={isLoading || !familyIncome || !schoolType || !hasCadUnico}
            className="w-full h-13 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/30 border-none text-xs uppercase tracking-widest disabled:opacity-40 group"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Simular Agora
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Result ── */}
      {result && (
        <div
          className={`relative rounded-[1.5rem] overflow-hidden border p-5 animate-in slide-in-from-bottom-4 duration-500 ${
            result.isEligible
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          }`}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: result.isEligible
                ? "radial-gradient(ellipse at 100% 0%, rgba(16,185,129,0.15) 0%, transparent 60%)"
                : "radial-gradient(ellipse at 100% 0%, rgba(239,68,68,0.15) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 flex items-start gap-3">
            <div
              className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                result.isEligible
                  ? "bg-emerald-500/15 border-emerald-500/25"
                  : "bg-red-500/15 border-red-500/25"
              }`}
            >
              {result.isEligible ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-black italic text-base leading-tight ${
                  result.isEligible ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {result.message}
              </h3>
              <p
                className={`text-xs font-medium italic leading-relaxed mt-2 ${
                  result.isEligible ? "text-emerald-300/70" : "text-red-300/70"
                }`}
              >
                {result.reason}
              </p>
              <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-white/5">
                <AlertCircle className="h-3 w-3 text-white/55 shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/55 font-medium leading-relaxed">
                  Este é um resultado preliminar. A confirmação final depende das regras de cada edital de vestibular.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
