"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Library, Bot, Loader2, Megaphone, AlertOctagon, Info,
  TrendingUp, PlayCircle, Video, FileText, FileCheck,
  Calculator, BrainCircuit, Sparkles, Zap, FilePenLine,
  ArrowRight, ChevronRight, BookOpen, Phone, Check,
  ClipboardCheck, KeyRound, CheckCircle2, ShieldAlert,
  AlertTriangle, GraduationCap, Scroll, BarChart3, Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

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
const DashboardChart = dynamic(
  () => import('recharts').then(({ AreaChart, Area, ResponsiveContainer, Tooltip }) => {
    function Chart({ data }: { data: { name: string; score: number }[] }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 2 }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
            <Area type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    return { default: Chart };
  }),
  { ssr: false, loading: () => <div className="h-full w-full bg-slate-50 animate-pulse rounded-2xl" /> }
);

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

// 3D Tilt Card component
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8]);
  const springX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  return (
    <motion.div
      style={{ rotateX: springX, rotateY: springY, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      whileTap={{ scale: 0.97 }}
      className={className}
    >
      {children}
    </motion.div>
  );
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
  const [loadingData, setLoadingData] = useState(true);

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
          setLoadingData(false);
          if (Date.now() - parsed.timestamp < 60000) { dataFetchedRef.current = true; return; }
        }
      } catch (e) { console.error("Cache corrupto"); }
    }
    setLoadingData(true);
    dataFetchedRef.current = true;
    try {
      const [annRes, trailRes, progressRes, libRes, essayRes, examRes] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(4),
        supabase.from('trails').select('*').or('status.eq.active,status.eq.published').limit(3),
        supabase.from('user_progress').select(`*, trail:trails(title, category, image_url)`).eq('user_id', user.id).order('last_accessed', { ascending: false }).limit(4),
        supabase.from('library_resources').select('*').not('category', 'ilike', 'LIVRO|%').order('created_at', { ascending: false }).limit(3),
        supabase.from('essay_submissions').select('score, status, theme, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('simulation_attempts').select('score, total_questions').eq('user_id', user.id),
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
      const cacheData = {
        data: { announcements: newAnn, recommendedTrails: trailRes?.data || [], recentProgress: progressRes?.data, libraryResources: libRes?.data, essayStats: newEssayStats, examStats: newExamStats },
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

      {/* ══════════════════════════════════════════════════
           HERO — 3D floating orbs + animated score ring
          ══════════════════════════════════════════════════ */}
      <motion.section variants={itemVariants}
        className="relative rounded-3xl overflow-hidden bg-slate-950 flex flex-col p-5 md:p-8 shadow-2xl gap-5 min-h-[200px]"
        style={{ perspective: "1200px" }}>

        {/* Floating orbs */}
        <motion.div
          className="absolute top-[-20%] right-[-5%] w-[280px] h-[280px] bg-violet-600/30 rounded-full blur-[80px] pointer-events-none"
          animate={{ y: [0, -16, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-30%] left-[-10%] w-[240px] h-[240px] bg-indigo-500/20 rounded-full blur-[70px] pointer-events-none"
          animate={{ y: [0, 20, 0], scale: [1, 0.95, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-[30%] left-[40%] w-[160px] h-[160px] bg-accent/15 rounded-full blur-[60px] pointer-events-none"
          animate={{ x: [0, 12, 0], y: [0, -8, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Greeting row */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full">
                <motion.div
                  className="h-1.5 w-1.5 rounded-full bg-green-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{greeting}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tighter">
                {firstName}! <span className="text-accent italic">Pronto para hoje?</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">
                {profile?.exam_target || 'ENEM'} · {profile?.institution || 'Colégio Colaço'}
              </motion.p>
            </div>

            {/* 3D Score ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: "spring" }}
              className="shrink-0 flex flex-col items-center gap-1">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r={ringR} stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" fill="none" />
                  <motion.circle
                    cx="36" cy="36" r={ringR}
                    stroke="hsl(var(--accent))"
                    strokeWidth="4.5" fill="none" strokeLinecap="round"
                    strokeDasharray={ringC}
                    initial={{ strokeDashoffset: ringC }}
                    animate={{ strokeDashoffset: ringC - (score / 100) * ringC }}
                    transition={{ duration: 1.8, ease: "easeOut", delay: 0.6 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-white leading-none">{score}</span>
                  <span className="text-[7px] text-white/65 font-bold uppercase">%</span>
                </div>
              </div>
              <span className="text-[8px] text-white/60 font-bold uppercase tracking-widest">Acertos</span>
            </motion.div>
          </div>

          {/* Stats strip */}
          <div className="flex gap-3 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1">
            {[
              { label: "Simulados",  value: examStats?.totalAssessed ? `${examStats.averageScore}%` : '–', icon: BrainCircuit, color: "text-accent" },
              { label: "Redação",    value: essayStats?.count ? `${essayStats.average}pts` : '–',       icon: FilePenLine,  color: "text-green-400" },
              { label: "Trilhas",    value: `${recentProgress.length}`,                                  icon: PlayCircle,   color: "text-yellow-400" },
            ].map((stat, i) => (
              <motion.div key={stat.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + i * 0.08 }}
                className="gradient-border flex items-center gap-2.5 bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 shrink-0 min-w-[120px]">
                <stat.icon className={`h-4 w-4 ${stat.color} shrink-0`} />
                <div>
                  <p className="font-black text-white text-base leading-none">{stat.value}</p>
                  <p className="text-[9px] text-white/65 font-bold uppercase tracking-widest mt-0.5">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════
           QUICK ACTIONS — 3D tilt cards
          ══════════════════════════════════ */}
      <motion.div variants={itemVariants} className="flex gap-3 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
        {quickActions.map((action, i) => (
          <TiltCard key={action.label} className="shrink-0">
            <Link href={action.href}>
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className={`btn-shimmer flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${action.color} rounded-2xl w-[84px] h-[84px] shadow-lg hover:shadow-xl transition-all [touch-action:manipulation]`}
                style={{ transformStyle: "preserve-3d" }}>
                <div style={{ transform: "translateZ(8px)" }}>
                  <action.icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <p className="font-bold text-white uppercase text-[9px] tracking-wide text-center leading-tight px-1"
                   style={{ transform: "translateZ(4px)" }}>
                  {action.label}
                </p>
              </motion.div>
            </Link>
          </TiltCard>
        ))}
      </motion.div>

      {/* ══════════════════════════════════════════
           PLATFORM FEATURES — bento 3D cards
          ══════════════════════════════════════════ */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-sm font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
            Tudo em Um Só Lugar
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {platformFeatures.map((feat, i) => (
            feat.wide ? (
              /* Wide card — spans full width */
              <motion.div key={feat.label} className="col-span-2"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <TiltCard>
                  <Link href={feat.href}>
                    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${feat.gradient} p-4 md:p-5 shadow-xl ${feat.glow} shadow-lg flex items-center gap-4 [touch-action:manipulation]`}
                         style={{ transformStyle: "preserve-3d" }}>
                      {/* Orb glow bg */}
                      <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                      <motion.div
                        className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0"
                        animate={{ y: [0, -4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        style={{ transform: "translateZ(12px)" }}>
                        <feat.icon className="h-7 w-7 text-white" strokeWidth={1.5} />
                      </motion.div>
                      <div className="relative z-10 flex-1" style={{ transform: "translateZ(6px)" }}>
                        <p className="font-black text-white text-base italic leading-tight">{feat.label}</p>
                        <p className="text-white/60 text-xs font-semibold mt-0.5">{feat.desc}</p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                        <ArrowRight className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </Link>
                </TiltCard>
              </motion.div>
            ) : (
              /* Regular card */
              <motion.div key={feat.label}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <TiltCard>
                  <Link href={feat.href}>
                    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${feat.gradient} p-4 shadow-lg ${feat.glow} shadow-md flex flex-col gap-3 h-full min-h-[120px] [touch-action:manipulation]`}
                         style={{ transformStyle: "preserve-3d" }}>
                      <div className="absolute right-[-10px] bottom-[-10px] w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <motion.div
                        className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center"
                        animate={{ rotateZ: [0, 5, -5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                        style={{ transform: "translateZ(10px)" }}>
                        <feat.icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                      </motion.div>
                      <div style={{ transform: "translateZ(6px)" }}>
                        <p className="font-black text-white text-sm italic leading-tight">{feat.label}</p>
                        <p className="text-white/60 text-[11px] font-semibold mt-0.5 leading-snug">{feat.desc}</p>
                      </div>
                    </div>
                  </Link>
                </TiltCard>
              </motion.div>
            )
          ))}
        </div>
      </motion.section>

      {/* ══════════════════════════════════════
           AURORA AI — full-width CTA banner
          ══════════════════════════════════════ */}
      <motion.div variants={itemVariants}
        className="gradient-border relative overflow-hidden rounded-[2.5rem] border border-accent/20 bg-gradient-to-r from-blue-50 via-indigo-50/20 to-white p-5 md:p-8 shadow-2xl group">
        <div className="absolute inset-0 dot-grid-dark opacity-40 pointer-events-none rounded-[2.5rem]" />
        <motion.div
          className="absolute right-[-40px] top-[-40px] w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none"
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-0">
            <motion.div className="relative h-12 w-12 md:h-16 md:w-16 shrink-0"
              whileHover={{ scale: 1.1, rotateY: 15 }} style={{ transformStyle: "preserve-3d" }}>
              <div className="h-full w-full rounded-2xl bg-white shadow-xl flex items-center justify-center border border-accent/10">
                <Bot className="h-6 w-6 md:h-8 md:w-8 text-accent animate-pulse-subtle" />
              </div>
              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </motion.div>
            <div className="flex items-center gap-2 sm:hidden">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Aurora IA</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="hidden sm:flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Aurora IA · Mentoria Estratégica</span>
            </div>
            <p className="text-slate-700 font-semibold italic text-sm md:text-base leading-relaxed tracking-tight">
              "A constância é a chave da aprovação! Revise os erros do último simulado antes de avançar. Estou disponível 24h para corrigir redações."
            </p>
          </div>
          <Button asChild className="bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 border-none hover:scale-105 transition-all w-full sm:w-auto shrink-0 h-12 md:h-14 px-6 md:px-8 text-xs md:text-sm uppercase tracking-widest italic active:scale-95">
            <Link href="/dashboard/support" className="flex items-center justify-center gap-2">
              Falar com Aurora <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* ── SUGESTÃO DE ESTUDO ── */}
      {user && <StudySuggestionWidget userId={user.id} />}

      {/* ── WIDGETS MÓVEL RÁPIDOS ── */}
      <motion.div variants={itemVariants} className="lg:hidden grid grid-cols-2 gap-4">
        <div className="gradient-border bg-white rounded-[1.5rem] shadow-xl border border-muted/20 p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-violet-100 flex items-center justify-center">
              <BrainCircuit className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <span className="font-black text-xs text-primary italic">Acertos</span>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-primary">{examStats?.averageScore || 0}<span className="text-lg text-muted-foreground">%</span></p>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">{examStats?.totalAssessed || 0} avaliações</p>
          </div>
        </div>
        <div className="bg-white rounded-[1.5rem] shadow-xl border border-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-green-100 flex items-center justify-center">
              <FilePenLine className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span className="font-black text-xs text-primary italic">Redações</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl p-2.5 text-center">
              <span className="text-2xl font-black text-primary">{essayStats?.count || 0}</span>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Envios</p>
            </div>
            <div className="bg-accent/5 rounded-xl p-2.5 text-center">
              <span className="text-2xl font-black text-accent">{essayStats?.average || 0}</span>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Média</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── MAIN CONTENT GRID ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

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

          {user && <GamificationWidget userId={user.id} />}
          <UpcomingEventsWidget />
        </div>
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
    </motion.div>
  );
}
