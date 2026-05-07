"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Clock, 
  BrainCircuit, 
  CheckCircle2, 
  XCircle,
  Zap,
  Award,
  Sparkles,
  Calendar,
  ChevronRight,
  Loader2
} from "lucide-react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const RadarChartComponent = dynamic(
  () => import('recharts').then(({ Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip }) => {
    function Chart({ data }: { data: any[] }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Desempenho"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.5}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 'black', fontSize: '12px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      );
    }
    return { default: Chart };
  }),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-50/50 animate-pulse rounded-3xl" /> }
);

const LineChartComponent = dynamic(
  () => import('recharts').then(({ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area }) => {
    function Chart({ data }: { data: any[] }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" stroke="#888" fontSize={11} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 'black', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="acertos" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    return { default: Chart };
  }),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-50/50 animate-pulse rounded-3xl" /> }
);

export default function StudentPerformancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAnswered: 0,
    correctCount: 0,
    accuracy: 0,
    timeSpent: 0, // em segundos
    streak: 0
  });
  
  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Buscar todas as respostas do aluno
        const { data: answers, error } = await supabase
          .from('student_question_answers')
          .select(`
            *,
            questions (
              subjects (name)
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        if (answers && answers.length > 0) {
          const total = answers.length;
          const corrects = answers.filter(a => a.is_correct).length;
          
          // Calcular Radar Data (por matéria)
          const subjectsMap: Record<string, { total: number, corrects: number }> = {};
          answers.forEach(a => {
            const subject = a.questions?.subjects?.name || "Geral";
            if (!subjectsMap[subject]) subjectsMap[subject] = { total: 0, corrects: 0 };
            subjectsMap[subject].total++;
            if (a.is_correct) subjectsMap[subject].corrects++;
          });

          const radar = Object.entries(subjectsMap).map(([subject, data]) => ({
            subject,
            score: Math.round((data.corrects / data.total) * 100),
            fullMark: 100
          }));

          // Calcular Histórico (últimos 15 dias)
          const last15Days = Array.from({ length: 15 }, (_, i) => {
            const date = subDays(new Date(), i);
            return format(date, 'yyyy-MM-dd');
          }).reverse();

          const history = last15Days.map(dateStr => {
            const dayAnswers = answers.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === dateStr);
            return {
              date: format(new Date(dateStr), 'dd/MM'),
              acertos: dayAnswers.filter(a => a.is_correct).length,
              total: dayAnswers.length
            };
          });

          setStats({
            totalAnswered: total,
            correctCount: corrects,
            accuracy: Math.round((corrects / total) * 100),
            timeSpent: total * 45, // Simulado: 45s por questão
            streak: 5 // Mock
          });
          setSubjectData(radar);
          setHistoryData(history);
        }
      } catch (e) {
        console.error("Erro ao carregar performance:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-primary font-black italic uppercase tracking-widest animate-pulse">Sincronizando BI...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 md:px-0">
      {/* Header Estilizado */}
      <div className="aurora-dark dot-grid rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-[100px] animate-pulse" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl">
                <BarChart3 className="h-6 w-6 text-accent" />
              </div>
              <Badge className="bg-accent text-accent-foreground border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 shadow-xl">
                Analytics de Alta Performance
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white italic leading-none uppercase">
              Seu Centro de <span className="text-accent">Comando</span>
            </h1>
            <p className="text-white/60 font-medium italic text-lg max-w-xl">
              Dados reais sobre sua jornada rumo à aprovação. Refine seus pontos cegos.
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-2xl">
             <div className="text-right">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">SINAL DE EVOLUÇÃO</p>
                <p className="text-3xl font-black text-accent italic">{stats.accuracy}%</p>
             </div>
             <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin-slow" />
          </div>
        </div>
      </div>

      {/* Grid de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Questões Respondidas", value: stats.totalAnswered, icon: BrainCircuit, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Taxa de Acerto", value: `${stats.accuracy}%`, icon: Target, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Tempo de Estudo", value: `${Math.round(stats.timeSpent / 3600)}h`, icon: Clock, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Ofensiva (Dais)", value: stats.streak, icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <Card key={i} className="gradient-border border-none shadow-xl rounded-[2.5rem] bg-white group hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className={`h-12 w-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <Badge variant="ghost" className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Live</Badge>
              </div>
              <p className="text-4xl font-black text-primary italic">{stat.value}</p>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-2">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-7 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden gradient-border">
          <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black text-primary italic">Mapa de Competências</CardTitle>
              <CardDescription className="font-medium italic">Distribuição de acertos por eixo temático.</CardDescription>
            </div>
            <Award className="h-8 w-8 text-accent opacity-20" />
          </CardHeader>
          <CardContent className="p-10 pt-6 h-[450px]">
            {subjectData.length > 0 ? (
              <RadarChartComponent data={subjectData} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                <p>Responda mais questões para gerar seu mapa.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-5 space-y-8">
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden h-full">
            <CardHeader className="p-10 pb-0">
              <CardTitle className="text-2xl font-black text-primary italic">Atividade Diária</CardTitle>
              <CardDescription className="font-medium italic">Volume de acertos nos últimos 15 dias.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-6 h-[300px]">
              <LineChartComponent data={historyData} />
            </CardContent>
          </Card>

          <Card className="gradient-border border-none shadow-2xl bg-primary text-white rounded-[2.5rem] p-8 overflow-hidden relative group">
             <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-accent/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
             <div className="relative z-10 flex items-center gap-6">
                <div className="h-16 w-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl">
                  <Sparkles className="h-8 w-8 text-accent animate-pulse" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-accent">Análise Aurora</p>
                   <p className="text-sm font-bold italic leading-relaxed">"Seu desempenho em Linguagens cresceu 15% esta semana. Foque em Natureza para equilibrar sua média TRI."</p>
                </div>
             </div>
          </Card>
        </div>
      </div>

      {/* Lista de Matérias Detalhada */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-primary italic px-2 uppercase tracking-tighter">Detalhamento por Área</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectData.map((item, idx) => (
            <Card key={idx} className="border-none shadow-lg bg-white rounded-3xl p-6 hover:shadow-xl transition-all border-b-4 border-transparent hover:border-accent">
               <div className="flex justify-between items-center mb-4">
                  <p className="font-black italic text-primary">{item.subject}</p>
                  <Badge className="bg-slate-50 text-primary border-none font-bold text-[10px]">{item.score}%</Badge>
               </div>
               <Progress value={item.score} className="h-2 rounded-full" />
               <div className="flex justify-between mt-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Iniciante</span>
                  <span className="text-accent">Maestro</span>
               </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
