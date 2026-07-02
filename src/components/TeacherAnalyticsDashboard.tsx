
"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, Users, Loader2, ClipboardCheck, BrainCircuit,
  Activity, FileDown, BarChart3, Sparkles, FilePenLine, FileText,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { BarChartPremium, LineChartPremium, AreaChartPremium } from "@/components/charts/premium";

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
    totalEssays: 0,
    avgEssayScore: 0,
    totalExamAttempts: 0,
    essaysTrend: [] as { week: string; total: number }[],
    examsTrend: [] as { week: string; total: number }[],
  });

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        // Performance: todas as leituras rodam em paralelo (antes eram 5 awaits
        // em série). A query com matéria (subAnswers) já traz is_correct, então
        // ela serve TAMBÉM para a média geral — eliminamos a query de tabela
        // cheia duplicada que existia só para calcular avgScore.
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const countQuery = userId
          ? Promise.resolve({ count: 1 })
          : supabase.from("profiles").select("*", { count: "exact", head: true }).eq("profile_type", "student");

        let subQuery = supabase.from("student_question_answers").select("is_correct, question:questions!question_id(subject:subjects!subject_id(name))");
        if (userId) subQuery = subQuery.eq("student_id", userId);

        let progressQuery = supabase.from("user_progress").select("percentage");
        if (userId) progressQuery = progressQuery.eq("user_id", userId);

        let trendQuery = supabase.from("student_question_answers").select("answered_at").gte("answered_at", weekAgo);
        if (userId) trendQuery = trendQuery.eq("student_id", userId);

        // Últimas 8 semanas de redações e simulados, para os gráficos de tendência.
        const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString();
        let essayQuery = supabase.from("essay_submissions").select("score, created_at").gte("created_at", eightWeeksAgo);
        if (userId) essayQuery = essayQuery.eq("user_id", userId);
        let examAttemptsQuery = supabase.from("exam_attempts").select("completed_at").gte("completed_at", eightWeeksAgo);
        if (userId) examAttemptsQuery = examAttemptsQuery.eq("user_id", userId);

        const [{ count }, { data: subAnswers }, { data: progress }, { data: trendData }, { data: essayRows }, { data: examAttemptRows }] = await Promise.all([
          countQuery, subQuery, progressQuery, trendQuery, essayQuery, examAttemptsQuery,
        ]);

        const realTotalStudents = count || 0;

        const answers = subAnswers ?? [];
        let realAvgScore = 0;
        if (answers.length > 0) {
          const correct = (answers as any[]).filter((a) => a.is_correct).length;
          realAvgScore = Math.round((correct / answers.length) * 1000);
        }

        let realAvgProg = 0;
        if (progress && progress.length > 0) {
          const total = progress.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
          realAvgProg = Math.round(total / progress.length);
        }

        const subjectMap: Record<string, { correct: number; total: number }> = {};
        (answers as any[]).forEach((a) => {
          const name = a.question?.subject?.name || "Geral";
          if (!subjectMap[name]) subjectMap[name] = { correct: 0, total: 0 };
          subjectMap[name].total += 1;
          if (a.is_correct) subjectMap[name].correct += 1;
        });

        const realPerformanceBySubject = Object.entries(subjectMap)
          .map(([name, s]) => ({ name, performance: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0 }))
          .sort((a, b) => b.performance - a.performance)
          .slice(0, 5);

        const daysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const dayMap: Record<string, number> = { Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, Sáb: 0, Dom: 0 };
        (trendData ?? []).forEach((row: any) => {
          const d = daysShort[new Date(row.answered_at).getDay()];
          if (d in dayMap) dayMap[d]++;
        });
        const realEngagementTrend = Object.entries(dayMap).map(([day, acessos]) => ({ day, acessos }));

        // Bucket genérico por semana (8 semanas, rótulo "S1"..."S8" da mais antiga
        // para a mais recente) — usado tanto para redações quanto simulados.
        const bucketByWeek = (rows: { date: string }[]): { week: string; total: number }[] => {
          const buckets = Array.from({ length: 8 }, () => 0);
          const now = Date.now();
          rows.forEach(({ date }) => {
            const ageMs = now - new Date(date).getTime();
            const weekIdx = 7 - Math.min(7, Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000)));
            if (weekIdx >= 0 && weekIdx < 8) buckets[weekIdx]++;
          });
          return buckets.map((total, i) => ({ week: `S${i + 1}`, total }));
        };

        const essayRowsSafe = essayRows ?? [];
        const realEssaysTrend = bucketByWeek(essayRowsSafe.map((e: any) => ({ date: e.created_at })));
        const scoredEssaysForAvg = essayRowsSafe.filter((e: any) => e.score !== null && e.score > 0);
        const realAvgEssayScore = scoredEssaysForAvg.length > 0
          ? Math.round(scoredEssaysForAvg.reduce((acc: number, e: any) => acc + Number(e.score), 0) / scoredEssaysForAvg.length)
          : 0;

        const examAttemptRowsSafe = examAttemptRows ?? [];
        const realExamsTrend = bucketByWeek(examAttemptRowsSafe.map((e: any) => ({ date: e.completed_at })));

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
            totalEssays: 47,
            avgEssayScore: 812,
            totalExamAttempts: 63,
            essaysTrend: [4, 6, 5, 8, 7, 9, 6, 2].map((total, i) => ({ week: `S${i + 1}`, total })),
            examsTrend: [6, 8, 7, 10, 9, 11, 8, 4].map((total, i) => ({ week: `S${i + 1}`, total })),
          });
        } else {
          setData({
            totalStudents: realTotalStudents,
            avgScore: realAvgScore,
            completionRate: realAvgProg,
            performanceBySubject: realPerformanceBySubject.length > 0 ? realPerformanceBySubject : [{ name: "Geral", performance: 0 }],
            engagementTrend: realEngagementTrend,
            totalEssays: essayRowsSafe.length,
            avgEssayScore: realAvgEssayScore,
            totalExamAttempts: examAttemptRowsSafe.length,
            essaysTrend: realEssaysTrend,
            examsTrend: realExamsTrend,
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
      <div className="bg-white shadow-sm border border-slate-200 rounded-[1.5rem] overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-400/85" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">Performance por Matéria</p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-slate-600 bg-white shadow-sm border border-slate-200 rounded-full px-2 py-0.5">Simulados</span>
        </div>
        <div className="p-4">
          <div className="h-[200px] w-full">
            <BarChartPremium
              data={data.performanceBySubject}
              xKey="name"
              yKey="performance"
              horizontal
              domainMax={100}
              unit="%"
              colors={["#ff6b00", "#fb923c", "#fdba74", "#fcd34d", "#fde68a"]}
            />
          </div>
        </div>
      </div>

      {/* ── Engajamento Semanal ── */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-[1.5rem] overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-400/85" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">Engajamento Semanal</p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">Ao Vivo</span>
        </div>
        <div className="p-4">
          <div className="h-[200px] w-full">
            <LineChartPremium data={data.engagementTrend} xKey="day" yKey="acessos" color="#ff6b00" />
          </div>
        </div>
      </div>

      {/* ── KPIs de Redação e Simulados ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center bg-white shadow-sm border border-slate-200 rounded-2xl py-3 px-2">
          <span className="text-xl font-black text-slate-800 leading-none">{data.totalEssays}</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 text-center">Redações (8sem)</span>
        </div>
        <div className="flex flex-col items-center bg-white shadow-sm border border-slate-200 rounded-2xl py-3 px-2">
          <span className="text-xl font-black text-slate-800 leading-none">{data.avgEssayScore}</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 text-center">Média Redação</span>
        </div>
        <div className="flex flex-col items-center bg-white shadow-sm border border-slate-200 rounded-2xl py-3 px-2">
          <span className="text-xl font-black text-slate-800 leading-none">{data.totalExamAttempts}</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 text-center">Simulados (8sem)</span>
        </div>
      </div>

      {/* ── Redações ao Longo do Tempo ── */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-[1.5rem] overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilePenLine className="h-4 w-4 text-orange-400/85" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">Redações Enviadas</p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-slate-600 bg-white shadow-sm border border-slate-200 rounded-full px-2 py-0.5">8 semanas</span>
        </div>
        <div className="p-4">
          <div className="h-[180px] w-full">
            <AreaChartPremium data={data.essaysTrend} xKey="week" yKey="total" color="#10b981" />
          </div>
        </div>
      </div>

      {/* ── Simulados ao Longo do Tempo ── */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-[1.5rem] overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-400/85" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">Simulados Realizados</p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-wider text-slate-600 bg-white shadow-sm border border-slate-200 rounded-full px-2 py-0.5">8 semanas</span>
        </div>
        <div className="p-4">
          <div className="h-[180px] w-full">
            <AreaChartPremium data={data.examsTrend} xKey="week" yKey="total" color="#6366f1" />
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
              <p className="text-xs font-black text-slate-800 italic">Insights Pedagógicos</p>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
            {isDemo
              ? `"Em modo de demonstração, observamos um potencial de média de 782 pontos. A taxa de engajamento simulada de 42% sugere que as trilhas de Redação e Linguagens são as mais acessadas pela rede."`
              : `"Com base nos dados reais, a rede apresenta uma média de ${data.avgScore} pontos nos simulados. A taxa de conclusão de trilhas (${data.completionRate}%) indica ${data.completionRate > 50 ? "alto" : "moderado"} engajamento nos módulos publicados pelos mentores."`}
          </p>
          <button
            onClick={handleDownloadReport}
            className="mt-4 h-11 px-5 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-slate-800 font-black rounded-xl shadow-lg shadow-orange-500/20 text-xs uppercase tracking-widest transition-all touch-manipulation active:scale-95 print:hidden"
          >
            <FileDown className="h-4 w-4" />
            Relatório Executivo
          </button>
        </div>
      </div>
    </div>
  );
}
