
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
  ArrowUpRight,
  Zap,
  Database,
  ShieldCheck,
  History,
  Clock
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const engagementData = [
  { name: "Seg", acessos: 120, quizzes: 45 },
  { name: "Ter", acessos: 150, quizzes: 52 },
  { name: "Qua", acessos: 180, quizzes: 61 },
  { name: "Qui", acessos: 140, quizzes: 48 },
  { name: "Sex", acessos: 160, quizzes: 55 },
  { name: "Sáb", acessos: 90, quizzes: 20 },
  { name: "Dom", acessos: 70, quizzes: 15 },
];

export default function CoordinatorDashboard() {
  const { profile, loading: isUserLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 1250,
    totalTeachers: 42,
    completionRate: 82,
    avgScore: 8.7
  });

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error) setLogs(data || []);
      setLoading(false);
    }
    fetchLogs();
  }, []);

  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    try {
      const { data: trail, error: tError } = await supabase.from('trails').insert([{
        title: "Redação Master: Rumo ao 1000",
        category: "Linguagens",
        description: "Domine a estrutura do texto dissertativo-argumentativo padrão ENEM.",
        image_url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800",
        teacher_name: "Prof. Ana Lúcia",
        status: "published",
        target_audience: "all"
      }]).select().single();

      if (tError) throw tError;

      toast({ title: "Dados de Demonstração Criados!", description: "As trilhas funcionais já estão disponíveis." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar dados", description: e.message, variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  if (isUserLoading || loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Auditoria...</p>
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
          <Button onClick={handleSeedDemoData} disabled={isSeeding} variant="outline" className="rounded-xl h-12 border-dashed border-accent/40 bg-white hover:bg-accent/5 text-accent">
            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />} Gerar Trilhas Demo
          </Button>
          <Button className="rounded-xl h-12 bg-accent text-accent-foreground font-black shadow-xl" asChild>
            <Link href="/dashboard/teacher/analytics">Relatório Global</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Alunos Ativos", value: stats.totalStudents, icon: Users, color: "text-blue-600", bg: "bg-blue-50", trend: "+12%" },
          { label: "Corpo Docente", value: stats.totalTeachers, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50", trend: "+2" },
          { label: "Taxa Conclusão", value: `${stats.completionRate}%`, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", trend: "+5%" },
          { label: "Média Global", value: stats.avgScore, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50", trend: "+0.3" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-none font-black text-[10px]">{stat.trend}</Badge>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-primary italic">Auditoria de Atividades</CardTitle>
                <CardDescription className="font-medium">Rastro industrial de ações dos gestores e mentores.</CardDescription>
              </div>
              <History className="h-6 w-6 text-accent opacity-20" />
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            {logs.length === 0 ? (
              <div className="py-10 text-center opacity-30 italic font-medium">Nenhuma atividade registrada hoje.</div>
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
            <Button variant="ghost" className="w-full text-[10px] font-black uppercase text-accent hover:bg-accent/5 tracking-widest mt-4">
              Ver Log Completo de Auditoria <ArrowUpRight className="h-3 w-3 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
            <CardHeader className="pb-2 p-8">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-accent" />
                Alertas de Risco
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
              {[
                { name: 'Ana Beatriz', reason: 'Inativa há 10 dias', severity: 'high' },
                { name: 'Julia Costa', reason: 'Evasão Detectada', severity: 'high' },
              ].map((alerta, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all cursor-pointer group">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-black truncate italic group-hover:text-accent transition-colors">{alerta.name}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${alerta.severity === 'high' ? 'text-red-400' : 'text-accent'}`}>{alerta.reason}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/40 hover:text-white" asChild>
                    <Link href="/dashboard/admin/students"><ArrowUpRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              ))}
              <Button className="w-full h-12 rounded-xl bg-accent text-accent-foreground font-black text-[10px] uppercase shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform">
                Central de Intervenção
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">Sinal da Rede</h3>
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-primary/60 uppercase">Banco de Dados</span>
                <span className="text-green-600 uppercase">Online</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-primary/60 uppercase">Aurora IA</span>
                <span className="text-green-600 uppercase">Ativa</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-primary/60 uppercase">Arquivamento</span>
                <span className="text-green-600 uppercase">Sincronizado</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
