'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Scroll, Award, RotateCw, AlertCircle, CheckCircle2, XCircle, 
  BookOpen, FileText, Timer, Flag, ChevronLeft, ChevronRight, Save, Sparkles 
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/app/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { SupportingTextBlock } from '@/components/SupportingTextBlock';

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

type PageState = 'loading' | 'list' | 'active' | 'finished' | 'error';

const getExamCover = (title: string, examType: string) => {
  const t = (title || '').toLowerCase();
  const type = (examType || '').toLowerCase();
  if (type === 'enem') {
    return 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('fuvest') || t.includes('usp')) {
    return 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('unicamp')) {
    return 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('matemática') || t.includes('exatas') || t.includes('física')) {
    return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('biologia') || t.includes('química') || t.includes('natureza')) {
    return 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('história') || t.includes('geografia') || t.includes('humanas')) {
    return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';
};

export default function ProvasCompletasPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  const fetchExams = useCallback(async () => {
    setPageState('loading');
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, description, year, exam_type, pdf_url, exam_questions(count)')
        .order('year', { ascending: false });

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
      setPageState('list');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro ao carregar provas.');
      setPageState('error');
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const startExam = async (exam: Exam) => {
    setPageState('loading');
    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('order_index, questions(id, question_text, supporting_text, image_url, options, correct_answer, explanation, subjects(name))')
        .eq('exam_id', exam.id)
        .order('order_index');

      if (error) throw error;

      const qs: Question[] = (data || [])
        .map((row: any) => row.questions)
        .filter(Boolean);

      if (qs.length === 0) {
        toast({ title: 'Prova sem questões', description: 'Esta prova ainda não tem questões cadastradas.', variant: 'destructive' });
        setPageState('list');
        return;
      }

      setActiveExam(exam);
      setQuestions(qs);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setAnswers([]);
      setMarkedForReview(new Set());
      
      // Set time based on question count (3.5 minutes per question, similar to ENEM)
      setTimeLeft(qs.length * 3.5 * 60); 
      setIsPaused(false);
      
      setPageState('active');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      setPageState('list');
    }
  };

  // Timer effect
  useEffect(() => {
    if (pageState !== 'active' || timeLeft === null || isPaused) return;
    
    if (timeLeft <= 0) {
      toast({ title: "Tempo esgotado!", description: "Sua prova será finalizada automaticamente.", variant: "destructive" });
      finishExam(answers);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [pageState, timeLeft, isPaused, answers]);

  const toggleReview = (id: string) => {
    const newSet = new Set(markedForReview);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setMarkedForReview(newSet);
  };

  const handleAnswer = () => {
    if (!selectedAnswer || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    const record: Answer = {
      questionId: q.id,
      selected: selectedAnswer,
      correct: q.correct_answer,
      explanation: q.explanation,
      question_text: q.question_text,
      options: q.options,
      subject: q.subjects?.name ?? null,
    };
    const newAnswers = [...answers, record];

    if (currentIndex + 1 < questions.length) {
      setAnswers(newAnswers);
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
    } else {
      finishExam(newAnswers);
    }
  };

  const finishExam = async (finalAnswers: Answer[]) => {
    const score = finalAnswers.filter(a => a.selected === a.correct).length;
    setAnswers(finalAnswers);
    setPageState('finished');

    if (!user || !activeExam) return;
    try {
      await supabase.from('exam_attempts').insert({
        user_id: user.id,
        exam_id: activeExam.id,
        score,
        total_questions: finalAnswers.length,
        answers: finalAnswers.map(a => ({ questionId: a.questionId, selected: a.selected, correct: a.correct })),
      });
    } catch {
      // silent
    }
  };

  const correctCount = answers.filter(a => a.selected === a.correct).length;
  const pct = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;

  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-sm font-black uppercase tracking-widest text-slate-400 animate-pulse">Sintonizando provas...</p>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive animate-bounce" />
        <p className="text-destructive font-black text-lg">{errorMsg}</p>
        <Button onClick={fetchExams} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 text-white">
          <RotateCw className="h-4 w-4 mr-2" />Tentar novamente
        </Button>
      </div>
    );
  }

  if (pageState === 'list') {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 px-4">
        {/* Banner Hero Premium */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-primary/30 p-8 md:p-12 rounded-[2rem] relative overflow-hidden border border-white/5 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Área de Treinamento</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tight">Provas Completas</h1>
              <p className="text-slate-400 font-medium max-w-xl text-sm md:text-base leading-relaxed">
                Desenvolva resistência física e inteligência emocional resolvendo provas anteriores inteiras sob condições de simulado.
              </p>
            </div>
            <div className="shrink-0 flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-[2rem] bg-accent/10 border border-accent/20 shadow-xl shadow-accent/5">
              <Scroll className="h-8 w-8 text-accent" />
            </div>
          </div>
        </div>

        {exams.length === 0 ? (
          <Card className="border border-white/5 shadow-2xl rounded-[2.5rem] bg-slate-900/40 backdrop-blur-md p-16 text-center">
            <BookOpen className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl font-black text-white italic">Nenhuma prova cadastrada</p>
            <p className="text-slate-400 font-medium mt-2 max-w-sm mx-auto text-sm">Em breve a equipe pedagógica disponibilizará provas anteriores nesta seção.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(exam => {
              const coverUrl = getExamCover(exam.title, exam.exam_type);
              return (
                <Card key={exam.id} className="border border-white/5 shadow-xl rounded-[2rem] bg-slate-900/40 backdrop-blur-md overflow-hidden hover:border-accent/40 transition-all duration-300 group hover:-translate-y-1 flex flex-col">
                  {/* Capa do Card */}
                  <div className="h-44 w-full relative overflow-hidden bg-slate-950">
                    <img 
                      src={coverUrl} 
                      alt={exam.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
                    
                    {exam.year && (
                      <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground font-black text-[10px] uppercase shadow-lg border-none px-3 py-1">
                        {exam.year}
                      </Badge>
                    )}
                    
                    <Badge className="absolute bottom-4 left-4 bg-primary/20 backdrop-blur-md text-white border border-white/10 font-black text-[9px] uppercase tracking-wider">
                      {exam.exam_type}
                    </Badge>
                  </div>

                  <CardContent className="p-6 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-2">
                      <h3 className="text-base font-black text-white italic group-hover:text-accent transition-colors leading-tight">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 pb-2 border-b border-white/[0.04]">
                      {exam.question_count > 0 && (
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4 text-slate-500" /> {exam.question_count} questões
                        </span>
                      )}
                      {exam.pdf_url && (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <FileText className="h-4 w-4" /> PDF Habilitado
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {exam.pdf_url && (
                        <Link href={`/dashboard/student/provas/${exam.id}`} className="w-full">
                          <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-accent/25 hover:shadow-accent/40 border-none transition-all">
                            PDF Interativo & Anotação
                          </Button>
                        </Link>
                      )}
                      
                      {exam.question_count > 0 && (
                        <Button
                          onClick={() => startExam(exam)}
                          className="w-full h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Simulado na Tela
                        </Button>
                      )}

                      {!exam.pdf_url && exam.question_count === 0 && (
                        <p className="text-center text-xs text-slate-500 italic py-2">Material em preparação...</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (pageState === 'active' && currentQuestion) {
    const formatTimeLeft = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isLowTime = timeLeft !== null && timeLeft < 300;

    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24 px-4">
        {/* Command Bar do Simulado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/80 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/5">
          <div className="space-y-2">
            <h2 className="text-lg font-black text-white italic leading-none">{activeExam?.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/20 text-primary-foreground border border-primary/20 font-black text-[9px] uppercase tracking-wider">
                Questão {currentIndex + 1} de {questions.length}
              </Badge>
              {markedForReview.has(currentQuestion.id) && (
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/20 font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
                  <Flag className="h-3 w-3" /> Revisar Depois
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-black text-lg border shadow-inner transition-all duration-300 ${
              isLowTime 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' 
                : 'bg-white/5 border-white/10 text-white'
            }`}>
              <Timer className={`h-5 w-5 ${isLowTime ? 'text-red-400' : 'text-accent'}`} />
              {timeLeft !== null ? formatTimeLeft(timeLeft) : '--:--'}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsPaused(!isPaused)} 
              className="h-12 w-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white"
            >
               {isPaused ? <RotateCw className="h-5 w-5 text-accent animate-spin" /> : <Loader2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question List Sidebar (Desktop) */}
          <div className="hidden lg:block space-y-4">
            <Card className="border border-white/5 shadow-2xl rounded-3xl bg-slate-950/40 backdrop-blur-md p-6 sticky top-24">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">Progresso</h3>
              <div className="grid grid-cols-5 gap-2 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin">
                {questions.map((q, idx) => {
                  const isAnswered = answers.find(a => a.questionId === q.id) || (idx === currentIndex && selectedAnswer);
                  const isCurrent = idx === currentIndex;
                  const isMarked = markedForReview.has(q.id);
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        if (selectedAnswer && currentIndex !== idx) {
                           const record: Answer = {
                            questionId: currentQuestion.id,
                            selected: selectedAnswer,
                            correct: currentQuestion.correct_answer,
                            explanation: currentQuestion.explanation,
                            question_text: currentQuestion.question_text,
                            options: currentQuestion.options,
                            subject: currentQuestion.subjects?.name ?? null,
                          };
                          setAnswers(prev => {
                            const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
                            return [...filtered, record];
                          });
                        }
                        setCurrentIndex(idx);
                        const existing = answers.find(a => a.questionId === q.id);
                        setSelectedAnswer(existing?.selected ?? null);
                      }}
                      className={`h-9 w-9 rounded-xl font-black text-xs transition-all flex items-center justify-center border
                        ${isCurrent 
                          ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-105 z-10' 
                          : isMarked 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                            : isAnswered 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <Button 
                onClick={() => finishExam(answers)} 
                className="w-full mt-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-xs rounded-xl h-11 transition-all"
              >
                Finalizar Prova
              </Button>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3 space-y-6">
            <Progress value={progress} className="h-1.5 rounded-full bg-slate-900 [&>div]:bg-accent" />

            <Card className="border border-white/5 shadow-2xl rounded-3xl bg-slate-900/30 backdrop-blur-md overflow-hidden">
              <CardContent className="p-6 md:p-10 space-y-8">
                 <div className="flex justify-between items-start gap-4">
                   <div className="space-y-4 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        {currentQuestion.subjects?.name && (
                          <Badge className="bg-accent/10 text-accent border border-accent/10 font-black text-[9px] uppercase px-3 py-0.5">
                            {currentQuestion.subjects.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-white/10 text-slate-500">
                          ID: {currentQuestion.id.substring(0,8)}
                        </Badge>
                      </div>

                      {/* Texto de Apoio */}
                      {currentQuestion.supporting_text && (
                        <SupportingTextBlock text={currentQuestion.supporting_text} />
                      )}

                      {/* Imagem */}
                      {currentQuestion.image_url && (
                        <div className="relative w-full aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden border border-white/5 shadow-inner bg-slate-950 p-2">
                           <img 
                            src={currentQuestion.image_url} 
                            alt="Visual de apoio" 
                            className="w-full h-full object-contain" 
                           />
                        </div>
                      )}

                      <p className="text-lg md:text-xl font-bold text-white italic leading-relaxed mt-4">
                        {currentQuestion.question_text.replace('[IMAGEM_PENDENTE]', '')}
                      </p>
                   </div>
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     onClick={() => toggleReview(currentQuestion.id)} 
                     className={`shrink-0 h-11 w-11 rounded-xl transition-all ${
                       markedForReview.has(currentQuestion.id) 
                         ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                         : 'bg-white/5 text-slate-400 hover:bg-white/10'
                     }`}
                   >
                      <Flag className="h-5 w-5" />
                   </Button>
                </div>

                <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} className="space-y-3.5">
                  {currentQuestion.options.map(opt => (
                    <Label
                      key={opt.key}
                      htmlFor={`opt-${opt.key}`}
                      className={`flex items-start gap-4 p-4 md:p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.005]
                        ${selectedAnswer === opt.key
                          ? 'border-accent bg-accent/5 shadow-lg shadow-accent/5 text-white'
                          : 'border-white/5 bg-white/5 hover:bg-white/10 text-slate-300'}`}
                    >
                      <RadioGroupItem id={`opt-${opt.key}`} value={opt.key} className="mt-1 shrink-0 accent-accent" />
                      <div className="flex gap-3">
                        <span className={`font-black italic text-base shrink-0 ${selectedAnswer === opt.key ? 'text-accent' : 'text-slate-500'}`}>
                          {opt.key})
                        </span>
                        <span className="font-semibold text-sm md:text-base leading-relaxed">{opt.text}</span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>

                <div className="flex flex-col md:flex-row gap-3.5 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentIndex > 0) {
                        setCurrentIndex(currentIndex - 1);
                        const prevAns = answers.find(a => a.questionId === questions[currentIndex - 1].id);
                        setSelectedAnswer(prevAns?.selected ?? null);
                      }
                    }}
                    disabled={currentIndex === 0}
                    className="flex-1 h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                  
                  <Button
                    onClick={handleAnswer}
                    disabled={!selectedAnswer && currentIndex + 1 >= questions.length}
                    className="flex-[2] h-12 rounded-xl bg-accent text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-accent/25 hover:shadow-accent/40 border-none transition-all"
                  >
                    {currentIndex + 1 < questions.length ? (
                      <>Próxima Questão <ChevronRight className="h-4 w-4 ml-2" /></>
                    ) : (
                      <>Finalizar Prova <Save className="h-4 w-4 ml-2 text-white/80" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === 'finished') {
    // Calculo do Dashoffset para o Gauge circular
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 px-4">
        {/* Painel do Placar */}
        <Card className="border border-white/5 shadow-2xl rounded-3xl bg-slate-900/40 backdrop-blur-md overflow-hidden">
          <CardContent className="p-8 md:p-12 text-center space-y-6 flex flex-col items-center">
            <div className="space-y-1">
              <Award className={`h-12 w-12 mx-auto ${pct >= 60 ? 'text-accent animate-bounce' : 'text-slate-500'}`} />
              <h2 className="text-2xl md:text-3xl font-black text-white italic">
                {pct >= 80 ? 'Excelente Rendimento!' : pct >= 60 ? 'Bom Trabalho!' : 'Continue Praticando!'}
              </h2>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{activeExam?.title}</p>
            </div>

            {/* Gauge de Performance Circular */}
            <div className="relative flex items-center justify-center h-40 w-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-slate-950 fill-transparent"
                  strokeWidth="10"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-accent fill-transparent transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white italic leading-none">{pct}%</span>
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 mt-1">Aproveitamento</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-md w-full bg-slate-950/60 p-5 rounded-2xl border border-white/5">
              <div className="text-center space-y-0.5">
                <p className="text-2xl font-black text-emerald-400">{correctCount}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Acertos</p>
              </div>
              <div className="text-center space-y-0.5 border-x border-white/5">
                <p className="text-2xl font-black text-rose-400">{answers.length - correctCount}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Erros</p>
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-2xl font-black text-white">{answers.length}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
              <Button 
                onClick={() => { setPageState('list'); fetchExams(); }} 
                className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-wider"
              >
                Tentar Outra Prova
              </Button>
              <Button 
                onClick={() => startExam(activeExam!)} 
                className="flex-1 h-12 rounded-xl bg-accent hover:bg-accent/90 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-accent/25 hover:shadow-accent/40 border-none transition-all"
              >
                Refazer Prova
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gabarito Comentado */}
        <div className="space-y-5">
          <h3 className="text-xl font-black text-white italic px-2">Gabarito Analítico</h3>
          {answers.map((ans, i) => {
            const isCorrect = ans.selected === ans.correct;
            return (
              <Card key={ans.questionId} className="border border-white/5 shadow-xl bg-slate-900/30 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 text-[10px] font-black px-2 py-0.5 rounded-md">
                        <XCircle className="h-3.5 w-3.5" /> Incorreto
                      </span>
                    )}
                    <Badge className="bg-primary/20 text-white border border-primary/20 font-black text-[9px] uppercase tracking-wider">
                      Questão {i + 1}
                    </Badge>
                    {ans.subject && (
                      <Badge className="bg-accent/10 text-accent border border-accent/10 font-black text-[9px] uppercase tracking-wider">
                        {ans.subject}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm font-bold text-slate-200 italic leading-relaxed line-clamp-3">
                    {ans.question_text}
                  </p>

                  <div className="space-y-2">
                    {ans.options.map(opt => {
                      const isCorrectOpt = opt.key === ans.correct;
                      const isSelectedOpt = opt.key === ans.selected;
                      return (
                        <div key={opt.key} className={`flex items-start gap-3 p-3 rounded-xl text-xs font-semibold border
                          ${isCorrectOpt 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : isSelectedOpt && !isCorrect 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 line-through' 
                              : 'bg-white/5 border-white/5 text-slate-400 opacity-60'
                          }
                        `}>
                          <span className="font-black italic w-4 shrink-0">{opt.key})</span>
                          <span className="leading-normal">{opt.text}</span>
                          {isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {ans.explanation && (
                    <div className="bg-slate-950/60 rounded-xl p-4 border border-white/5 border-l-2 border-l-accent">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-accent mb-1">Comentário do Professor</h4>
                      <p className="text-xs font-medium text-slate-400 italic leading-relaxed">{ans.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
