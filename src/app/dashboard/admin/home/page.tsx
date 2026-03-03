
"use client";

import { useState, useEffect, useCallback } from "react";
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
  WifiOff,
  Filter,
  Layers,
  ArrowUpRight,
  HandHeart,
  FileWarning,
  UserX,
  ZapOff
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { formatDistanceToNow, subDays, subMonths, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RiskAlert {
  id: string;
  type: 'inactivity' | 'documentation' | 'progress' | 'system';
  label: string;
  count: number;
  description: string;
  icon: any;
  color: string;
}

export default function CoordinatorDashboard() {
  const { profile, loading: isUserLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState({ db: 'checking', ai: 'checking' });
  const [logs, setLogs] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    startedTrails: 0,
    finishedTrails: 0,
    avgFinishedPerStudent: 0,
    eligibleStudents: 0
  });

  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const status = {
        db: data.supabase?.status === 'ok' ? 'online' : 'offline',
        ai: data.genkit?.status === 'ok' ? 'online' : 'offline'
      };
      setNetworkStatus(status);
      return status;
    } catch (e) {
      setNetworkStatus({ db: 'offline', ai: 'offline' });
      return { db: 'offline', ai: 'offline' };
    }
  }

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const health = await checkHealth();
    
    try {
      // 1. Buscar Perfis
      const { data: allProfiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, profile_type, name, last_access, is_financial_aid_eligible');
      
      let studentCount = 0;
      let teacherCount = 0;
      let eligibleCount = 0;
      let inactiveStudents = 0;

      if (!pErr && allProfiles) {
        const studentKeywords = ['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'];
        const sevenDaysAgo = subDays(new Date(), 7);
        
        const classified = allProfiles.map(p => {
          const type = (p.profile_type || '').toLowerCase().trim();
          const isStaff = !studentKeywords.some(key => type.includes(key)) && type !== '';
          
          if (!isStaff) {
            if (p.last_access && new Date(p.last_access) < sevenDaysAgo) {
              inactiveStudents++;
            }
          }
          
          return { ...p, isStaff };
        });

        studentCount = classified.filter(p => !p.isStaff).length;
        teacherCount = classified.filter(p => p.isStaff).length;
        eligibleCount = classified.filter(p => p.is_financial_aid_eligible === true).length;
      }

      // 2. Buscar Documentação
      const { data: checklists } = await supabase.from('student_checklists').select('user_id');
      const studentsWithDocs = new Set(checklists?.map(c => c.user_id) || []);
      const documentationRisk = studentCount - studentsWithDocs.size;

      // 3. Buscar Progresso
      const { data: progressData } = await supabase.from('user_progress').select('user_id, percentage, last_accessed');
      const stuckStudents = progressData?.filter(p => p.percentage < 20 && p.percentage > 0).length || 0;

      // 4. Montar Alertas de Risco
      const alerts: RiskAlert[] = [];
      
      if (health.db === 'offline' || health.ai === 'offline') {
        alerts.push({
          id: 'system',
          type: 'system',
          label: 'Sinal Instável',
          count: 1,
          description: 'Falha detectada nos serviços de infraestrutura.',
          icon: ZapOff,
          color: 'text-red-400'
        });
      }

      if (inactiveStudents > 0) {
        alerts.push({
          id: 'inactivity',
          type: 'inactivity',
          label: 'Inatividade Crítica',
          count: inactiveStudents,
          description: 'Alunos sem acesso há mais de 7 dias.',
          icon: UserX,
          color: 'text-orange-400'
        });
      }

      if (documentationRisk > 0) {
        alerts.push({
          id: 'docs',
          type: 'documentation',
          label: 'Vácuo Documental',
          count: documentationRisk,
          description: 'Estudantes sem nenhum item no checklist.',
          icon: FileWarning,
          color: 'text-amber-400'
        });
      }

      if (stuckStudents > 0) {
        alerts.push({
          id: 'progress',
          type: 'progress',
          label: 'Engajamento Baixo',
          count: stuckStudents,
          description: 'Alunos estagnados no início das trilhas.',
          icon: Activity,
          color: 'text-blue-400'
        });
      }

      setRiskAlerts(alerts);

      // Logs e Stats
      const { data: logData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (logData) setLogs(logData);

      let started = progressData?.length || 0;
      let finished = progressData?.filter(p => p.percentage === 100).length || 0;
      let avgFinished = studentCount > 0 ? Number((finished / studentCount).toFixed(2)) : 0;

      setStats({
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        startedTrails: started,
        finishedTrails: finished,
        avgFinishedPerStudent: avgFinished,
        eligibleStudents: eligibleCount
      });

    } catch (err) {
      console.error("[ADMIN DEBUG] Falha no carregamento:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isUserLoading || loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizando Auditoria Global...</p>
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
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[180px] h-12 rounded-xl bg-white border-none shadow-xl font-bold italic text-primary">
              <Filter className="h-4 w-4 mr-2 text-accent" />
              <SelectValue placeholder="Filtrar Período" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              <SelectItem value="all" className="font-bold">Todo o Período</SelectItem>
              <SelectItem value="week" className="font-bold">Última Semana</SelectItem>
              <SelectItem value="month" className="font-bold">Último Mês</SelectItem>
              <SelectItem value="year" className="font-bold">Último Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => fetchDashboardData()} variant="ghost" size="icon" className="rounded-xl h-12 w-12 bg-white shadow-xl">
            <Activity className={`h-5 w-5 text-accent ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Alunos Ativos */}
        <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shadow-sm group-hover:scale-110 transition-transform duration-500">
                <Users className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-black text-[8px]">REDE</Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-primary leading-none italic">{stats.totalStudents}</p>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Alunos Ativos</p>
            </div>
          </CardContent>
        </Card>

        {/* Corpo Docente */}
        <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 shadow-sm group-hover:scale-110 transition-transform duration-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-black text-[8px]">EQUIPE</Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-primary leading-none italic">{stats.totalTeachers}</p>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Corpo Docente</p>
            </div>
          </CardContent>
        </Card>

        {/* Trilhas Concluídas */}
        <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-green-50 text-green-600 shadow-sm group-hover:scale-110 transition-transform duration-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-none font-black text-[8px]">CONCLUÍDAS</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-3xl font-black text-primary leading-none italic">{stats.finishedTrails}</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Total de Trilhas Terminadas</p>
              </div>
              <div className="pt-2 border-t border-muted/10 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-black text-primary italic">{stats.startedTrails}</p>
                  <p className="text-[7px] font-bold text-muted-foreground uppercase">Iniciadas</p>
                </div>
                <div>
                  <p className="text-xs font-black text-green-600 italic">{stats.avgFinishedPerStudent}</p>
                  <p className="text-[7px] font-bold text-muted-foreground uppercase">Média / Aluno</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impacto Social */}
        <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-orange-50 text-orange-600 shadow-sm group-hover:scale-110 transition-transform duration-500">
                <HandHeart className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-none font-black text-[8px]">SOCIAL</Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-primary leading-none italic">{stats.eligibleStudents}</p>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Impacto Social (Isenções)</p>
            </div>
          </CardContent>
        </Card>
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
              {riskAlerts.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-white/10 rounded-[2rem] opacity-40">
                  <p className="text-[10px] font-bold italic">Nenhum risco crítico detectado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {riskAlerts.map((alert) => (
                    <div key={alert.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4 group hover:bg-white/10 transition-all">
                      <div className={`p-2.5 rounded-xl bg-white/10 ${alert.color} shadow-inner`}>
                        <alert.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-xs italic leading-none">{alert.label}</p>
                          <Badge className="h-4 px-1.5 bg-accent text-accent-foreground border-none font-black text-[8px]">{alert.count}</Badge>
                        </div>
                        <p className="text-[9px] font-medium text-white/50 mt-1 leading-tight">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button asChild className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-transform mt-2">
                <Link href="/dashboard/admin/checklists">Central de Intervenção</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
