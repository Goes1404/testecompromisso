
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Activity,
  BookOpen,
  History,
  Clock,
  Wifi,
  WifiOff
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CoordinatorDashboard() {
  const { profile, loading: isUserLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState({ db: 'checking', ai: 'checking' });
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    completionRate: 0,
    avgScore: 0
  });

  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setNetworkStatus({
        db: data.supabase?.status === 'ok' ? 'online' : 'offline',
        ai: data.genkit?.status === 'ok' ? 'online' : 'offline'
      });
    } catch (e) {
      setNetworkStatus({ db: 'offline', ai: 'offline' });
    }
  }

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      checkHealth();
      try {
        const { data: logData } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (logData) setLogs(logData);

        const { count: studentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .not('profile_type', 'in', '("teacher","admin")');

        const { count: teacherCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('profile_type', 'teacher');

        const { data: progressData } = await supabase
          .from('user_progress')
          .select('percentage');
        
        const avgCompletion = progressData && progressData.length > 0
          ? Math.round(progressData.reduce((acc, curr) => acc + curr.percentage, 0) / progressData.length)
          : 0;

        const { data: scoreData } = await supabase
          .from('simulation_attempts')
          .select('score, total_questions');
        
        const avgScore = scoreData && scoreData.length > 0
          ? (scoreData.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / scoreData.length) * 10
          : 0;

        setStats({
          totalStudents: studentCount || 0,
          totalTeachers: teacherCount || 0,
          completionRate: avgCompletion,
          avgScore: Number(avgScore.toFixed(1))
        });

      } catch (err) {
        console.error("Erro dashboard admin:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (isUserLoading || loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Auditoria Global...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-primary italic leading-none">Gestão 360</h1>
            <Badge className="bg-primary text-white border-none font-black text-[10px] px-3 shadow-lg">ADMIN</Badge>
          </div>
          <p className="text-muted-foreground font-medium text-sm md:text-lg italic">Inteligência de rede e auditoria em tempo real.</p>
        </div>
        <Button className="rounded-xl h-12 bg-accent text-accent-foreground font-black shadow-xl" asChild>
          <Link href="/dashboard/teacher/analytics">Relatório Global</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Alunos Ativos", value: stats.totalStudents, icon: Users, color: "text-blue-600", bg: "bg-blue-50", trend: "REDE" },
          { label: "Corpo Docente", value: stats.totalTeachers, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50", trend: "ATIVO" },
          { label: "Taxa Conclusão", value: `${stats.completionRate}%`, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", trend: "MÉDIA" },
          { label: "Média Global", value: stats.avgScore, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50", trend: "NOTAS" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-black text-[8px]">{stat.trend}</Badge>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-primary leading-none italic">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-xl font-black text-primary italic">Auditoria de Atividades</CardTitle>
            <CardDescription className="font-medium">Rastro industrial de ações dos gestores e mentores.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            {logs.length === 0 ? (
              <div className="py-10 text-center opacity-30 italic font-medium">Nenhuma atividade registrada no sistema.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white shadow-inner flex items-center justify-center font-black text-primary text-xs italic">{log.user_name?.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-bold text-primary italic leading-none group-hover:text-accent transition-colors">{log.action}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })} por {log.user_name}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-primary/5 text-primary text-[7px] font-black uppercase border-none">{log.entity_type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">Sinal da Rede</h3>
              <Activity className={`h-4 w-4 ${networkStatus.db === 'online' ? 'text-green-500 animate-pulse' : 'text-red-500'}`} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-primary/60 uppercase">Banco de Dados</span>
                <Badge variant="outline" className={`border-none ${networkStatus.db === 'online' ? 'text-green-600' : 'text-red-600'} uppercase text-[8px]`}>
                  {networkStatus.db === 'online' ? <Wifi className="h-2.5 w-2.5 mr-1" /> : <WifiOff className="h-2.5 w-2.5 mr-1" />}
                  {networkStatus.db.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-primary/60 uppercase">Aurora IA</span>
                <Badge variant="outline" className={`border-none ${networkStatus.ai === 'online' ? 'text-green-600' : 'text-red-600'} uppercase text-[8px]`}>
                  {networkStatus.ai === 'online' ? <Wifi className="h-2.5 w-2.5 mr-1" /> : <WifiOff className="h-2.5 w-2.5 mr-1" />}
                  {networkStatus.ai.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-primary/60 uppercase">Arquivamento</span>
                <span className="text-green-600 uppercase">SINCRONIZADO</span>
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
            <CardHeader className="pb-2 p-8 relative z-10">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-accent" />
                Alertas de Risco
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4 relative z-10">
              <div className="py-10 text-center border-2 border-dashed border-white/10 rounded-[2rem] opacity-40">
                <p className="text-[10px] font-bold italic">Nenhum risco crítico detectado no momento.</p>
              </div>
              <Button disabled className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-black text-[10px] uppercase shadow-lg">
                Central de Intervenção
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
