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
          .eq('student_id', user.id);

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
            const dayAnswers = answers.filter(a => format(new Date(a.answered_at), 'yyyy-MM-dd') === dateStr);
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
    <div className="space-y-4 md:space-y-7 animate-in fade-in duration-500 pb-8 px-1 md:px-0">

      {/* ── HERO — compact on mobile ── */}
      <div className="aurora-dark dot-grid rounded-2xl md:rounded-[3rem] p-5 md:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-accent/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <Badge className="bg-accent text-accent-foreground border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                Meu Desempenho
              </Badge>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-white italic leading-tight">
              Centro de <span className="text-accent">Comando</span>
            </h1>
            <p className="text-white/50 text-xs font-medium italic">
              Dados reais sobre sua jornada. Refine seus pontos cegos.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl self-start md:self-auto">
            <div>
              <p className="text-[9px] font-black text-white/65 uppercase tracking-widest">Taxa de Acerto</p>
              <p className="text-3xl font-black text-accent italic leading-none">{stats.accuracy}%</p>
            </div>
            <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin-slow shrink-0" />
          </div>
        </div>
      </div>

      {/* ── KPI CARDS — 2×2 on mobile ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {[
          { label: "Questões",     value: stats.totalAnswered,                      icon: BrainCircuit, color: "text-blue-500",   bg: "bg-blue-50" },
          { label: "Taxa de Acerto", value: `${stats.accuracy}%`,                   icon: Target,       color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Tempo Estudo", value: `${Math.round(stats.timeSpent / 3600)}h`, icon: Clock,        color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Sequência",    value: `${stats.streak}d`,                       icon: Zap,          color: "text-amber-500",  bg: "bg-amber-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 md:p-6 shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-2xl md:text-3xl font-black text-slate-900 italic leading-none">{stat.value}</p>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

        {/* Radar chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl md:rounded-[2.5rem] shadow-md border border-slate-100 overflow-hidden">
          <div className="p-4 md:p-8 pb-2 flex items-center justify-between">
            <div>
              <h2 className="font-black text-base md:text-xl text-slate-900 italic">Mapa de Competências</h2>
              <p className="text-xs text-slate-400 italic mt-0.5">Distribuição de acertos por área.</p>
            </div>
            <Award className="h-6 w-6 text-accent/30" />
          </div>
          <div className="p-4 md:p-8 pt-2 h-[260px] md:h-[400px]">
            {subjectData.length > 0 ? (
              <RadarChartComponent data={subjectData} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 italic text-sm">
                <p>Responda questões para gerar seu mapa.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Line chart */}
          <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-md border border-slate-100 overflow-hidden">
            <div className="p-4 md:p-8 pb-2">
              <h2 className="font-black text-base text-slate-900 italic">Atividade Diária</h2>
              <p className="text-xs text-slate-400 italic mt-0.5">Acertos nos últimos 15 dias.</p>
            </div>
            <div className="p-4 md:p-8 pt-2 h-[200px] md:h-[260px]">
              <LineChartComponent data={historyData} />
            </div>
          </div>

          {/* Aurora tip */}
          <div className="bg-primary rounded-2xl md:rounded-[2rem] p-4 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-1">Aurora IA</p>
                <p className="text-xs font-semibold italic text-white/80 leading-relaxed">
                  "Seu desempenho em Linguagens cresceu 15% esta semana. Foque em Natureza para equilibrar sua média TRI."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUBJECT BREAKDOWN ── */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-slate-900 italic px-1 uppercase tracking-tighter">Detalhamento por Área</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {subjectData.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 md:p-5 shadow-md border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex justify-between items-center mb-3">
                <p className="font-black text-sm italic text-slate-900">{item.subject}</p>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.score >= 70 ? 'bg-green-50 text-green-600' : item.score >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                  {item.score}%
                </span>
              </div>
              <Progress value={item.score} className="h-1.5 rounded-full" />
              <div className="flex justify-between mt-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Iniciante</span>
                <span className="text-accent">Maestro</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
