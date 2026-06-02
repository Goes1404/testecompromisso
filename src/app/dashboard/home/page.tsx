"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Library, Bot, Loader2, Megaphone, AlertOctagon, Info,
  TrendingUp, PlayCircle, Video, FileText, FileCheck,
  Calculator, BrainCircuit, FilePenLine,
  ArrowRight, ChevronRight, BookOpen, Phone, Check,
  ClipboardCheck, KeyRound, CheckCircle2, ShieldAlert,
  AlertTriangle, GraduationCap, Scroll, BarChart3,
  XCircle, ChevronDown, ListChecks
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import { AreaChartPremium } from "@/components/charts/premium";
import {
  SIMULADO_GABARITO,
  SIMULADO_GABARITO_CHAVE,
  SIMULADO_GABARITO_TITULO,
  SIMULADO_GABARITO_TOTAL,
} from "@/lib/gabarito-simulado";

const GamificationWidget = dynamic(
  () => import('@/components/GamificationWidget').then(m => ({ default: m.GamificationWidget })),
  { ssr: false, loading: () => <div className="h-40 rounded-[2rem] bg-muted/20 animate-pulse" /> }
);
const UpcomingEventsWidget = dynamic(
  () => import('@/components/UpcomingEventsWidget').then(m => ({ default: m.UpcomingEventsWidget })),
  { ssr: false, loading: () => <div className="h-32 rounded-[2rem] bg-muted/20 animate-pulse" /> }
);
const StudySuggestionWidget = dynamic(
  () => import('@/components/StudySuggestionWidget').then(m => ({ default: m.StudySuggestionWidget })),
  { ssr: false, loading: () => <div className="h-24 rounded-[2rem] bg-muted/20 animate-pulse" /> }
);
const StreakWidget = dynamic(
  () => import('@/components/StreakWidget').then(m => ({ default: m.StreakWidget })),
  { ssr: false, loading: () => <div className="h-32 rounded-[2.5rem] bg-muted/20 animate-pulse" /> }
);
const GoalsWidget = dynamic(
  () => import('@/components/GoalsWidget').then(m => ({ default: m.GoalsWidget })),
  { ssr: false, loading: () => <div className="h-44 rounded-[2.5rem] bg-muted/20 animate-pulse" /> }
);
const JournalWidget = dynamic(
  () => import('@/components/JournalWidget').then(m => ({ default: m.JournalWidget })),
  { ssr: false, loading: () => <div className="h-40 rounded-[2.5rem] bg-muted/20 animate-pulse" /> }
);
const WeeklySummaryWidget = dynamic(
  () => import('@/components/WeeklySummaryWidget').then(m => ({ default: m.WeeklySummaryWidget })),
  { ssr: false, loading: () => <div className="h-48 rounded-[2.5rem] bg-muted/20 animate-pulse" /> }
);
function DashboardChart({ data }: { data: { name: string; score: number }[] }) {
  return <AreaChartPremium data={data} xKey="name" yKey="score" color="#7c3aed" showAxis={false} domainMax={100} />;
}

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
  if (!url || url.includes("picsum.photos") || url.includes("pixabay.com")) {
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

export default function DashboardHome() {
  const { user, profile, userRole, loading: isUserLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const dataFetchedRef = useRef(false);
  const { toast } = useToast();

  const [phoneValue, setPhoneValue] = useState("");
  const [submittingPhone, setSubmittingPhone] = useState(false);
  const [salaValue, setSalaValue] = useState("");
  const [examTargetValue, setExamTargetValue] = useState("");
  const [turnoValue, setTurnoValue] = useState("");
  const [submittingClass, setSubmittingClass] = useState(false);

  const [recommendedTrails, setRecommendedTrails] = useState<any[]>([]);
  const [libraryResources, setLibraryResources] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentProgress, setRecentProgress] = useState<any[]>([]);
  const [essayStats, setEssayStats] = useState<{ count: number; average: number; latest: any } | null>(null);
  const [examStats, setExamStats] = useState<{ totalAssessed: number; averageScore: number; history?: any[] } | null>(null);
  const [simuladoOficial, setSimuladoOficial] = useState<{ title: string; score: number; total: number; completed_at: string; answers: { q: number; selected: string }[] } | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Gabarito comentado (modal)
  const [gabaritoOpen, setGabaritoOpen] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);

  const [activeSession, setActiveSession] = useState<any>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceStep, setAttendanceStep] = useState<"code" | "fraud">("code");
  const [checkinCode, setCheckinCode] = useState("");
  const [confirmoInput, setConfirmoInput] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      if (digits.length <= 6) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      else if (digits.length <= 10) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      else formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setPhoneValue(formatted);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const digits = phoneValue.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Telefone Inválido ⚠️", description: "Insira um número com DDD válido.", variant: "destructive" });
      return;
    }
    setSubmittingPhone(true);
    try {
      const { error } = await supabase.from("profiles").update({ phone: phoneValue }).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Telefone Salvo! 🎉", description: "Seu número foi registrado com sucesso." });
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      toast({ title: "Erro ao Salvar ❌", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingPhone(false);
    }
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!salaValue) { toast({ title: "Campo obrigatório ⚠️", description: "Selecione o número da sua sala.", variant: "destructive" }); return; }
    if (!examTargetValue) { toast({ title: "Campo obrigatório ⚠️", description: "Selecione seu foco de exame.", variant: "destructive" }); return; }
    if (!turnoValue) { toast({ title: "Campo obrigatório ⚠️", description: "Selecione o turno em que você estuda.", variant: "destructive" }); return; }
    setSubmittingClass(true);
    try {
      const { error } = await supabase.from("profiles").update({ sala: salaValue, exam_target: examTargetValue, turno: turnoValue }).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Perfil atualizado! 🎉", description: "Sala, foco e turno salvos com sucesso." });
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      toast({ title: "Erro ao Salvar ❌", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingClass(false);
    }
  };

  const checkActiveSession = useCallback(async () => {
    if (!user || !profile?.course) return;
    try {
      const { data: activeSessions } = await supabase
        .from("class_sessions")
        .select("id, title, subject, session_date, teacher_name, class_label, checkin_code, checkin_code_expires_at")
        .eq("class_label", profile.course)
        .gt("checkin_code_expires_at", new Date().toISOString())
        .order("checkin_code_expires_at", { ascending: true })
        .limit(1);
      if (activeSessions && activeSessions.length > 0) {
        const session = activeSessions[0];
        const { data: record } = await supabase.from("attendance_records").select("status").eq("session_id", session.id).eq("student_id", user.id).maybeSingle();
        if (!record || record.status === "ausente") { setActiveSession(session); return; }
      }
      setActiveSession(null);
    } catch (err) { console.error("Error checking session:", err); }
  }, [user, profile]);

  const handleOpenAttendanceCheckin = () => {
    setAttendanceStep("code");
    setCheckinCode("");
    setConfirmoInput("");
    setAttendanceDialogOpen(true);
  };

  const handleConfirmedCheckin = async () => {
    const code = checkinCode.trim().toUpperCase();
    if (confirmoInput.trim().toUpperCase() !== "CONFIRMO") {
      toast({ title: "Digite CONFIRMO para prosseguir", variant: "destructive" });
      return;
    }
    setCheckingIn(true);
    try {
      const res = await fetch("/api/attendance/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, confirmed: true }) });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro no check-in", description: data.error || "Código inválido ou expirado.", variant: "destructive" });
      } else {
        toast({ title: "Presença registrada!", description: `Aula: ${data.session_title}` });
        setAttendanceDialogOpen(false);
        setActiveSession(null);
        fetchData(true);
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      setCheckingIn(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && userRole !== 'student') {
      if (userRole === 'admin' || userRole === 'staff') router.replace("/dashboard/admin/home");
      else if (userRole === 'teacher') router.replace("/dashboard/teacher/home");
    }
  }, [userRole, isUserLoading, router]);

  const fetchData = useCallback(async (force = false) => {
    if (!user || (dataFetchedRef.current && !force)) return;
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
          if (parsed.data.simuladoOficial) setSimuladoOficial(parsed.data.simuladoOficial);
          setLoadingData(false);
          if (Date.now() - parsed.timestamp < 60000) { dataFetchedRef.current = true; return; }
        }
      } catch (e) { console.error("Cache corrupto"); }
    }
    setLoadingData(true);
    dataFetchedRef.current = true;
    try {
      const [annRes, trailRes, progressRes, libRes, essayRes, examRes, simOficialRes] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(4),
        supabase.from('trails').select('*').or('status.eq.active,status.eq.published').limit(3),
        supabase.from('user_progress').select(`*, trail:trails(title, category, image_url)`).eq('user_id', user.id).order('last_accessed', { ascending: false }).limit(4),
        supabase.from('library_resources').select('*').not('category', 'ilike', 'LIVRO|%').order('created_at', { ascending: false }).limit(3),
        supabase.from('essay_submissions').select('score, status, theme, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('simulation_attempts').select('score, total_questions').eq('user_id', user.id),
        supabase.from('exam_attempts').select('score, completed_at, answers, exam:exams!inner(title, exam_type)').eq('user_id', user.id).order('completed_at', { ascending: false }),
      ]);
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

      // Simulado oficial importado pela secretaria
      const simOficialData = (simOficialRes?.data || []).find(
        (a: any) => a.exam?.exam_type === 'simulado_importado'
      ) as any;
      if (simOficialData) {
        const examObj = Array.isArray(simOficialData.exam) ? simOficialData.exam[0] : simOficialData.exam;
        const rawAnswers = Array.isArray(simOficialData.answers) ? simOficialData.answers : [];
        setSimuladoOficial({
          title: examObj?.title ?? 'Simulado ENEM',
          score: Number(simOficialData.score),
          total: 60,
          completed_at: simOficialData.completed_at,
          answers: rawAnswers,
        });
      }

      const cacheData = {
        data: { announcements: newAnn, recommendedTrails: trailRes?.data || [], recentProgress: progressRes?.data, libraryResources: libRes?.data, essayStats: newEssayStats, examStats: newExamStats, simuladoOficial },
        timestamp: Date.now()
      };
      if (typeof window !== 'undefined') localStorage.setItem(`dash_cache_${user.id}`, JSON.stringify(cacheData));
    } catch (e: any) {
      console.error("Dashboard data load error:", e);
    } finally {
      setLoadingData(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile && userRole === 'student') {
      fetchData();
      checkActiveSession();
    }
  }, [user, profile, userRole, fetchData, checkActiveSession]);

  if (isUserLoading || (userRole === 'student' && loadingData && !dataFetchedRef.current)) return (
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
  const userName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : nameParts[0] || 'Estudante';
  const firstName = nameParts[0] || 'Estudante';
  const greeting = greetingByHour();
  const score = examStats?.averageScore || 0;
  const ringR = 28;
  const ringC = 2 * Math.PI * ringR;

  // ── Gabarito comentado: dados derivados ──
  const studentAnswerByQ: Record<number, string> = {};
  (simuladoOficial?.answers || []).forEach((a) => {
    if (a && typeof a.q === 'number' && a.selected) {
      studentAnswerByQ[a.q] = String(a.selected).toUpperCase();
    }
  });
  const hasStudentAnswers = Object.keys(studentAnswerByQ).length > 0;
  const gabAcertos = hasStudentAnswers
    ? SIMULADO_GABARITO_CHAVE.filter((g, i) => studentAnswerByQ[i + 1] === g.toUpperCase()).length
    : (simuladoOficial?.score ?? 0);
  const gabErros = hasStudentAnswers ? Object.keys(studentAnswerByQ).length - gabAcertos : 0;
  const visibleGabarito = onlyErrors && hasStudentAnswers
    ? SIMULADO_GABARITO.filter((q) => {
        const sel = studentAnswerByQ[q.numero];
        return sel && sel !== q.resposta.toUpperCase();
      })
    : SIMULADO_GABARITO;
  const gabaritoPorArea = visibleGabarito.reduce((acc, q) => {
    (acc[q.area] = acc[q.area] || []).push(q);
    return acc;
  }, {} as Record<string, typeof SIMULADO_GABARITO>);

  const quickActions = [
    { label: "Simulado",   icon: BrainCircuit, href: "/dashboard/student/simulados",           color: "from-violet-500 to-purple-600" },
    { label: "Redação",    icon: FilePenLine,  href: "/dashboard/student/essays",              color: "from-emerald-500 to-green-600" },
    { label: "Provas",     icon: Scroll,       href: "/dashboard/student/provas",              color: "from-red-500 to-rose-600" },
    { label: "Checklist",  icon: FileCheck,    href: "/dashboard/student/documents",           color: "from-blue-500 to-blue-600" },
    { label: "Biblioteca", icon: Library,      href: "/dashboard/library",                     color: "from-teal-500 to-cyan-600" },
    { label: "Isenção",    icon: Calculator,   href: "/dashboard/student/documents/exemption", color: "from-amber-500 to-orange-500" },
  ];

  const platformFeatures = [
    { icon: BrainCircuit, label: "Banco de Questões",  desc: "5.000+ questões ENEM/ETEC",   href: "/dashboard/student/simulados", gradient: "from-violet-600 to-purple-700",  glow: "shadow-violet-500/30" },
    { icon: FilePenLine,  label: "Lab de Redação",     desc: "Correção por IA em minutos",   href: "/dashboard/student/essays",    gradient: "from-emerald-500 to-teal-600",  glow: "shadow-emerald-500/30" },
    { icon: Bot,          label: "Aurora IA",          desc: "Mentora disponível 24h",       href: "/dashboard/support",           gradient: "from-indigo-500 to-violet-600", glow: "shadow-indigo-500/30", wide: true },
    { icon: PlayCircle,   label: "Trilhas de Vídeo",   desc: "Aprenda no seu ritmo",         href: "/dashboard/trails",            gradient: "from-blue-500 to-cyan-600",     glow: "shadow-blue-500/30" },
    { icon: BarChart3,    label: "Meu Desempenho",     desc: "Identifique pontos cegos",     href: "/dashboard/student/performance", gradient: "from-orange-500 to-red-500",  glow: "shadow-orange-500/30" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
  };

  return (
    <motion.div
      className="space-y-4 md:space-y-6 pb-10 px-3 md:px-0.5"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >

      {/* ── CARD DE TELEFONE PENDENTE ── */}
      {profile && !profile.phone && (
        <motion.div variants={itemVariants}
          className="gradient-border relative overflow-hidden rounded-[2rem] border border-orange-200 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-5 md:p-8 shadow-2xl text-white">
          <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none rounded-[2rem]" />
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">Cadastro Obrigatório</span>
                <h2 className="text-base md:text-xl font-black italic tracking-tighter leading-tight">Cadastre seu Telefone</h2>
              </div>
            </div>
            <form onSubmit={handlePhoneSubmit} className="flex flex-col sm:flex-row gap-3">
              <input type="tel" inputMode="numeric" value={phoneValue} onChange={handlePhoneChange} placeholder="(00) 00000-0000"
                className="h-12 flex-1 bg-white/10 backdrop-blur-md text-white placeholder:text-white/50 border border-white/20 focus:border-white rounded-xl font-bold font-mono text-center text-sm focus-visible:outline-none px-3" />
              <Button type="submit" disabled={submittingPhone}
                className="bg-white text-orange-600 hover:bg-orange-50 font-black rounded-xl shadow-lg border-none h-12 px-6 text-xs uppercase tracking-widest active:scale-95 flex items-center gap-2 justify-center shrink-0">
                {submittingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Salvar</>}
              </Button>
            </form>
          </div>
        </motion.div>
      )}

      {/* ── CARD DE TURMA/EXAME PENDENTE ── */}
      {profile && userRole === 'student' && (!profile.sala || !profile.exam_target || !profile.turno) && (
        <motion.div variants={itemVariants}
          className="relative overflow-hidden rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 md:p-8 shadow-2xl text-white">
          <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none rounded-[2rem]" />
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">Cadastro Obrigatório</span>
                <h2 className="text-base md:text-xl font-black italic tracking-tighter leading-tight">Complete seu Perfil</h2>
              </div>
            </div>
            <form onSubmit={handleClassSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={salaValue} onChange={(e) => setSalaValue(e.target.value)}
                  className="h-12 bg-white/10 text-white border border-white/20 focus:border-white rounded-xl font-bold text-sm focus-visible:outline-none px-3 cursor-pointer">
                  <option value="" className="text-slate-800">Número da sala…</option>
                  {Array.from({ length: 15 }, (_, i) => String(i + 1)).map(n => (
                    <option key={n} value={n} className="text-slate-800">Sala {n}</option>
                  ))}
                </select>
                <select value={examTargetValue} onChange={(e) => setExamTargetValue(e.target.value)}
                  className="h-12 bg-white/10 text-white border border-white/20 focus:border-white rounded-xl font-bold text-sm focus-visible:outline-none px-3 cursor-pointer">
                  <option value="" className="text-slate-800">Foco de exame…</option>
                  <option value="ENEM" className="text-slate-800">ENEM</option>
                  <option value="ETEC" className="text-slate-800">ETEC</option>
                </select>
              </div>
              <div className="flex gap-3">
                <select value={turnoValue} onChange={(e) => setTurnoValue(e.target.value)}
                  className="h-12 flex-1 bg-white/10 text-white border border-white/20 focus:border-white rounded-xl font-bold text-sm focus-visible:outline-none px-3 cursor-pointer">
                  <option value="" className="text-slate-800">Turno…</option>
                  <option value="manha" className="text-slate-800">Manhã</option>
                  <option value="tarde" className="text-slate-800">Tarde</option>
                  <option value="integral" className="text-slate-800">Integral</option>
                </select>
                <Button type="submit" disabled={submittingClass}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-black rounded-xl shadow-lg border-none h-12 px-5 text-xs uppercase tracking-widest active:scale-95 flex items-center gap-2 justify-center shrink-0">
                  {submittingClass ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Salvar</>}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* ── CHAMADA ATIVA ── */}
      {activeSession && (
        <motion.div variants={itemVariants}
          className="gradient-border relative overflow-hidden rounded-[2.5rem] border border-violet-200 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 md:p-8 shadow-2xl glow-purple text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none rounded-[2.5rem]" />
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 relative z-10 w-full md:w-auto">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-xl animate-float">
              <ClipboardCheck className="h-7 w-7 text-white" />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/80 animate-pulse">Chamada em Andamento 🚨</span>
              <h2 className="text-xl md:text-2xl font-black italic tracking-tighter leading-none">Registre sua Presença</h2>
              <p className="text-white/80 font-semibold text-xs leading-relaxed max-w-lg italic">
                Chamada para <strong className="text-white">{activeSession.title}</strong> · turma <strong className="text-white">{activeSession.class_label}</strong> aberta.
              </p>
            </div>
          </div>
          <Button onClick={handleOpenAttendanceCheckin}
            className="bg-white text-violet-600 hover:bg-violet-50 font-black rounded-xl shadow-lg border-none h-12 px-6 text-xs uppercase tracking-widest active:scale-[0.98] flex items-center gap-2 relative z-10 shrink-0">
            <KeyRound className="h-4 w-4" /> Responder Chamada
          </Button>
        </motion.div>
      )}

      {/* ══════════════════════════════════
           HERO — editorial, brand-first
          ══════════════════════════════════ */}
      <motion.section variants={itemVariants}
        className="relative rounded-[2rem] overflow-hidden bg-slate-950 p-5 md:p-8 shadow-2xl">

        {/* Single focused glow — brand orange, not orb soup */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/25 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col gap-5">
          {/* Top row: greeting + score pill */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div className="h-2 w-2 rounded-full bg-green-400"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }} />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">{greeting}</span>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, type: "spring" }}
              className="flex items-center gap-2 bg-primary/20 border border-primary/40 px-3.5 py-1.5 rounded-full">
              <BrainCircuit className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-black text-primary tabular-nums">{score}%</span>
              <span className="text-[9px] text-white/40 font-bold">acertos</span>
            </motion.div>
          </div>

          {/* Name — editorial, big */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="text-[3.2rem] md:text-[4.5rem] font-black text-white leading-none tracking-tighter italic">
              {firstName}<span className="text-primary">.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-sm font-black text-white/40 italic mt-1 tracking-tight">
              Vamos lá!
            </motion.p>
          </div>

          {/* Context chips */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-full bg-white/8 border border-white/12 text-[10px] font-black text-white/55 uppercase tracking-wider">
              {profile?.exam_target || 'ENEM'} 2025
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white/8 border border-white/12 text-[10px] font-black text-white/55 uppercase tracking-wider">
              {profile?.institution || 'Colaço'}
            </span>
            {(examStats?.totalAssessed ?? 0) > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-primary/15 border border-primary/35 text-[10px] font-black text-primary uppercase tracking-wider">
                {examStats!.totalAssessed} simulados
              </span>
            )}
            {(essayStats?.count ?? 0) > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                {essayStats!.count} redações
              </span>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* ════════════════════════════
           QUICK ACTIONS — pill style
          ════════════════════════════ */}
      <motion.div variants={itemVariants} className="flex gap-2.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
        {quickActions.map((action, i) => (
          <motion.div key={action.label} className="shrink-0"
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28 + i * 0.045 }}>
            <Link href={action.href}>
              <div className="flex items-center gap-2.5 pl-2.5 pr-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-sm hover:border-primary/30 hover:shadow-md active:scale-95 transition-all [touch-action:manipulation]">
                <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center shrink-0 shadow-sm`}>
                  <action.icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-700 whitespace-nowrap">
                  {action.label}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* ══════════════════════════════════
           GABARITO COMENTADO — card fixo na home
           (toque abre o gabarito comentado do simulado)
          ══════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => { setExpandedQ(null); setOnlyErrors(false); setGabaritoOpen(true); }}
          className="w-full text-left relative bg-[#0d0d0f] rounded-[2rem] overflow-hidden p-5 group cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform [touch-action:manipulation]"
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(255,107,0,0.3) 0%, transparent 60%)" }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="relative shrink-0">
              {simuladoOficial ? (
                <>
                  {(() => {
                    const pct = Math.round((simuladoOficial.score / simuladoOficial.total) * 100);
                    const r = 24, circ = 2 * Math.PI * r;
                    const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
                    return (
                      <svg width="60" height="60" className="-rotate-90">
                        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} />
                      </svg>
                    );
                  })()}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black text-white leading-none italic">
                      {Math.round((simuladoOficial.score / simuladoOficial.total) * 100)}%
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-[60px] w-[60px] rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <ListChecks className="h-7 w-7 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-0.5">Gabarito Comentado</p>
              <p className="font-black italic text-white leading-tight truncate">{simuladoOficial?.title || SIMULADO_GABARITO_TITULO}</p>
              {simuladoOficial ? (
                <p className="text-xl font-black text-primary leading-none mt-1 italic">
                  {simuladoOficial.score}<span className="text-sm text-white/40 font-bold">/{simuladoOficial.total} acertos</span>
                </p>
              ) : (
                <p className="text-[11px] font-bold text-white/50 mt-1 italic">Toque para ver as respostas comentadas</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-primary transition-colors shrink-0" />
          </div>
        </button>
      </motion.div>

      {/* ══════════════════════════════════
           PLATFORM FEATURES — editorial list
          ══════════════════════════════════ */}
      <motion.section variants={itemVariants}>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden">
          <div className="px-5 pt-4 pb-2.5 border-b border-slate-50">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Recursos da plataforma</span>
          </div>
          {platformFeatures.map((feat, i) => (
            <Link key={feat.label} href={feat.href}>
              <div className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/80 active:bg-slate-100 transition-colors group [touch-action:manipulation]${i < platformFeatures.length - 1 ? ' border-b border-slate-50' : ''}`}>
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                  <feat.icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-slate-900 italic leading-tight">{feat.label}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{feat.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-active:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ════════════════════════
           AURORA CTA — clean dark
          ════════════════════════ */}
      <motion.div variants={itemVariants}
        className="aurora-dark relative overflow-hidden rounded-[2rem] p-5 md:p-7 flex items-center gap-4 md:gap-6">
        <div className="absolute right-0 top-0 w-40 h-40 bg-primary/15 rounded-full blur-[50px] pointer-events-none" />

        <div className="relative shrink-0">
          <div className="h-14 w-14 rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center">
            <Bot className="h-7 w-7 text-primary" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-[#0a0a0a] animate-pulse" />
        </div>

        <div className="flex-1 min-w-0 relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-1.5">Aurora IA · 24h online</p>
          <p className="font-black text-white text-sm md:text-base italic leading-tight tracking-tight">
            Dúvida na matéria? Redação? Estratégia de prova? Estou aqui.
          </p>
        </div>

        <Button asChild className="shrink-0 bg-primary text-white font-black h-11 px-5 rounded-2xl text-xs uppercase border-none shadow-lg shadow-primary/30 relative z-10 hover:bg-primary/90 active:scale-95 transition-all [touch-action:manipulation]">
          <Link href="/dashboard/support">Falar</Link>
        </Button>
      </motion.div>

      {/* ── SUGESTÃO DE ESTUDO ── */}
      {user && <StudySuggestionWidget userId={user.id} />}

      {/* ── RESUMO SEMANAL POR IA ── */}
      {user && <WeeklySummaryWidget userId={user.id} />}

      {/* ── STATS RÁPIDOS (mobile) ── */}
      <motion.div variants={itemVariants} className="lg:hidden grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[1.5rem] shadow-lg border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Simulados</span>
          </div>
          <p className="text-4xl font-black text-slate-900 italic leading-none tabular-nums">
            {examStats?.averageScore || 0}<span className="text-xl text-slate-400 ml-0.5">%</span>
          </p>
          <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">
            {examStats?.totalAssessed || 0} avaliações
          </p>
        </div>
        <div className="bg-white rounded-[1.5rem] shadow-lg border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FilePenLine className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Redações</span>
          </div>
          <p className="text-4xl font-black text-slate-900 italic leading-none tabular-nums">{essayStats?.count || 0}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">
            {essayStats?.average ? `média ${essayStats.average}pts` : 'nenhuma enviada'}
          </p>
        </div>
      </motion.div>

      {/* ── MAIN CONTENT GRID ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 lg:items-start gap-6">

        {/* LEFT — 2/3 */}
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
                    <motion.div key={prog.id}
                      whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                      <Link href={`/dashboard/classroom/${prog.trail_id}`}>
                        <div className="group overflow-hidden rounded-3xl shadow-xl bg-white hover:shadow-2xl transition-all duration-500 border border-muted/10">
                          <div className="relative aspect-[16/7] overflow-hidden bg-slate-100">
                            <Image src={getSafeImageUrl(trailData?.image_url, i)} alt={trailData?.title || "Trilha"} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
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
                                <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                  initial={{ width: 0 }} animate={{ width: `${prog.percentage || 0}%` }}
                                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 + i * 0.1 }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
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
                {loadingData ? Array(2).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-2xl" />) : (
                  announcements.map((ann: any) => {
                    const styles = priorityStyles[ann.priority as keyof typeof priorityStyles] || priorityStyles.low;
                    const Icon = styles.icon;
                    return (
                      <motion.div key={ann.id} whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400 }}
                        className={`p-4 rounded-2xl flex items-start gap-4 ${styles.bgColor} border ${styles.border} shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer`}>
                        {ann.priority === 'high' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-white shadow-sm border border-gray-100">
                          <Icon className={`h-5 w-5 ${styles.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${styles.border} ${styles.color}`}>{styles.label}</span>
                            <span className="text-[10px] font-bold text-slate-400">Público Geral</span>
                          </div>
                          <p className="font-black text-sm text-slate-900 truncate">{ann.title}</p>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium mt-0.5 italic">{ann.message}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — 1/3 (desktop only widgets) */}
        <div className="space-y-5">
          {/* Taxa de Acertos */}
          <div className="hidden lg:block gradient-border bg-white rounded-[2rem] shadow-xl border border-muted/20 p-5 md:p-6 space-y-4 relative overflow-hidden group hover:glow-orange transition-shadow duration-300">
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
              {loadingData ? <div className="h-full w-full bg-slate-50 animate-pulse rounded-2xl" /> : <DashboardChart data={examStats?.history || []} />}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2 relative z-10">
              Evolução: {examStats?.totalAssessed || 0} Avaliações
            </p>
            <Button asChild className="w-full h-11 bg-primary text-white font-black rounded-2xl border-none shadow-lg text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform">
              <Link href="/dashboard/student/simulados">Banco de Questões</Link>
            </Button>
          </div>

          {/* Lab. Redação */}
          <div className="hidden lg:block bg-white rounded-3xl shadow-xl border border-muted/20 p-5 md:p-6 space-y-4">
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

        </div>
      </motion.div>

      {/* ── WIDGETS ABAIXO DO GRID (desktop: 3 cols; mobile: 1 col) ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Biblioteca */}
        <div className="bg-white rounded-3xl shadow-xl border border-muted/20 p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Library className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="font-black text-sm text-primary italic">Biblioteca</h3>
            </div>
            <Link href="/dashboard/library" className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-primary transition-colors">Ver tudo</Link>
          </div>
          <div className="space-y-2.5">
            {loadingData ? Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-muted/20 animate-pulse rounded-2xl" />) : libraryResources.length === 0 ? (
              <div className="py-8 text-center opacity-30 italic text-xs">Materiais em sincronização...</div>
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

        {user && <StreakWidget userId={user.id} />}
        {user && <GoalsWidget userId={user.id} />}
        {user && <JournalWidget userId={user.id} />}
        {user && <GamificationWidget userId={user.id} />}
        <UpcomingEventsWidget />
      </motion.div>

      {/* FOOTER */}
      <footer className="mt-12 py-8 border-t border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4">
            <div className="relative h-10 w-10 shrink-0 bg-white rounded-xl shadow-md p-1.5 border border-slate-100 overflow-hidden">
              <Image src={cityLogoUrl} alt="Logo Prefeitura" fill className="object-contain" sizes="40px" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Plataforma Educacional</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Patrocinada pela Prefeitura de Santana de Parnaíba</p>
            </div>
          </div>
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Compromisso • 2024</p>
        </div>
      </footer>

      {/* ── DIALOG CHECK-IN ── */}
      <Dialog open={attendanceDialogOpen} onOpenChange={(v) => { if (!v) { setAttendanceDialogOpen(false); setConfirmoInput(""); } }}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          {attendanceStep === "code" ? (
            <>
              <DialogHeader className="p-8 pb-4 bg-violet-50 border-b-2 border-violet-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-14 w-14 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
                    <KeyRound className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-violet-700 leading-none italic uppercase tracking-tighter">Check-in da Aula</DialogTitle>
                    <DialogDescription className="text-xs mt-1 font-bold text-violet-500">Confirme sua presença inserindo o token da lousa</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-8 space-y-6">
                <p className="font-semibold text-sm text-slate-600">
                  Digite o token exibido pelo professor para a aula <strong className="text-violet-700">{activeSession?.title}</strong>.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="checkin-code" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Token da aula</Label>
                  <Input id="checkin-code" className="h-14 text-center text-2xl font-black tracking-[0.4em] uppercase font-mono rounded-2xl border-2 border-violet-200 focus:border-violet-500 bg-white"
                    maxLength={6} placeholder="A7X9" value={checkinCode}
                    onChange={(e) => setCheckinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && checkinCode.length >= 4 && setAttendanceStep("fraud")} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-black text-xs border-slate-200">Cancelar</Button>
                  <Button onClick={() => setAttendanceStep("fraud")} disabled={checkinCode.length < 4}
                    className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl shadow-lg shadow-violet-200 border-none text-xs disabled:opacity-40">Prosseguir</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="p-8 pb-4 bg-red-50 border-b-2 border-red-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-14 w-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-300">
                    <ShieldAlert className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-red-700 leading-none italic uppercase tracking-tighter">Aviso de Fraude</DialogTitle>
                    <DialogDescription className="text-xs mt-1 font-bold text-red-600">Leia com atenção antes de confirmar</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-8 space-y-5">
                <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-red-700 font-bold text-sm">Você está prestes a registrar <strong>presença em aula presencial</strong>. O token só pode ser digitado por <strong>você, dentro da sala</strong>.</p>
                </div>
                <ul className="space-y-2 text-slate-700 font-medium text-[13px]">
                  <li className="flex gap-2"><span className="text-red-600 font-black">·</span> Compartilhar o token com colegas caracteriza <strong>fraude documental</strong>.</li>
                  <li className="flex gap-2"><span className="text-red-600 font-black">·</span> Alunos detectados em fraude perdem a vaga <strong>imediatamente</strong>.</li>
                  <li className="flex gap-2"><span className="text-red-600 font-black">·</span> A lista de papel é cruzada com os check-ins do app pela secretaria.</li>
                </ul>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="confirmo" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                    Para prosseguir, digite a palavra <span className="text-red-600 font-black">CONFIRMO</span>
                  </Label>
                  <Input id="confirmo" placeholder="CONFIRMO" value={confirmoInput} onChange={(e) => setConfirmoInput(e.target.value.toUpperCase())}
                    className="h-14 text-center text-xl font-black tracking-[0.3em] rounded-2xl border-2 border-red-200 focus:border-red-500 bg-white" autoComplete="off" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setAttendanceStep("code")} className="flex-1 h-12 rounded-2xl font-black text-xs border-slate-200">Voltar</Button>
                  <Button onClick={handleConfirmedCheckin} disabled={checkingIn || confirmoInput.trim().toUpperCase() !== "CONFIRMO"}
                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 border-none text-xs disabled:opacity-40">
                    {checkingIn ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Registrar Presença ({checkinCode})
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG GABARITO COMENTADO ── */}
      <Dialog open={gabaritoOpen} onOpenChange={setGabaritoOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-4 bg-[#0d0d0f] relative shrink-0 text-left">
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 90% 0%, rgba(255,107,0,0.25) 0%, transparent 60%)" }} />
            <div className="relative z-10 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black italic text-white leading-tight tracking-tighter truncate">
                  {SIMULADO_GABARITO_TITULO}
                </DialogTitle>
                <DialogDescription className="text-[11px] font-bold text-white/50 mt-0.5">
                  Gabarito comentado · {SIMULADO_GABARITO_TOTAL} questões
                </DialogDescription>
              </div>
            </div>
            {hasStudentAnswers && (
              <div className="relative z-10 flex items-center gap-2 mt-4 flex-wrap">
                <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 rounded-full px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-[11px] font-black text-green-400 tabular-nums">{gabAcertos} acertos</span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-3 py-1">
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-[11px] font-black text-red-400 tabular-nums">{gabErros} erros</span>
                </div>
                <button
                  onClick={() => setOnlyErrors((v) => !v)}
                  className={`ml-auto text-[10px] font-black uppercase tracking-wider rounded-full px-3 py-1.5 transition-colors [touch-action:manipulation] ${onlyErrors ? 'bg-primary text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'}`}
                >
                  {onlyErrors ? 'Mostrar tudo' : 'Só meus erros'}
                </button>
              </div>
            )}
          </DialogHeader>

          <div className="overflow-y-auto px-4 py-4 space-y-5 bg-slate-50">
            {Object.keys(gabaritoPorArea).length === 0 ? (
              <div className="py-14 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="font-black italic text-slate-700">Nenhum erro! Mandou bem 🎉</p>
              </div>
            ) : (
              Object.entries(gabaritoPorArea).map(([area, questoes]) => (
                <div key={area}>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary px-2 mb-2">{area}</h3>
                  <div className="space-y-2">
                    {questoes.map((q) => {
                      const sel = studentAnswerByQ[q.numero];
                      const acertou = sel ? sel === q.resposta.toUpperCase() : null;
                      const isOpen = expandedQ === q.numero;
                      return (
                        <div key={q.numero} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          <button
                            onClick={() => setExpandedQ(isOpen ? null : q.numero)}
                            className="w-full flex items-center gap-3 p-3.5 text-left [touch-action:manipulation] active:bg-slate-50"
                          >
                            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-black text-slate-700 tabular-nums">{q.numero}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1 truncate">{q.topico}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                                  Gabarito {q.resposta}
                                </span>
                                {sel && (
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${acertou ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                                    {acertou ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    Você {sel}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-300 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="px-3.5 pb-4 pt-0">
                              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1.5">Comentário</p>
                                <p className="text-[13px] text-slate-700 leading-relaxed font-medium whitespace-pre-line">{q.comentario}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
