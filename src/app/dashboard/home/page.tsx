"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Library,
  Bot,
  Loader2,
  Megaphone,
  AlertOctagon,
  Info,
  TrendingUp,
  PlayCircle,
  Video,
  FileText,
  FileCheck,
  Calculator,
  BrainCircuit,
  Sparkles,
  Zap,
  FilePenLine,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Target,
  Clock,
  Star
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const logoUrl = "/images/logocompromisso.png";
const cityLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";

const localImagesFallback = [
  "/images/capa1.jpeg",
  "/images/carrosel1.jpeg",
  "/images/carrosel2.jpeg",
  "/images/carrosel3.jpeg",
  "/images/carrosel4.jpeg"
];

function getSafeImageUrl(url: string | null | undefined, index: number) {
  if (!url || url.includes("picsum.photos")) {
    return localImagesFallback[index % localImagesFallback.length];
  }
  return url;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

const priorityStyles: Record<'low' | 'medium' | 'high', { icon: any; color: string; bgColor: string; border: string; label: string }> = {
  low: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-50/50', border: 'border-blue-100', label: 'Informativo' },
  medium: { icon: Megaphone, color: 'text-amber-600', bgColor: 'bg-amber-50/50', border: 'border-amber-100', label: 'Importante' },
  high: { icon: AlertOctagon, color: 'text-red-600', bgColor: 'bg-red-50', border: 'border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-pulse-subtle', label: 'Urgente' },
};

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const CACHE_DURATION = 5 * 60 * 1000;
let dashboardCache: any = {
  data: null,
  timestamp: 0,
};

export default function DashboardHome() {
  const { user, profile, userRole, loading: isUserLoading } = useAuth();
  const router = useRouter();
  const dataFetchedRef = useRef(false);

  const [recommendedTrails, setRecommendedTrails] = useState<any[]>([]);
  const [libraryResources, setLibraryResources] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentProgress, setRecentProgress] = useState<any[]>([]);
  const [essayStats, setEssayStats] = useState<{ count: number; average: number; latest: any } | null>(null);
  const [examStats, setExamStats] = useState<{ totalAssessed: number; averageScore: number; history?: any[] } | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isUserLoading && userRole !== 'student') {
      if (userRole === 'admin') router.replace("/dashboard/admin/home");
      else if (userRole === 'teacher') router.replace("/dashboard/teacher/home");
    }
  }, [userRole, isUserLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user || dataFetchedRef.current) return;
    
    // 1. Tentar carregar do Cache Local para velocidade instantânea
    const cacheKey = `dash_cache_${user.id}`;
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          setAnnouncements(parsed.data.announcements);
          setRecommendedTrails(parsed.data.recommendedTrails);
          setRecentProgress(parsed.data.recentProgress);
          setLibraryResources(parsed.data.libraryResources);
          setEssayStats(parsed.data.essayStats);
          setExamStats(parsed.data.examStats);
          setLoadingData(false);
          
          // Se o cache for muito recente (menos de 60s), não precisamos buscar de novo
          if (Date.now() - parsed.timestamp < 60000) {
            dataFetchedRef.current = true;
            return;
          }
        }
      } catch (e) { console.error("Cache corrupto"); }
    }

    setLoadingData(true);
    dataFetchedRef.current = true;

    try {
      // Execução paralela de todas as queries principais para performance máxima
      const [annRes, trailRes, progressRes, libRes] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(4),
        supabase.from('trails').select('*').or('status.eq.active,status.eq.published').limit(3),
        supabase.from('user_progress').select(`*, trail:trails(title, category, image_url)`).eq('user_id', user.id).order('last_accessed', { ascending: false }).limit(4),
        supabase.from('library_resources').select('*').order('created_at', { ascending: false }).limit(3)
      ]);
      
      // Essay e Exam com tratamento individual de erro para não travar o restante
      const [essayRes, examRes] = await Promise.all([
        supabase.from('essay_submissions').select('score, status, theme, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).then(r => r),
        supabase.from('simulation_attempts').select('score, total_questions').eq('user_id', user.id).then(r => r)
      ]).catch(e => [ {data: []}, {data: []} ]);

      let essayData = essayRes?.data || [];
      let examData = examRes?.data || [];

      let newAnn = annRes?.data && annRes.data.length > 0 
        ? annRes.data 
        : [
            { id: '1', title: 'Simulado Geral ETEC/ENEM', message: 'O grande simulado presencial ocorrerá neste sábado às 08h.', priority: 'high' },
            { id: '2', title: 'Novas Apostilas de Biologia', message: 'Já estão disponíveis as novas apostilas de genética.', priority: 'medium' },
          ];
      
      setAnnouncements(newAnn as any);
      setRecommendedTrails(trailRes?.data || []);
      setRecentProgress(progressRes?.data ? (progressRes.data as any[]).filter((p: any) => p.trail) : []);
      setLibraryResources(libRes?.data || []);

      let newEssayStats = { count: 0, average: 0, latest: null as any };
      if (essayData.length > 0) {
        const scoredEssays = essayData.filter((e: any) => e.score !== null && e.score > 0);
        const avg = scoredEssays.length > 0 ? scoredEssays.reduce((acc: number, curr: any) => acc + Number(curr.score), 0) / scoredEssays.length : 0;
        newEssayStats = { count: essayData.length, average: Math.round(avg), latest: essayData[0] };
      }
      setEssayStats(newEssayStats);

      let newExamStats = { totalAssessed: 0, averageScore: 0, history: [] as any[] };
      if (examData.length > 0) {
        let totalScore = 0, totalMax = 0;
        const historyData = examData.map((ex: any, i: number) => {
          totalScore += Number(ex.score || 0);
          totalMax += Number(ex.total_questions || 0);
          return { name: `S${i + 1}`, score: Math.round(ex.total_questions ? (ex.score / ex.total_questions) * 100 : 0) };
        }).reverse();
        newExamStats = { totalAssessed: examData.length, averageScore: Math.round(totalMax > 0 ? (totalScore / totalMax) * 100 : 0), history: historyData };
      } else {
        newExamStats = { totalAssessed: 0, averageScore: 0, history: [{ name: "Jan", score: 40 }, { name: "Fev", score: 55 }, { name: "Mar", score: 85 }] };
      }
      setExamStats(newExamStats);

      const cacheData = {
        data: { 
          announcements: newAnn, 
          recommendedTrails: trailRes?.data || [], 
          recentProgress: progressRes?.data, 
          libraryResources: libRes?.data, 
          essayStats: newEssayStats, 
          examStats: newExamStats 
        },
        timestamp: Date.now()
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(`dash_cache_${user.id}`, JSON.stringify(cacheData));
      }

    } catch (e: any) {
      console.error("Dashboard data load error:", e);
    } finally {
      setLoadingData(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile && userRole === 'student') {
      fetchData();
    }
  }, [user, profile, userRole, fetchData]);

  if (isUserLoading || (loadingData && !dataFetchedRef.current)) return (
    <div className="flex flex-col h-[70vh] items-center justify-center gap-5">
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Carregando seu ambiente...</p>
    </div>
  );

  const nameToUse = profile?.name || user?.user_metadata?.full_name || '';
  const nameParts = nameToUse.trim().split(' ');
  const userName = nameParts.length > 1 
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` 
    : nameParts[0] || 'Estudante';
  const greeting = greetingByHour();

  const quickActions = [
    { label: "Checklist", icon: FileCheck, href: "/dashboard/student/documents", color: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/20" },
    { label: "Simulado", icon: BrainCircuit, href: "/dashboard/student/simulados", color: "from-violet-500 to-purple-600", shadow: "shadow-purple-500/20" },
    { label: "Isenção", icon: Calculator, href: "/dashboard/student/documents?tab=exemption", color: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
    { label: "Biblioteca", icon: Library, href: "/dashboard/library", color: "from-emerald-500 to-green-600", shadow: "shadow-green-500/20" },
  ];

  const score = examStats?.averageScore || 0;
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-700 px-3 md:px-0.5">

      {/* ── HERO BANNER ── */}
      <section className="relative rounded-3xl overflow-hidden bg-slate-900 min-h-[160px] md:min-h-[200px] flex items-end p-5 md:p-6 shadow-2xl">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] right-[-10%] w-[300px] md:w-[400px] h-[300px] md:h-[400px] bg-primary/25 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-30%] left-[-5%] w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-accent/15 rounded-full blur-[80px]" />
        </div>

        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 w-full">
          <div className="space-y-2 md:space-y-3">
            {/* Greeting chip */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{greeting}</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tighter">
              {userName}! <span className="text-primary italic">Pronto para hoje?</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              {profile?.exam_target || 'ENEM'} • {profile?.institution || 'Colégio Colaço'}
            </p>

            <p className="text-sm text-white/50 font-medium max-w-md leading-relaxed">
              Sua IA Aurora está monitorando seu progresso em tempo real. Continue de onde parou.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3 shrink-0">
            {[
              { label: "Acertos", value: examStats?.totalAssessed ? `${examStats.averageScore}%` : '–', icon: BrainCircuit, color: "text-accent" },
              { label: "Redação", value: essayStats?.count ? `${essayStats.average}pts` : '–', icon: FilePenLine, color: "text-green-400" },
              { label: "Trilhas", value: `${recentProgress.length}`, icon: PlayCircle, color: "text-yellow-400" },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2.5 bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 min-w-[110px]">
                <stat.icon className={`h-5 w-5 ${stat.color} shrink-0`} />
                <div>
                  <p className="font-black text-white text-base leading-none">{stat.value}</p>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.color} p-4 md:p-5 shadow-lg ${action.shadow} hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer`}>
              <div className="flex flex-col h-[76px] justify-between">
                <div>
                  <action.icon className="h-6 w-6 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex items-center justify-between w-full">
                  <p className="font-extrabold text-white uppercase text-[11px] tracking-wider">{action.label}</p>
                  <ChevronRight className="h-4 w-4 text-white/60 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── AURORA INSIGHT ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-accent/20 bg-gradient-to-r from-blue-50 via-indigo-50/20 to-white p-7 md:p-8 shadow-2xl group">
        <div className="absolute right-[-40px] top-[-40px] w-64 h-64 bg-accent/5 rounded-full blur-[80px] group-hover:bg-accent/10 transition-colors duration-1000" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          <div className="relative h-16 w-16 shrink-0 group-hover:scale-110 transition-transform duration-500">
            <div className="h-full w-full rounded-2xl bg-white shadow-xl flex items-center justify-center border border-accent/10">
              <Bot className="h-8 w-8 text-accent animate-pulse-subtle" />
            </div>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 translate-y-1 opacity-0 animate-in fade-in fill-mode-forwards duration-700">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Aurora IA · Mentoria Estratégica</span>
            </div>
            <p className="text-slate-700 font-semibold italic text-base leading-relaxed tracking-tight group-hover:text-black transition-colors">
              "A constância é a chave da aprovação! Revise os erros do último simulado antes de avançar. Estou disponível 24h para corrigir redações."
            </p>
          </div>
          <Button asChild className="bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 border-none hover:scale-105 hover:bg-primary-dark transition-all shrink-0 h-14 px-8 text-sm uppercase tracking-widest italic active:scale-95">
            <Link href="/dashboard/support" className="flex items-center gap-2">
              Falar com Aurora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — 2/3 width */}
        <div className="lg:col-span-2 space-y-6">

          {/* Trilhas em Progresso */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-black text-primary italic flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Por Onde Começar
              </h2>
              {recentProgress.length > 0 && (
                <Link href="/dashboard/trails" className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-primary transition-colors flex items-center gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            {loadingData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array(2).fill(0).map((_, i) => <div key={i} className="h-52 bg-muted/20 animate-pulse rounded-3xl" />)}
              </div>
            ) : recentProgress.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed border-muted/20 rounded-3xl bg-muted/5 flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                  <PlayCircle className="h-6 w-6 text-primary/30" />
                </div>
                <div>
                  <p className="font-black italic text-primary/60 text-sm">Nenhuma trilha iniciada</p>
                  <p className="text-xs text-muted-foreground mt-1">Explore o catálogo e comece sua jornada.</p>
                </div>
                <Button asChild size="sm" className="mt-1 bg-primary text-white border-none rounded-xl font-black h-9 px-5 text-xs">
                  <Link href="/dashboard/trails">Explorar Trilhas</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentProgress.map((prog, i) => {
                  const trailData = prog.trail;
                  return (
                    <Link key={prog.id} href={`/dashboard/classroom/${prog.trail_id}`}>
                      <div className="group overflow-hidden rounded-3xl shadow-xl bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border border-muted/10">
                        <div className="relative aspect-[16/7] overflow-hidden bg-slate-100">
                          <Image
                            src={getSafeImageUrl(trailData?.image_url, i)}
                            alt={trailData?.title || "Trilha"}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-primary/90 text-white border-none text-[9px] font-black uppercase px-2.5 h-5 backdrop-blur-sm">
                              {trailData?.category || 'Curso'}
                            </Badge>
                          </div>
                          <div className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                            <PlayCircle className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="p-4 space-y-2.5">
                          <h3 className="font-black text-sm text-primary italic truncate leading-tight">{trailData?.title || 'Trilha'}</h3>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Progresso</span>
                              <span className="text-[9px] font-black text-primary">{prog.percentage || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                                style={{ width: `${prog.percentage || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Anúncios */}
          {(!loadingData && announcements.length === 0) ? null : (
            <div>
              <h2 className="text-lg font-black text-primary italic flex items-center gap-2 px-1 mb-4">
                <div className="h-7 w-7 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Megaphone className="h-4 w-4 text-amber-600" />
                </div>
                Comunicados
              </h2>
              <div className="space-y-3">
                {loadingData ? (
                  Array(2).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-2xl" />)
                ) : (
                  announcements.map((ann: any) => {
                    const styles = priorityStyles[ann.priority as keyof typeof priorityStyles] || priorityStyles.low;
                    const Icon = styles.icon;
                    return (
                      <div key={ann.id} className={`p-4 rounded-2xl flex items-start gap-4 ${styles.bgColor} border ${styles.border} shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer`}>
                        {ann.priority === 'high' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-white shadow-sm border border-gray-100`}>
                          <Icon className={`h-5 w-5 ${styles.color}`} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${styles.border} ${styles.color}`}>{styles.label}</span>
                            <span className="text-[10px] font-bold text-slate-400">Público Geral</span>
                          </div>
                          <p className={`font-black text-sm text-slate-900 truncate`}>{ann.title}</p>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium mt-0.5 italic">{ann.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — 1/3 width */}
        <div className="space-y-5">

          {/* Taxa de Acertos — Data Viz */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-muted/20 p-5 md:p-6 space-y-4 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center shadow-inner">
                  <BrainCircuit className="h-4 w-4 text-violet-600" />
                </div>
                <h3 className="font-black text-sm text-primary italic">Taxa de Acertos</h3>
              </div>
              <Badge className="bg-violet-50 text-violet-600 border-none px-2 shadow-sm font-black">{score}%</Badge>
            </div>

            <div className="h-[120px] w-full" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
              {loadingData ? (
                <div className="h-full w-full bg-slate-50 animate-pulse rounded-2xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={examStats?.history || []} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--violet-500, 262 83% 58%))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--violet-500, 262 83% 58%))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <RechartsTooltip cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 2 }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--violet-500, 262 83% 58%))" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2 relative z-10">
              Evolução: {examStats?.totalAssessed || 0} Avaliações Computadas
            </p>

            <Button asChild className="w-full h-11 bg-primary text-white font-black rounded-2xl border-none shadow-lg text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform">
              <Link href="/dashboard/student/simulados">Banco de Questões</Link>
            </Button>
          </div>

          {/* Laboratório de Redação */}
          <div className="bg-white rounded-3xl shadow-xl border border-muted/20 p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-green-100 flex items-center justify-center">
                <FilePenLine className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="font-black text-sm text-primary italic">Lab. de Redação</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-4 text-center border border-slate-100">
                <span className="text-3xl font-black text-primary">{essayStats?.count || 0}</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Enviadas</p>
              </div>
              <div className="bg-gradient-to-br from-accent/5 to-primary/5 rounded-2xl p-4 text-center border border-accent/10">
                <span className="text-3xl font-black text-accent">{essayStats?.average || 0}</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Média pts</p>
              </div>
            </div>

            {essayStats?.latest ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-white border border-muted/20 flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-primary truncate italic">{essayStats.latest.theme}</p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mt-0.5">
                    {essayStats.latest.status === 'reviewed' ? '✅ Corrigida' : '⏳ Aguardando'}
                  </p>
                </div>
                {essayStats.latest.score && (
                  <div className="shrink-0 bg-white shadow border border-muted/20 px-2.5 py-1.5 rounded-xl">
                    <span className="font-black text-primary text-sm">{essayStats.latest.score}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center border-2 border-dashed rounded-2xl bg-slate-50 opacity-50">
                <p className="text-xs font-medium italic text-slate-400">Comece a escrever hoje!</p>
              </div>
            )}

            <Button asChild className="w-full h-11 bg-primary text-white font-black rounded-2xl border-none shadow-lg text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform">
              <Link href="/dashboard/student/essays">Acessar Laboratório</Link>
            </Button>
          </div>

          {/* Biblioteca */}
          <div className="bg-white rounded-3xl shadow-xl border border-muted/20 p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Library className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="font-black text-sm text-primary italic">Acervo & Apostilas</h3>
              </div>
              <Link href="/dashboard/library" className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-primary transition-colors">Ver tudo</Link>
            </div>

            <div className="space-y-2.5">
              {loadingData ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-muted/20 animate-pulse rounded-2xl" />)
              ) : libraryResources.length === 0 ? (
                <div className="py-8 text-center opacity-30 italic text-xs">Apostilas em sincronização...</div>
              ) : (
                libraryResources.map((res) => (
                  <Link key={res.id} href="/dashboard/library">
                    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 hover:shadow-md transition-all group cursor-pointer border border-transparent hover:border-muted/20">
                      <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/10 transition-colors">
                        {res.type === 'Video' ? <Video className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-primary truncate italic">{res.title}</h4>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-accent transition-colors shrink-0" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER DE PATROCÍNIO */}
      <footer className="mt-12 py-8 border-t border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4">
            <div className="relative h-10 w-10 shrink-0 bg-white rounded-xl shadow-md p-1.5 border border-slate-100 overflow-hidden">
              <Image src={cityLogoUrl} alt="Logo Prefeitura" fill className="object-contain" unoptimized />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Plataforma Educacional</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Patrocinada pela Prefeitura de Santana de Parnaíba</p>
            </div>
          </div>
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Compromisso • 2024</p>
        </div>
      </footer>
    </div>
  );
}
