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
  CheckCircle,
  Lightbulb,
  Target,
  Link as LinkIcon,
  ArrowRight
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
    color: "text-blue-500"
  },
  { 
    title: "Tese Objetiva", 
    desc: "Sua tese deve estar clara na introdução. Evite deixar o corretor procurando seu ponto de vista.",
    icon: Target,
    color: "text-orange-500"
  },
  { 
    title: "Os 5 Elementos", 
    desc: "Na intervenção, não esqueça: Agente, Ação, Meio/Modo, Efeito e Detalhamento.",
    icon: CheckCircle2,
    color: "text-green-500"
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-2">
      
      {/* HEADER ESTRATÉGICO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-black text-primary italic tracking-tighter">Redação Master</h1>
            <Badge className="bg-accent text-accent-foreground border-none font-black text-[10px] px-3 animate-pulse">ESTÚDIO ATIVO</Badge>
          </div>
          <p className="text-muted-foreground font-medium italic">Acelere sua nota rumo aos 1000 pontos com IA pedagógica.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline"
            onClick={() => { setCustomTheme(!customTheme); setTheme(""); setSupportingTexts([]); setResult(null); }}
            className={`rounded-xl h-12 border-dashed border-primary/20 font-black transition-all ${customTheme ? 'bg-primary text-white border-none shadow-lg' : 'bg-white'}`}
          >
            {customTheme ? <CheckCircle className="h-4 w-4 mr-2" /> : <PenTool className="h-4 w-4 mr-2" />}
            {customTheme ? "Definir Tema" : "Tema Personalizado"}
          </Button>
          <Button 
            onClick={handleGenerateTopic} 
            disabled={loadingTopic || loadingGrading}
            className="rounded-xl h-12 bg-accent text-accent-foreground font-black px-8 shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            {loadingTopic ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Gerar Tema ENEM
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ÁREA DE ESCRITA (ESQUERDA) */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-black/5">
            <CardHeader className="bg-slate-50/50 p-6 md:p-10 border-b border-dashed">
              {customTheme ? (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-2">Título do Tema da sua Escolha</Label>
                  <Input 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Digite o tema que deseja treinar..."
                    className="h-14 rounded-2xl bg-white border-none shadow-inner font-bold italic text-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-white border-none font-black text-[8px] px-3 py-1 uppercase tracking-widest">Padrão ENEM</Badge>
                      <span className="text-[8px] font-black text-muted-foreground uppercase">Proposta Oficial</span>
                    </div>
                    <CardTitle className="text-xl md:text-3xl font-black text-primary italic leading-tight">
                      {theme || "Gere um tema ou use um manual para começar."}
                    </CardTitle>
                  </div>
                  <div className="bg-white px-5 py-3 rounded-2xl border shadow-sm shrink-0 flex flex-col items-center justify-center">
                    <p className="text-[8px] font-black text-muted-foreground uppercase">Caracteres</p>
                    <p className={`text-xl font-black italic ${charCount < 300 ? 'text-orange-500' : 'text-green-600'}`}>{charCount}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 relative">
              <Textarea 
                placeholder="Desenvolva sua tese aqui... 'Em primeira análise, é fundamental compreender...'"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loadingGrading}
                className="min-h-[500px] md:min-h-[600px] border-none p-10 font-medium text-lg leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent text-primary/90"
              />
              
              <div className="p-8 bg-slate-50/80 backdrop-blur-sm border-t flex flex-col sm:flex-row justify-between items-center gap-6">
                <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest italic">
                  Analise o tema e escreva com atenção.
                </p>
                <Button 
                  onClick={handleSubmitEssay} 
                  disabled={loadingGrading || !text || !theme}
                  className="bg-primary text-white font-black h-14 px-10 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto text-lg border-none"
                >
                  {loadingGrading ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Send className="h-6 w-6 mr-3 text-accent" />}
                  {loadingGrading ? "Aurora Analisando..." : "Submeter para Correção"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RESULTADOS DETALHADOS (EXIBE QUANDO HOUVER RESULTADO) */}
          {result && (
            <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-1000">
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden">
                <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="text-center md:text-left space-y-4">
                    <Badge className="bg-accent text-accent-foreground font-black text-[10px] px-4 py-1.5 uppercase">Nota Final INEP</Badge>
                    <h2 className="text-8xl md:text-9xl font-black italic tracking-tighter leading-none">{result.total_score}</h2>
                    <p className="text-sm md:text-xl font-medium italic text-white/70 max-w-xl">"{result.general_feedback}"</p>
                  </div>
                  <div className="h-40 w-40 rounded-[3rem] bg-white/10 flex items-center justify-center rotate-6 shadow-inner border border-white/5">
                    <CheckCircle2 className="h-20 w-20 text-accent" />
                  </div>
                </div>
              </Card>

              {/* RAIO-X GRAMATICAL (RED/GREEN) */}
              <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-slate-50 p-8 border-b">
                  <CardTitle className="text-xl font-black text-primary italic flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    Diagnóstico Gramatical
                  </CardTitle>
                  <CardDescription className="font-medium italic">Trechos identificados para ajuste imediato.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {result.detailed_corrections?.length > 0 ? result.detailed_corrections.map((corr: any, i: number) => (
                    <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-black/5 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex-1 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-medium line-through">
                          {corr.original}
                        </div>
                        <ChevronRight className="h-5 w-5 text-primary/20 rotate-90 sm:rotate-0" />
                        <div className="flex-1 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-bold italic">
                          {corr.suggestion}
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-primary/60 uppercase tracking-tight italic flex items-center gap-2">
                        <Lightbulb className="h-3.5 w-3.5 text-accent" /> {corr.reason}
                      </p>
                    </div>
                  )) : (
                    <p className="text-center italic opacity-40">Nenhum erro crítico detectado pela Aurora.</p>
                  )}
                </CardContent>
              </Card>

              {/* COMPETÊNCIAS INDIVIDUAIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(result.competencies || {}).map(([key, comp]: any) => (
                  <Card key={key} className="border-none shadow-xl bg-white rounded-[2rem] p-8 group hover:border-accent/30 border-2 border-transparent transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase text-primary/40 tracking-widest">{COMPETENCY_LABELS[key]}</span>
                      <Badge className="bg-primary text-white font-black italic text-sm px-3">{comp.score} / 200</Badge>
                    </div>
                    <p className="text-sm text-primary/80 font-medium leading-relaxed italic">"{comp.feedback}"</p>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-center pt-4">
                <Button onClick={() => setResult(null)} variant="outline" className="rounded-2xl h-14 px-10 border-2 font-black uppercase text-xs text-primary">
                  Nova Sessão de Escrita
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* BARRA LATERAL (DIREITA) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* TEXTOS MOTIVADORES */}
          {!result && supportingTexts.length > 0 && (
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden animate-in slide-in-from-right-4">
              <CardHeader className="bg-accent/5 p-6 border-b">
                <CardTitle className="text-xs font-black text-primary uppercase flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-accent" /> Base de Referência
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6 max-h-[400px] overflow-y-auto">
                {supportingTexts.map((st) => (
                  <div key={st.id} className="space-y-2 p-5 bg-slate-50 rounded-2xl border border-black/5">
                    <p className="text-[9px] font-black text-primary/30 uppercase">Texto {st.id}</p>
                    <p className="text-xs font-medium italic text-primary/80 leading-relaxed">"{st.content}"</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase text-right mt-2">— {st.source}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CHECKLIST INEP */}
          <Card className="border-none shadow-xl bg-primary text-white rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <h3 className="font-black text-white italic uppercase tracking-widest text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Check-list INEP
              </h3>
              <div className="space-y-4 mt-6">
                {[
                  "Norma culta sem desvios.",
                  "Tese vinculada ao tema.",
                  "Dois repertórios externos.",
                  "Proposta com detalhamento."
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-[11px] font-bold italic opacity-80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* DICAS DA AURORA */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] px-4 flex items-center gap-2">
              <Lightbulb className="h-3 w-3 text-accent" /> Dicas da Mentoria
            </h3>
            {ESSAY_TIPS.map((tip, i) => (
              <Card key={i} className="border-none shadow-lg bg-white rounded-2xl p-5 hover:shadow-xl transition-all cursor-default">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl bg-slate-50 ${tip.color} group-hover:scale-110 transition-transform`}>
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

      {/* DASHBOARD DE EVOLUÇÃO (RODAPÉ) */}
      <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden p-10 md:p-16 mt-12 group">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl md:text-3xl font-black text-primary italic flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-accent" />
              Evolução Acadêmica
            </h3>
            <p className="text-muted-foreground font-medium italic">Acompanhe sua consistência e curva de aprendizado nas notas.</p>
          </div>
          <div className="flex gap-10">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Média</p>
              <p className="text-3xl font-black text-primary italic">785</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Última</p>
              <p className="text-3xl font-black text-accent italic">920</p>
            </div>
          </div>
        </div>
        
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockHistory}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} dy={15} />
              <YAxis domain={[0, 1000]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '1rem' }} 
                itemStyle={{ fontWeight: '900', fontStyle: 'italic', color: 'hsl(var(--primary))' }}
              />
              <Area type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={5} fillOpacity={1} fill="url(#colorScore)" dot={{ r: 8, fill: "hsl(var(--accent))", strokeWidth: 3, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-3 mt-12 text-[10px] font-black text-primary/20 uppercase tracking-[0.5em]">
          <History className="h-4 w-4" /> Log de Auditoria de Notas Sincronizado
        </div>
      </Card>
    </div>
  );
}
