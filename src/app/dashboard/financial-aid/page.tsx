
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Wallet2, 
  Users2, 
  ArrowRight, 
  Info, 
  Loader2,
  Scale,
  FileWarning,
  HelpCircle,
  TrendingUp,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { Badge } from "@/components/ui/badge";

export default function FinancialAidPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    eligible: boolean;
    perCapita: number;
    threshold: number;
    minWage: number;
  } | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    monthlyIncome: "",
    familySize: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const income = Number(formData.monthlyIncome);
    const size = Number(formData.familySize);

    if (!formData.monthlyIncome || income < 0) {
      toast({
        title: "Valor Inválido",
        description: "Por favor, informe uma renda bruta mensal válida.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Simulação de processamento de IA
    await new Promise(r => setTimeout(r, 1200));

    const minWage = 1621; // Salário Mínimo de Referência
    const threshold = minWage * 1.5; 
    const perCapita = income / size;
    const eligible = perCapita <= threshold;

    setResult({
      eligible: eligible,
      perCapita: perCapita,
      threshold: threshold,
      minWage: minWage
    });

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ is_financial_aid_eligible: eligible })
          .eq('id', user.id);
      } catch (e) {
        console.error("Erro ao salvar elegibilidade:", e);
      }
    }

    setLoading(false);
    toast({
      title: "Cálculo Concluído ✅",
      description: "Seu perfil foi atualizado com o status de elegibilidade social.",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-primary italic">
              Simulador de Isenção
            </h1>
            <Badge className="bg-accent text-accent-foreground border-none font-black text-[10px] px-3 py-1 shadow-lg animate-pulse">
              VERSÃO 2024
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl font-medium italic">
            Descubra se você tem direito à isenção de taxa no SiSU, ProUni e vestibulares estaduais.
          </p>
        </div>
        <div className="flex items-center gap-2 text-primary/40 font-black text-[10px] uppercase tracking-widest bg-white/50 px-4 py-2 rounded-full border border-white/20">
          <History className="h-3 w-3" /> Último Cálculo: {result ? 'Hoje' : 'Nunca'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Coluna 1: Instruções e Regras */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden relative group transition-all duration-500 hover:shadow-primary/20">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <CardHeader className="p-8">
              <div className="h-12 w-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center mb-6 shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
                <Scale className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-black italic italic">A Regra de Ouro</CardTitle>
              <CardDescription className="text-white/60 font-medium italic">Entenda o critério do Governo Federal.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" /> Teto Atualizado
                </p>
                <p className="text-sm font-medium leading-relaxed italic">
                  Sua renda dividida pelo número de moradores deve ser de até <strong className="text-accent text-lg">R$ 2.431,50</strong>.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Wallet2, text: "Considere a renda BRUTA mensal" },
                  { icon: Users2, text: "Inclua todos que moram na casa" },
                  { icon: Info, text: "Ignore auxílios assistenciais" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                    <item.icon className="h-4 w-4 text-accent" />
                    <span className="text-[11px] font-bold uppercase tracking-tight italic">{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white rounded-[2rem] p-8 space-y-4">
            <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-accent" /> Dica da Aurora
            </h3>
            <p className="text-xs font-medium italic text-primary/70 leading-relaxed">
              "Estudantes que cursaram o Ensino Médio integralmente em escola pública têm direito à isenção automática em muitos casos, independente da renda. Verifique seu edital!"
            </p>
          </Card>
        </div>

        {/* Coluna 2: Formulário e Resultado */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="shadow-2xl border-none bg-white rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-primary/5">
            <CardHeader className="bg-muted/10 p-10 border-b border-muted/20">
              <CardTitle className="text-2xl font-black text-primary italic flex items-center gap-3">
                Calculadora de Elegibilidade
                <Sparkles className="h-5 w-5 text-accent" />
              </CardTitle>
              <CardDescription className="font-medium italic">Informe os dados reais para um diagnóstico preciso da rede.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label htmlFor="income" className="text-[10px] font-black uppercase tracking-widest text-primary/50 flex items-center gap-2 ml-2">
                    <Wallet2 className="h-4 w-4 text-accent" />
                    Renda Mensal da Família (Bruta)
                  </Label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary/20 italic text-xl group-focus-within:text-accent transition-colors">R$</div>
                    <Input 
                      id="income" 
                      type="number" 
                      placeholder="Ex: 3500" 
                      className="pl-16 h-16 bg-muted/30 border-none text-xl font-black rounded-2xl focus:ring-accent transition-all" 
                      value={formData.monthlyIncome}
                      onChange={(e) => setFormData({...formData, monthlyIncome: e.target.value})}
                      required 
                      disabled={loading}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase italic ml-2">Soma de todos os salários sem descontos.</p>
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="familySize" className="text-[10px] font-black uppercase tracking-widest text-primary/50 flex items-center gap-2 ml-2">
                    <Users2 className="h-4 w-4 text-accent" />
                    Residentes na Mesma Casa
                  </Label>
                  <Select value={formData.familySize} onValueChange={(v) => setFormData({...formData, familySize: v})} disabled={loading}>
                    <SelectTrigger id="familySize" className="h-16 bg-muted/30 border-none text-xl font-black rounded-2xl px-8 focus:ring-accent">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <SelectItem key={n} value={n.toString()} className="text-base font-bold py-3 px-6">
                          {n} {n === 1 ? 'Pessoa' : 'Pessoas'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase italic ml-2">Incluindo você e crianças/idosos.</p>
                </div>

                <div className="md:col-span-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-primary hover:bg-primary/95 text-white h-16 rounded-2xl font-black text-lg shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 group"
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <TrendingUp className="h-6 w-6 mr-2 group-hover:translate-y-[-2px] transition-transform" />}
                    {loading ? "Analizando Perfil Socioeconômico..." : "Executar Simulação de Rede"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {result && !loading && (
            <div className="animate-in zoom-in-95 slide-in-from-top-10 duration-700">
              <Card className={`border-none shadow-2xl rounded-[3rem] overflow-hidden overflow-hidden ${result.eligible ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                <div className={`p-10 flex flex-col md:flex-row items-center gap-8 ${result.eligible ? 'bg-green-600 text-white' : 'bg-red-600 text-white'} transition-all duration-1000`}>
                  <div className="h-20 w-20 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center shrink-0 shadow-2xl rotate-3">
                    {result.eligible ? <CheckCircle2 className="h-10 w-10" /> : <FileWarning className="h-10 w-10" />}
                  </div>
                  <div className="text-center md:text-left space-y-1">
                    <h3 className="text-2xl md:text-4xl font-black italic tracking-tighter leading-none">
                      {result.eligible ? "Elegível para Isenção Total" : "Atenção: Fora do Critério Federal"}
                    </h3>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] opacity-80">
                      Diagnóstico baseado na renda per capita de 1,5 salário mínimo
                    </p>
                  </div>
                </div>
                <CardContent className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white rounded-3xl border-2 border-muted/10 flex flex-col gap-1 shadow-inner group hover:border-accent/30 transition-all">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sua Renda por Pessoa</span>
                      <span className={`text-2xl font-black italic ${result.eligible ? 'text-green-600' : 'text-red-600'}`}>R$ {result.perCapita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border-2 border-muted/10 flex flex-col gap-1 shadow-inner">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Limite do Programa</span>
                      <span className="text-2xl font-black text-primary italic">R$ {result.threshold.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border-2 border-muted/10 flex flex-col gap-1 shadow-inner">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Base do SM</span>
                      <span className="text-2xl font-black text-primary/40 italic">R$ {result.minWage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  
                  <div className="mt-10 flex flex-col md:flex-row gap-4">
                    <Button asChild className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-black h-16 rounded-2xl shadow-xl shadow-accent/20 transition-all hover:scale-105 active:scale-95 text-base">
                      <Link href="/dashboard/chat/aurora-ai">
                        Orientação com Aurora IA
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1 h-16 rounded-2xl border-2 font-black text-primary hover:bg-muted/50 transition-all" asChild>
                      <Link href="/dashboard/student/documents">
                        Organizar Documentos
                      </Link>
                    </Button>
                  </div>
                  
                  <p className="mt-8 text-[10px] text-center text-muted-foreground font-bold uppercase italic opacity-60">
                    *Este simulador é apenas para fins de orientação. A concessão final depende da análise do MEC/Instituição.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
