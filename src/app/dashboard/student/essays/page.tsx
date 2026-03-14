
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
  Info
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
    title: "Conectivos", 
    desc: "Varie o início dos parágrafos.",
    icon: LinkIcon,
    color: "bg-blue-500/10 text-blue-600"
  },
  { 
    title: "Tese", 
    desc: "Deve ser clara na introdução.",
    icon: Target,
    color: "bg-orange-500/10 text-orange-600"
  }
];

const COMPETENCY_LABELS: Record<string, string> = {
  c1: "C1: Norma Culta",
  c2: "C2: Tema/Estrutura",
  c3: "C3: Argumentação",
  c4: "C4: Coesão",
  c5: "C5: Intervenção"
};

// DADOS DE DEMONSTRAÇÃO (FAKE EVALUATION)
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
    // SIMULAÇÃO DE TEMPO DE PROCESSAMENTO
    setTimeout(() => {
      setResult(DEMO_RESULT);
      setLoadingGrading(false);
      toast({ 
        title: "Avaliação Concluída! ✅", 
        description: "Diagnóstico gerado no Modo de Demonstração Aurora IA." 
      });
    }, 2500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-4 md:px-6">
      
      {/* HEADER DINÂMICO */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-primary italic tracking-tighter">
              Redação <span className="text-accent">Master</span>
            </h1>
            <Badge className="bg-primary text-white border-none font-black text-[10px] px-3 shadow-lg">MODO DEMONSTRAÇÃO</Badge>
          </div>
          <p className="text-muted-foreground font-medium text-sm md:text-lg italic">
            Escrita de alta performance com auditoria Aurora IA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost"
            onClick={() => { setCustomTheme(!customTheme); setTheme(""); setSupportingTexts([]); setResult(null); }}
            className={`rounded-xl h-12 px-6 font-black text-xs uppercase border-2 transition-all ${customTheme ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white border-muted/20 text-primary'}`}
          >
            {customTheme ? "Sair do Modo Manual" : "Tema Personalizado"}
          </Button>
          <Button 
            onClick={handleGenerateTopic} 
            disabled={loadingTopic || loadingGrading}
            className="rounded-xl h-12 bg-accent text-accent-foreground font-black px-8 shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase border-none"
          >
            {loadingTopic ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Tema ENEM
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA DE ESCRITA (8 COLUNAS) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-black/5">
            <CardHeader className="bg-slate-50/50 p-8 border-b border-dashed border-muted/30">
              {customTheme ? (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-primary/40 ml-2 tracking-widest">Sua Proposta de Tema</Label>
                  <Input 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Ex: A inteligência artificial na educação brasileira..."
                    className="h-14 rounded-2xl bg-white border-none shadow-inner font-bold italic text-lg"
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center gap-6">
                  <div className="space-y-2 flex-1 min-w-0">
                    <p className="text-[9px] font-black text-accent uppercase tracking-[0.3em] ml-1">Desafio Pedagógico</p>
                    <CardTitle className="text-xl md:text-2xl font-black text-primary italic leading-tight">
                      {theme || "Gere um tema ou inicie manualmente..."}
                    </CardTitle>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-muted/10 shadow-sm shrink-0 flex flex-col items-center">
                    <p className="text-[8px] font-black text-muted-foreground uppercase">Caracteres</p>
                    <p className="text-xl font-black text-primary italic">{charCount}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-0">
              <Textarea 
                placeholder="Inicie sua dissertação aqui. Lembre-se: Introdução, Desenvolvimento e Intervenção..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loadingGrading}
                className="min-h-[600px] border-none p-10 md:p-14 font-medium text-base md:text-lg leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent text-primary/90"
              />
              
              <div className="p-8 bg-slate-50/50 border-t border-muted/10 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 italic">Engine de Simulação Ativa</p>
                </div>
                <Button 
                  onClick={handleSubmitEssay} 
                  disabled={loadingGrading || !text || !theme}
                  className="bg-primary text-white font-black h-14 px-12 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm uppercase border-none w-full sm:w-auto"
                >
                  {loadingGrading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2 text-accent" />}
                  {loadingGrading ? "Simulando Auditoria..." : "Enviar para Auditoria Aurora"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DE AUDITORIA (4 COLUNAS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* RESULTADOS DA AURORA */}
          {result && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-700">
              {/* CARD DE NOTA */}
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2rem] overflow-hidden relative group">
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="p-8 relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <Badge className="bg-accent text-accent-foreground font-black text-[9px] px-3 py-1 uppercase rounded-full">RELATÓRIO FINAL</Badge>
                    <CheckCircle2 className="h-6 w-6 text-accent animate-bounce" />
                  </div>
                  <h2 className="text-7xl font-black italic tracking-tighter leading-none">{result.total_score}</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-4 border-t border-white/10 pt-4 leading-relaxed">
                    "{result.general_feedback}"
                  </p>
                </div>
              </Card>

              {/* COMPETÊNCIAS */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-3">Performance Pedagógica</h3>
                <div className="grid gap-3">
                  {Object.entries(result.competencies || {}).map(([key, comp]: any) => (
                    <Card key={key} className="border-none shadow-lg bg-white p-5 rounded-2xl hover:border-accent/30 transition-all border border-muted/10 group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase text-primary/60 tracking-wider">{COMPETENCY_LABELS[key]}</span>
                        <span className="text-sm font-black italic text-accent">{comp.score}</span>
                      </div>
                      <p className="text-[11px] text-primary/80 font-medium italic leading-relaxed">{comp.feedback}</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* RAIO-X GRAMATICAL */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-red-600/40 uppercase tracking-[0.2em] px-3">Raio-X de Desvios</h3>
                {result.detailed_corrections?.map((corr: any, i: number) => (
                  <Card key={i} className="p-5 border-none shadow-md bg-white rounded-2xl space-y-3 border-l-4 border-red-500">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-lg line-through decoration-2 w-fit">{corr.original}</span>
                      <span className="text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-black italic w-fit">{corr.suggestion}</span>
                    </div>
                    <p className="text-[10px] font-bold text-primary/60 italic leading-relaxed flex items-start gap-2">
                      <Lightbulb className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                      {corr.reason}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SUPORTE TEÓRICO (ESTÁTICO) */}
          <div className="space-y-6">
            
            {/* TEXTOS MOTIVADORES */}
            {!result && supportingTexts.length > 0 && (
              <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-right-4">
                <CardHeader className="bg-accent/5 p-6 border-b border-dashed border-accent/20">
                  <CardTitle className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3 italic">
                    <BookOpen className="h-5 w-5 text-accent" /> Base de Apoio ENEM
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {supportingTexts.map((st) => (
                    <div key={st.id} className="p-4 bg-slate-50/50 rounded-2xl border border-muted/20 hover:bg-white hover:shadow-md transition-all">
                      <p className="text-xs font-medium italic text-primary/80 leading-relaxed">"{st.content}"</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase text-right pt-2 opacity-60">Fonte: {st.source}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* CHECKLIST INEP */}
            <Card className="border-none shadow-xl bg-primary text-white rounded-[2rem] p-8 space-y-4 relative overflow-hidden group">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <h3 className="font-black italic uppercase tracking-widest text-xs">Exigências INEP</h3>
                </div>
                <div className="space-y-2">
                  {[
                    "Tese explícita no primeiro parágrafo.",
                    "Dois ou mais repertórios externos.",
                    "Intervenção com 5 elementos."
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      <span className="text-[10px] font-bold italic opacity-90">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* DICAS DA AURORA */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-3">Insights Mentoria</h3>
              {ESSAY_TIPS.map((tip, i) => (
                <Card key={i} className="border-none shadow-lg bg-white p-4 rounded-2xl hover:-translate-y-1 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl shrink-0 transition-all group-hover:scale-110 ${tip.color}`}>
                      <tip.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-primary italic leading-none">{tip.title}</p>
                      <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed mt-1">{tip.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* DASHBOARD DE EVOLUÇÃO (RODAPÉ) */}
        <Card className="lg:col-span-12 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden p-8 md:p-12 group relative ring-1 ring-black/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-3xl bg-accent/10 flex items-center justify-center text-accent shadow-inner rotate-3">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-primary italic tracking-tighter leading-none">
                  Evolução <span className="text-accent">Acadêmica</span>
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-2 opacity-60">Ciclo de Avaliação 2024</p>
              </div>
            </div>
            
            <div className="flex gap-10 bg-slate-50/80 backdrop-blur-sm p-6 rounded-[2rem] border border-muted/10 shadow-inner">
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Média Rede</p>
                <p className="text-3xl font-black text-primary italic leading-none">785</p>
              </div>
              <div className="w-px bg-muted/20" />
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Seu Pico</p>
                <p className="text-3xl font-black text-accent italic leading-none">920</p>
              </div>
            </div>
          </div>
          
          <div className="h-[250px] w-full relative z-10">
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
                  strokeWidth={5} 
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
    </div>
  );
}
