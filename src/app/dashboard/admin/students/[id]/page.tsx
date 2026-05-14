"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  BrainCircuit,
  Target,
  Clock,
  Zap,
  Award,
  Mail,
  Building2,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  FileText,
  Loader2,
  Star,
  BarChart3,
  User,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Charts ──────────────────────────────────────────────────────────────────

const RadarChartComponent = dynamic(
  () =>
    import("recharts").then(
      ({ Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip }) => {
        function Chart({ data }: { data: any[] }) {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Desempenho" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                <Tooltip contentStyle={{ borderRadius: "1rem", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }} itemStyle={{ fontWeight: "bold", fontSize: "12px" }} />
              </RadarChart>
            </ResponsiveContainer>
          );
        }
        return { default: Chart };
      }
    ),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-slate-50 rounded-3xl" /> }
);

const AreaChartComponent = dynamic(
  () =>
    import("recharts").then(({ AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => {
      function Chart({ data }: { data: any[] }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAcertos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#888" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: "1rem", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }} />
              <Area type="monotone" dataKey="acertos" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAcertos)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      return { default: Chart };
    }),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-slate-50 rounded-3xl" /> }
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  if (!seconds) return "0min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatLastAccess(ts: string | null) {
  if (!ts) return "Nunca";
  return format(new Date(ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

const SUBJECT_COLORS: Record<string, string> = {
  "Matemática": "bg-blue-500",
  "Linguagens": "bg-purple-500",
  "Ciências da Natureza": "bg-emerald-500",
  "Ciências Humanas": "bg-amber-500",
  "Redação": "bg-rose-500",
};

function subjectColor(name: string) {
  return SUBJECT_COLORS[name] ?? "bg-slate-400";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [essays, setEssays] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    if (!studentId) return;

    async function load() {
      setLoading(true);
      try {
        const [profileRes, answersRes, examsRes, essaysRes, badgesRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", studentId).single(),
          supabase
            .from("student_question_answers")
            .select("*, questions(subject_id, subjects(name))")
            .eq("user_id", studentId),
          supabase
            .from("exam_attempts")
            .select("*, exams(title, year, exam_type)")
            .eq("user_id", studentId)
            .order("completed_at", { ascending: false })
            .limit(10),
          supabase
            .from("essay_submissions")
            .select("id, theme, score, status, created_at")
            .eq("user_id", studentId)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase.from("user_badges").select("*").eq("user_id", studentId),
        ]);

        if (profileRes.data) setStudent(profileRes.data);
        if (answersRes.data) setAnswers(answersRes.data);
        if (examsRes.data) setExamAttempts(examsRes.data);
        if (essaysRes.data) setEssays(essaysRes.data);
        if (badgesRes.data) setBadges(badgesRes.data);
      } catch (e) {
        console.error("Erro ao carregar perfil:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [studentId]);

  // ── Computed metrics ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = answers.length;
    const correct = answers.filter((a) => a.is_correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, incorrect: total - correct, accuracy };
  }, [answers]);

  const subjectData = useMemo(() => {
    const map: Record<string, { total: number; correct: number }> = {};
    answers.forEach((a) => {
      const name = a.questions?.subjects?.name ?? "Geral";
      if (!map[name]) map[name] = { total: 0, correct: 0 };
      map[name].total++;
      if (a.is_correct) map[name].correct++;
    });
    return Object.entries(map)
      .map(([subject, d]) => ({
        subject,
        total: d.total,
        correct: d.correct,
        score: Math.round((d.correct / d.total) * 100),
      }))
      .sort((a, b) => b.total - a.total);
  }, [answers]);

  const radarData = useMemo(
    () => subjectData.map((s) => ({ subject: s.subject, score: s.score, fullMark: 100 })),
    [subjectData]
  );

  const historyData = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const dateStr = format(subDays(new Date(), 14 - i), "yyyy-MM-dd");
      const day = answers.filter(
        (a) => format(new Date(a.created_at ?? a.answered_at), "yyyy-MM-dd") === dateStr
      );
      return {
        date: format(new Date(dateStr), "dd/MM"),
        acertos: day.filter((a) => a.is_correct).length,
        total: day.length,
      };
    });
  }, [answers]);

  const examAvgScore = useMemo(() => {
    if (!examAttempts.length) return null;
    const avg = examAttempts.reduce((s, e) => s + (e.score ?? 0), 0) / examAttempts.length;
    return Math.round(avg);
  }, [examAttempts]);

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-primary font-black italic uppercase tracking-widest animate-pulse text-sm">
          Carregando perfil...
        </p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-primary font-black italic">Aluno não encontrado.</p>
        <Button onClick={() => router.back()} variant="outline" className="rounded-2xl font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const isEtec = (student.exam_target ?? "").toUpperCase().includes("ETEC");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 px-1">

      {/* ── Voltar ── */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="h-10 rounded-xl font-bold text-muted-foreground hover:text-primary gap-2 -ml-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para lista
      </Button>

      {/* ── Hero do aluno ── */}
      <div className="relative rounded-[2.5rem] overflow-hidden bg-primary p-8 md:p-10 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">

          {/* Avatar */}
          <div className="h-24 w-24 rounded-[1.5rem] bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl shrink-0">
            <span className="text-4xl font-black text-white">
              {student.name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          </div>

          {/* Info principal */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black text-white italic leading-none tracking-tight">
                {student.name}
              </h1>
              <Badge
                className={`font-black text-[10px] uppercase px-3 py-1 border-none ${
                  isEtec ? "bg-orange-400 text-white" : "bg-blue-400 text-white"
                }`}
              >
                {student.exam_target ?? "ENEM"}
              </Badge>
              {student.status === "suspended" && (
                <Badge className="bg-red-400 text-white font-black text-[10px] uppercase border-none">
                  Suspenso
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {student.email && (
                <span className="flex items-center gap-2 text-white/70 text-sm font-medium">
                  <Mail className="h-3.5 w-3.5" /> {student.email}
                </span>
              )}
              {student.institution && (
                <span className="flex items-center gap-2 text-white/70 text-sm font-medium">
                  <Building2 className="h-3.5 w-3.5" /> {student.institution}
                </span>
              )}
              {student.course && (
                <span className="flex items-center gap-2 text-white/70 text-sm font-medium">
                  <GraduationCap className="h-3.5 w-3.5" /> {student.course}
                </span>
              )}
            </div>

            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
              Último acesso: {formatLastAccess(student.last_access)}
            </p>
          </div>

          {/* XP bubble */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-[2rem] px-8 py-6 text-center shadow-xl shrink-0">
            <Zap className="h-6 w-6 text-yellow-300 mx-auto mb-1" />
            <p className="text-4xl font-black text-white italic">{student.xp_points ?? 0}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mt-1">XP Total</p>
          </div>
        </div>
      </div>

      {/* ── Métricas rápidas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Questões Respondidas",
            value: stats.total,
            icon: BrainCircuit,
            color: "text-blue-500",
            bg: "bg-blue-50",
          },
          {
            label: "Taxa de Acerto",
            value: `${stats.accuracy}%`,
            icon: Target,
            color: stats.accuracy >= 60 ? "text-emerald-500" : stats.accuracy >= 40 ? "text-amber-500" : "text-red-500",
            bg: stats.accuracy >= 60 ? "bg-emerald-50" : stats.accuracy >= 40 ? "bg-amber-50" : "bg-red-50",
          },
          {
            label: "Tempo de Estudo",
            value: formatTime(student.total_time_spent ?? 0),
            icon: Clock,
            color: "text-purple-500",
            bg: "bg-purple-50",
          },
          {
            label: "Medalhas Conquistadas",
            value: badges.length,
            icon: Award,
            color: "text-amber-500",
            bg: "bg-amber-50",
          },
        ].map((m, i) => (
          <Card key={i} className="border-none shadow-xl rounded-[2rem] bg-white">
            <CardContent className="p-6">
              <div className={`h-11 w-11 rounded-2xl ${m.bg} ${m.color} flex items-center justify-center mb-4 shadow-inner`}>
                <m.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-black text-primary italic">{m.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1.5">
                {m.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Radar */}
        <Card className="lg:col-span-6 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-xl font-black text-primary italic">Mapa de Competências</CardTitle>
            <CardDescription className="italic text-xs">Acerto por área do conhecimento.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4 h-[350px]">
            {radarData.length > 0 ? (
              <RadarChartComponent data={radarData} />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm opacity-40">
                Nenhuma resposta registrada ainda.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atividade diária */}
        <Card className="lg:col-span-6 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-xl font-black text-primary italic">Atividade Diária</CardTitle>
            <CardDescription className="italic text-xs">Questões acertadas nos últimos 15 dias.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4 h-[350px]">
            <AreaChartComponent data={historyData} />
          </CardContent>
        </Card>
      </div>

      {/* ── Breakdown por matéria ── */}
      {subjectData.length > 0 && (
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-primary italic">Detalhamento por Matéria</CardTitle>
                <CardDescription className="italic text-xs">Acertos, erros e taxa de aproveitamento.</CardDescription>
              </div>
              <BarChart3 className="h-7 w-7 text-primary/10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/10">
              {subjectData.map((s, i) => (
                <div key={i} className="flex items-center gap-6 px-8 py-5 hover:bg-muted/5 transition-colors">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${subjectColor(s.subject)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-black text-primary italic text-sm truncate">{s.subject}</p>
                      <span className="text-xs font-black text-muted-foreground ml-4 shrink-0">{s.score}%</span>
                    </div>
                    <Progress value={s.score} className="h-1.5 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs font-bold">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {s.correct}
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircle className="h-3.5 w-3.5" /> {s.total - s.correct}
                    </span>
                    <Badge variant="outline" className="font-black text-[9px] uppercase border-muted/30">
                      {s.total} questões
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Grid: Provas + Redações ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tentativas de provas */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-primary italic">Provas Realizadas</CardTitle>
                <CardDescription className="italic text-xs">
                  {examAttempts.length} tentativa{examAttempts.length !== 1 ? "s" : ""}
                  {examAvgScore !== null && ` · Média: ${examAvgScore} pts`}
                </CardDescription>
              </div>
              <TrendingUp className="h-6 w-6 text-primary/10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {examAttempts.length === 0 ? (
              <p className="px-8 py-10 text-center text-sm italic text-muted-foreground opacity-50">
                Nenhuma prova realizada.
              </p>
            ) : (
              <div className="divide-y divide-muted/10">
                {examAttempts.map((e, i) => {
                  const pct = e.total_questions > 0 ? Math.round((e.score / e.total_questions) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-4 px-8 py-4 hover:bg-muted/5 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-primary/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-primary italic text-sm truncate">
                          {e.exams?.title ?? "Prova"}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                          {e.exams?.year ?? ""} · {e.exams?.exam_type ?? ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-primary italic">
                          {e.score}/{e.total_questions}
                        </p>
                        <p className={`text-[10px] font-black uppercase ${pct >= 60 ? "text-emerald-500" : "text-red-400"}`}>
                          {pct}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Redações */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-primary italic">Redações</CardTitle>
                <CardDescription className="italic text-xs">
                  {essays.length} envio{essays.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <FileText className="h-6 w-6 text-primary/10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {essays.length === 0 ? (
              <p className="px-8 py-10 text-center text-sm italic text-muted-foreground opacity-50">
                Nenhuma redação enviada.
              </p>
            ) : (
              <div className="divide-y divide-muted/10">
                {essays.map((essay, i) => (
                  <div key={i} className="flex items-center gap-4 px-8 py-4 hover:bg-muted/5 transition-colors">
                    <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-primary italic text-sm truncate">{essay.theme ?? "Redação"}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">
                        {format(new Date(essay.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {essay.score != null ? (
                        <span className="font-black text-primary italic">{essay.score} pts</span>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-amber-200 text-amber-600 bg-amber-50">
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Medalhas ── */}
      {badges.length > 0 && (
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-muted/10">
            <CardTitle className="text-lg font-black text-primary italic">Conquistas & Medalhas</CardTitle>
            <CardDescription className="italic text-xs">{badges.length} medalha{badges.length !== 1 ? "s" : ""} conquistada{badges.length !== 1 ? "s" : ""}.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-wrap gap-3">
              {badges.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3"
                  title={b.earned_at ? format(new Date(b.earned_at), "dd/MM/yyyy") : ""}
                >
                  <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                  <span className="text-xs font-black text-amber-700 uppercase tracking-wide">{b.badge_type}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Resumo acertos/erros ── */}
      {stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-lg rounded-[2rem] bg-emerald-500 text-white overflow-hidden p-6">
            <CheckCircle2 className="h-7 w-7 opacity-40 mb-3" />
            <p className="text-4xl font-black italic">{stats.correct}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">Questões Corretas</p>
          </Card>
          <Card className="border-none shadow-lg rounded-[2rem] bg-red-400 text-white overflow-hidden p-6">
            <XCircle className="h-7 w-7 opacity-40 mb-3" />
            <p className="text-4xl font-black italic">{stats.incorrect}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">Questões Erradas</p>
          </Card>
          <Card className="border-none shadow-lg rounded-[2rem] bg-white overflow-hidden p-6 border-l-8 border-primary">
            <Target className="h-7 w-7 text-primary/20 mb-3" />
            <p className="text-4xl font-black italic text-primary">{stats.accuracy}%</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-muted-foreground">Taxa de Aproveitamento</p>
          </Card>
        </div>
      )}

    </div>
  );
}
