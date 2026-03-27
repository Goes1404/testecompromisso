
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
  ZapOff,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles
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
import { formatDistanceToNow, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";

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
  const { profile, userRole, loading: isUserLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState({ db: 'checking', ai: 'checking' });
  const [logs, setLogs] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [showTeacherCode, setShowTeacherCode] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    startedTrails: 0,
    finishedTrails: 0,
    avgFinishedPerStudent: 0,
    eligibleStudents: 0
  });

  const TEACHER_CODE = "COMPROMISSO2024";

  useEffect(() => {
    if (!isUserLoading && userRole !== 'admin') {
      router.replace(userRole === 'teacher' ? "/dashboard/teacher/home" : "/dashboard/home");
    }
  }, [userRole, isUserLoading, router]);

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
      // 1. BUSCA DE PERFIS (ESTATÍSTICAS GERAIS)
      const { data: allProfiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, profile_type, name, last_access, is_financial_aid_eligible');
      
      let studentCount = 0;
      let teacherCount = 0;
      let eligibleCount = 0;
      let inactiveStudents = 0;

      const studentKeywords = ['etec', 'uni', 'enem', 'cpop', 'student', 'aluno'];
      const sevenDaysAgo = subDays(new Date(), 7);

      if (!pErr && allProfiles) {
        allProfiles.forEach(p => {
          const type = (p.profile_type || '').toLowerCase();
          const isStudent = studentKeywords.some(key => type.includes(key)) || type === '';
          
          if (isStudent) {
            studentCount++;
            if (p.is_financial_aid_eligible) eligibleCount++;
            if (!p.last_access || new Date(p.last_access) < sevenDaysAgo) inactiveStudents++;
          } else {
            teacherCount++;
          }
        });
      }

      // 2. BUSCA DE DOCUMENTAÇÃO (CHECKLISTS)
      const { data: checklists } = await supabase.from('student_checklists').select('user_id');
      const studentsWithDocs = new Set(checklists?.map(c => c.user_id) || []);
      const documentationRisk = Math.max(0, studentCount - studentsWithDocs.size);

      // 3. BUSCA DE PROGRESSO
      const { data: progressData } = await supabase.from('user_progress').select('user_id, percentage');
      const stuckStudents = progressData?.filter(p => p.percentage < 20 && p.percentage > 0).length || 0;

      // 4. MONTAR ALERTAS DE RISCO REAIS
      const alerts: RiskAlert[] = [];
      
      if (health.db === 'offline' || health.ai === 'offline') {
        alerts.push({
          id: 'system', type: 'system', label: 'Sinal Instável', count: 1,
          description: 'Falha detectada nos serviços de infraestrutura.',
          icon: ZapOff, color: 'text-red-400'
        });
      }

      if (inactiveStudents > 0) {
        alerts.push({
          id: 'inactivity', type: 'inactivity', label: 'Inatividade Crítica', count: inactiveStudents,
          description: 'Alunos sem acesso há mais de 7 dias.',
          icon: UserX, color: 'text-orange-400'
        });
      }

      if (documentationRisk > 0) {
        alerts.push({
          id: 'docs', type: 'documentation', label: 'Vácuo Documental', count: documentationRisk,
          description: 'Estudantes sem nenhum item no checklist.',
          icon: FileWarning, color: 'text-amber-400'
        });
      }

      if (stuckStudents > 0) {
        alerts.push({
          id: 'progress', type: 'progress', label: 'Engajamento Baixo', count: stuckStudents,
          description: 'Alunos estagnados no início das trilhas.',
          icon: Activity, color: 'text-blue-400'
        });
      }

      setRiskAlerts(alerts);

      // LOGS E STATS FINAIS
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
    if (userRole === 'admin') fetchDashboardData();
  }, [fetchDashboardData, userRole]);

  if (isUserLoading || loading || userRole !== 'admin') return (
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
            <h1 className="text-3xl md:text-4xl font-black text-primary italic leading-none uppercase tracking-tighter">Gabinete de Gestão</h1>
            <Badge className="bg-primary text-white border-none font-black text-[10px] px-4 py-1.5 shadow-xl uppercase tracking-widest">Coordenação</Badge>
          </div>
          <p className="text-muted-foreground font-medium text-sm md:text-lg italic">Visão estratégica e controle industrial de rede.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-white border-none shadow-xl font-bold italic text-primary">
              <Filter className="h-4 w-4 mr-2 text-accent" />
              <SelectValue placeholder="Filtrar Período" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              <SelectItem value="all" className="font-bold">Todo o Período</SelectItem>
              <SelectItem value="week" className="font-bold">Última Semana</SelectItem>
              <SelectItem value="month" className="font-bold">Último Mês</SelectItem>
              <SelectItem value="year" className="font-bold">Último Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => fetchDashboardData()} variant="ghost" size="icon" className="rounded-2xl h-12 w-12 bg-white shadow-xl">
            <Activity className={`h-5 w-5 text-accent ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* CARD DE CÓDIGO DOCENTE */}
      <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-l-[12px] border-accent animate-in zoom-in-95 duration-700">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-[2rem] bg-accent/10 flex items-center justify-center text-accent shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-primary italic leading-none">Segurança de Rede</h2>
            <p className="text-muted-foreground text-sm font-medium italic">Gerencie o código de entrada para novos Mentores/Professores.</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border-2 border-dashed border-primary/10 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-primary/40" />
              <p className="text-lg font-black tracking-[0.3em] font-mono text-primary">
                {showTeacherCode ? TEACHER_CODE : "••••••••••••••"}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowTeacherCode(!showTeacherCode)}
              className="h-10 w-10 rounded-full hover:bg-white"
            >
              {showTeacherCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-2">
            <Sparkles className="h-3 w-3" /> CÓDIGO ATIVO PARA NOVOS MENTORES
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Alunos Ativos */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 shadow-sm group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <Users className="h-7 w-7" />
              </div>
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-black text-[8px] tracking-widest px-3 py-1">REDE</Badge>
            </div>
            <div className="mt-6">
              <p className="text-4xl font-black text-primary leading-none italic">{stats.totalStudents}</p>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-3">Alunos na Base</p>
            </div>
          </CardContent>
        </Card>

        {/* Corpo Docente */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-purple-50 text-purple-600 shadow-sm group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <BookOpen className="h-7 w-7" />
              </div>
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-black text-[8px] tracking-widest px-3 py-1">EQUIPE</Badge>
            </div>
            <div className="mt-6">
              <p className="text-4xl font-black text-primary leading-none italic">{stats.totalTeachers}</p>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-3">Staff / Mentoria</p>
            </div>
          </CardContent>
        </Card>

        {/* Trilhas Concluídas */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-green-50 text-green-600 shadow-sm group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-none font-black text-[8px] tracking-widest px-3 py-1">SUCESSO</Badge>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-4xl font-black text-primary leading-none italic">{stats.finishedTrails}</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Trilhas Concluídas</p>
              </div>
              <div className="pt-3 border-t border-muted/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-black text-primary italic">{stats.startedTrails}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Engajados</p>
                </div>
                <div>
                  <p className="text-sm font-black text-green-600 italic">{stats.avgFinishedPerStudent}</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Média Geral</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Impacto Social */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-orange-50 text-orange-600 shadow-sm group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <HandHeart className="h-7 w-7" />
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-none font-black text-[8px] tracking-widest px-3 py-1">SOCIAL</Badge>
            </div>
            <div className="mt-6">
              <p className="text-4xl font-black text-primary leading-none italic">{stats.eligibleStudents}</p>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-3">Elegíveis Isenção</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
          <CardHeader className="p-10 pb-0">
            <CardTitle className="text-2xl font-black text-primary italic">Rastro Operacional</CardTitle>
            <CardDescription className="font-medium text-lg">Auditoria de atividades em tempo real.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 space-y-4">
            {logs.length === 0 ? (
              <div className="py-16 text-center opacity-30 italic font-medium border-2 border-dashed rounded-[2rem]">Nenhuma atividade recente registrada.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-white shadow-inner flex items-center justify-center font-black text-primary text-sm italic group-hover:bg-primary group-hover:text-white transition-all">{log.user_name?.charAt(0)}</div>
                    <div>
                      <p className="text-base font-bold text-primary italic leading-none group-hover:text-accent transition-colors">{log.action}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })} por {log.user_name}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-primary/5 text-primary text-[8px] font-black uppercase border-none px-3 py-1">{log.entity_type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-white rounded-[3rem] p-10 overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em]">Status de Sinal</h3>
              <Activity className={`h-5 w-5 ${networkStatus.db === 'online' ? 'text-green-500 animate-pulse' : 'text-red-500'}`} />
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-primary/60 uppercase tracking-widest">Banco de Dados</span>
                <Badge variant="outline" className={`border-none ${networkStatus.db === 'online' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} uppercase text-[9px] px-3 py-1 font-black`}>
                  {networkStatus.db === 'online' ? <Wifi className="h-3 w-3 mr-2" /> : <WifiOff className="h-3 w-3 mr-2" />}
                  {networkStatus.db.toUpperCase()}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-2xl bg-primary text-white rounded-[3rem] overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
            <CardHeader className="pb-2 p-10 relative z-10">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-accent">
                <AlertCircle className="h-5 w-5" />
                Alertas de Risco
              </CardTitle>
            </CardHeader>
            <CardContent className="px-10 pb-10 space-y-5 relative z-10">
              {riskAlerts.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-[2rem] opacity-40">
                  <p className="text-[10px] font-bold italic tracking-widest uppercase">Rede em Conformidade Total</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {riskAlerts.map((alert) => (
                    <div key={alert.id} className="p-5 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-start gap-5 group hover:bg-white/10 transition-all cursor-pointer">
                      <div className={`p-3 rounded-2xl bg-white/10 ${alert.color} shadow-inner`}>
                        <alert.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-black text-sm italic leading-none">{alert.label}</p>
                          <Badge className="h-5 px-2 bg-accent text-accent-foreground border-none font-black text-[9px]">{alert.count}</Badge>
                        </div>
                        <p className="text-[10px] font-medium text-white/50 mt-2 leading-relaxed">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button asChild className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-black text-xs uppercase shadow-xl hover:scale-105 transition-transform mt-4 border-none">
                <Link href="/dashboard/admin/checklists">Aplicar Intervenção</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
