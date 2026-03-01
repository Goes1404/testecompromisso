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
  History,
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
  c1: "Norma Culta",
  c2: "Temática",
  c3: "Argumentação",
  c4: "Coesão",
  c5: "Intervenção"
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
      console.error("ERRO TEMA:", e);
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast({ title: "Correção Concluída!", description: "Seu diagnóstico está pronto." });
      } else {
        throw new Error(data.error || "Erro no processamento.");
      }
    } catch (e: any) {
      console.error("ERRO CORREÇÃO:", e);
      toast({ title: "Aurora Offline", description: e.message, variant: "destructive" });
    } finally {
      setLoadingGrading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-700 pb-12 px-2 md:px-4">
      
      {/* HEADER COMPACTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1 border-b border-muted/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center shadow-md rotate-3">
            <PenTool className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-primary italic tracking-tight leading-none">
              Redação <span className="text-accent">Master</span>
            </h1>
            <p className="text-muted-foreground font-medium italic text-[9px]">Aprovação com Inteligência Aurora.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => { setCustomTheme(!customTheme); setTheme(""); setSupportingTexts([]); setResult(null); }}
            className={`rounded-lg h-8 px-3 font-black text-[8px] uppercase transition-all border ${customTheme ? 'bg-primary text-white border-primary' : 'bg-white border-muted/20 text-primary'}`}
          >
            {customTheme ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Quote className="h-3 w-3 mr-1" />}
            {customTheme ? "Fixo" : "Manual"}
          </Button>
          <Button 
            size="sm"
            onClick={handleGenerateTopic} 
            disabled={loadingTopic || loadingGrading}
            className="rounded-lg h-8 bg-accent text-accent-foreground font-black px-3 shadow-md hover:scale-105 transition-all border-none text-[8px] uppercase"
          >
            {loadingTopic ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Gerar Tema
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ÁREA DE ESCRITA (ESQUERDA) */}
        <div className="lg:col-span-8 space-y-5">
          <Card className="border-none shadow-lg rounded-2xl bg-white overflow-hidden ring-1 ring-black/5 relative">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-20" />
            
            <CardHeader className="bg-slate-50/30 p-4 md:p-5 border-b border-dashed border-muted/30">
              {customTheme ? (
                <div className="space-y-1.5">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-primary/40 ml-1">Tema Livre</Label>
                  <Input 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Sobre o que vamos escrever hoje?"
                    className="h-9 rounded-lg bg-white border-none shadow-inner font-bold italic text-xs text-primary focus-visible:ring-2 focus-visible:ring-accent/30"
                  />
                </div>
              ) : (
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1 flex-1">
                    <Badge className="bg-primary text-white border-none font-black text-[6px] px-2 py-0.5 uppercase tracking-widest rounded-full">AURORA IA</Badge>
                    <CardTitle className="text-sm md:text-base font-black text-primary italic leading-snug tracking-tight">
                      {theme || "Gere um tema para iniciar seu treino..."}
                    </CardTitle>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-muted/10 shadow-sm shrink-0 flex flex-col items-center justify-center min-w-[50px]">
                    <p className="text-[6px] font-black text-muted-foreground uppercase tracking-widest">Caract.</p>
                    <p className={`text-sm font-black italic ${charCount < 300 ? 'text-orange-500' : 'text-primary'}`}>{charCount}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-0">
              <Textarea 
                placeholder="Inicie sua jornada argumentativa aqui... (Mínimo 300 caracteres)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loadingGrading}
                className="min-h-[300px] md:min-h-[400px] border-none p-5 md:p-6 font-medium text-xs md:text-sm leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent text-primary/80"
              />
              
              <div className="p-3 md:p-4 bg-white/80 backdrop-blur-md border-t border-muted/10 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-primary/30">
                  <FileText className="h-3 w-3" />
                  <p className="text-[7px] font-black uppercase tracking-widest italic">Análise Industrial em Tempo Real</p>
                </div>
                <Button 
                  onClick={handleSubmitEssay} 
                  disabled={loadingGrading || !text || !theme}
                  className="bg-primary text-white font-black h-9 px-6 rounded-lg shadow-md hover:scale-[1.02] transition-all w-full sm:w-auto text-[10px] uppercase border-none group"
                >
                  {loadingGrading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2 text-accent" />}
                  {loadingGrading ? "Processando..." : "Solicitar Avaliação"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RESULTADOS COMPACTOS */}
          {result && (
            <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-700">
              <Card className="border-none shadow-xl bg-primary text-white rounded-2xl overflow-hidden relative group">
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-accent/20 rounded-full blur-[60px]" />
                <div className="p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
                  <div className="text-center md:text-left space-y-2">
                    <Badge className="bg-accent text-accent-foreground font-black text-[7px] px-2 py-0.5 uppercase rounded-full">NOTA FINAL</Badge>
                    <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none">{result.total_score}</h2>
                    <p className="text-[10px] md:text-xs font-medium italic text-white/80 max-w-lg leading-relaxed">
                      "{result.general_feedback}"
                    </p>
                  </div>
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/10 flex items-center justify-center rotate-6 shadow-lg border border-white/10 backdrop-blur-md">
                    <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 text-accent animate-pulse" />
                  </div>
                </div>
              </Card>

              {/* RAIO-X COMPACTO */}
              <Card className="border-none shadow-lg bg-white rounded-2xl overflow-hidden ring-1 ring-black/5">
                <CardHeader className="bg-slate-50/50 p-4 border-b border-dashed border-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600 shadow-inner">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs md:text-sm font-black text-primary italic leading-none">Raio-X Gramatical</CardTitle>
                      <p className="text-muted-foreground font-medium italic mt-0.5 text-[8px]">Desvios técnicos identificados.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {result.detailed_corrections?.length > 0 ? result.detailed_corrections.map((corr: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50/50 border border-muted/20 space-y-2 group hover:border-accent/30 transition-all">
                      <div className="flex flex-col md:flex-row gap-2 items-center">
                        <div className="flex-1 p-2 bg-red-50/50 border border-red-100 rounded-lg text-red-700 text-[9px] font-medium line-through w-full">
                          {corr.original}
                        </div>
                        <ChevronRight className="h-3 w-3 text-primary/20 rotate-90 md:rotate-0" />
                        <div className="flex-1 p-2 bg-green-50/50 border border-green-100 rounded-lg text-green-700 text-[10px] font-black italic w-full">
                          {corr.suggestion}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <Lightbulb className="h-3 w-3 text-accent" />
                        <p className="text-[8px] font-black text-primary/60 uppercase italic">
                          JUSTIFICATIVA: <span className="text-primary normal-case font-bold">{corr.reason}</span>
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-6 opacity-30 italic">
                      <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-500" />
                      <p className="font-black uppercase text-[8px] tracking-widest">Sem desvios detectados</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* COMPETÊNCIAS GRID COMPACTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(result.competencies || {}).map(([key, comp]: any) => (
                  <Card key={key} className="border-none shadow-md bg-white rounded-xl p-4 group hover:border-accent/30 border border-transparent transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 opacity-5">
                      <Badge className="text-2xl font-black italic">{comp.score}</Badge>
                    </div>
                    <div className="relative z-10 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] font-black uppercase text-primary/40 tracking-widest">{COMPETENCY_LABELS[key]}</span>
                        <Badge className="bg-primary text-white font-black italic text-[8px] px-2 py-0.5 rounded-full">{comp.score}</Badge>
                      </div>
                      <p className="text-[10px] text-primary/80 font-medium leading-relaxed italic line-clamp-3">"{comp.feedback}"</p>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-center">
                <Button onClick={() => setResult(null)} variant="outline" className="rounded-lg h-8 px-5 border-primary/20 font-black uppercase text-[8px] text-primary hover:bg-primary hover:text-white transition-all">
                  Nova Sessão de Treino
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* BARRA LATERAL (DIREITA) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* TEXTOS MOTIVADORES COMPACTOS */}
          {!result && supportingTexts.length > 0 && (
            <Card className="border-none shadow-lg bg-white rounded-2xl overflow-hidden animate-in slide-in-from-right-4 ring-1 ring-black/5">
              <CardHeader className="bg-accent/5 p-3 border-b border-dashed border-accent/20">
                <CardTitle className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-accent" /> Base de Apoio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5 max-h-[300px] overflow-y-auto scrollbar-hide">
                {supportingTexts.map((st) => (
                  <div key={st.id} className="space-y-1 p-2.5 bg-slate-50/50 rounded-lg border border-muted/20">
                    <p className="text-[10px] font-medium italic text-primary/80 leading-relaxed">"{st.content}"</p>
                    <p className="text-[6px] font-black text-muted-foreground uppercase text-right tracking-widest pt-1 border-t border-muted/10 opacity-60">Fonte: {st.source}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CHECKLIST COMPACTO */}
          <Card className="border-none shadow-xl bg-primary text-white rounded-2xl p-5 space-y-3 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-accent/20 rounded-full blur-[30px]" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-accent shadow-md border border-white/10">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h3 className="font-black text-white italic uppercase tracking-widest text-[9px]">Padrão INEP</h3>
              </div>
              <div className="space-y-1.5">
                {[
                  "Domínio da norma culta.",
                  "Tese clara na introdução.",
                  "Dois repertórios externos.",
                  "Proposta 5 elementos."
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 p-1.5 rounded-lg border border-white/5">
                    <div className="h-1 w-1 rounded-full bg-accent" />
                    <span className="text-[8px] font-bold italic opacity-90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* DICAS DA AURORA COMPACTAS */}
          <div className="space-y-2.5">
            <h3 className="text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] px-3 flex items-center gap-2">
              <Zap className="h-2 w-2 text-accent fill-accent" /> Mentoria Aurora
            </h3>
            {ESSAY_TIPS.map((tip, i) => (
              <Card key={i} className="border-none shadow-md bg-white rounded-xl p-3 hover:shadow-lg transition-all cursor-default group">
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg border transition-transform group-hover:scale-110 ${tip.color}`}>
                    <tip.icon className="h-3 w-3" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-primary italic leading-none">{tip.title}</p>
                    <p className="text-[8px] text-muted-foreground font-medium italic leading-tight">{tip.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* DASHBOARD DE EVOLUÇÃO (RODAPÉ) */}
      <Card className="border-none shadow-xl rounded-2xl bg-white overflow-hidden p-5 md:p-8 mt-6 group relative ring-1 ring-black/5">
        <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none group-hover:rotate-12 transition-all">
          <TrendingUp className="h-32 w-32 text-primary" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3 relative z-10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shadow-md">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-primary italic tracking-tight">
                Evolução <span className="text-accent">Acadêmica</span>
              </h3>
            </div>
            <p className="text-muted-foreground font-medium italic text-[9px] max-w-md">Mapeamento histórico de notas.</p>
          </div>
          
          <div className="flex gap-4 bg-slate-50 p-3 rounded-xl border border-muted/10 shadow-inner">
            <div className="text-center">
              <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Média</p>
              <p className="text-lg font-black text-primary italic">785</p>
            </div>
            <div className="w-px bg-muted/20" />
            <div className="text-center">
              <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Pico</p>
              <p className="text-lg font-black text-accent italic">920</p>
            </div>
          </div>
        </div>
        
        <div className="h-[180px] w-full mt-1 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: '900', fontStyle: 'italic' }} 
                dy={8} 
              />
              <YAxis 
                domain={[0, 1000]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: '900' }} 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '0.75rem', 
                  border: 'none', 
                  boxShadow: '0 10px 20px -5px rgba(0,0,0,0.15)', 
                  padding: '0.5rem',
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'white'
                }} 
                itemStyle={{ fontWeight: '900', fontSize: '9px', color: 'hsl(var(--accent))' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '0.1rem', fontSize: '8px' }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorScore)" 
                dot={{ r: 4, fill: "hsl(var(--accent))", strokeWidth: 1.5, stroke: "#fff" }} 
                activeDot={{ r: 6, fill: "white", stroke: "hsl(var(--accent))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-2 mt-6 text-[7px] font-black text-primary/20 uppercase tracking-[0.3em] italic">
          <History className="h-3 w-3" /> Monitoramento Maestro • Compromisso
        </div>
      </Card>
    </div>
  );
}
