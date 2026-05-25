
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp, Users, Loader2, ClipboardCheck, BrainCircuit,
  Activity, FileDown, BarChart3, Sparkles,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const PerformanceChart = dynamic(
  () =>
    import("recharts").then(({ BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid }) => {
      function Chart({ data }: { data: { name: string; performance: number }[] }) {
        const COLORS = ["#f97316", "#fb923c", "#fdba74", "#fcd34d", "#fde68a"];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.4)" fontSize={11} width={80} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)", background: "#1a1a1f", color: "#fff", fontSize: 12 }}
              />
              <Bar dataKey="performance" radius={[0, 8, 8, 0]} barSize={20}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      return { default: Chart };
    }),
  { ssr: false }
);

const EngagementChart = dynamic(
  () =>
    import("recharts").then(({ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer }) => {
      function Chart({ data }: { data: { day: string; acessos: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} dy={8} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)", background: "#1a1a1f", color: "#fff", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="acessos"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 5, fill: "#f97316", strokeWidth: 2, stroke: "#0d0d0f" }}
                activeDot={{ r: 7, strokeWidth: 0, fill: "#fb923c" }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      return { default: Chart };
    }),
  { ssr: false }
);

export default function TeacherAnalyticsDashboard({ userId }: { userId?: string }) {
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const { toast } = useToast();
  const [data, setData] = useState({
    totalStudents: 0,
    avgScore: 0,
    completionRate: 0,
    performanceBySubject: [] as { name: string; performance: number }[],
    engagementTrend: [] as { day: string; acessos: number }[],
  });

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        let realTotalStudents = 0;
        if (userId) {
          realTotalStudents = 1;
        } else {
          const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("profile_type", "student");
          realTotalStudents = count || 0;
        }

        let answerQuery = supabase.from("student_question_answers").select("is_correct");
        if (userId) answerQuery = answerQuery.eq("student_id", userId);
        const { data: answers } = await answerQuery;

        let realAvgScore = 0;
        if (answers && answers.length > 0) {
          const correct = answers.filter((a) => a.is_correct).length;
          realAvgScore = Math.round((correct / answers.length) * 1000);
        }

        let progressQuery = supabase.from("user_progress").select("percentage");
        if (userId) progressQuery = progressQuery.eq("user_id", userId);
        const { data: progress } = await progressQuery;

        let realAvgProg = 0;
        if (progress && progress.length > 0) {
          const total = progress.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
          realAvgProg = Math.round(total / progress.length);
        }

        let subQuery = supabase.from("student_question_answers").select("is_correct, question:questions!question_id(subject:subjects!subject_id(name))");
        if (userId) subQuery = subQuery.eq("student_id", userId);
        const { data: subAnswers } = await subQuery;

        const subjectMap: Record<string, { correct: number; total: number }> = {};
        (subAnswers as any[] ?? []).forEach((a) => {
          const name = a.question?.subject?.name || "Geral";
          if (!subjectMap[name]) subjectMap[name] = { correct: 0, total: 0 };
          subjectMap[name].total += 1;
          if (a.is_correct) subjectMap[name].correct += 1;
        });

        const realPerformanceBySubject = Object.entries(subjectMap)
          .map(([name, s]) => ({ name, performance: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0 }))
          .sort((a, b) => b.performance - a.performance)
          .slice(0, 5);

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let trendQuery = supabase.from("student_question_answers").select("answered_at").gte("answered_at", weekAgo);
        if (userId) trendQuery = trendQuery.eq("student_id", userId);
        const { data: trendData } = await trendQuery;

        const daysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const dayMap: Record<string, number> = { Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, Sáb: 0, Dom: 0 };
        (trendData ?? []).forEach((row: any) => {
          const d = daysShort[new Date(row.answered_at).getDay()];
          if (d in dayMap) dayMap[d]++;
        });
        const realEngagementTrend = Object.entries(dayMap).map(([day, acessos]) => ({ day, acessos }));

        const hasNoData = realTotalStudents === 0 && (answers?.length ?? 0) === 0;
        setIsDemo(hasNoData && !userId);

        if (hasNoData && !userId) {
          setData({
            totalStudents: 158,
            avgScore: 782,
            completionRate: 42,
            performanceBySubject: [
              { name: "Redação", performance: 88 },
              { name: "Linguagens", performance: 82 },
              { name: "Matemática", performance: 75 },
              { name: "Biologia", performance: 68 },
              { name: "Física", performance: 61 },
            ],
            engagementTrend: [
              { day: "Seg", acessos: 110 }, { day: "Ter", acessos: 145 },
              { day: "Qua", acessos: 168 }, { day: "Qui", acessos: 152 },
              { day: "Sex", acessos: 130 }, { day: "Sáb", acessos: 95 },
              { day: "Dom", acessos: 70 },
            ],
          });
        } else {
          setData({
            totalStudents: realTotalStudents,
            avgScore: realAvgScore,
            completionRate: realAvgProg,
            performanceBySubject: realPerformanceBySubject.length > 0 ? realPerformanceBySubject : [{ name: "Geral", performance: 0 }],
            engagementTrend: realEngagementTrend,
          });
        }
      } catch (e) {
        console.error("Erro ao processar inteligência:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [userId]);

  const handleDownloadReport = () => {
    toast({ title: "Gerando Relatório...", description: "Preparando diagnóstico para impressão." });
    setTimeout(() => { window.print(); }, 1000);
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center gap-3">
        <Sparkles className="h-8 w-8 text-orange-400 animate-pulse" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/55">Sintonizando Satélite Analítico...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Hero ── */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 10%, rgba(255,107,0,0.13) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(99,102,241,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-3 w-3 text-orange-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/85">
                  BI · Analytics
                </p>
                {isDemo && (
                  <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5">Demo</span>
                )}
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
                Inteligência Pedagógica
              </h1>
              <p className="text-white/70 text-xs font-semibold mt-1">
                Engajamento e performance acadêmica em tempo real
              </p>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center bg-white/5 border border-white/8 rounded-2xl py-3 px-2">
              <span className="text-xl font-black text-white leading-none">{data.totalStudents}</span>
              <span className="text-[8px] font-bold text-white/55 uppercase tracking-wider mt-0.5 text-center">Alunos</span>
            </div>
            <div className="flex flex-col items-center bg-orange-500/10 border border-orange-500/20 rounded-2xl py-3 px-2">
              <span className="text-xl font-black text-orange-400 leading-none">{data.avgScore}</span>
              <span className="text-[8px] font-bold text-orange-400/80 uppercase tracking-wider mt-0.5 text-center">Média pts</span>
            </div>
            <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl py-3 px-2">
              <span className="text-xl font-black text-emerald-400 leading-none">{data.completionRate}%</span>
              <span className="text-[8px] font-bold text-emerald-400/80 uppercase tracking-wider mt-0.5 text-center">Conclusão</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Performance por Matéria ── */}
      <div className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-400/85" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">Performance por Matéria</p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-white/65 bg-white/5 border border-white/8 rounded-full px-2 py-0.5">Simulados</span>
        </div>
        <div className="p-4">
          <div className="h-[200px] w-full">
            <PerformanceChart data={data.performanceBySubject} />
          </div>
        </div>
      </div>

      {/* ── Engajamento Semanal ── */}
      <div className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-400/85" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">Engajamento Semanal</p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Ao Vivo</span>
        </div>
        <div className="p-4">
          <div className="h-[200px] w-full">
            <EngagementChart data={data.engagementTrend} />
          </div>
        </div>
      </div>

      {/* ── Insights Aurora ── */}
      <div className="relative rounded-[1.5rem] overflow-hidden border border-orange-500/15 bg-gradient-to-br from-orange-500/8 to-amber-500/5 p-5">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(255,107,0,0.15) 0%, transparent 60%)" }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <BrainCircuit className="h-4.5 w-4.5 text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400/85">Aurora IA</p>
              <p className="text-xs font-black text-white italic">Insights Pedagógicos</p>
            </div>
          </div>
          <p className="text-xs font-medium text-white/75 leading-relaxed italic">
            {isDemo
              ? `"Em modo de demonstração, observamos um potencial de média de 782 pontos. A taxa de engajamento simulada de 42% sugere que as trilhas de Redação e Linguagens são as mais acessadas pela rede."`
              : `"Com base nos dados reais, a rede apresenta uma média de ${data.avgScore} pontos nos simulados. A taxa de conclusão de trilhas (${data.completionRate}%) indica ${data.completionRate > 50 ? "alto" : "moderado"} engajamento nos módulos publicados pelos mentores."`}
          </p>
          <button
            onClick={handleDownloadReport}
            className="mt-4 h-11 px-5 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 text-xs uppercase tracking-widest transition-all touch-manipulation active:scale-95 print:hidden"
          >
            <FileDown className="h-4 w-4" />
            Relatório Executivo
          </button>
        </div>
      </div>
    </div>
  );
}
