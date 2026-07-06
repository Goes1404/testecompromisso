"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Download,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { SupportingTextBlock } from "@/components/SupportingTextBlock";
import { FlameEmberCanvas } from "@/components/FlameEmberCanvas";
import { estimateThetaEAP, mapThetaToEnemScore } from "@/lib/tri-solver";

type Exam = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  exam_type: string;
  pdf_url: string | null;
  question_count: number;
  gabarito_url: string | null;
  gabarito_comentado_url: string | null;
  difficulty_level: string | null;
  is_special_cursinho?: boolean;
  tri_score_calculated?: boolean;
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
  tri_a?: number;
  tri_b?: number;
  tri_c?: number;
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

function examTypeStyles(type: string) {
  const t = (type || "").toLowerCase();
  if (t === "enem")
    return {
      chip: "bg-purple-100 text-purple-700 border-purple-200",
      glow: "shadow-purple-500/20",
      ring: "from-purple-600 to-fuchsia-600",
      label: "ENEM",
    };
  if (t.includes("fuvest") || t.includes("usp"))
    return {
      chip: "bg-blue-100 text-blue-700 border-blue-200",
      glow: "shadow-blue-500/20",
      ring: "from-blue-600 to-indigo-600",
      label: "FUVEST",
    };
  if (t.includes("etec") || t.includes("fatec"))
    return {
      chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
      glow: "shadow-emerald-500/20",
      ring: "from-emerald-600 to-teal-600",
      label: t.toUpperCase(),
    };
  return {
    chip: "bg-orange-100 text-orange-700 border-orange-200",
    glow: "shadow-orange-500/20",
    ring: "from-orange-500 to-amber-500",
    label: (type || "").toUpperCase(),
  };
}

const norm = (v: string | undefined | null) => (v ?? "").trim().toUpperCase();
const triggerHaptic = (ms = 15) => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
};

export default function ProvasCompletasPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers]       = useState<Answer[]>([]);
  const [errorMsg, setErrorMsg]     = useState("");
  const [timeLeft, setTimeLeft]     = useState<number | null>(null);
  const [isPaused, setIsPaused]     = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid]     = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Group exams by type and year
  const groupedExams = useMemo(() => {
    const groups: Record<string, Exam[]> = {};
    exams.forEach((exam) => {
      const key = `${exam.exam_type}-${exam.year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(exam);
    });

    return Object.entries(groups).map(([key, list]) => {
      // Sort variants: Day 1 before Day 2
      const sorted = [...list].sort((a, b) => {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        if (titleA.includes("dia 1") || titleA.includes("-1")) return -1;
        if (titleB.includes("dia 1") || titleB.includes("-1")) return 1;
        return a.title.localeCompare(b.title);
      });
      return {
        key,
        exam_type: sorted[0].exam_type,
        year: sorted[0].year,
        variants: sorted,
      };
    }).sort((a, b) => (b.year || 0) - (a.year || 0));
  }, [exams]);

  // Set default selected variant for each group
  useEffect(() => {
    const defaults: Record<string, string> = {};
    groupedExams.forEach((group) => {
      if (group.variants.length > 0 && !selectedVariants[group.key]) {
        defaults[group.key] = group.variants[0].id;
      }
    });
    if (Object.keys(defaults).length > 0) {
      setSelectedVariants((prev) => ({ ...defaults, ...prev }));
    }
  }, [groupedExams, selectedVariants]);

  const fetchExams = useCallback(async () => {
    if (!user) return;
    setPageState("loading");
    try {
      // Determina o foco do aluno: ETEC ou ENEM
      const rawTarget = (
        profile?.exam_target ||
        user?.user_metadata?.exam_target ||
        profile?.profile_type ||
        user?.user_metadata?.profile_type ||
        'enem'
      ).toLowerCase();
      const isEtec = rawTarget.includes('etec');
      const allowedType = isEtec ? 'etec' : 'enem';

      let query = supabase
        .from("exams")
        .select("id, title, description, year, exam_type, pdf_url, gabarito_url, gabarito_comentado_url, difficulty_level, is_special_cursinho, tri_score_calculated, exam_questions(count)")
        .eq("exam_type", allowedType)
        .order("year", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Exam[] = (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        year: e.year,
        exam_type: e.exam_type,
        pdf_url: e.pdf_url,
        gabarito_url: e.gabarito_url ?? null,
        gabarito_comentado_url: e.gabarito_comentado_url ?? null,
        difficulty_level: e.difficulty_level ?? null,
        is_special_cursinho: e.is_special_cursinho ?? false,
        tri_score_calculated: e.tri_score_calculated ?? false,
        question_count: e.exam_questions?.[0]?.count ?? 0,
      }));

      setExams(mapped);
      setPageState("list");
    } catch (e: any) {
      setErrorMsg(e.message || "Erro ao carregar provas.");
      setPageState("error");
    }
  }, [user, profile]);

  useEffect(() => {
    if (user) fetchExams();
  }, [fetchExams, user]);

  const startExam = async (exam: Exam) => {
    setPageState("loading");
    try {
      const { data, error } = await supabase
        .from("exam_questions")
        .select(
          "order_index, questions(id, question_text, supporting_text, image_url, options, correct_answer, explanation, tri_a, tri_b, tri_c, subjects(name))"
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
      const final = commitCurrent();
      finishExam(final);
    }
  };

  const finishExam = async (finalAnswers: Answer[]) => {
    const score = finalAnswers.filter((a) => norm(a.selected) === norm(a.correct)).length;
    setAnswers(finalAnswers);
    setPageState("finished");

    if (!user || !activeExam) return;

    let triScore: number | null = null;
    const shouldCalcTri = activeExam.tri_score_calculated || activeExam.exam_type.toLowerCase() === "enem";

    if (shouldCalcTri) {
      const triResponses = finalAnswers.map((ans) => {
        const q = questions.find((q) => q.id === ans.questionId);
        const isRight = norm(ans.selected) === norm(ans.correct);
        return {
          correct: isRight,
          triParams: {
            a: Number(q?.tri_a ?? 1.2),
            b: Number(q?.tri_b ?? 0.2),
            c: Number(q?.tri_c ?? 0.20),
          }
        };
      });
      const theta = estimateThetaEAP(triResponses);
      triScore = mapThetaToEnemScore(theta);
    }

    try {
      await supabase.from("exam_attempts").insert({
        user_id: user.id,
        exam_id: activeExam.id,
        score,
        total_questions: finalAnswers.length,
        answers: finalAnswers.map((a) => ({ questionId: a.questionId, selected: a.selected, correct: a.correct })),
        tri_score: triScore,
      });
    } catch {
      // silent
    }
  };

  const correctCount = answers.filter((a) => norm(a.selected) === norm(a.correct)).length;
  const pct = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];
  const answeredCount = answers.length + (selectedAnswer && !answers.find((a) => a.questionId === currentQuestion?.id) ? 1 : 0);

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
          Sintonizando provas...
        </p>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-14 w-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-600" />
        </div>
        <p className="text-red-600 font-black italic text-sm">{errorMsg}</p>
        <Button
          onClick={fetchExams}
          className="h-11 px-5 rounded-xl bg-white border border-slate-200 text-primary font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50"
        >
          <RotateCw className="h-3.5 w-3.5 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  // ── LIST ─────────────────────────────────────────────────────────────────────
  if (pageState === "list") {
    return (
      <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Hero */}
        <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 shadow-2xl shadow-orange-200 p-6">
          <div className="absolute top-[-10%] right-[-5%] w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <Scroll className="absolute right-4 top-4 h-20 w-20 text-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3 w-3 text-white/80" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
                Área de Treinamento
              </p>
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
              Provas Completas
            </h1>
            <p className="text-white/80 text-xs font-semibold mt-1 max-w-md leading-relaxed">
              Treine resistência e gestão de tempo com provas anteriores sob simulado real.
            </p>

            <div className="flex items-center gap-2 mt-4">
              <Badge className="bg-white/20 text-white border border-white/30 font-black text-[9px] uppercase tracking-widest px-2 h-5">
                {exams.length} provas
              </Badge>
              <Badge className="bg-white/20 text-white border border-white/30 font-black text-[9px] uppercase tracking-widest px-2 h-5">
                {exams.filter((e) => e.question_count > 0).length} c/ questões
              </Badge>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {exams.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-[1.5rem]">
            <BookOpen className="h-9 w-9 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-black italic text-slate-400 uppercase tracking-widest">
              Nenhuma prova cadastrada
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-1.5 max-w-xs mx-auto">
              A equipe pedagógica disponibilizará provas em breve.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groupedExams.map((group) => {
              const selectedId = selectedVariants[group.key] || group.variants[0]?.id;
              const selectedExam = group.variants.find((v) => v.id === selectedId) || group.variants[0];
              if (!selectedExam) return null;

              const s = examTypeStyles(selectedExam.exam_type);
              const hasContent = selectedExam.question_count > 0 || selectedExam.pdf_url;

              const isSpecial = selectedExam.is_special_cursinho;
              const cardBgClass = isSpecial 
                ? "relative card-on-fire text-white border-orange-500/30 shadow-2xl rounded-[1.5rem] overflow-hidden transition-all group flex flex-col justify-between"
                : "relative bg-white border border-slate-100 hover:border-slate-200 shadow-sm rounded-[1.5rem] overflow-hidden transition-all group flex flex-col justify-between";

              return (
                <div
                  key={group.key}
                  className={cardBgClass}
                >
                  {isSpecial && <FlameEmberCanvas className="absolute inset-0 h-full w-full pointer-events-none z-0 opacity-45" />}
                  <div>
                    <div className={`h-1 w-full bg-gradient-to-r ${s.ring}`} />

                    <div className="p-5 pb-2 space-y-4 relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {selectedExam.year && (
                            <p className="text-4xl font-black italic text-primary leading-none tracking-tighter">
                              {selectedExam.year}
                            </p>
                          )}
                          <Badge className={`${s.chip} border font-black text-[9px] uppercase tracking-widest px-1.5 h-4 mt-1.5`}>
                            {s.label}
                          </Badge>
                        </div>

                        {/* Variant Selector Dots */}
                        {group.variants.length > 1 && (
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-2xl">
                            {group.variants.map((variant, idx) => {
                              const isCurrent = variant.id === selectedExam.id;
                              const titleLower = variant.title.toLowerCase();

                              // Determine dot color
                              let dotColor = "bg-orange-500 ring-orange-300 text-white";
                              if (titleLower.includes("azul")) dotColor = "bg-blue-500 ring-blue-300 text-white";
                              else if (titleLower.includes("amarelo")) dotColor = "bg-yellow-500 ring-yellow-250 text-slate-800";
                              else if (titleLower.includes("rosa")) dotColor = "bg-pink-500 ring-pink-300 text-white";
                              else if (titleLower.includes("branco")) dotColor = "bg-white border border-slate-250 ring-slate-200 text-slate-650";
                              else if (titleLower.includes("cinza")) dotColor = "bg-zinc-400 ring-zinc-200 text-white";

                              // Determine label
                              let label = String(idx + 1);
                              if (titleLower.includes("dia 1") || titleLower.includes("-1")) label = "1";
                              else if (titleLower.includes("dia 2") || titleLower.includes("-2")) label = "2";

                              return (
                                <button
                                  key={variant.id}
                                  onClick={() => {
                                    triggerHaptic(10);
                                    setSelectedVariants((prev) => ({ ...prev, [group.key]: variant.id }));
                                  }}
                                  className={`h-6 w-6 rounded-full flex items-center justify-center font-black text-[9px] transition-all active:scale-90
                                    ${dotColor}
                                    ${isCurrent
                                      ? "ring-2 ring-offset-2 ring-offset-white scale-110 shadow-sm"
                                      : "opacity-40 hover:opacity-80"}`}
                                  title={variant.title}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          {selectedExam.pdf_url && (
                            <div className="h-7 w-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center" title="PDF disponível">
                              <FileText className="h-3 w-3 text-emerald-600" />
                            </div>
                          )}
                          {selectedExam.question_count > 0 && (
                            <div className="h-7 px-2 rounded-lg bg-orange-100 border border-orange-200 flex items-center gap-1" title="Questões cadastradas">
                              <BookOpen className="h-3 w-3 text-orange-600" />
                              <span className="text-[10px] font-black text-orange-700">{selectedExam.question_count}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className={`text-sm font-black italic leading-snug line-clamp-2 ${isSpecial ? "text-orange-400 group-hover:text-orange-300" : "text-primary"}`}>
                          {selectedExam.title}
                        </h3>
                        {selectedExam.description && (
                          <p className={`text-[11px] font-medium italic line-clamp-2 leading-snug mt-1.5 ${isSpecial ? "text-white/70" : "text-slate-500"}`}>
                            {selectedExam.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-2 relative z-10">
                    <div className="space-y-2 pt-1 border-t border-slate-100/10">
                      {selectedExam.pdf_url && (
                        <div className="flex gap-2">
                          <Link href={`/dashboard/student/provas/${selectedExam.id}`} className="flex-1">
                            <button className={`w-full h-11 rounded-xl bg-gradient-to-r ${s.ring} text-white font-black text-[10px] uppercase tracking-widest shadow-lg ${s.glow} transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2`}>
                              <FileText className="h-3.5 w-3.5" />
                              PDF Interativo
                            </button>
                          </Link>
                          <a href={selectedExam.pdf_url} target="_blank" rel="noopener noreferrer">
                            <button className={`h-11 w-11 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${isSpecial ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650"}`} title="Baixar PDF Original">
                              <Download className="h-4.5 w-4.5" />
                            </button>
                          </a>
                        </div>
                      )}
                      {selectedExam.question_count > 0 && (
                        <button
                          onClick={() => startExam(selectedExam)}
                          className={`w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2 ${isSpecial ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"}`}
                        >
                          <Timer className="h-3.5 w-3.5" />
                          Simulado na Tela
                        </button>
                      )}
                      {/* Gabarito Comentado */}
                      {selectedExam.gabarito_comentado_url && (
                        <a href={selectedExam.gabarito_comentado_url} target="_blank" rel="noopener noreferrer" className="block">
                          <button className="w-full h-10 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            📄 Gabarito Comentado
                          </button>
                        </a>
                      )}
                      {selectedExam.gabarito_url && !selectedExam.gabarito_comentado_url && (
                        <a href={selectedExam.gabarito_url} target="_blank" rel="noopener noreferrer" className="block">
                          <button className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            Ver Gabarito
                          </button>
                        </a>
                      )}
                      {!hasContent && !selectedExam.gabarito_url && (
                        <p className="text-center text-[10px] text-slate-400 font-medium italic py-2">
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

  // ── ACTIVE ───────────────────────────────────────────────────────────────────
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

        {/* Command bar */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-600">
                Simulado em andamento
              </p>
              <p className="text-sm font-black italic text-primary truncate leading-snug">
                {activeExam?.title}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 px-3 h-10 rounded-xl font-black text-base border transition-all ${
                isLowTime
                  ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                  : "bg-slate-100 border-slate-200 text-primary"
              }`}
            >
              <Timer className={`h-4 w-4 ${isLowTime ? "text-red-500" : "text-orange-500"}`} />
              <span className="font-mono">{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95"
              title={isPaused ? "Retomar" : "Pausar"}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Questão {currentIndex + 1} de {questions.length}</span>
              <span>{answeredCount}/{questions.length} respondidas</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sub-bar: chips + grid toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentQuestion.subjects?.name && (
            <Badge className="bg-orange-100 text-orange-700 border border-orange-200 font-black text-[9px] uppercase tracking-widest px-2 h-5">
              {currentQuestion.subjects.name}
            </Badge>
          )}
          {markedForReview.has(currentQuestion.id) && (
            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-black text-[9px] uppercase tracking-widest px-2 h-5 flex items-center gap-1">
              <Flag className="h-2.5 w-2.5" /> Revisar
            </Badge>
          )}
          <button
            onClick={() => toggleReview(currentQuestion.id)}
            className={`ml-auto h-7 w-7 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
              markedForReview.has(currentQuestion.id)
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700"
            }`}
            title="Marcar para revisar"
          >
            <Flag className="h-3 w-3" />
          </button>
          <button
            onClick={() => setShowGrid((s) => !s)}
            className={`h-7 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
              showGrid ? "bg-orange-500 text-white" : "bg-slate-100 border border-slate-200 text-slate-600"
            }`}
          >
            <LayoutGrid className="h-2.5 w-2.5" />
            Mapa
          </button>
        </div>

        {/* Question Grid (jump-to) */}
        {showGrid && (
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">
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
                        ? "bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 ring-offset-white"
                        : isMarked
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : isAnswered
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Question card */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-[1.5rem] overflow-hidden">
          <div className="p-5 space-y-5">
            {currentQuestion.supporting_text && (
              <SupportingTextBlock text={currentQuestion.supporting_text} />
            )}

            {currentQuestion.image_url && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                <img
                  src={currentQuestion.image_url}
                  alt="Visual de apoio"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <p className="text-base font-bold text-primary italic leading-relaxed">
              {currentQuestion.question_text.replace("[IMAGEM_PENDENTE]", "")}
            </p>

            <RadioGroup
              value={selectedAnswer ?? ""}
              onValueChange={setSelectedAnswer}
              className="space-y-2"
            >
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswer === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => setSelectedAnswer(opt.key)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all touch-manipulation active:scale-[0.99] ${
                      isSelected
                        ? "bg-orange-50 border-orange-400 shadow-sm shadow-orange-100"
                        : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <RadioGroupItem
                      id={`opt-${opt.key}`}
                      value={opt.key}
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-1 shrink-0 ${isSelected ? "text-orange-500" : ""}`}
                    />
                    <div className="flex gap-2.5 flex-1">
                      <span
                        className={`font-black italic text-sm shrink-0 ${
                          isSelected ? "text-orange-600" : "text-slate-400"
                        }`}
                      >
                        {opt.key})
                      </span>
                      <span
                        className={`font-semibold text-sm leading-relaxed ${
                          isSelected ? "text-primary" : "text-slate-600"
                        }`}
                      >
                        {opt.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Prev/Next nav footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={goPrev}
                disabled={isFirst}
                className="h-12 rounded-2xl flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed"
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
              className="w-full mt-2 h-10 rounded-xl text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
              Finalizar prova agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FINISHED ─────────────────────────────────────────────────────────────────
  if (pageState === "finished") {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;
    const isGood = pct >= 60;

    return (
      <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Score Hero */}
        <div className={`relative rounded-[2rem] overflow-hidden p-6 shadow-2xl ${
          isGood
            ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 shadow-emerald-200"
            : "bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 shadow-orange-200"
        }`}>
          <div className="absolute top-[-10%] right-[-5%] w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-2">
              <Award className={`h-4 w-4 ${isGood ? "text-emerald-200" : "text-amber-200"}`} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
                {pct >= 80 ? "Excelente rendimento" : pct >= 60 ? "Bom trabalho" : "Continue praticando"}
              </p>
            </div>
            <h2 className="text-lg font-black italic text-white tracking-tighter leading-none">
              {activeExam?.title}
            </h2>

            {/* SVG gauge */}
            <div className="relative flex items-center justify-center h-40 w-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="10" />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black italic text-white tracking-tighter leading-none">{pct}</span>
                <span className="text-sm font-black text-white/70 italic">%</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/60 mt-1">
                  Aproveitamento
                </span>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-md">
              <div className="flex flex-col items-center bg-white/20 border border-white/30 rounded-2xl py-2.5">
                <span className="text-xl font-black text-white leading-none italic">{correctCount}</span>
                <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider mt-0.5">Acertos</span>
              </div>
              <div className="flex flex-col items-center bg-white/20 border border-white/30 rounded-2xl py-2.5">
                <span className="text-xl font-black text-white leading-none italic">{answers.length - correctCount}</span>
                <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider mt-0.5">Erros</span>
              </div>
              <div className="flex flex-col items-center bg-white/20 border border-white/30 rounded-2xl py-2.5">
                <span className="text-xl font-black text-white leading-none italic">{answers.length}</span>
                <span className="text-[8px] font-bold text-white/70 uppercase tracking-wider mt-0.5">Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setPageState("list");
              fetchExams();
            }}
            className="h-12 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-primary font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
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

        {/* Analytical gabarito */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <BookOpen className="h-4 w-4 text-orange-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
              Gabarito analítico
            </p>
          </div>
          {answers.map((ans, i) => {
            const isCorrect = norm(ans.selected) === norm(ans.correct);
            return (
              <div
                key={ans.questionId}
                className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    className={`border font-black text-[9px] uppercase tracking-widest px-1.5 h-5 flex items-center gap-1 ${
                      isCorrect
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-red-100 text-red-700 border-red-200"
                    }`}
                  >
                    {isCorrect ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                    {isCorrect ? "Correto" : "Incorreto"}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-500 border border-slate-200 font-black text-[9px] uppercase tracking-widest px-1.5 h-5">
                    Q{i + 1}
                  </Badge>
                  {ans.subject && (
                    <Badge className="bg-orange-100 text-orange-700 border border-orange-200 font-black text-[9px] uppercase tracking-widest px-1.5 h-5">
                      {ans.subject}
                    </Badge>
                  )}
                </div>

                <p className="text-sm font-bold text-slate-700 italic leading-relaxed line-clamp-3">
                  {ans.question_text}
                </p>

                <div className="space-y-1.5">
                  {ans.options.map((opt) => {
                    const isCorrectOpt = norm(opt.key) === norm(ans.correct);
                    const isSelectedOpt = norm(opt.key) === norm(ans.selected);
                    return (
                      <div
                        key={opt.key}
                        className={`flex items-start gap-2 p-2.5 rounded-xl text-xs font-semibold border ${
                          isCorrectOpt
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : isSelectedOpt && !isCorrect
                            ? "bg-red-50 border-red-200 text-red-700 line-through"
                            : "bg-white border-slate-100 text-slate-600"
                        }`}
                      >
                        <span className="font-black italic w-4 shrink-0">{opt.key})</span>
                        <span className="leading-normal flex-1">{opt.text}</span>
                        {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {ans.explanation && (
                  <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 border-l-2 border-l-orange-500">
                    <p className="text-[9px] font-black uppercase tracking-widest text-orange-600 mb-1">
                      Comentário do professor
                    </p>
                    <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed">
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
