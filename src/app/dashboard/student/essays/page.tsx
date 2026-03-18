
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
  History,
  Info,
  ShieldCheck,
  Star,
  FileSearch,
  MessageSquareQuote
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

const COMPETENCY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  c1: { label: "C1: Norma Culta", icon: PenTool, color: "text-blue-500" },
  c2: { label: "C2: Estrutura", icon: FileSearch, color: "text-purple-500" },
  c3: { label: "C3: Argumentação", icon: Target, color: "text-orange-500" },
  c4: { label: "C4: Coesão", icon: LinkIcon, color: "text-cyan-500" },
  c5: { label: "C5: Intervenção", icon: ShieldCheck, color: "text-green-500" }
};

const DEMO_RESULT = {
  total_score: 920,
  general_feedback: "Excelente trabalho! O seu texto demonstra uma ótima compreensão do tema e apresenta uma estrutura argumentativa muito sólida. Você articulou bem suas ideias e a proposta de intervenção é relevante e bem detalhada. Continue aprimorando pequenos detalhes de coesão para buscar a nota máxima.",
  competencies: {
    c1: { score: 160, feedback: "Demonstra excelente domínio formal, com raros desvios de pontuação." },
    c2: { score: 200, feedback: "Compreende perfeitamente a proposta e aplica conceitos de várias áreas (Bauman)." },
    c3: { score: 200, feedback: "A argumentação é consistente e bem defendida, com excelente seleção de fatos." },
    c4: { score: 180, feedback: "Uso eficaz de mecanismos de coesão, mas cuidado com a repetição da palavra 'visto que'." },
    c5: { score: 180, feedback: "A proposta de intervenção é muito boa, faltando apenas detalhar o meio de execução." }
  },
  detailed_corrections: [
    { original: "através da educação", suggestion: "por meio da educação", reason: "O termo 'através' indica atravessar. Para meios ou instrumentos, prefira 'por meio'." },
    { original: "fazem muitos anos", suggestion: "faz muitos anos", reason: "Verbo 'fazer' indicando tempo decorrido é impessoal e deve ficar no singular." }
  ],
  suggestions: [
    "Utilize conectivos mais diversificados no início dos parágrafos de desenvolvimento.",
    "Aprofunde o detalhamento do agente na proposta de intervenção."
  ]
};

export default function StudentEssayPage() {
  const { toast } = useToast();
  const [theme, setTheme] = useState("Os impactos da Inteligência Artificial na educação brasileira contemporânea");
  const [supportingTexts, setSupportingTexts] = useState<any[]>([
    { id: 1, content: "A inteligência artificial pode personalizar o ensino, mas levanta questões éticas sobre a autonomia do aluno.", source: "MEC 2024" },
    { id: 2, content: "O Brasil ocupa a 5ª posição no ranking de países que mais buscam ferramentas de IA para estudo.", source: "G1 Notícias" }
  ]);
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
        toast({ title: "Proposta ENEM Gerada!", description: "A Aurora carregou os textos motivadores." });
      } else {
        throw new Error(data.error || "Aurora temporariamente offline.");
      }
    } catch (e: any) {
      toast({ title: "Modo Simulação", description: "Carregando tema de exemplo para demonstração.", variant: "default" });
      setTheme("O desafio de democratizar o acesso à tecnologia no Brasil");
    } finally {
      setLoadingTopic(false);
    }
  };

  const handleSubmitEssay = async () => {
    if (text.length < 100) {
      toast({ title: "Texto Insuficiente", description: "Escreva ao menos 100 caracteres para a simulação.", variant: "destructive" });
      return;
    }

    setLoadingGrading(true);
    setTimeout(() => {
      setResult(DEMO_RESULT);
      setLoadingGrading(false);
      toast({ 
        title: "Avaliação Concluída! ✅", 
        description: "Diagnóstico gerado no Modo de Demonstração Aurora IA." 
      });
      // Scroll suave para os resultados
      setTimeout(() => {
        const resultSection = document.getElementById('audit-results');
        resultSection?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24 px-4 md:px-6">
      
      {/* HEADER DINÂMICO */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-black text-primary italic tracking-tighter uppercase leading-none">
              Redação <span className="text-accent">Master</span>
            </h1>
            <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest h-6">MODO DEMONSTRAÇÃO</Badge>
          </div>
          <p className="text-muted-foreground font-medium text-sm md:text-lg italic">
            Refine sua escrita com o motor de auditoria Aurora IA.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="ghost"
            onClick={() => { setCustomTheme(!customTheme); setTheme(""); setSupportingTexts([]); setResult(null); }}
            className={`rounded-xl h-12 px-6 font-black text-[10px] uppercase border-2 transition-all ${customTheme ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white border-muted/20 text-primary'}`}
          >
            {customTheme ? "Sair do Manual" : "Tema Personalizado"}
          </Button>
          <Button 
            onClick={handleGenerateTopic} 
            disabled={loadingTopic || loadingGrading}
            className="rounded-xl h-12 bg-accent text-accent-foreground font-black px-8 shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase border-none"
          >
            {loadingTopic ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Tema com IA
          </Button>
        </div>
      </div>

      {/* ÁREA DE ESCRITA - FULL WIDTH */}
      <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden ring-1 ring-black/5">
        <CardHeader className="bg-primary/5 p-8 md:p-12 border-b border-dashed border-primary/10">
          {customTheme ? (
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-primary/40 ml-2 tracking-widest flex items-center gap-2">
                <PenTool className="h-3 w-3" /> Sua Proposta de Tema
              </Label>
              <Input 
                value={theme} 
                onChange={(e) => setTheme(e.target.value)} 
                placeholder="Ex: A inteligência artificial na educação brasileira..."
                className="h-16 rounded-2xl bg-white border-none shadow-inner font-black italic text-xl md:text-2xl text-primary placeholder:opacity-30"
              />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">IA Sintonizada</p>
                </div>
                <CardTitle className="text-2xl md:text-4xl font-black text-primary italic leading-[1.1] uppercase tracking-tighter">
                  {theme || "Aguardando geração de tema..."}
                </CardTitle>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-muted/10 shadow-sm shrink-0 flex flex-col items-center min-w-[120px]">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contagem</p>
                <p className="text-3xl font-black text-primary italic leading-none mt-1">{charCount}</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Sinais</p>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <Textarea 
            placeholder="Inicie seu texto aqui... Desenvolva sua tese com clareza industrial."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loadingGrading}
            className="min-h-[500px] md:min-h-[650px] border-none p-10 md:p-20 font-medium text-lg md:text-2xl leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent text-primary/90 scrollbar-hide"
          />
          
          <div className="p-8 md:p-12 bg-slate-50/80 backdrop-blur-sm border-t border-muted/10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Segurança Pedagógica</p>
                <p className="text-sm font-bold italic text-primary/60">Análise baseada nos critérios INEP 2024</p>
              </div>
            </div>
            <Button 
              onClick={handleSubmitEssay} 
              disabled={loadingGrading || !text || !theme}
              className="bg-primary text-white font-black h-20 px-16 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(26,44,75,0.4)] hover:scale-105 active:scale-95 transition-all text-lg md:text-xl uppercase border-none group w-full md:w-auto"
            >
              {loadingGrading ? (
                <div className="flex items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>Sincronizando Auditoria...</span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span>Submeter para Aurora IA</span>
                  <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO DE RESULTADOS - ABAIXO DA REDAÇÃO */}
      {result && (
        <div id="audit-results" className="space-y-12 py-10 animate-in slide-in-from-bottom-10 duration-1000">
          <div className="flex items-center gap-4 px-2">
            <div className="h-1 w-12 bg-accent rounded-full" />
            <h2 className="text-3xl font-black text-primary italic uppercase tracking-tighter">Diagnóstico de Performance</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* CARD DE NOTA MESTRE */}
            <Card className="lg:col-span-4 border-none shadow-2xl bg-primary text-white rounded-[3rem] overflow-hidden relative group">
              <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-accent/20 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000" />
              <div className="p-12 relative z-10 space-y-8">
                <div className="flex justify-between items-center">
                  <Badge className="bg-accent text-accent-foreground font-black text-[10px] px-4 py-1.5 uppercase rounded-xl shadow-lg">RESULTADO FINAL</Badge>
                  <Star className="h-8 w-8 text-accent fill-accent animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Pontuação Maestro</p>
                  <h2 className="text-9xl font-black italic tracking-tighter leading-none mt-2 drop-shadow-2xl">{result.total_score}</h2>
                </div>
                <div className="pt-8 border-t border-white/10">
                  <p className="text-sm md:text-lg font-medium italic opacity-90 leading-relaxed text-white/80">
                    <MessageSquareQuote className="h-6 w-6 text-accent mb-3" />
                    "{result.general_feedback}"
                  </p>
                </div>
              </div>
            </Card>

            {/* GRID DE COMPETÊNCIAS */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(result.competencies || {}).map(([key, comp]: any) => {
                const info = COMPETENCY_LABELS[key];
                const Icon = info.icon;
                return (
                  <Card key={key} className="border-none shadow-xl bg-white p-8 rounded-[2.5rem] hover:shadow-2xl transition-all border-b-8 border-transparent hover:border-accent group">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl bg-slate-50 transition-all group-hover:scale-110 shadow-inner ${info.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Nota</p>
                        <p className="text-3xl font-black text-primary italic leading-none">{comp.score}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary/60">{info.label}</h4>
                      <p className="text-sm font-medium italic text-primary/80 leading-relaxed">{comp.feedback}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* RAIO-X DE DESVIOS E SUGESTÕES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
              <CardHeader className="bg-red-50/50 p-8 border-b border-dashed border-red-100">
                <CardTitle className="text-xl font-black text-red-600 italic uppercase flex items-center gap-3">
                  <AlertCircle className="h-6 w-6" /> Raio-X de Desvios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {result.detailed_corrections?.map((corr: any, i: number) => (
                  <div key={i} className="p-6 bg-slate-50 rounded-3xl space-y-4 border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                    <div className="flex flex-wrap gap-3 items-center">
                      <Badge className="bg-red-100 text-red-600 border-none font-black text-[10px] px-3 line-through opacity-60 decoration-2">{corr.original}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Badge className="bg-green-100 text-green-700 border-none font-black text-[10px] px-4 py-1.5 shadow-sm">{corr.suggestion}</Badge>
                    </div>
                    <p className="text-xs font-bold text-primary/60 italic leading-relaxed flex items-start gap-3">
                      <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      {corr.reason}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl rounded-[3rem] bg-primary text-white overflow-hidden">
              <CardHeader className="bg-white/5 p-8 border-b border-white/10">
                <CardTitle className="text-xl font-black italic uppercase flex items-center gap-3">
                  <Zap className="h-6 w-6 text-accent" /> Plano de Evolução
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {result.suggestions?.map((sug: string, i: number) => (
                  <div key={i} className="flex items-start gap-5 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <div className="h-8 w-8 rounded-xl bg-accent text-accent-foreground flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>
                    <p className="text-sm md:text-base font-medium italic leading-relaxed">{sug}</p>
                  </div>
                ))}
                <Button className="w-full h-16 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest mt-4">
                  Arquivar no Meu Histórico
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* BASE DE APOIO E HISTÓRICO - RODAPÉ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-10 border-t border-muted/20">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 px-2">
            <BookOpen className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-black text-primary italic uppercase tracking-widest">Base de Apoio ENEM</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!result && supportingTexts.map((st) => (
              <Card key={st.id} className="border-none shadow-xl bg-white p-8 rounded-[2.5rem] hover:-translate-y-1 transition-all group">
                <p className="text-sm font-medium italic text-primary/80 leading-relaxed">"{st.content}"</p>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-muted/10">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Fonte: {st.source}</span>
                  <Badge variant="outline" className="border-accent/30 text-accent font-black text-[7px] uppercase">Motivador</Badge>
                </div>
              </Card>
            ))}
            {result && (
              <Card className="col-span-full border-none shadow-xl bg-white p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8">
                <div className="h-20 w-20 rounded-[2rem] bg-accent/10 flex items-center justify-center shrink-0">
                  <History className="h-10 w-10 text-accent" />
                </div>
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-xl font-black text-primary italic uppercase">Foco na Próxima Escrita</h3>
                  <p className="text-sm font-medium text-muted-foreground italic">Seus textos motivadores e dicas foram arquivados. Continue treinando para atingir a nota 1000.</p>
                </div>
                <Button variant="outline" className="ml-auto rounded-xl h-12 border-primary/20 font-black text-[10px] uppercase">Nova Simulação</Button>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <TrendingUp className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-black text-primary italic uppercase tracking-widest">Evolução</h2>
          </div>
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHistory}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, 1000]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', padding: '1rem', backgroundColor: 'hsl(var(--primary))' }} 
                  itemStyle={{ fontWeight: '900', color: 'hsl(var(--accent))' }}
                />
                <Area type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
