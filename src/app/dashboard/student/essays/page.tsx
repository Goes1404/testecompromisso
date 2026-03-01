
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  BookOpen, 
  Send, 
  Loader2, 
  CheckCircle2, 
  TrendingUp,
  ChevronRight,
  PenTool,
  AlertCircle,
  Lightbulb,
  Target,
  Link as LinkIcon,
  FileText,
  Zap,
  Quote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockHistory = [
  { date: '01/05', score: 560 },
  { date: '05/05', score: 620 },
  { date: '10/05', score: 780 },
  { date: '15/05', score: 740 },
  { date: '20/05', score: 880 },
  { date: '25/05', score: 920 },
];

const ESSAY_TIPS = [
  { 
    title: "Coesão", 
    desc: "Varie conectivos no início dos parágrafos.",
    icon: LinkIcon,
    color: "bg-blue-500/10 text-blue-600 border-blue-200"
  },
  { 
    title: "Tese", 
    desc: "Deve estar clara logo na introdução.",
    icon: Target,
    color: "bg-orange-500/10 text-orange-600 border-orange-200"
  },
  { 
    title: "Intervenção", 
    desc: "Use os 5 elementos obrigatórios do INEP.",
    icon: CheckCircle2,
    color: "bg-green-500/10 text-green-600 border-green-200"
  }
];

const COMPETENCY_LABELS: Record<string, string> = {
  c1: "C1: Norma Culta",
  c2: "C2: Tema/Estrutura",
  c3: "C3: Argumentação",
  c4: "C4: Coesão",
  c5: "C5: Intervenção"
};

export default function StudentEssayPage() {
  const { toast } = useToast();
  const [theme, setTheme] = useState("");
  const [supportingTexts, setSupportingTexts] = useState<any[]>([]);
  const [customTheme, setCustomTheme] = useState(false);
  const [text, setText] = useState("");
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [loadingGrading, setLoadingGrading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  const handleGenerateTopic = async () => {
    setLoadingTopic(true);
    setResult(null);
    setCustomTheme(false);
    try {
      const res = await fetch('/api/genkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: 'essayTopicGenerator', input: {} })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setTheme(data.result.title);
        setSupportingTexts(data.result.supporting_texts || []);
        toast({ title: "Proposta Gerada!", description: "A Aurora selecionou um desafio pedagógico." });
      } else {
        throw new Error(data.error || "A Aurora não respondeu ao chamado.");
      }
    } catch (e: any) {
      toast({ title: "Aurora Offline", description: e.message, variant: "destructive" });
    } finally {
      setLoadingTopic(false);
    }
  };

  const handleSubmitEssay = async () => {
    if (text.length < 300) {
      toast({ title: "Texto insuficiente", description: "Escreva pelo menos 300 caracteres.", variant: "destructive" });
      return;
    }

    setLoadingGrading(true);
    try {
      const res = await fetch('/api/genkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: 'essayEvaluator', input: { theme, text } })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.result);
        toast({ title: "Correção Concluída!", description: "Seu diagnóstico está pronto na lateral." });
      } else {
        throw new Error(data.error || "Erro no processamento.");
      }
    } catch (e: any) {
      toast({ title: "Aurora Offline", description: e.message, variant: "destructive" });
    } finally {
      setLoadingGrading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 pb-16 px-4 md:px-6">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-muted/20">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl">
            <PenTool className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-primary italic leading-none">
              Redação <span className="text-accent">Master</span>
            </h1>
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1.5 opacity-60">Laboratório de Alta Performance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost"
            onClick={() => { setCustomTheme(!customTheme); setTheme(""); setSupportingTexts([]); setResult(null); }}
            className={`rounded-xl h-11 px-5 font-black text-xs uppercase transition-all border-2 ${customTheme ? 'bg-primary text-white border-primary' : 'bg-white border-muted/20 text-primary'}`}
          >
            {customTheme ? "Voltar" : "Tema Manual"}
          </Button>
          <Button 
            onClick={handleGenerateTopic} 
            disabled={loadingTopic || loadingGrading}
            className="rounded-xl h-11 bg-accent text-accent-foreground font-black px-6 shadow-xl hover:scale-105 transition-all border-none text-xs uppercase"
          >
            {loadingTopic ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Proposta INEP
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA DE ESCRITA (ESQUERDA) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-black/5 relative">
            <CardHeader className="bg-slate-50/50 p-6 md:p-8 border-b border-dashed border-muted/30">
              {customTheme ? (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-2">Defina seu Tema Personalizado</Label>
                  <Input 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Sobre o que vamos escrever hoje?"
                    className="h-14 rounded-2xl bg-white border-none shadow-inner font-bold italic text-lg focus-visible:ring-2 focus-visible:ring-accent/30"
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center gap-6">
                  <div className="space-y-2 flex-1 min-w-0">
                    <Badge className="bg-primary text-white border-none font-black text-[9px] px-3 py-1 uppercase rounded-full tracking-widest">TEMA SELECIONADO</Badge>
                    <CardTitle className="text-xl md:text-2xl font-black text-primary italic leading-tight">
                      {theme || "Gere um tema estratégico para começar..."}
                    </CardTitle>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-muted/10 shadow-sm shrink-0 flex flex-col items-center justify-center min-w-[80px]">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Caracteres</p>
                    <p className={`text-xl font-black italic ${charCount < 300 ? 'text-orange-500' : 'text-primary'}`}>{charCount}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-0">
              <Textarea 
                placeholder="Inicie seu texto dissertativo-argumentativo seguindo o padrão ENEM... (Mínimo de 300 caracteres para correção)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loadingGrading}
                className="min-h-[500px] md:min-h-[650px] border-none p-8 md:p-12 font-medium text-base md:text-lg leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent text-primary/90"
              />
              
              <div className="p-6 md:p-8 bg-white/80 backdrop-blur-md border-t border-muted/10 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3 text-primary/30">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Aurora Engine v2.5 Flash Ativa</p>
                </div>
                <Button 
                  onClick={handleSubmitEssay} 
                  disabled={loadingGrading || !text || !theme}
                  className="bg-primary text-white font-black h-14 px-10 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all w-full sm:w-auto text-sm uppercase border-none group"
                >
                  {loadingGrading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2 text-accent group-hover:translate-x-1 transition-transform" />}
                  {loadingGrading ? "Auditando Texto..." : "Enviar para Avaliação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA LATERAL DE APOIO E RESULTADOS (DIREITA) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* PAINEL DE RESULTADOS (DINÂMICO) */}
          {result && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-700">
              {/* NOTA FINAL */}
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2rem] overflow-hidden relative group">
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-accent/20 rounded-full blur-[50px] group-hover:scale-150 transition-transform duration-1000" />
                <div className="p-8 flex items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <Badge className="bg-accent text-accent-foreground font-black text-[10px] px-3 py-1 uppercase rounded-full shadow-lg">NOTA FINAL</Badge>
                    <h2 className="text-6xl font-black italic tracking-tighter leading-none">{result.total_score}</h2>
                  </div>
                  <div className="h-20 w-20 rounded-3xl bg-white/10 flex items-center justify-center rotate-6 shadow-2xl border border-white/10 backdrop-blur-sm">
                    <CheckCircle2 className="h-10 w-10 text-accent animate-pulse" />
                  </div>
                </div>
                <div className="px-8 pb-8 relative z-10">
                  <p className="text-xs md:text-sm font-medium italic text-white/80 leading-relaxed border-t border-white/10 pt-4">
                    "{result.general_feedback}"
                  </p>
                </div>
              </Card>

              {/* COMPETÊNCIAS - LOGO ABAIXO DA NOTA */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] px-3">Análise de Competências</h3>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(result.competencies || {}).map(([key, comp]: any) => (
                    <div key={key} className="bg-white p-5 rounded-2xl shadow-lg border border-muted/10 group hover:border-accent/30 transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase text-primary/60 tracking-wider">{COMPETENCY_LABELS[key]}</span>
                        <Badge className="bg-muted text-primary font-black italic text-xs h-6 px-3">{comp.score}</Badge>
                      </div>
                      <p className="text-[11px] text-primary/80 font-medium italic leading-relaxed">{comp.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RAIO-X GRAMATICAL - ABAIXO DAS COMPETÊNCIAS */}
              <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden ring-1 ring-black/5">
                <CardHeader className="bg-slate-50/50 p-6 border-b border-dashed border-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <CardTitle className="text-xs font-black text-primary italic uppercase tracking-[0.2em]">Raio-X de Desvios</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {result.detailed_corrections?.length > 0 ? result.detailed_corrections.map((corr: any, i: number) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50/50 border border-muted/20 space-y-2 group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs bg-red-100/50 text-red-700 px-3 py-1.5 rounded-xl line-through decoration-2 opacity-70 w-fit">{corr.original}</span>
                        <span className="text-sm bg-green-100/50 text-green-700 px-3 py-1.5 rounded-xl font-black italic w-fit">{corr.suggestion}</span>
                      </div>
                      <p className="text-[10px] font-bold text-primary/60 italic leading-relaxed flex items-start gap-2 pt-1">
                        <Lightbulb className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                        {corr.reason}
                      </p>
                    </div>
                  )) : (
                    <div className="text-center py-8 opacity-40">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                      <p className="text-xs font-black italic">Nenhum desvio gramatical crítico encontrado.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* APOIO PEDAGÓGICO (ESTÁTICO) */}
          <div className="space-y-6">
            
            {/* TEXTOS MOTIVADORES (CASO EXISTAM) */}
            {!result && supportingTexts.length > 0 && (
              <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden animate-in slide-in-from-right-4 ring-1 ring-black/5">
                <CardHeader className="bg-accent/5 p-6 border-b border-dashed border-accent/20">
                  <CardTitle className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-accent" /> Base de Apoio
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {supportingTexts.map((st) => (
                    <div key={st.id} className="p-4 bg-slate-50/50 rounded-2xl border border-muted/20 hover:bg-white hover:shadow-md transition-all">
                      <p className="text-xs md:text-sm font-medium italic text-primary/80 leading-relaxed">"{st.content}"</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase text-right pt-2 opacity-60">Fonte: {st.source}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* CHECKLIST PADRÃO INEP */}
            <Card className="border-none shadow-2xl bg-primary text-white rounded-[2rem] p-8 space-y-4 relative overflow-hidden group">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-[40px] group-hover:scale-125 transition-transform duration-700" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-black text-white italic uppercase tracking-[0.2em] text-xs">Exigências INEP</h3>
                </div>
                <div className="space-y-2">
                  {[
                    "Norma culta formal impecável.",
                    "Tese explícita no primeiro parágrafo.",
                    "Mínimo de dois repertórios externos.",
                    "Proposta de intervenção com 5 elementos."
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      <span className="text-[10px] font-bold italic opacity-90 leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* DICAS DA AURORA */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] px-3">Mentoria Aurora</h3>
              {ESSAY_TIPS.map((tip, i) => (
                <Card key={i} className="border-none shadow-xl bg-white rounded-2xl p-4 hover:shadow-2xl hover:-translate-y-1 transition-all group cursor-default">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl border-2 shrink-0 transition-all group-hover:scale-110 ${tip.color}`}>
                      <tip.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-primary italic leading-none">{tip.title}</p>
                      <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD DE EVOLUÇÃO (RODAPÉ) */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-8 md:p-10 mt-8 group relative ring-1 ring-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-inner">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-primary italic tracking-tight leading-none">
                Evolução <span className="text-accent">Acadêmica</span>
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1.5 opacity-60">Histórico de Notas 2024</p>
            </div>
          </div>
          
          <div className="flex gap-6 bg-slate-50 p-4 rounded-2xl border border-muted/10 shadow-inner">
            <div className="text-center px-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Média Geral</p>
              <p className="text-2xl font-black text-primary italic leading-none">785</p>
            </div>
            <div className="w-px bg-muted/20" />
            <div className="text-center px-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pico Histórico</p>
              <p className="text-2xl font-black text-accent italic leading-none">920</p>
            </div>
          </div>
        </div>
        
        <div className="h-[200px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} 
                dy={10}
              />
              <YAxis 
                domain={[0, 1000]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', padding: '1rem', backgroundColor: 'hsl(var(--primary))', color: 'white' }} 
                itemStyle={{ fontWeight: '900', fontSize: '12px', color: 'hsl(var(--accent))' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="hsl(var(--accent))" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorScore)" 
                dot={{ r: 6, fill: "hsl(var(--accent))", strokeWidth: 2, stroke: "#fff" }} 
                activeDot={{ r: 8, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
