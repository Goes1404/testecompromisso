
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  Loader2, 
  ClipboardCheck, 
  BrainCircuit,
  Activity,
  ArrowUpRight,
  History,
  FileDown
} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#1a2c4b", "#f59e0b", "#64748b", "#94a3b8", "#cbd5e1"];

const PerformanceChart = dynamic(
  () => import('recharts').then(({ BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid }) => {
    function Chart({ data }: { data: { name: string; performance: number }[] }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="performance" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} barSize={24}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return { default: Chart };
  }),
  { ssr: false }
);

const EngagementChart = dynamic(
  () => import('recharts').then(({ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => {
    function Chart({ data }: { data: { day: string; acessos: number }[] }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            />
            <Line
              type="monotone"
              dataKey="acessos"
              stroke="hsl(var(--accent))"
              strokeWidth={4}
              dot={{ r: 6, fill: "hsl(var(--accent))", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 8, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    return { default: Chart };
  }),
  { ssr: false }
);

export default function TeacherAnalyticsDashboard({ userId }: { userId?: string }) {
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const { toast } = useToast();
  const [data, setData] = useState({
    totalStudents: 0,
    avgScore: 0,
    completionRate: 0,
    performanceBySubject: [] as any[],
    engagementTrend: [] as any[]
  });

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        // 1. Total de alunos via profiles.profile_type = 'student'
        let realTotalStudents = 0;
        if (userId) {
          realTotalStudents = 1;
        } else {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('profile_type', 'student');
          realTotalStudents = count || 0;
        }

        // 2. Taxa de acerto — usa student_question_answers (simulation_attempts não existe nas migrations)
        let answerQuery = supabase.from('student_question_answers').select('is_correct');
        if (userId) answerQuery = answerQuery.eq('student_id', userId);
        const { data: answers } = await answerQuery;

        let realAvgScore = 0;
        if (answers && answers.length > 0) {
          const correct = answers.filter(a => a.is_correct).length;
          // Escala ENEM: 0–1000
          realAvgScore = Math.round((correct / answers.length) * 1000);
        }

        // 3. Taxa de conclusão de trilhas — user_progress.percentage
        let progressQuery = supabase.from('user_progress').select('percentage');
        if (userId) progressQuery = progressQuery.eq('user_id', userId);
        const { data: progress } = await progressQuery;

        let realAvgProg = 0;
        if (progress && progress.length > 0) {
          const total = progress.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
          realAvgProg = Math.round(total / progress.length);
        }

        // 4. Performance por matéria — student_question_answers → questions → subjects
        let subQuery = supabase
          .from('student_question_answers')
          .select('is_correct, question:questions!question_id(subject:subjects!subject_id(name))');
        if (userId) subQuery = subQuery.eq('student_id', userId);
        const { data: subAnswers } = await subQuery;

        const subjectMap: Record<string, { correct: number; total: number }> = {};
        (subAnswers as any[] ?? []).forEach((a) => {
          const name = a.question?.subject?.name || 'Geral';
          if (!subjectMap[name]) subjectMap[name] = { correct: 0, total: 0 };
          subjectMap[name].total += 1;
          if (a.is_correct) subjectMap[name].correct += 1;
        });

        const realPerformanceBySubject = Object.entries(subjectMap)
          .map(([name, s]) => ({
            name,
            performance: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
          }))
          .sort((a, b) => b.performance - a.performance)
          .slice(0, 5);

        // 5. Engajamento semanal — answered_at dos últimos 7 dias
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let trendQuery = supabase
          .from('student_question_answers')
          .select('answered_at')
          .gte('answered_at', weekAgo);
        if (userId) trendQuery = trendQuery.eq('student_id', userId);
        const { data: trendData } = await trendQuery;

        const daysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const dayMap: Record<string, number> = { "Seg": 0, "Ter": 0, "Qua": 0, "Qui": 0, "Sex": 0, "Sáb": 0, "Dom": 0 };
        (trendData ?? []).forEach((row: any) => {
          const d = daysShort[new Date(row.answered_at).getDay()];
          if (d in dayMap) dayMap[d]++;
        });
        const realEngagementTrend = Object.entries(dayMap).map(([day, acessos]) => ({ day, acessos }));

        const hasNoData = realTotalStudents === 0 && (answers?.length ?? 0) === 0;
        setIsDemo(hasNoData && !userId);

        if (hasNoData && !userId) {
          setData({
            totalStudents: 158,
            avgScore: 782,
            completionRate: 42,
            performanceBySubject: [
              { name: "Redação", performance: 88 },
              { name: "Linguagens", performance: 82 },
              { name: "Matemática", performance: 75 },
              { name: "Biologia", performance: 68 },
              { name: "Física", performance: 61 }
            ],
            engagementTrend: [
              { day: "Seg", acessos: 110 }, { day: "Ter", acessos: 145 },
              { day: "Qua", acessos: 168 }, { day: "Qui", acessos: 152 },
              { day: "Sex", acessos: 130 }, { day: "Sáb", acessos: 95 },
              { day: "Dom", acessos: 70 },
            ]
          });
        } else {
          setData({
            totalStudents: realTotalStudents,
            avgScore: realAvgScore,
            completionRate: realAvgProg,
            performanceBySubject: realPerformanceBySubject.length > 0
              ? realPerformanceBySubject
              : [{ name: "Geral", performance: 0 }],
            engagementTrend: realEngagementTrend,
          });
        }
      } catch (e) {
        console.error("Erro ao processar inteligência:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [userId]);

  const handleDownloadReport = () => {
    toast({
      title: "Gerando Relatório...",
      description: "Preparando diagnóstico industrial para impressão.",
    });
    
    // Pequeno delay para garantir que o toast apareça antes de travar a thread com o print dialog
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sintonizando Satélite Analítico...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 print:p-0 print:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:flex-row">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none print:text-2xl">Inteligência Pedagógica (BI)</h1>
          <p className="text-muted-foreground font-medium text-lg italic print:text-sm">Visão térmica de engajamento e performance acadêmica.</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          {isDemo && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-black px-4 py-2 flex items-center gap-2">
              MODO DEMONSTRAÇÃO
            </Badge>
          )}
          <Badge className="bg-accent/10 text-accent font-black px-4 py-2 border-none flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            DADOS EM TEMPO REAL
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        <Card className="border-none shadow-xl bg-primary text-white overflow-hidden rounded-[2.5rem] p-5 md:p-8 relative group print:rounded-2xl print:p-6 print:shadow-none print:border">
          <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 print:hidden" />
          <div className="flex items-center gap-4 md:gap-6 relative z-10">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg print:h-12 print:w-12">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-accent print:h-6 print:w-6" />
            </div>
            <div>
              <p className="text-3xl font-black italic print:text-xl">{data.totalStudents}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Alunos na Rede</p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem] p-5 md:p-8 group hover:shadow-2xl transition-all duration-500 print:rounded-2xl print:p-6 print:shadow-none print:border">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-accent/10 flex items-center justify-center shadow-inner group-hover:bg-accent group-hover:text-white transition-all print:h-12 print:w-12">
              <ClipboardCheck className="h-6 w-6 md:h-8 md:w-8 text-accent group-hover:text-white print:h-6 print:w-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-primary italic print:text-xl">{data.avgScore}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Média de Acertos</p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem] p-5 md:p-8 print:rounded-2xl print:p-6 print:shadow-none print:border">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-green-50 flex items-center justify-center print:h-12 print:w-12">
              <Activity className="h-6 w-6 md:h-8 md:w-8 text-green-600 print:h-6 print:w-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-primary italic print:text-xl">{data.completionRate}%</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Conclusão Trilhas</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden print:rounded-2xl print:shadow-none print:border">
          <CardHeader className="p-5 md:p-10 pb-0 print:p-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-black text-primary italic flex items-center gap-3 print:text-lg">
                <TrendingUp className="h-5 w-5 text-accent" />
                Performance por Matéria
              </CardTitle>
              <Badge className="bg-muted text-primary font-black text-[8px] px-3 print:hidden">SIMULADOS</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 md:p-10 print:p-6">
            <div className="h-[220px] md:h-[350px] w-full print:h-[250px]">
              <PerformanceChart data={data.performanceBySubject} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden print:rounded-2xl print:shadow-none print:border">
          <CardHeader className="p-5 md:p-10 pb-0 print:p-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-black text-primary italic flex items-center gap-3 print:text-lg">
                <Activity className="h-5 w-5 text-accent" />
                Engajamento Semanal
              </CardTitle>
              <span className="text-[10px] font-black text-green-600 uppercase print:hidden">Monitoramento Ativo</span>
            </div>
          </CardHeader>
          <CardContent className="p-5 md:p-10 print:p-6">
            <div className="h-[220px] md:h-[350px] w-full print:h-[250px]">
              <EngagementChart data={data.engagementTrend} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-1">
        <Card className="border-none shadow-2xl bg-accent text-accent-foreground rounded-[3rem] p-10 flex flex-col justify-center items-center text-center space-y-6 md:col-span-2 print:rounded-2xl print:p-8 print:border print:shadow-none">
          <div className="h-20 w-20 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl rotate-3 print:h-12 print:w-12">
            <BrainCircuit className="h-10 w-10 text-white print:h-6 print:w-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black italic tracking-tighter uppercase print:text-xl">Insights Aurora</h3>
            <p className="text-sm font-medium leading-relaxed opacity-80 max-w-2xl mx-auto print:text-xs">
              {isDemo ? (
                `"Em modo de demonstração, observamos um potencial de média de 782 pontos. A taxa de engajamento simulada de 42% sugere que as trilhas de Redação e Linguagens são as mais acessadas inicialmente pela rede."`
              ) : (
                `"Com base nos dados reais, a rede apresenta uma média de ${data.avgScore} pontos nos simulados. A taxa de conclusão de trilhas (${data.completionRate}%) indica ${data.completionRate > 50 ? 'alto' : 'moderado'} engajamento nos módulos publicados pelos mentores."`
              )}
            </p>
          </div>
          <button 
            onClick={handleDownloadReport}
            className="h-14 px-8 bg-primary text-white font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-none text-xs uppercase tracking-widest print:hidden"
          >
            Gerar Relatório Executivo <FileDown className="h-4 w-4" />
          </button>
        </Card>
      </div>
    </div>
  );
}
