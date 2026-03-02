
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
      if (!res.ok) throw new Error();
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
      await checkHealth();
      
      try {
        console.log("[ADMIN DEBUG] Iniciando Varredura de Rede...");

        const { data: allProfiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, profile_type, name, email');
        
        if (pErr) {
          console.error("[ADMIN DEBUG] Erro Supabase:", pErr.message);
        } else {
          // LÓGICA INDUSTRIAL: Definir quem é ALUNO. 
          // O resto (que não for vazio) é STAFF/DOCENTE.
          const studentKeywords = ['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'];
          
          const students = allProfiles?.filter(p => {
            const type = (p.profile_type || '').toLowerCase().trim();
            // Se o tipo contém palavras de aluno OU está vazio (default aluno), entra aqui
            return studentKeywords.some(key => type.includes(key)) || type === '';
          }) || [];

          const teachers = allProfiles?.filter(p => {
            const type = (p.profile_type || '').toLowerCase().trim();
            // Se NÃO é aluno e NÃO está vazio, é Corpo Docente/Staff
            const isNotStudent = !studentKeywords.some(key => type.includes(key));
            return isNotStudent && type !== '';
          }) || [];
          
          console.table(allProfiles?.map(p => ({
            Nome: p.name,
            Email: p.email,
            TipoOriginal: p.profile_type || "NULO",
            Classificacao: studentKeywords.some(key => (p.profile_type || '').toLowerCase().includes(key)) || (p.profile_type || '') === '' ? "ALUNO" : "DOCENTE/STAFF"
          })));
          
          setStats(prev => ({
            ...prev,
            totalStudents: students.length,
            totalTeachers: teachers.length
          }));
        }

        // 2. Logs de Atividade
        const { data: logData } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (logData) setLogs(logData);

        // 3. Taxa de Conclusão Média
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('percentage');
        
        if (progressData && progressData.length > 0) {
          const validProgress = progressData.filter(p => p.percentage !== null);
          const avgCompletion = validProgress.length > 0 
            ? Math.round(validProgress.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / validProgress.length)
            : 0;
          setStats(prev => ({ ...prev, completionRate: avgCompletion }));
        }

        // 4. Média Global de Simulados
        try {
          const { data: scoreData } = await supabase
            .from('simulation_attempts')
            .select('score, total_questions');
          
          if (scoreData && scoreData.length > 0) {
            const validAttempts = scoreData.filter(s => s.total_questions > 0);
            if (validAttempts.length > 0) {
              const sumGrades = validAttempts.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0);
              const avgScore = (sumGrades / validAttempts.length) * 10;
              setStats(prev => ({ ...prev, avgScore: Number(avgScore.toFixed(1)) }));
            }
          }
        } catch (e) {
          console.log("[ADMIN DEBUG] Dados de simulados ainda não disponíveis.");
        }

      } catch (err) {
        console.error("[ADMIN DEBUG] Falha no carregamento:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (isUserLoading || loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
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
          { label: "Corpo Docente", value: stats.totalTeachers, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50", trend: "EQUIPE" },
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
              <div className="py-10 text-center opacity-30 italic font-medium">Nenhuma atividade recente registrada.</div>
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
                <p className="text-[10px] font-bold italic">Nenhum risco crítico detectado.</p>
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
