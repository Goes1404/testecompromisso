"use client";

import { useState, useEffect, useMemo } from "react";
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
  Eraser,
  PenTool,
  History,
  FileText,
  AlertCircle,
  XCircle,
  CheckCircle,
  Layout
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock de histórico para o Dashboard (Em produção viria do Supabase)
const mockHistory = [
  { date: '01/05', score: 560 },
  { date: '05/05', score: 620 },
  { date: '10/05', score: 780 },
  { date: '15/05', score: 740 },
  { date: '20/05', score: 880 },
];

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
        toast({ title: "Novo Tema Estilo ENEM!", description: "Textos de apoio carregados." });
      } else {
        throw new Error(data.error || "Falha ao sintonizar tema.");
      }
    } catch (e: any) {
      toast({ title: "Aurora Offline", description: e.message, variant: "destructive" });
    } finally {
      setLoadingTopic(false);
    }
  };

  const handleSubmitEssay = async () => {
    if (text.length < 300) {
      toast({ title: "Texto Insuficiente", description: "Mínimo de 300 caracteres para avaliação.", variant: "destructive" });
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
        toast({ title: "Correção Finalizada!", description: "Análise pedagógica completa disponível." });
      } else {
        throw new Error(data.error || "Erro no processamento da Aurora.");
      }
    } catch (e: any) {
      toast({ title: "Erro na Correção", description: e.message, variant: "destructive" });
    } finally {
      setLoadingGrading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-2 md:px-4">
      {/* Cabeçalho Estratégico */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-black text-primary italic tracking-tighter">Redação Master</h1>
          <p className="text-muted-foreground font-medium italic">Ambiente de alta performance para o nota 1000.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline"
            onClick={() => { setCustomTheme(!customTheme); setTheme(""); }}
            className={`rounded-xl h-14 border-dashed border-primary/20 font-black ${customTheme ? 'bg-primary text-white border-none' : ''}`}
          >
            {customTheme ? <CheckCircle className="h-4 w-4 mr-2" /> : <PenTool className="h-4 w-4 mr-2" />}
            {customTheme ? "Tema Manual Ativo" : "Tema Personalizado"}
          </Button>
          <Button 
            onClick={handleGenerateTopic} 
            disabled={loadingTopic || loadingGrading}
            className="rounded-xl h-14 bg-accent text-accent-foreground font-black px-8 shadow-xl"
          >
            {loadingTopic ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Gerar Proposta ENEM
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Lado Esquerdo: Editor e Dashboard */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Dashboard de Evolução */}
          {!result && (
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden p-8 animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-primary italic">Sua Evolução Pedagógica</h3>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Histórico de notas recentes</p>
                </div>
                <History className="h-6 w-6 text-accent opacity-20" />
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 1000]} hide />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={4} dot={{ r: 6, fill: "hsl(var(--accent))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Área de Escrita */}
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="bg-primary/5 p-6 md:p-8 border-b border-dashed">
              {customTheme ? (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-primary/40">Título do seu tema</Label>
                  <Input 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Digite aqui o tema que deseja praticar..."
                    className="h-14 rounded-xl bg-white border-none shadow-inner font-bold italic"
                  />
                </div>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <Badge className="bg-primary text-white border-none font-black text-[8px] px-3 py-1 uppercase tracking-widest">Proposta da Aurora</Badge>
                    <CardTitle className="text-xl md:text-2xl font-black text-primary italic leading-tight">
                      {theme || "Gere um tema ou ative o modo personalizado..."}
                    </CardTitle>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border shadow-inner shrink-0">
                    <p className="text-[8px] font-black text-muted-foreground uppercase text-right">Caracteres</p>
                    <p className={`text-lg font-black italic ${charCount < 300 ? 'text-orange-500' : 'text-green-600'}`}>{charCount}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Textarea 
                placeholder="Comece sua redação... 'Em primeira análise, é fundamental destacar...'"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loadingGrading}
                className="min-h-[500px] md:min-h-[650px] border-none p-8 md:p-10 font-medium text-base md:text-lg leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent text-primary/90"
              />
              <div className="p-6 md:p-8 bg-slate-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-[9px] font-black text-primary/30 uppercase tracking-widest italic text-center sm:text-left">
                  Respeite a estrutura dissertativo-argumentativa do ENEM.
                </p>
                <Button 
                  onClick={handleSubmitEssay} 
                  disabled={loadingGrading || !text || !theme}
                  className="bg-primary text-white font-black h-14 px-10 rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
                >
                  {loadingGrading ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Send className="h-5 w-5 mr-3 text-accent" />}
                  {loadingGrading ? "Aurora Analisando..." : "Submeter para Correção"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito: Textos Motivadores ou Resultados */}
        <div className="lg:col-span-4 space-y-6">
          
          {!result ? (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {supportingTexts.length > 0 && (
                <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="bg-accent/10 p-6 border-b border-accent/10">
                    <CardTitle className="text-sm font-black text-primary uppercase flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-accent" /> Textos Motivadores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6 max-h-[600px] overflow-y-auto scrollbar-hide">
                    {supportingTexts.map((st) => (
                      <div key={st.id} className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-primary/40 uppercase">Texto {st.id}</p>
                        <p className="text-xs font-medium italic text-primary/80 leading-relaxed">"{st.content}"</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase text-right">Fonte: {st.source}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="border-none shadow-xl bg-primary text-white rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <h3 className="font-black text-white italic uppercase tracking-widest text-sm flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-accent" /> Check-list INEP
                  </h3>
                  <div className="space-y-4 mt-6">
                    {[
                      "Domínio da norma culta formal.",
                      "Presença de tese clara na introdução.",
                      "Uso de repertório sociocultural.",
                      "Proposta de intervenção completa."
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                        <span className="text-[11px] font-bold italic opacity-80">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              
              {/* Score Final */}
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[3rem] p-8 text-center relative overflow-hidden border-b-8 border-accent">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Nota Final Aurora</p>
                <h2 className="text-7xl md:text-8xl font-black italic tracking-tighter text-white drop-shadow-2xl">{result.total_score}</h2>
                <p className="text-xs md:text-sm font-medium italic text-white/80 pt-4 leading-relaxed line-clamp-4">"{result.general_feedback}"</p>
              </Card>

              {/* Destaques de Erros (Red/Green) */}
              <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-red-50 p-6 border-b border-red-100">
                  <CardTitle className="text-xs font-black text-red-800 uppercase flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Diagnóstico de Erros
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {result.detailed_corrections?.length > 0 ? (
                    result.detailed_corrections.map((corr: any, i: number) => (
                      <div key={i} className="space-y-2 pb-4 border-b last:border-0">
                        <div className="flex flex-col gap-1">
                          <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-bold line-through line-clamp-1">{corr.original}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground mx-auto" />
                          <span className="text-green-700 bg-green-50 px-2 py-1 rounded-md text-xs font-black italic">{corr.suggestion}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium italic">Regra: {corr.reason}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-center text-muted-foreground italic py-4">Nenhum erro grave identificado pela Aurora.</p>
                  )}
                </CardContent>
              </Card>

              {/* Competências */}
              <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 space-y-6">
                <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                  <Layout className="h-4 w-4 text-accent" /> Competências
                </h3>
                <div className="space-y-5">
                  {Object.entries(result.competencies).map(([key, comp]: [string, any], idx) => (
                    <div key={key} className="space-y-2 group">
                      <div className="flex justify-between text-[9px] font-black uppercase">
                        <span className="text-primary/60">Competência {idx + 1}</span>
                        <span className="text-accent">{comp.score}/200</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${(comp.score / 200) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              
              <Button onClick={() => setResult(null)} variant="outline" className="w-full h-14 rounded-2xl border-dashed font-black text-primary hover:bg-primary/5 uppercase text-xs">
                Reiniciar Estúdio
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
