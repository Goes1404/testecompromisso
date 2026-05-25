"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Scroll,
  Award,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  FileText,
  Timer,
  Flag,
  ChevronLeft,
  ChevronRight,
  Save,
  Sparkles,
  Pause,
  Play,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { SupportingTextBlock } from "@/components/SupportingTextBlock";

type Exam = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  exam_type: string;
  pdf_url: string | null;
  question_count: number;
};

type Question = {
  id: string;
  question_text: string;
  options: { key: string; text: string }[];
  supporting_text: string | null;
  image_url: string | null;
  correct_answer: string;
  explanation: string | null;
  subjects: { name: string } | null;
};

type Answer = {
  questionId: string;
  selected: string;
  correct: string;
  explanation: string | null;
  question_text: string;
  options: { key: string; text: string }[];
  subject: string | null;
};

type PageState = "loading" | "list" | "active" | "finished" | "error";

// ── Color scheme per exam_type (static for Tailwind) ─────────────────────────
function examTypeStyles(type: string) {
  const t = (type || "").toLowerCase();
  if (t === "enem")
    return {
      chip: "bg-purple-500/15 text-purple-400 border-purple-500/25",
      glow: "shadow-purple-500/30",
      ring: "from-purple-500/40 to-fuchsia-500/40",
      label: "ENEM",
    };
  if (t.includes("fuvest") || t.includes("usp"))
    return {
      chip: "bg-blue-500/15 text-blue-400 border-blue-500/25",
      glow: "shadow-blue-500/30",
      ring: "from-blue-500/40 to-indigo-500/40",
      label: "FUVEST",
    };
  if (t.includes("etec") || t.includes("fatec"))
    return {
      chip: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
      glow: "shadow-emerald-500/30",
      ring: "from-emerald-500/40 to-teal-500/40",
      label: t.toUpperCase(),
    };
  return {
    chip: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    glow: "shadow-orange-500/30",
    ring: "from-orange-500/40 to-amber-500/40",
    label: (type || "").toUpperCase(),
  };
}

export default function ProvasCompletasPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(false);

  const fetchExams = useCallback(async () => {
    setPageState("loading");
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("id, title, description, year, exam_type, pdf_url, exam_questions(count)")
        .order("year", { ascending: false });

      if (error) throw error;

      const mapped: Exam[] = (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        year: e.year,
        exam_type: e.exam_type,
        pdf_url: e.pdf_url,
        question_count: e.exam_questions?.[0]?.count ?? 0,
      }));

      setExams(mapped);
      setPageState("list");
    } catch (e: any) {
      setErrorMsg(e.message || "Erro ao carregar provas.");
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const startExam = async (exam: Exam) => {
    setPageState("loading");
    try {
      const { data, error } = await supabase
        .from("exam_questions")
        .select(
          "order_index, questions(id, question_text, supporting_text, image_url, options, correct_answer, explanation, subjects(name))"
        )
        .eq("exam_id", exam.id)
        .order("order_index");

      if (error) throw error;

      const qs: Question[] = (data || []).map((row: any) => row.questions).filter(Boolean);

      if (qs.length === 0) {
        toast({
          title: "Prova sem questões",
          description: "Esta prova ainda não tem questões cadastradas.",
          variant: "destructive",
        });
        setPageState("list");
        return;
      }

      setActiveExam(exam);
      setQuestions(qs);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setAnswers([]);
      setMarkedForReview(new Set());
      setTimeLeft(qs.length * 3.5 * 60);
      setIsPaused(false);
      setShowGrid(false);

      setPageState("active");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setPageState("list");
    }
  };

  // Timer
  useEffect(() => {
    if (pageState !== "active" || timeLeft === null || isPaused) return;

    if (timeLeft <= 0) {
      toast({ title: "Tempo esgotado!", description: "Prova finalizada automaticamente.", variant: "destructive" });
      finishExam(answers);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [pageState, timeLeft, isPaused, answers]);

  const toggleReview = (id: string) => {
    const newSet = new Set(markedForReview);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setMarkedForReview(newSet);
  };

  // Commit current selected answer to the answers array (replace if exists)
  const commitCurrent = (): Answer[] => {
    const q = questions[currentIndex];
    if (!q || !selectedAnswer) return answers;
    const record: Answer = {
      questionId: q.id,
      selected: selectedAnswer,
      correct: q.correct_answer,
      explanation: q.explanation,
      question_text: q.question_text,
      options: q.options,
      subject: q.subjects?.name ?? null,
    };
    return [...answers.filter((a) => a.questionId !== q.id), record];
  };

  const goToIndex = (idx: number) => {
    const next = commitCurrent();
    setAnswers(next);
    setCurrentIndex(idx);
    const existing = next.find((a) => a.questionId === questions[idx]?.id);
    setSelectedAnswer(existing?.selected ?? null);
    setShowGrid(false);
  };

  const goPrev = () => {
    if (currentIndex > 0) goToIndex(currentIndex - 1);
  };

  const goNext = () => {
    if (currentIndex + 1 < questions.length) {
      goToIndex(currentIndex + 1);
    } else {
      // Last question — finish
      const final = commitCurrent();
      finishExam(final);
    }
  };

  const finishExam = async (finalAnswers: Answer[]) => {
    const score = finalAnswers.filter((a) => a.selected === a.correct).length;
    setAnswers(finalAnswers);
    setPageState("finished");

    if (!user || !activeExam) return;
    try {
      await supabase.from("exam_attempts").insert({
        user_id: user.id,
        exam_id: activeExam.id,
        score,
        total_questions: finalAnswers.length,
        answers: finalAnswers.map((a) => ({ questionId: a.questionId, selected: a.selected, correct: a.correct })),
      });
    } catch {
      // silent
    }
  };

  const correctCount = answers.filter((a) => a.selected === a.correct).length;
  const pct = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];
  const answeredCount = answers.length + (selectedAnswer && !answers.find((a) => a.questionId === currentQuestion?.id) ? 1 : 0);

  // ════════════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════════════
  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/55 animate-pulse">
          Sintonizando provas...
        </p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR
  // ════════════════════════════════════════════════════════════════════════════
  if (pageState === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-14 w-14 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-red-400 font-black italic text-sm">{errorMsg}</p>
        <Button
          onClick={fetchExams}
          className="h-11 px-5 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest"
        >
          <RotateCw className="h-3.5 w-3.5 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIST — clean catalog, no Unsplash covers, typography-driven
  // ════════════════════════════════════════════════════════════════════════════
  if (pageState === "list") {
    return (
      <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* ── Hero ── */}
        <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 80% 10%, rgba(255,107,0,0.13) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(168,85,247,0.10) 0%, transparent 60%)",
            }}
          />
          <Scroll className="absolute right-4 top-4 h-20 w-20 text-white/[0.04]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3 w-3 text-orange-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/85">
                Área de Treinamento
              </p>
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
              Provas Completas
            </h1>
            <p className="text-white/40 text-xs font-semibold mt-1 max-w-md leading-relaxed">
              Treine resistência e gestão de tempo com provas anteriores sob simulado real.
            </p>

            <div className="flex items-center gap-2 mt-4">
              <Badge className="bg-white/5 text-white/60 border border-white/10 font-black text-[9px] uppercase tracking-widest px-2 h-5">
                {exams.length} provas
              </Badge>
              <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/25 font-black text-[9px] uppercase tracking-widest px-2 h-5">
                {exams.filter((e) => e.question_count > 0).length} c/ questões
              </Badge>
            </div>
          </div>
        </div>

        {/* ── Empty state ── */}
        {exams.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-[1.5rem]">
            <BookOpen className="h-9 w-9 mx-auto mb-2 text-white/15" />
            <p className="text-sm font-black italic text-white/55 uppercase tracking-widest">
              Nenhuma prova cadastrada
            </p>
            <p className="text-[10px] text-white/45 font-medium mt-1.5 max-w-xs mx-auto">
              A equipe pedagógica disponibilizará provas em breve.
            </p>
          </div>
        ) : (
          /* ── Grid of exams — typography & color over imagery ─────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exams.map((exam) => {
              const s = examTypeStyles(exam.exam_type);
              const hasContent = exam.question_count > 0 || exam.pdf_url;
              return (
                <div
                  key={exam.id}
                  className="relative bg-white/3 border border-white/6 hover:border-white/15 rounded-[1.5rem] overflow-hidden transition-all group"
                >
                  {/* Decorative top accent bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${s.ring}`} />

                  <div className="p-5 space-y-4">
                    {/* Year + Type header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {exam.year && (
                          <p className="text-4xl font-black italic text-white leading-none tracking-tighter">
                            {exam.year}
                          </p>
                        )}
                        <Badge className={`${s.chip} border font-black text-[9px] uppercase tracking-widest px-1.5 h-4 mt-1.5`}>
                          {s.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {exam.pdf_url && (
                          <div className="h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center" title="PDF disponível">
                            <FileText className="h-3 w-3 text-emerald-400" />
                          </div>
                        )}
                        {exam.question_count > 0 && (
                          <div className="h-7 px-2 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center gap-1" title="Questões cadastradas">
                            <BookOpen className="h-3 w-3 text-orange-400" />
                            <span className="text-[10px] font-black text-orange-400">{exam.question_count}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title + description */}
                    <div>
                      <h3 className="text-sm font-black text-white italic leading-snug line-clamp-2">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="text-[11px] text-white/40 font-medium italic line-clamp-2 leading-snug mt-1.5">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    {/* CTAs */}
                    <div className="space-y-2 pt-1 border-t border-white/5">
                      {exam.pdf_url && (
                        <Link href={`/dashboard/student/provas/${exam.id}`} className="block">
                          <button className={`w-full h-11 rounded-xl bg-gradient-to-r ${s.ring} text-white font-black text-[10px] uppercase tracking-widest shadow-lg ${s.glow} transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2`}>
                            <FileText className="h-3.5 w-3.5" />
                            PDF Interativo
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </Link>
                      )}
                      {exam.question_count > 0 && (
                        <button
                          onClick={() => startExam(exam)}
                          className="w-full h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/15 text-white/80 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2"
                        >
                          <Timer className="h-3.5 w-3.5" />
                          Simulado na Tela
                        </button>
                      )}
                      {!hasContent && (
                        <p className="text-center text-[10px] text-white/55 font-medium italic py-2">
                          Material em preparação
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVE — taking the exam (focused single-question UX)
  // ════════════════════════════════════════════════════════════════════════════
  if (pageState === "active" && currentQuestion) {
    const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };
    const isLowTime = timeLeft !== null && timeLeft < 300;
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
    const isFirst = currentIndex === 0;
    const isLast = currentIndex + 1 >= questions.length;

    return (
      <div className="pb-24 space-y-4 animate-in fade-in duration-500">

        {/* ── Compact command bar ── */}
        <div className="relative rounded-2xl overflow-hidden bg-[#0d0d0f] border border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-400/85">
                Simulado em andamento
              </p>
              <p className="text-sm font-black italic text-white truncate leading-snug">
                {activeExam?.title}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 px-3 h-10 rounded-xl font-black text-base border transition-all ${
                isLowTime
                  ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                  : "bg-white/5 border-white/10 text-white"
              }`}
            >
              <Timer className={`h-4 w-4 ${isLowTime ? "text-red-400" : "text-orange-400"}`} />
              <span className="font-mono">{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 flex items-center justify-center transition-all active:scale-95"
              title={isPaused ? "Retomar" : "Pausar"}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Progress + question counter */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
              <span>Questão {currentIndex + 1} de {questions.length}</span>
              <span>{answeredCount}/{questions.length} respondidas</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Sub-bar: chips + grid toggle ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentQuestion.subjects?.name && (
            <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/25 font-black text-[9px] uppercase tracking-widest px-2 h-5">
              {currentQuestion.subjects.name}
            </Badge>
          )}
          {markedForReview.has(currentQuestion.id) && (
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/25 font-black text-[9px] uppercase tracking-widest px-2 h-5 flex items-center gap-1">
              <Flag className="h-2.5 w-2.5" /> Revisar
            </Badge>
          )}
          <button
            onClick={() => toggleReview(currentQuestion.id)}
            className={`ml-auto h-7 w-7 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
              markedForReview.has(currentQuestion.id)
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 border border-white/10 text-white/40 hover:text-white/70"
            }`}
            title="Marcar para revisar"
          >
            <Flag className="h-3 w-3" />
          </button>
          <button
            onClick={() => setShowGrid((s) => !s)}
            className={`h-7 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
              showGrid ? "bg-orange-500 text-white" : "bg-white/5 border border-white/10 text-white/60"
            }`}
          >
            <LayoutGrid className="h-2.5 w-2.5" />
            Mapa
          </button>
        </div>

        {/* ── Question Grid (jump-to) — collapsed by default ── */}
        {showGrid && (
          <div className="bg-white/3 border border-white/6 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-2">
              Mapa de questões
            </p>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!answers.find((a) => a.questionId === q.id) || (isCurrent && !!selectedAnswer);
                const isMarked = markedForReview.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => goToIndex(idx)}
                    className={`aspect-square rounded-lg font-black text-[10px] italic transition-all active:scale-90 touch-manipulation flex items-center justify-center ${
                      isCurrent
                        ? "bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 ring-offset-[#0a0a0c]"
                        : isMarked
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : isAnswered
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Question card ── */}
        <div className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden">
          <div className="p-5 space-y-5">
            {/* Supporting text */}
            {currentQuestion.supporting_text && (
              <SupportingTextBlock text={currentQuestion.supporting_text} />
            )}

            {/* Image */}
            {currentQuestion.image_url && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0c] p-2">
                <img
                  src={currentQuestion.image_url}
                  alt="Visual de apoio"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Question text */}
            <p className="text-base font-bold text-white italic leading-relaxed">
              {currentQuestion.question_text.replace("[IMAGEM_PENDENTE]", "")}
            </p>

            {/* Options */}
            <RadioGroup
              value={selectedAnswer ?? ""}
              onValueChange={setSelectedAnswer}
              className="space-y-2"
            >
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswer === opt.key;
                return (
                  <Label
                    key={opt.key}
                    htmlFor={`opt-${opt.key}`}
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all touch-manipulation active:scale-[0.99] ${
                      isSelected
                        ? "bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/10"
                        : "bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15"
                    }`}
                  >
                    <RadioGroupItem
                      id={`opt-${opt.key}`}
                      value={opt.key}
                      className={`mt-1 shrink-0 ${isSelected ? "text-orange-400" : ""}`}
                    />
                    <div className="flex gap-2.5 flex-1">
                      <span
                        className={`font-black italic text-sm shrink-0 ${
                          isSelected ? "text-orange-400" : "text-white/40"
                        }`}
                      >
                        {opt.key})
                      </span>
                      <span
                        className={`font-semibold text-sm leading-relaxed ${
                          isSelected ? "text-white" : "text-white/70"
                        }`}
                      >
                        {opt.text}
                      </span>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          {/* ── Prev/Next nav footer ── */}
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
                className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 touch-manipulation ${
                  isLast
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30"
                }`}
              >
                {isLast ? (
                  <>
                    Finalizar
                    <Save className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => finishExam(commitCurrent())}
              className="w-full mt-2 h-10 rounded-xl text-red-400/80 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
              Finalizar prova agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINISHED — score recap + analytical gabarito
  // ════════════════════════════════════════════════════════════════════════════
  if (pageState === "finished") {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;
    const isGood = pct >= 60;

    return (
      <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ── Score Hero ── */}
        <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isGood
                ? "radial-gradient(ellipse at 100% 0%, rgba(16,185,129,0.18) 0%, transparent 60%)"
                : "radial-gradient(ellipse at 100% 0%, rgba(245,158,11,0.18) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-2">
              <Award className={`h-4 w-4 ${isGood ? "text-emerald-400" : "text-amber-400"}`} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                {pct >= 80 ? "Excelente rendimento" : pct >= 60 ? "Bom trabalho" : "Continue praticando"}
              </p>
            </div>
            <h2 className="text-lg font-black italic text-white tracking-tighter leading-none">
              {activeExam?.title}
            </h2>

            {/* SVG gauge */}
            <div className="relative flex items-center justify-center h-40 w-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={isGood ? "#10b981" : "#f59e0b"}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black italic text-white tracking-tighter leading-none">{pct}</span>
                <span className="text-sm font-black text-white/40 italic">%</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/55 mt-1">
                  Aproveitamento
                </span>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-md">
              <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl py-2.5">
                <span className="text-xl font-black text-emerald-400 leading-none italic">{correctCount}</span>
                <span className="text-[8px] font-bold text-emerald-400/80 uppercase tracking-wider mt-0.5">Acertos</span>
              </div>
              <div className="flex flex-col items-center bg-red-500/10 border border-red-500/20 rounded-2xl py-2.5">
                <span className="text-xl font-black text-red-400 leading-none italic">{answers.length - correctCount}</span>
                <span className="text-[8px] font-bold text-red-400/80 uppercase tracking-wider mt-0.5">Erros</span>
              </div>
              <div className="flex flex-col items-center bg-white/5 border border-white/8 rounded-2xl py-2.5">
                <span className="text-xl font-black text-white leading-none italic">{answers.length}</span>
                <span className="text-[8px] font-bold text-white/55 uppercase tracking-wider mt-0.5">Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setPageState("list");
              fetchExams();
            }}
            className="h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
          >
            Outra prova
          </button>
          <button
            onClick={() => activeExam && startExam(activeExam)}
            className="h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/30 transition-all active:scale-95"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1.5 inline" />
            Refazer
          </button>
        </div>

        {/* ── Analytical gabarito ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <BookOpen className="h-4 w-4 text-orange-400/80" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
              Gabarito analítico
            </p>
          </div>
          {answers.map((ans, i) => {
            const isCorrect = ans.selected === ans.correct;
            return (
              <div
                key={ans.questionId}
                className="bg-white/3 border border-white/6 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    className={`border font-black text-[9px] uppercase tracking-widest px-1.5 h-5 flex items-center gap-1 ${
                      isCorrect
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                        : "bg-red-500/15 text-red-400 border-red-500/25"
                    }`}
                  >
                    {isCorrect ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                    {isCorrect ? "Correto" : "Incorreto"}
                  </Badge>
                  <Badge className="bg-white/5 text-white/50 border border-white/10 font-black text-[9px] uppercase tracking-widest px-1.5 h-5">
                    Q{i + 1}
                  </Badge>
                  {ans.subject && (
                    <Badge className="bg-orange-500/10 text-orange-400/80 border border-orange-500/20 font-black text-[9px] uppercase tracking-widest px-1.5 h-5">
                      {ans.subject}
                    </Badge>
                  )}
                </div>

                <p className="text-sm font-bold text-white/80 italic leading-relaxed line-clamp-3">
                  {ans.question_text}
                </p>

                <div className="space-y-1.5">
                  {ans.options.map((opt) => {
                    const isCorrectOpt = opt.key === ans.correct;
                    const isSelectedOpt = opt.key === ans.selected;
                    return (
                      <div
                        key={opt.key}
                        className={`flex items-start gap-2 p-2.5 rounded-xl text-xs font-semibold border ${
                          isCorrectOpt
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            : isSelectedOpt && !isCorrect
                            ? "bg-red-500/10 border-red-500/20 text-red-300 line-through"
                            : "bg-white/3 border-white/5 text-white/40"
                        }`}
                      >
                        <span className="font-black italic w-4 shrink-0">{opt.key})</span>
                        <span className="leading-normal flex-1">{opt.text}</span>
                        {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {ans.explanation && (
                  <div className="bg-[#0a0a0c] rounded-xl p-3 border border-white/5 border-l-2 border-l-orange-500">
                    <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1">
                      Comentário do professor
                    </p>
                    <p className="text-[11px] font-medium text-white/50 italic leading-relaxed">
                      {ans.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
