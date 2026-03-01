
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
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-700 pb-12 px-2">
      
      {/* HEADER COMPACTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-muted/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-md">
            <PenTool className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black text-primary italic leading-none">
              Redação <span className="text-accent">Master</span>
            </h1>
            <p className="text-muted-foreground font-medium italic text-[8px]">Laboratório de Alta Performance</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => { setCustomTheme(!customTheme); setTheme(""); setSupportingTexts([]); setResult(null); }}
            className={`rounded-lg h-7 px-3 font-black text-[8px] uppercase transition-all border ${customTheme ? 'bg-primary text-white' : 'bg-white border-muted/20 text-primary'}`}
          >
            {customTheme ? "Fixo" : "Tema Manual"}
          </Button>
          <Button 
            size="sm"
            onClick={handleGenerateTopic} 
            disabled={loadingTopic || loadingGrading}
            className="rounded-lg h-7 bg-accent text-accent-foreground font-black px-3 shadow-md border-none text-[8px] uppercase"
          >
            {loadingTopic ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Gerar Proposta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ÁREA DE ESCRITA (ESQUERDA) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-none shadow-lg rounded-xl bg-white overflow-hidden ring-1 ring-black/5 relative">
            <CardHeader className="bg-slate-50/30 p-3 md:p-4 border-b border-dashed border-muted/30">
              {customTheme ? (
                <div className="space-y-1">
                  <Label className="text-[8px] font-black uppercase tracking-widest text-primary/40 ml-1">Defina o Tema</Label>
                  <Input 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Sobre o que vamos escrever?"
                    className="h-8 rounded-lg bg-white border-none shadow-inner font-bold italic text-[10px] focus-visible:ring-2 focus-visible:ring-accent/30"
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <Badge className="bg-primary text-white border-none font-black text-[6px] px-2 py-0.5 uppercase rounded-full">TEMA ATIVO</Badge>
                    <CardTitle className="text-xs md:text-sm font-black text-primary italic leading-tight truncate">
                      {theme || "Gere um tema para iniciar..."}
                    </CardTitle>
                  </div>
                  <div className="bg-white p-1 rounded-lg border border-muted/10 shadow-sm shrink-0 flex flex-col items-center justify-center min-w-[40px]">
                    <p className="text-[6px] font-black text-muted-foreground uppercase">Caract.</p>
                    <p className={`text-[10px] font-black italic ${charCount < 300 ? 'text-orange-500' : 'text-primary'}`}>{charCount}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-0">
              <Textarea 
                placeholder="Inicie seu texto dissertativo-argumentativo aqui... (Mínimo 300 caracteres)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loadingGrading}
                className="min-h-[350px] md:min-h-[450px] border-none p-4 md:p-6 font-medium text-xs md:text-sm leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent"
              />
              
              <div className="p-3 bg-white/80 backdrop-blur-md border-t border-muted/10 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-primary/30">
                  <FileText className="h-3 w-3" />
                  <p className="text-[7px] font-black uppercase tracking-widest italic">Análise Aurora 2.5 Flash</p>
                </div>
                <Button 
                  onClick={handleSubmitEssay} 
                  disabled={loadingGrading || !text || !theme}
                  className="bg-primary text-white font-black h-8 px-6 rounded-lg shadow-md hover:scale-[1.02] transition-all w-full sm:w-auto text-[9px] uppercase border-none"
                >
                  {loadingGrading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2 text-accent" />}
                  {loadingGrading ? "Corrigindo..." : "Enviar para Correção"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BARRA LATERAL DE APOIO E RESULTADOS (DIREITA) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* RESULTADOS (APARECEM AQUI QUANDO DISPONÍVEIS) */}
          {result && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-700">
              {/* NOTA FINAL */}
              <Card className="border-none shadow-xl bg-primary text-white rounded-xl overflow-hidden relative group">
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-[40px]" />
                <div className="p-4 flex items-center justify-between gap-4 relative z-10">
                  <div className="space-y-1">
                    <Badge className="bg-accent text-accent-foreground font-black text-[6px] px-2 py-0.5 uppercase rounded-full">NOTA</Badge>
                    <h2 className="text-4xl font-black italic tracking-tighter leading-none">{result.total_score}</h2>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center rotate-6 shadow-lg border border-white/10">
                    <CheckCircle2 className="h-6 w-6 text-accent animate-pulse" />
                  </div>
                </div>
                <div className="px-4 pb-4 relative z-10">
                  <p className="text-[9px] font-medium italic text-white/80 leading-relaxed border-t border-white/10 pt-2">
                    {result.general_feedback}
                  </p>
                </div>
              </Card>

              {/* COMPETÊNCIAS (EM BAIXO DA NOTA) */}
              <div className="space-y-2">
                <h3 className="text-[7px] font-black text-primary/40 uppercase tracking-[0.2em] px-2">Detalhamento por Competência</h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(result.competencies || {}).map(([key, comp]: any) => (
                    <div key={key} className="bg-white p-3 rounded-lg shadow-sm border border-muted/10 group hover:border-accent/30 transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[7px] font-black uppercase text-primary/60">{COMPETENCY_LABELS[key]}</span>
                        <Badge className="bg-muted text-primary font-black italic text-[8px] h-4">{comp.score}</Badge>
                      </div>
                      <p className="text-[9px] text-primary/80 font-medium italic leading-tight line-clamp-2">{comp.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RAIO-X GRAMATICAL (PREENCHENDO O ESPAÇO) */}
              <Card className="border-none shadow-md bg-white rounded-xl overflow-hidden ring-1 ring-black/5">
                <CardHeader className="bg-slate-50/50 p-3 border-b border-dashed border-muted/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    <CardTitle className="text-[9px] font-black text-primary italic uppercase tracking-widest">Diagnóstico Crítico</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {result.detailed_corrections?.length > 0 ? result.detailed_corrections.map((corr: any, i: number) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50/50 border border-muted/20 space-y-1.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded w-fit line-through opacity-70">{corr.original}</span>
                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded w-fit font-black italic">{corr.suggestion}</span>
                      </div>
                      <p className="text-[7px] font-bold text-primary/60 italic leading-tight">
                        <Lightbulb className="h-2 w-2 inline mr-1 text-accent" />
                        {corr.reason}
                      </p>
                    </div>
                  )) : (
                    <p className="text-[8px] text-center italic text-muted-foreground">Nenhum desvio detectado.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TEXTOS MOTIVADORES (TOPO DA SIDEBAR QUANDO DISPONÍVEL) */}
          {!result && supportingTexts.length > 0 && (
            <Card className="border-none shadow-md bg-white rounded-xl overflow-hidden animate-in slide-in-from-right-4 ring-1 ring-black/5">
              <CardHeader className="bg-accent/5 p-2.5 border-b border-dashed border-accent/20">
                <CardTitle className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-accent" /> Base de Apoio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2.5 space-y-2 max-h-[250px] overflow-y-auto scrollbar-hide">
                {supportingTexts.map((st) => (
                  <div key={st.id} className="p-2 bg-slate-50/50 rounded-lg border border-muted/20">
                    <p className="text-[9px] font-medium italic text-primary/80 leading-relaxed">"{st.content}"</p>
                    <p className="text-[6px] font-black text-muted-foreground uppercase text-right pt-1 opacity-60">Fonte: {st.source}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CHECKLIST PADRÃO INEP */}
          <Card className="border-none shadow-lg bg-primary text-white rounded-xl p-4 space-y-2.5 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-20 h-20 bg-accent/20 rounded-full blur-[20px]" />
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                <h3 className="font-black text-white italic uppercase tracking-widest text-[8px]">Critérios INEP</h3>
              </div>
              <div className="space-y-1">
                {[
                  "Norma culta formal.",
                  "Tese clara e explícita.",
                  "Dois repertórios externos.",
                  "Proposta 5 elementos."
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                    <div className="h-1 w-1 rounded-full bg-accent" />
                    <span className="text-[7px] font-bold italic opacity-90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* DICAS DA AURORA (SIDEBAR) */}
          <div className="space-y-2">
            <h3 className="text-[7px] font-black text-primary/40 uppercase tracking-[0.2em] px-2">Mentoria Aurora</h3>
            {ESSAY_TIPS.map((tip, i) => (
              <Card key={i} className="border-none shadow-sm bg-white rounded-lg p-2.5 hover:shadow-md transition-all group">
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg border ${tip.color}`}>
                    <tip.icon className="h-3 w-3" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-primary italic leading-none">{tip.title}</p>
                    <p className="text-[7px] text-muted-foreground font-medium italic leading-tight">{tip.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* DASHBOARD DE EVOLUÇÃO (RODAPÉ) */}
      <Card className="border-none shadow-xl rounded-xl bg-white overflow-hidden p-4 md:p-6 mt-4 group relative ring-1 ring-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h3 className="text-sm md:text-base font-black text-primary italic tracking-tight">
              Evolução <span className="text-accent">Acadêmica</span>
            </h3>
          </div>
          
          <div className="flex gap-3 bg-slate-50 p-2 rounded-lg border border-muted/10">
            <div className="text-center px-2">
              <p className="text-[6px] font-black uppercase text-muted-foreground">Média</p>
              <p className="text-xs font-black text-primary italic">785</p>
            </div>
            <div className="w-px bg-muted/20" />
            <div className="text-center px-2">
              <p className="text-[6px] font-black uppercase text-muted-foreground">Pico</p>
              <p className="text-xs font-black text-accent italic">920</p>
            </div>
          </div>
        </div>
        
        <div className="h-[120px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
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
                tick={{ fill: '#94a3b8', fontSize: 7, fontWeight: '900' }} 
              />
              <YAxis 
                domain={[0, 1000]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 7, fontWeight: '900' }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', padding: '0.3rem', backgroundColor: 'hsl(var(--primary))', color: 'white' }} 
                itemStyle={{ fontWeight: '900', fontSize: '8px', color: 'hsl(var(--accent))' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '7px' }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorScore)" 
                dot={{ r: 3, fill: "hsl(var(--accent))" }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
