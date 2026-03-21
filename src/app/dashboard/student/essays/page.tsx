"use client";

import { useState, useEffect, useCallback } from "react";
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
  ArrowRight,
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
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";

const COMPETENCY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  c1: { label: "C1: Norma Culta", icon: PenTool, color: "text-blue-500" },
  c2: { label: "C2: Estrutura", icon: FileSearch, color: "text-purple-500" },
  c3: { label: "C3: Argumentação", icon: Target, color: "text-orange-500" },
  c4: { label: "C4: Coesão", icon: LinkIcon, color: "text-cyan-500" },
  c5: { label: "C5: Intervenção", icon: ShieldCheck, color: "text-green-500" }
};

export default function StudentEssayPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState("Os impactos da Inteligência Artificial na educação brasileira contemporânea");
  const [supportingTexts, setSupportingTexts] = useState<any[]>([
    { id: 1, content: "A inteligência artificial pode personalizar o ensino, mas levanta questões éticas sobre a autonomia do aluno.", source: "MEC 2024" },
    { id: 2, content: "O Brasil ocupa a 5ª posição no ranking de países que mais buscam ferramentas de IA para estudo.", source: "G1 Notícias" },
    { id: 3, content: "A desigualdade digital no Brasil ainda é um entrave para a implementação plena de tecnologias educacionais.", source: "IBGE" }
  ]);
  const [customTheme, setCustomTheme] = useState(false);
  const [text, setText] = useState("");
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [loadingGrading, setLoadingGrading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [charCount, setCharCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('essay_submissions')
        .select('created_at, score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (data) {
        setHistory(data.map(d => ({
          date: format(new Date(d.created_at), 'dd/MM'),
          score: d.score
        })));
      }
    } catch (e) {
      console.warn("Histórico ainda em sincronização.");
    }
  }, [user]);

  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleGenerateTopic = async () => {
    setLoadingTopic(true);
    setResult(null);
    setCustomTheme(false);
    try {
      const res = await fetch('/api/essay-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setTheme(data.result.title);
        setSupportingTexts(data.result.supporting_texts || []);
        toast({ title: "Proposta ENEM Gerada!", description: "A Aurora carregou os textos motivadores." });
      } else {
        throw new Error(data.error || "IA falhou");
      }
    } catch (e: any) {
      toast({ title: "Base de Apoio", description: "Carregando tema de exemplo para foco." });
      setTheme("O desafio de democratizar o acesso à tecnologia no Brasil");
      setSupportingTexts([
        { id: 1, content: "O acesso à internet no Brasil ainda é desigual, afetando principalmente as áreas rurais e as classes D e E.", source: "TIC Domicílios" },
        { id: 2, content: "A educação mediada pela tecnologia exige infraestrutura e capacitação docente.", source: "Portal Educação" }
      ]);
    } finally {
      setLoadingTopic(false);
    }
  };

  const handleSubmitEssay = async () => {
    if (text.length < 100) {
      toast({ title: "Texto Insuficiente", description: "Escreva ao menos 100 caracteres.", variant: "destructive" });
      return;
    }

    setLoadingGrading(true);
    try {
      const res = await fetch('/api/essay-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, text })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        const aiOutput = data.result;
        setResult(aiOutput);
        
        // Salvar no Supabase para o gráfico de evolução
        if (user) {
          await supabase.from('essay_submissions').insert({
            user_id: user.id,
            theme: theme,
            content: text,
            score: aiOutput.total_score,
            feedback: aiOutput.general_feedback,
            result_data: aiOutput
          });
          fetchHistory();
        }

        toast({ title: "Avaliação Concluída! ✅" });
        setTimeout(() => {
          document.getElementById('audit-results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error(data.error || "IA offline");
      }
    } catch (e: any) {
      toast({ title: "Erro de Sincronização", description: "Houve uma oscilação na rede Aurora. Tente novamente.", variant: "destructive" });
    } finally {
      setLoadingGrading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700 pb-12 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-extrabold text-primary italic tracking-tighter uppercase leading-none">
              Redação <span className="text-accent">Master</span>
            </h1>
            <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest h-6">SINAL ATIVO</Badge>
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

      <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden ring-1 ring-black/5">
        <CardHeader className="bg-primary/5 p-6 md:p-8 border-b border-dashed border-primary/10">
          {customTheme ? (
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-primary/40 ml-2 tracking-widest flex items-center gap-2">
                <PenTool className="h-3 w-3" /> Sua Proposta de Tema
              </Label>
              <Input 
                value={theme} 
                onChange={(e) => setTheme(e.target.value)} 
                placeholder="Ex: A inteligência artificial na educação brasileira..."
                className="h-12 rounded-xl bg-white border-none shadow-inner font-bold italic text-lg md:text-xl text-primary placeholder:opacity-30"
              />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">IA Sintonizada</p>
                </div>
                <CardTitle className="text-xl md:text-3xl font-extrabold text-primary italic leading-[1.1] uppercase tracking-tighter">
                  {theme || "Aguardando geração de tema..."}
                </CardTitle>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-muted/10 shadow-sm shrink-0 flex flex-col items-center min-w-[120px]">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contagem</p>
                <p className="text-2xl font-black text-primary italic leading-none mt-1">{charCount}</p>
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
            className="min-h-[300px] md:min-h-[450px] border-none p-6 md:p-10 font-medium text-base md:text-lg leading-relaxed italic resize-none focus-visible:ring-0 bg-transparent text-primary/90 scrollbar-hide"
          />
          
          <div className="p-6 md:p-8 bg-slate-50/80 backdrop-blur-sm border-t border-muted/10 flex flex-col md:flex-row justify-between items-center gap-8">
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
              className="bg-primary text-white font-extrabold h-14 px-8 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all text-sm md:text-base uppercase border-none group w-full md:w-auto"
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

      {result && (
        <div id="audit-results" className="space-y-12 py-10 animate-in slide-in-from-bottom-10 duration-1000">
          <div className="flex items-center gap-4 px-2">
            <div className="h-1 w-12 bg-accent rounded-full" />
            <h2 className="text-3xl font-black text-primary italic uppercase tracking-tighter">Diagnóstico de Performance</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <Card className="lg:col-span-4 border-none shadow-2xl bg-primary text-white rounded-[2rem] overflow-hidden relative group">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000" />
              <div className="p-8 relative z-10 space-y-6">
                <div className="flex justify-between items-center">
                  <Badge className="bg-accent text-accent-foreground font-bold text-[10px] px-3 py-1 uppercase rounded-lg shadow-md">SINAL FINAL</Badge>
                  <Star className="h-6 w-6 text-accent fill-accent animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Pontuação Maestro</p>
                  <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none mt-2 drop-shadow-xl">{result.total_score}</h2>
                </div>
                <div className="pt-6 border-t border-white/10">
                  <p className="text-sm font-medium italic opacity-90 leading-relaxed text-white/80">
                    <MessageSquareQuote className="h-6 w-6 text-accent mb-3" />
                    "{result.general_feedback}"
                  </p>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(result.competencies || {}).map(([key, comp]: any) => {
                const info = COMPETENCY_LABELS[key];
                if (!info) return null;
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
              <CardHeader className="bg-red-50/50 p-8 border-b border-dashed border-red-100">
                <CardTitle className="text-xl font-black text-red-600 italic uppercase flex items-center gap-3">
                  <AlertCircle className="h-6 w-6" /> Raio-X de Desvios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {result.detailed_corrections?.length > 0 ? (
                  result.detailed_corrections.map((corr: any, i: number) => (
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
                  ))
                ) : (
                  <div className="py-10 text-center opacity-30 italic">Nenhum desvio gramatical detectado pela Aurora.</div>
                )}
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
                  Sincronizado no Meu Mural
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-10 border-t border-muted/20">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 px-2">
            <BookOpen className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-black text-primary italic uppercase tracking-widest">Base de Apoio ENEM</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {supportingTexts.map((st) => (
              <Card key={st.id} className="border-none shadow-xl bg-white p-8 rounded-[2.5rem] hover:-translate-y-1 transition-all group border-l-4 border-accent">
                <p className="text-sm font-medium italic text-primary/80 leading-relaxed">"{st.content}"</p>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-muted/10">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Fonte: {st.source}</span>
                  <Badge variant="outline" className="border-accent/30 text-accent font-black text-[7px] uppercase">Motivador</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <TrendingUp className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-black text-primary italic uppercase tracking-widest">Evolução</h2>
          </div>
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white p-8 h-[300px]">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
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
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 italic text-center">
                <History className="h-10 w-10 mb-2" />
                <p className="text-[10px] font-black uppercase">Aguardando primeira auditoria</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
