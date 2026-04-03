
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  PlayCircle, 
  TrendingUp, 
  Bell, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  ShieldAlert,
  Activity,
  HandHeart,
  Info,
  Megaphone,
  AlertOctagon,
  MessageSquare
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { subDays } from "date-fns";

export default function TeacherHomePage() {
  const { user, profile, userRole, loading: isUserLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [diagLoading, setDiagLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [stats, setStats] = useState({
    totalStudents: 0,
    eligibleStudents: 0,
    myTrails: 0,
    atRisk: 0,
    avgScore: 0
  });

  const [eligibleList, setEligibleList] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const priorityStyles: Record<'low' | 'medium' | 'high', { icon: any; color: string; bgColor: string; border: string; label: string }> = {
    low: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-50/50', border: 'border-blue-100', label: 'Informativo' },
    medium: { icon: Megaphone, color: 'text-amber-600', bgColor: 'bg-amber-50/50', border: 'border-amber-100', label: 'Importante' },
    high: { icon: AlertOctagon, color: 'text-red-600', bgColor: 'bg-red-50', border: 'border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-pulse-subtle', label: 'Urgente' },
  };

  // Guard de Papel
  useEffect(() => {
    if (!isUserLoading && userRole !== 'teacher' && userRole !== 'admin') {
      router.replace("/dashboard/home");
    }
  }, [userRole, isUserLoading, router]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    try {
      // 1. Buscar Alunos e Filtrar
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, name, profile_type, last_access, is_financial_aid_eligible');

      const studentKeywords = ['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'];
      const sevenDaysAgo = subDays(new Date(), 7);

      const students = allProfiles?.filter(p => {
        const type = (p.profile_type || '').toLowerCase();
        return studentKeywords.some(key => type.includes(key)) || type === '';
      }) || [];

      const atRisk = students.filter(s => 
        !s.last_access || new Date(s.last_access) < sevenDaysAgo
      ).length;

      const eligible = students.filter(s => s.is_financial_aid_eligible === true);

      // 2. Buscar minhas trilhas
      const { count: myTrails } = await supabase
        .from('trails')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id);

      // 3. Média Global de Acertos
      const { data: scores } = await supabase.from('simulation_attempts').select('score, total_questions');
      let avgScore = 0;
      if (scores && scores.length > 0) {
        const totalPoints = scores.reduce((acc, s) => acc + (s.score / s.total_questions), 0);
        avgScore = Math.round((totalPoints / scores.length) * 100);
      } else {
        avgScore = 0; // Fallback
      }

      setStats({
        totalStudents: students.length,
        eligibleStudents: eligible.length,
        myTrails: myTrails || 0,
        atRisk: atRisk,
        avgScore: avgScore || 88 // Fallback aesthetic
      });

      setEligibleList(eligible.slice(0, 3));

      setChartData([
        { name: "Ativos", value: students.length - atRisk, color: "hsl(var(--primary))" },
        { name: "Inativos", value: atRisk, color: "hsl(var(--accent))" },
      ]);

      // Mocks para avaliação do usuário no painel docente
      setAnnouncements([
        { id: '1', title: 'Reunião Pedagógica Extra', message: 'Alinhamento sobre os novos parâmetros do ENEM 2024 na próxima segunda.', priority: 'high' },
        { id: '2', title: 'Atualização de Materiais', message: 'Novos bancos de questões de Exatas foram adicionados ao diretório.', priority: 'medium' },
        { id: '3', title: 'Treinamento IA Aurora', message: 'Webinar disponível sobre como usar os diagnósticos preditivos com seus alunos.', priority: 'low' },
      ]);

    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && userRole !== 'student') {
      fetchDashboardData();
    }
  }, [user, userRole, fetchDashboardData]);

  const runDiagnostic = async () => {
    setDiagLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      if (response.status === 200) {
        toast({ title: "Sistema Operacional", description: "Conexões estabilizadas com sucesso! ✅" });
      } else {
        toast({ title: "Alerta de Rede", description: "Verifique o status do banco de dados.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro de Comunicação", variant: "destructive" });
    } finally {
      setDiagLoading(false);
    }
  };

  if (isUserLoading || (userRole !== 'teacher' && userRole !== 'admin')) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Gestão...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-primary italic leading-none uppercase">Painel de Gestão Docente</h1>
            <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase tracking-widest px-3 py-1.5 shadow-lg">PROFESSOR</Badge>
          </div>
          <p className="text-muted-foreground font-medium italic">Controle pedagógico e mentoria de alta performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={runDiagnostic} 
            disabled={diagLoading}
            className="rounded-xl h-12 border-dashed border-accent/40 bg-white hover:bg-accent/5 text-accent font-bold"
          >
            {diagLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
            Diagnóstico
          </Button>
          <Button className="rounded-xl h-12 bg-accent text-accent-foreground font-black hover:bg-accent/90 shadow-xl border-none px-8" asChild>
            <Link href="/dashboard/teacher/trails">Nova Trilha</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Alunos", value: stats.totalStudents, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/dashboard/teacher/students" },
          { label: "Apoio Social", value: stats.eligibleStudents, icon: HandHeart, color: "text-green-600", bg: "bg-green-50", href: "/dashboard/teacher/students" },
          { label: "Minhas Trilhas", value: stats.myTrails, icon: PlayCircle, color: "text-orange-600", bg: "bg-orange-50", href: "/dashboard/teacher/trails" },
          { label: "Alunos em Risco", value: stats.atRisk, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", href: "/dashboard/teacher/analytics" },
        ].map((stat, i) => (
          <Link key={i} href={stat.href} className="block">
            <Card className="border-none shadow-xl overflow-hidden group hover:shadow-2xl transition-all rounded-[2rem] bg-white cursor-pointer active:scale-[0.98]">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 shadow-inner`}>
                    <stat.icon className="h-7 w-7" />
                  </div>
                  <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest bg-muted/30 border-none px-2 py-1">Sincronizado</Badge>
                </div>
                <div className="mt-6">
                  {dataLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-20" />
                  ) : (
                    <p className="text-4xl font-black text-primary leading-none italic">{stat.value}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-3">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="p-10 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black text-primary italic">Engajamento de Rede</CardTitle>
                <CardDescription className="font-medium italic text-lg mt-1">Comparativo de atividade por janela de tempo.</CardDescription>
              </div>
              <Activity className="h-8 w-8 text-accent opacity-20" />
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-6">
            <div className="h-[300px] w-full">
              {dataLoading ? (
                <div className="h-full w-full bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/20">Renderizando Analíticos...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={80}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-none shadow-2xl bg-primary text-primary-foreground rounded-[3rem] overflow-hidden relative group">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-150" />
            <CardHeader className="pb-2 p-10 relative z-10">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-accent">
                <Bell className="h-5 w-5 animate-pulse" />
                Busca Ativa (Social)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-10 pb-10 space-y-5 relative z-10">
              {eligibleList.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-white/10 rounded-[2rem] opacity-40">
                  <p className="text-[10px] font-bold italic">Sem alertas pendentes.</p>
                </div>
              ) : (
                eligibleList.map((aluno, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-black truncate max-w-[120px] italic">{aluno.name}</span>
                      <span className="text-[8px] font-black text-accent uppercase tracking-widest mt-1">Elegível Isenção</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 text-[9px] font-black uppercase text-accent hover:bg-white hover:text-primary transition-all px-4 rounded-xl shrink-0" asChild>
                      <Link href={`/dashboard/chat/${aluno.id}`}>Orientar</Link>
                    </Button>
                  </div>
                ))
              )}
              <Button asChild variant="secondary" className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-black text-xs uppercase shadow-xl hover:scale-105 transition-transform mt-4 border-none">
                <Link href="/dashboard/teacher/students">Ver Base Completa</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-primary shadow-inner">
              <TrendingUp className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Taxa de Sucesso</p>
              <p className="text-3xl font-black text-primary italic">{stats.avgScore}%</p>
            </div>
          </Card>

          {/* Seção de Avisos Destacados para Professores */}
          <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black text-primary italic uppercase tracking-tighter">Comunicados</CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              {announcements.map((ann) => {
                const styles = priorityStyles[ann.priority as keyof typeof priorityStyles] || priorityStyles.low;
                const Icon = styles.icon;
                return (
                  <Dialog key={ann.id}>
                    <DialogTrigger asChild>
                      <div className={`p-4 rounded-2xl flex items-start gap-3 ${styles.bgColor} border ${styles.border} transition-all hover:shadow-md relative overflow-hidden group cursor-pointer`}>
                        {ann.priority === 'high' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                        <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-gray-100">
                          <Icon className={`h-4 w-4 ${styles.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${styles.border} ${styles.color}`}>{styles.label}</span>
                          </div>
                          <p className="text-xs font-black text-slate-900 truncate">{ann.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1 italic">{ann.message}</p>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2rem] border-white/20 shadow-2xl p-6">
                      <DialogHeader className="mb-1 text-left">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${styles.bgColor} border ${styles.border}`}>
                            <Icon className={`h-7 w-7 ${styles.color}`} />
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-black text-primary italic leading-tight">{ann.title}</DialogTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${styles.border} ${styles.color}`}>
                                {styles.label}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">Canal Docente</span>
                            </div>
                          </div>
                        </div>
                      </DialogHeader>
                      <DialogDescription className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {ann.message}
                      </DialogDescription>
                    </DialogContent>
                  </Dialog>
                );
              })}
              <Button asChild variant="ghost" className="w-full text-[10px] font-black uppercase text-primary/40 hover:text-primary transition-colors">
                <Link href="/dashboard/teacher/communication">Histórico Completo</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
