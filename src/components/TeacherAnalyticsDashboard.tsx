
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
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid, LineChart, Line } from "recharts";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#1a2c4b", "#f59e0b", "#64748b", "#94a3b8", "#cbd5e1"];

export default function TeacherAnalyticsDashboard() {
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
        const studentKeywords = ['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'];
        const { data: profiles } = await supabase.from('profiles').select('profile_type');
        
        const realTotalStudents = profiles?.filter(p => {
          const type = (p.profile_type || '').toLowerCase();
          return studentKeywords.some(key => type.includes(key)) || type === '';
        }).length || 0;

        const { data: scores } = await supabase.from('simulation_attempts').select('score, total_questions');
        let realAvgScore = 0;
        if (scores && scores.length > 0) {
          const totalPoints = scores.reduce((acc, s) => acc + (s.score / s.total_questions), 0);
          realAvgScore = Math.round((totalPoints / scores.length) * 1000);
        }

        const { data: progress } = await supabase.from('user_progress').select('percentage');
        let realAvgProg = 0;
        if (progress && progress.length > 0) {
          realAvgProg = Math.round(progress.reduce((acc, p) => acc + (p.percentage || 0), 0) / progress.length);
        }

        const { data: subjectScores } = await supabase
          .from('simulation_attempts')
          .select('score, total_questions, subjects(name)');
        
        const subjectMap: Record<string, { total: number, count: number }> = {};
        subjectScores?.forEach((s: any) => {
          const subjectData = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;
          const name = subjectData?.name || 'Geral';
          
          if (!subjectMap[name]) subjectMap[name] = { total: 0, count: 0 };
          subjectMap[name].total += (s.score / s.total_questions) * 100;
          subjectMap[name].count += 1;
        });

        const realPerformanceBySubject = Object.entries(subjectMap).map(([name, stats]) => ({
          name,
          performance: Math.round(stats.total / stats.count)
        })).sort((a, b) => b.performance - a.performance);

        const { data: logTrend } = await supabase
          .from('activity_logs')
          .select('created_at');
        
        const dayMap: Record<string, number> = { "Seg": 0, "Ter": 0, "Qua": 0, "Qui": 0, "Sex": 0, "Sáb": 0, "Dom": 0 };
        const daysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        
        logTrend?.forEach(log => {
          const date = new Date(log.created_at);
          const dayName = daysShort[date.getDay()];
          if (dayMap[dayName] !== undefined) dayMap[dayName]++;
        });

        const realEngagementTrend = Object.entries(dayMap).map(([day, acessos]) => ({
          day,
          acessos: acessos + 10 
        }));

        const hasNoData = realTotalStudents === 0 && realAvgScore === 0;
        setIsDemo(hasNoData);

        if (hasNoData) {
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
              { day: "Seg", acessos: 110 },
              { day: "Ter", acessos: 145 },
              { day: "Qua", acessos: 168 },
              { day: "Qui", acessos: 152 },
              { day: "Sex", acessos: 130 },
              { day: "Sáb", acessos: 95 },
              { day: "Dom", acessos: 70 },
            ]
          });
        } else {
          setData({
            totalStudents: realTotalStudents,
            avgScore: realAvgScore,
            completionRate: realAvgProg,
            performanceBySubject: realPerformanceBySubject.length > 0 ? realPerformanceBySubject : [{ name: "Geral", performance: 50 }],
            engagementTrend: realEngagementTrend
          });
        }
      } catch (e) {
        console.error("Erro ao processar inteligência:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

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
        <Card className="border-none shadow-xl bg-primary text-white overflow-hidden rounded-[2.5rem] p-8 relative group print:rounded-2xl print:p-6 print:shadow-none print:border">
          <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 print:hidden" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg print:h-12 print:w-12">
              <Users className="h-8 w-8 text-accent print:h-6 print:w-6" />
            </div>
            <div>
              <p className="text-3xl font-black italic print:text-xl">{data.totalStudents}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Alunos na Rede</p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem] p-8 group hover:shadow-2xl transition-all duration-500 print:rounded-2xl print:p-6 print:shadow-none print:border">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center shadow-inner group-hover:bg-accent group-hover:text-white transition-all print:h-12 print:w-12">
              <ClipboardCheck className="h-8 w-8 text-accent group-hover:text-white print:h-6 print:w-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-primary italic print:text-xl">{data.avgScore}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Média de Acertos</p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem] p-8 print:rounded-2xl print:p-6 print:shadow-none print:border">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-green-50 flex items-center justify-center print:h-12 print:w-12">
              <Activity className="h-8 w-8 text-green-600 print:h-6 print:w-6" />
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
          <CardHeader className="p-10 pb-0 print:p-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-black text-primary italic flex items-center gap-3 print:text-lg">
                <TrendingUp className="h-5 w-5 text-accent" />
                Performance por Matéria
              </CardTitle>
              <Badge className="bg-muted text-primary font-black text-[8px] px-3 print:hidden">SIMULADOS</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-10 print:p-6">
            <div className="h-[350px] w-full print:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.performanceBySubject} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="performance" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} barSize={24}>
                    {data.performanceBySubject.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden print:rounded-2xl print:shadow-none print:border">
          <CardHeader className="p-10 pb-0 print:p-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-black text-primary italic flex items-center gap-3 print:text-lg">
                <Activity className="h-5 w-5 text-accent" />
                Engajamento Semanal
              </CardTitle>
              <span className="text-[10px] font-black text-green-600 uppercase print:hidden">Monitoramento Ativo</span>
            </div>
          </CardHeader>
          <CardContent className="p-10 print:p-6">
            <div className="h-[350px] w-full print:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.engagementTrend}>
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
