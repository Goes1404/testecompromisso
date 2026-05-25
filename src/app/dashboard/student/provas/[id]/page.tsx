"use client";

export const runtime = "edge";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthProvider";
import Script from "next/script";
import { supabase } from "@/app/lib/supabase";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  XCircle,
  Award,
  ChevronUp,
  FileText,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const InteractiveWorkbook = dynamic(
  () => import("@/components/InteractiveWorkbook").then((mod) => mod.InteractiveWorkbook),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0c] text-white gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">
          Carregando Prova Digital...
        </p>
      </div>
    ),
  }
);

type ExamData = {
  id: string;
  title: string;
  exam_type: string;
  pdf_url: string;
};

type QuestionData = {
  id: string;
  question_id: string;
  order_index: number;
  question: {
    id: string;
    correct_answer: string;
    subjects: { name: string } | null;
  };
};

export default function InteractiveExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; triRange: string } | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTrayExpanded, setIsTrayExpanded] = useState(true);
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    async function loadExam() {
      if (!id) return;
      try {
        const { data: examData, error: examError } = await supabase
          .from("exams")
          .select("id, title, exam_type, pdf_url")
          .eq("id", id)
          .single();

        if (examError || !examData || !examData.pdf_url) {
          toast({ title: "Erro", description: "Prova não encontrada ou sem PDF.", variant: "destructive" });
          router.push("/dashboard/student/provas");
          return;
        }
        setExam(examData);

        const { data: qData, error: qError } = await supabase
          .from("exam_questions")
          .select("id, question_id, order_index, question:questions(id, correct_answer, subjects(name))")
          .eq("exam_id", id)
          .order("order_index", { ascending: true });

        if (!qError && qData) {
          setQuestions(qData as unknown as QuestionData[]);
        }
      } catch (err) {
        console.error("Falha fatal:", err);
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [id, router, toast]);

  const handleSelectAnswer = useCallback(
    (qId: string, option: string) => {
      if (result) return;
      setAnswers((prev) => ({ ...prev, [qId]: option }));
    },
    [result]
  );

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setShowGrid(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
    setShowGrid(false);
  }, [questions.length]);

  // ── Keyboard navigation (desktop) ─────────────────────────────────────────
  useEffect(() => {
    if (result) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const currentQ = questions[currentIndex];
      if (!currentQ) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (["a", "b", "c", "d", "e", "A", "B", "C", "D", "E"].includes(e.key)) {
        e.preventDefault();
        handleSelectAnswer(currentQ.question.id, e.key.toUpperCase());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, questions, handleSelectAnswer, goPrev, goNext, result]);

  const handleSubmit = async () => {
    if (!user || !exam) return;

    if (Object.keys(answers).length < questions.length) {
      if (!confirm("Você deixou questões em branco. Deseja entregar a prova mesmo assim?")) {
        return;
      }
    }

    setIsSubmitting(true);
    let correctCount = 0;

    const formattedAnswers = questions.map((q) => {
      const selected = answers[q.question.id] || null;
      const correct = q.question.correct_answer;
      if (selected === correct) correctCount++;
      return { question_id: q.question.id, selected, correct };
    });

    let triRange = "";
    if (exam.exam_type.toLowerCase() === "enem") {
      const percentage = correctCount / questions.length;
      if (percentage < 0.2) triRange = "300 - 450";
      else if (percentage < 0.4) triRange = "450 - 550";
      else if (percentage < 0.6) triRange = "550 - 650";
      else if (percentage < 0.8) triRange = "650 - 750";
      else triRange = "750 - 850+";
    } else {
      triRange = "N/A";
    }

    try {
      await supabase.from("exam_attempts").insert({
        user_id: user.id,
        exam_id: exam.id,
        score: correctCount,
        total_questions: questions.length,
        answers: formattedAnswers,
      });

      setResult({ score: correctCount, total: questions.length, triRange });
      setIsTrayExpanded(true);
      toast({ title: "Prova Finalizada!", description: `Você acertou ${correctCount} questões.` });
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
          Carregando Prova e Gabarito...
        </p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.question.id] : undefined;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const progressPct = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-[#0a0a0c] overflow-hidden select-none">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js" strategy="afterInteractive" />

      {/* ════════════════════════════════════════════════════════════════════
         LEFT — PDF Viewer
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-white/5" style={{ minHeight: 0 }}>
        <header className="h-14 bg-[#0a0a0c] flex items-center px-4 shrink-0 z-50 gap-3 border-b border-white/5">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all active:scale-95 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-xs md:text-sm font-black text-white italic truncate leading-none">
              {exam?.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/25 font-black text-[8px] uppercase tracking-widest px-1.5 h-4">
                Simulado Digital
              </Badge>
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">·</span>
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                {exam?.exam_type}
              </span>
            </div>
          </div>

          <Badge className="bg-white/5 text-white/60 border border-white/10 font-black text-[9px] uppercase tracking-wider px-2 h-6 shrink-0">
            <FileText className="h-2.5 w-2.5 mr-1" />
            {answeredCount}/{questions.length}
          </Badge>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <InteractiveWorkbook
            materialId={exam?.id || ""}
            pdfUrl={exam?.pdf_url}
            userName={profile?.name || user?.email || "Estudante"}
            userCpf={profile?.id?.substring(0, 8) || "ID"}
          />
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
         RIGHT — Answer Tray (focused single-question + grid jump)
      ═════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`w-full md:w-[360px] flex flex-col bg-[#0d0d0f] border-t md:border-t-0 md:border-l border-white/5 shadow-2xl z-40 shrink-0 overflow-hidden transition-all duration-300 ${
          isTrayExpanded ? "h-[60vh] md:h-auto" : "h-14 md:h-auto"
        }`}
      >

        {/* ── Tray header (mobile toggle) ── */}
        <button
          onClick={() => {
            if (window.innerWidth < 768) setIsTrayExpanded(!isTrayExpanded);
          }}
          className="relative px-4 py-3 bg-gradient-to-b from-white/[0.03] to-transparent border-b border-white/5 flex justify-between items-center shrink-0 md:cursor-default"
        >
          <div className="w-8 h-1 bg-white/15 rounded-full mx-auto mb-1.5 md:hidden block absolute top-1.5 left-1/2 -translate-x-1/2" />
          <div className="pt-1 md:pt-0 flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-orange-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-white italic leading-none">Gabarito</p>
              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
                {answeredCount} de {questions.length} respondidas
              </p>
            </div>
          </div>
          <div className="md:hidden">
            <ChevronUp
              className={`h-4 w-4 text-white/40 transition-transform duration-300 ${
                isTrayExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-[#0d0d0f]">
          {result ? (
            /* ── RESULT VIEW ─────────────────────────────────────────────── */
            <div className="p-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">

              {/* Score card */}
              <div className="relative rounded-[1.5rem] overflow-hidden bg-[#0a0a0c] border border-emerald-500/20 p-5">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at 100% 0%, rgba(16,185,129,0.18) 0%, transparent 60%)",
                  }}
                />
                <div className="relative z-10 text-center">
                  <Award className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-4xl font-black italic text-white leading-none tracking-tighter">
                    {result.score}
                    <span className="text-xl text-white/40">/{result.total}</span>
                  </p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mt-2">
                    Questões Acertadas
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-base font-black text-emerald-400 italic">
                      {Math.round((result.score / result.total) * 100)}%
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/60 mt-0.5">
                      Aproveitamento
                    </p>
                  </div>
                </div>
              </div>

              {exam?.exam_type.toLowerCase() === "enem" && (
                <div className="bg-white/3 border border-orange-500/20 rounded-2xl p-3 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                    Simulação TRI INEP
                  </p>
                  <p className="text-lg font-black text-orange-400 italic">{result.triRange}</p>
                </div>
              )}

              {/* Detailed gabarito */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 px-1">
                  Gabarito completo
                </p>
                {questions.map((q, idx) => {
                  const selected = answers[q.question.id];
                  const correct = q.question.correct_answer;
                  const isRight = selected === correct;
                  return (
                    <div
                      key={q.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        isRight
                          ? "bg-emerald-500/8 border-emerald-500/20"
                          : "bg-red-500/8 border-red-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-black text-[10px] text-white/40 w-5">{idx + 1}.</span>
                        {isRight ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span
                          className={`font-black text-xs uppercase ${
                            isRight ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {selected || "—"}
                        </span>
                      </div>
                      {!isRight && (
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 h-5 rounded-md flex items-center">
                          Correta: {correct}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── ANSWER VIEW (focused single question + grid) ────────────── */
            <div className="flex flex-col h-full">

              {/* ── PROGRESS HEADER ── */}
              <div className="p-4 pb-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
                      Questão
                    </p>
                    <p className="text-3xl font-black italic text-white leading-none tracking-tighter mt-0.5">
                      {String(currentIndex + 1).padStart(2, "0")}
                      <span className="text-base text-white/30 font-bold ml-1">
                        /{String(questions.length).padStart(2, "0")}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGrid((s) => !s)}
                    className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 touch-manipulation ${
                      showGrid
                        ? "bg-orange-500 text-white"
                        : "bg-white/5 border border-white/10 text-white/60"
                    }`}
                  >
                    <LayoutGrid className="h-3 w-3" />
                    {showGrid ? "Fechar" : "Mapa"}
                  </button>
                </div>
                {/* Progress bar */}
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* ── FOCUSED QUESTION ─────────────────────────────────────── */}
              {!showGrid && currentQ && (
                <div className="flex-1 flex flex-col">
                  <div className="p-5 flex-1 flex flex-col justify-center">
                    {currentQ.question.subjects?.name && (
                      <Badge className="bg-white/5 text-white/40 border border-white/10 font-black text-[8px] uppercase tracking-widest px-2 h-5 self-start mb-3">
                        {currentQ.question.subjects.name}
                      </Badge>
                    )}
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400/70 mb-3">
                      Selecione a resposta
                    </p>

                    {/* Big A/B/C/D/E buttons */}
                    <div className="grid grid-cols-5 gap-2">
                      {["A", "B", "C", "D", "E"].map((letter) => {
                        const isSelected = currentAnswer === letter;
                        return (
                          <button
                            key={letter}
                            onClick={() => handleSelectAnswer(currentQ.question.id, letter)}
                            className={`aspect-square rounded-2xl font-black text-2xl italic transition-all touch-manipulation active:scale-90 flex items-center justify-center ${
                              isSelected
                                ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/40 scale-105"
                                : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/8 hover:text-white"
                            }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected feedback */}
                    <div className="mt-4 text-center">
                      {currentAnswer ? (
                        <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest">
                          ✓ Resposta marcada: <span className="text-orange-400">{currentAnswer}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">
                          Nenhuma resposta marcada
                        </p>
                      )}
                    </div>

                    {/* Keyboard hint (desktop) */}
                    <div className="hidden md:flex items-center justify-center gap-3 mt-5 pt-4 border-t border-white/5">
                      {(["A", "B", "C", "D", "E"] as const).map((k) => (
                        <kbd
                          key={k}
                          className="px-1.5 py-0.5 text-[9px] font-black bg-white/5 border border-white/10 rounded text-white/40"
                        >
                          {k}
                        </kbd>
                      ))}
                      <span className="text-[9px] text-white/30">·</span>
                      <kbd className="px-1.5 py-0.5 text-[9px] font-black bg-white/5 border border-white/10 rounded text-white/40">
                        ←
                      </kbd>
                      <kbd className="px-1.5 py-0.5 text-[9px] font-black bg-white/5 border border-white/10 rounded text-white/40">
                        →
                      </kbd>
                    </div>
                  </div>

                  {/* ── PREV / NEXT NAV ──────────────────────────────────── */}
                  <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={goPrev}
                        disabled={isFirst}
                        className="h-12 rounded-2xl flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest bg-white/5 border border-white/10 text-white/70 hover:bg-white/8 hover:text-white transition-all active:scale-95 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </button>
                      <button
                        onClick={goNext}
                        disabled={isLast}
                        className="h-12 rounded-2xl flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 transition-all active:scale-95 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── QUESTION GRID (jump-to) ──────────────────────────────── */}
              {showGrid && (
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-3">
                    Mapa de questões
                  </p>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                    {questions.map((q, idx) => {
                      const answered = !!answers[q.question.id];
                      const isCurrent = idx === currentIndex;
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentIndex(idx);
                            setShowGrid(false);
                          }}
                          className={`aspect-square rounded-lg font-black text-[10px] italic transition-all active:scale-90 touch-manipulation flex items-center justify-center ${
                            isCurrent
                              ? "bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 ring-offset-[#0d0d0f]"
                              : answered
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded bg-orange-500" />
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Atual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Respondida</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded bg-white/5 border border-white/10" />
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Em branco</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SUBMIT FOOTER ── */}
        {!result && (
          <div className="p-4 bg-[#0a0a0c] border-t border-white/5 shrink-0">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/30 border-none disabled:opacity-40"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Entregar Simulado
            </Button>
            {answeredCount < questions.length && (
              <p className="text-[9px] text-amber-400/70 font-bold uppercase tracking-wider text-center mt-2">
                {questions.length - answeredCount} {questions.length - answeredCount === 1 ? "questão em branco" : "questões em branco"}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
