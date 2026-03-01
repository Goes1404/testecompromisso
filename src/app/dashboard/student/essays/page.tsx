"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ArrowRight,
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
    title: "Coesão é Chave", 
    desc: "Use conectivos variados no início de cada parágrafo para garantir a fluidez do texto.",
    icon: LinkIcon,
    color: "bg-blue-500/10 text-blue-600 border-blue-200"
  },
  { 
    title: "Tese Objetiva", 
    desc: "Sua tese deve estar clara na introdução. Evite deixar o corretor procurando seu ponto de vista.",
    icon: Target,
    color: "bg-orange-500/10 text-orange-600 border-orange-200"
  },
  { 
    title: "Os 5 Elementos", 
    desc: "Na intervenção, não esqueça: Agente, Ação, Meio/Modo, Efeito e Detalhamento.",
    icon: CheckCircle2,
    color: "bg-green-500/10 text-green-600 border-green-200"
  }
];

const COMPETENCY_LABELS: Record<string, string> = {
  c1: "Norma Culta",
  c2: "Proposta e Conceitos",
  c3: "Organização das Ideias",
  c4: "Coesão e Mecanismos",
  c5: "Proposta de Intervenção"
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
        toast({ title: "Proposta Gerada!", description: "Textos motivadores carregados na lateral." });
      } else {
        throw new Error(data.error || "Falha na comunicação com a Aurora.");
      }
    } catch (e: any) {
      toast({ title: "Aurora Offline", description: e.message, variant: "destructive" });
    } finally {
      setLoadingTopic(false);
    }
  };

  const handleSubmitEssay = async () => {
    if (text.length < 300) {
      toast({ title: "Texto muito curto", description: "Escreva pelo menos 300 caracteres para avaliação.", variant: "destructive" });
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
        toast({ title: "Avaliação Concluída!", description: "Seu diagnóstico já está disponível abaixo." });
      } else {
        throw new Error(data.error || "Erro no processamento da correção.");
      }
    } catch (e: any) {
      toast({ title: "Erro na Correção", description: e.message, variant: "destructive" });
    } finally {
      setLoadingGrading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20 px-2 sm:px-4">
      
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3">
              <PenTool className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-primary italic tracking-tighter leading-none">
                Redação <span className="text-accent">Master</span>
              </h1>
              <p className="text-muted-foreground font-medium italic mt-1 text-sm md:text-base">Aceleração pedagógica com Inteligência de Rede.</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Button 
            variant="ghost"
            onClick={() => { setCustomTheme(!customTheme); setTheme(""); setSupportingTexts([]); setResult(null); }}
            className={`rounded-2xl h-14 px-6 font-black transition-all border-2 ${customTheme ? 'bg-primary text-white border-primary shadow-xl' : 'bg-white border-muted/20 text-primary hover:border-primary/40'}`}
          >
            {customTheme ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <Quote className="h-5 w-5 mr-2" />}
            {customTheme ? "Tema Definido" : "Tema Personalizado"}
          </Button>
          <Button 
            onClick={handleGenerateTopic} 
            disabled={loadingTopic || loadingGrading}
            className="rounded-2xl h-14 bg-accent text-accent-foreground font-black px-10 shadow-2xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all border-none"
          >
            {loadingTopic ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Sparkles className="h-5 w-5 mr-3" />}
            Gerar Tema Aurora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* ÁREA DE ESCRITA (ESQUERDA) */}
        <div className="lg:col-span-8 space-y-10">
          <Card className="border-none shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3rem] bg-white overflow-hidden ring-1 ring-black/5 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary opacity-20" />
            
            <CardHeader className="bg-slate-50/30 p-8 md:p-12 border-b border-dashed border-muted/30">
              {customTheme ? (
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 ml-2">Título do Tema Livre</Label>
                  <Input 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Digite o tema que deseja treinar hoje..."
                    className="h-16 rounded-2xl bg-white border-none shadow-inner font-black italic text-xl text-primary focus-visible:ring-2 focus-visible:ring-accent/30"
                  />
                </div>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-primary text-white border-none font-black text-[9px] px-4 py-1.5 uppercase tracking-widest rounded-full shadow-lg">MODO OFICIAL ENEM</Badge>
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                        <Zap className="h-3 w-3 text-accent fill-accent" /> Proposta Aurora
                      </span>
                    </div>
                    <CardTitle className="text-2xl md:text-4xl font-black text-primary italic leading-[1.1] tracking-tight">
                      {theme || "Aguardando definição de tema..."}
                    </CardTitle>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-muted/10 shadow-xl shadow-black/5 shrink-0 flex flex-col items-center justify-center min-w-[120px]">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Caracteres</p>
                    <p className={`text-3xl font-black italic ${charCount < 300 ? 'text-orange-500' : 'text-primary'}`}>{charCount}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-0 relative">
              <Textarea 
                placeholder="Inicie sua redação aqui... 'Em primeira análise, é imperativo observar que...'"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loadingGrading}
                className="min-h-[600px] md:min-h-[700px] border-none p-10 md:p-16 font-medium text-xl leading-[1.8] italic resize-none focus-visible:ring-0 bg-transparent text-primary/80 selection:bg-accent/20"
              />
              
              <div className="p-10 md:p-12 bg-white/80 backdrop-blur-md border-t border-muted/10 flex flex-col sm:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-4 text-primary/40">
                  <FileText className="h-5 w-5" />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] italic">
                    Escrita monitorada em tempo real
                  </p>
                </div>
                <Button 
                  onClick={handleSubmitEssay} 
                  disabled={loadingGrading || !text || !theme}
                  className="bg-primary text-white font-black h-16 px-12 rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all w-full sm:w-auto text-xl border-none group"
                >
                  {loadingGrading ? <Loader2 className="h-6 w-6 animate-spin mr-4" /> : <Send className="h-6 w-6 mr-4 text-accent transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />}
                  {loadingGrading ? "Aurora Analisando..." : "Submeter Avaliação"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RESULTADOS PREMIUM */}
          {result && (
            <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[3.5rem] overflow-hidden relative group">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-[100px] group-hover:scale-150 transition-transform duration-1000" />
                <div className="p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                  <div className="text-center md:text-left space-y-6">
                    <Badge className="bg-accent text-accent-foreground font-black text-[11px] px-6 py-2 uppercase rounded-full shadow-2xl">DIAGNÓSTICO FINAL AURORA</Badge>
                    <h2 className="text-[10rem] md:text-[14rem] font-black italic tracking-tighter leading-none block drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]">{result.total_score}</h2>
                    <p className="text-lg md:text-2xl font-medium italic text-white/80 max-w-2xl leading-relaxed">
                      <Quote className="h-8 w-8 text-accent mb-4 opacity-50" />
                      "{result.general_feedback}"
                    </p>
                  </div>
                  <div className="h-64 w-64 rounded-[4rem] bg-white/10 flex items-center justify-center rotate-6 shadow-2xl border border-white/10 backdrop-blur-md group-hover:rotate-0 transition-transform duration-700">
                    <CheckCircle2 className="h-32 w-32 text-accent animate-pulse" />
                  </div>
                </div>
              </Card>

              {/* RAIO-X GRAMATICAL REDESENHADO */}
              <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden ring-1 ring-black/5">
                <CardHeader className="bg-slate-50/50 p-10 md:p-14 border-b border-muted/10">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600 shadow-inner">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl md:text-3xl font-black text-primary italic leading-none">Raio-X Gramatical</CardTitle>
                      <p className="text-muted-foreground font-medium italic mt-2">Detecção industrial de desvios e sugestões técnicas.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 md:p-14 space-y-8">
                  {result.detailed_corrections?.length > 0 ? result.detailed_corrections.map((corr: any, i: number) => (
                    <div key={i} className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-muted/20 space-y-6 group hover:border-accent/30 transition-all duration-500">
                      <div className="flex flex-col md:flex-row gap-8 items-stretch">
                        <div className="flex-1 p-6 bg-red-50/50 border border-red-100 rounded-3xl text-red-700 text-base font-medium line-through decoration-red-300 decoration-2">
                          {corr.original}
                        </div>
                        <div className="flex items-center justify-center shrink-0">
                          <div className="h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center text-primary/20 rotate-90 md:rotate-0">
                            <ChevronRight className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex-1 p-6 bg-green-50/50 border border-green-100 rounded-3xl text-green-700 text-lg font-black italic">
                          {corr.suggestion}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 px-4">
                        <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                          <Lightbulb className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-black text-primary/60 uppercase tracking-widest italic">
                          JUSTIFICATIVA: <span className="text-primary normal-case font-bold">{corr.reason}</span>
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 opacity-30 italic">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                      <p className="font-black uppercase text-xs tracking-widest">Nenhum desvio crítico detectado</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* COMPETÊNCIAS COM DESIGN DE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(result.competencies || {}).map(([key, comp]: any) => (
                  <Card key={key} className="border-none shadow-xl bg-white rounded-[2.5rem] p-10 group hover:border-accent/30 border-2 border-transparent transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Badge className="text-8xl font-black italic leading-none">{comp.score}</Badge>
                    </div>
                    <div className="relative z-10 space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase text-primary/40 tracking-[0.3em]">{COMPETENCY_LABELS[key]}</span>
                        <Badge className="bg-primary text-white font-black italic text-base px-5 py-1.5 rounded-full shadow-lg">{comp.score} / 200</Badge>
                      </div>
                      <p className="text-base text-primary/80 font-medium leading-relaxed italic">"{comp.feedback}"</p>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-center pt-8">
                <Button onClick={() => setResult(null)} variant="outline" className="rounded-2xl h-16 px-12 border-2 border-primary/20 font-black uppercase text-xs text-primary hover:bg-primary hover:text-white transition-all shadow-xl">
                  Iniciar Nova Sessão de Treinamento
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* BARRA LATERAL (DIREITA) */}
        <div className="lg:col-span-4 space-y-10">
          
          {/* TEXTOS MOTIVADORES COM DESIGN DE LIVRO */}
          {!result && supportingTexts.length > 0 && (
            <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden animate-in slide-in-from-right-4 ring-1 ring-black/5">
              <CardHeader className="bg-accent/5 p-8 border-b border-dashed border-accent/20">
                <CardTitle className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-accent" /> Base Motivadora
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8 max-h-[500px] overflow-y-auto scrollbar-hide">
                {supportingTexts.map((st) => (
                  <div key={st.id} className="space-y-4 p-6 bg-slate-50/50 rounded-[2rem] border border-muted/20 relative group">
                    <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center font-black text-[10px] text-accent">
                      {st.id}
                    </div>
                    <p className="text-sm font-medium italic text-primary/80 leading-[1.7]">"{st.content}"</p>
                    <p className="text-[9px] font-black text-muted-foreground uppercase text-right tracking-widest pt-4 border-t border-muted/10 opacity-60">Fonte: {st.source}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CHECKLIST INEP PREMIUM */}
          <Card className="border-none shadow-2xl bg-primary text-white rounded-[3rem] p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-accent/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-accent shadow-xl border border-white/10">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-black text-white italic uppercase tracking-[0.2em] text-sm">Protocolo 1000</h3>
              </div>
              <div className="space-y-5">
                {[
                  "Domínio total da norma culta.",
                  "Tese explícita no 1º parágrafo.",
                  "Dois repertórios socioculturais.",
                  "Proposta com os 5 elementos."
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-xs font-bold italic opacity-90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* DICAS DA AURORA REDESENHADAS */}
          <div className="space-y-6">
            <h3 className="text-[11px] font-black text-primary/40 uppercase tracking-[0.4em] px-6 flex items-center gap-3">
              <Zap className="h-4 w-4 text-accent fill-accent" /> Mentor Digital
            </h3>
            {ESSAY_TIPS.map((tip, i) => (
              <Card key={i} className="border-none shadow-xl bg-white rounded-[2rem] p-6 hover:shadow-2xl transition-all duration-500 cursor-default ring-1 ring-black/5 group">
                <div className="flex items-start gap-5">
                  <div className={`p-3.5 rounded-2xl border-2 transition-transform group-hover:scale-110 ${tip.color}`}>
                    <tip.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-primary italic leading-none">{tip.title}</p>
                    <p className="text-[11px] text-muted-foreground font-medium italic leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* DASHBOARD DE EVOLUÇÃO (RODAPÉ) PREMIUM */}
      <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[4rem] bg-white overflow-hidden p-12 md:p-20 mt-20 group relative ring-1 ring-black/5">
        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
          <TrendingUp className="h-96 w-96 text-primary" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center shadow-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-3xl md:text-5xl font-black text-primary italic tracking-tighter">
                Evolução <span className="text-accent">Acadêmica</span>
              </h3>
            </div>
            <p className="text-muted-foreground font-medium italic text-sm md:text-lg max-w-xl">Mapeamento histórico de consistência e refinamento técnico.</p>
          </div>
          
          <div className="flex gap-12 bg-slate-50 p-8 rounded-[2.5rem] border border-muted/10 shadow-inner">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] mb-2">Média Geral</p>
              <p className="text-4xl font-black text-primary italic">785</p>
            </div>
            <div className="w-px bg-muted/20" />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] mb-2">Pico Histórico</p>
              <p className="text-4xl font-black text-accent italic">920</p>
            </div>
          </div>
        </div>
        
        <div className="h-[450px] w-full mt-8 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockHistory} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: '900', fontStyle: 'italic' }} 
                dy={25} 
              />
              <YAxis 
                domain={[0, 1000]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: '900' }} 
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '2rem', 
                  border: 'none', 
                  boxShadow: '0 40px 80px -15px rgba(0,0,0,0.3)', 
                  padding: '1.5rem',
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'white'
                }} 
                itemStyle={{ fontWeight: '900', fontStyle: 'italic', color: 'hsl(var(--accent))' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="hsl(var(--accent))" 
                strokeWidth={6} 
                fillOpacity={1} 
                fill="url(#colorScore)" 
                dot={{ r: 10, fill: "hsl(var(--accent))", strokeWidth: 4, stroke: "#fff" }} 
                activeDot={{ r: 14, fill: "white", stroke: "hsl(var(--accent))", strokeWidth: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-4 mt-16 text-[11px] font-black text-primary/20 uppercase tracking-[0.6em] italic">
          <History className="h-5 w-5" /> Log de Auditoria Maestro • Rede Sincronizada
        </div>
      </Card>
    </div>
  );
}
