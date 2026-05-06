
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scroll, Award, RotateCw, AlertCircle, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/app/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Timer, Flag, ChevronLeft, ChevronRight, Save } from 'lucide-react';

type Exam = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  exam_type: string;
  question_count: number;
};

type Question = {
  id: string;
  question_text: string;
  options: { key: string; text: string }[];
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
        .select('id, title, description, year, exam_type, exam_questions(count)')
        .order('year', { ascending: false });

      if (error) throw error;

      const mapped: Exam[] = (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        year: e.year,
        exam_type: e.exam_type,
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
        .select('order_index, questions(id, question_text, options, correct_answer, explanation, subjects(name))')
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
      // silent — não bloquear o resultado
    }
  };

  const correctCount = answers.filter(a => a.selected === a.correct).length;
  const pct = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;

  if (pageState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium italic">Carregando provas...</p>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-bold">{errorMsg}</p>
        <Button onClick={fetchExams} variant="outline" className="rounded-xl"><RotateCw className="h-4 w-4 mr-2" />Tentar novamente</Button>
      </div>
    );
  }

  if (pageState === 'list') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
        <header className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-3">
            <Scroll className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-primary italic leading-none">Provas Completas</h1>
            <p className="text-muted-foreground font-medium italic">Faça provas anteriores do ENEM e vestibulares completas.</p>
          </div>
        </header>

        {exams.length === 0 ? (
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-xl font-black text-primary italic">Nenhuma prova disponível</p>
            <p className="text-muted-foreground font-medium mt-2">Os professores ainda não cadastraram provas completas.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map(exam => (
              <Card key={exam.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden hover:shadow-2xl transition-all group cursor-pointer" onClick={() => startExam(exam)}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-primary italic leading-tight">{exam.title}</h3>
                      {exam.description && <p className="text-xs text-muted-foreground font-medium mt-1 line-clamp-2">{exam.description}</p>}
                    </div>
                    {exam.year && <Badge className="bg-accent/10 text-accent border-none font-black text-xs shrink-0">{exam.year}</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary/5 text-primary border-none font-black text-[10px] uppercase">{exam.exam_type}</Badge>
                    <span className="text-xs text-muted-foreground font-medium">{exam.question_count} questões</span>
                  </div>
                  <Button className="w-full h-12 rounded-2xl bg-primary text-white font-black text-sm shadow-lg group-hover:scale-[1.02] transition-all">
                    Iniciar Prova
                  </Button>
                </CardContent>
              </Card>
            ))}
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

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24 px-4">
        {/* Exam Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-lg border-b-4 border-primary">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-primary italic leading-none">{activeExam?.title}</h2>
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/5 text-primary border-none font-black text-[10px] uppercase">
                {currentIndex + 1} de {questions.length} Questões
              </Badge>
              {markedForReview.has(currentQuestion.id) && (
                <Badge className="bg-amber-100 text-amber-600 border-none font-black text-[10px] uppercase flex items-center gap-1">
                  <Flag className="h-3 w-3" /> Revisar
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xl shadow-inner ${timeLeft && timeLeft < 300 ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-50 text-primary'}`}>
              <Timer className={`h-6 w-6 ${timeLeft && timeLeft < 300 ? 'text-red-500' : 'text-accent'}`} />
              {timeLeft !== null ? formatTimeLeft(timeLeft) : '--:--'}
            </div>
            <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} className="h-12 w-12 rounded-xl border-2">
               {isPaused ? <RotateCw className="h-5 w-5" /> : <Loader2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question List Sidebar (Desktop) */}
          <div className="hidden lg:block space-y-4">
            <Card className="border-none shadow-xl rounded-[2rem] bg-white p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary/40 mb-4 px-1">Navegação</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers.find(a => a.questionId === q.id) || (idx === currentIndex && selectedAnswer);
                  const isCurrent = idx === currentIndex;
                  const isMarked = markedForReview.has(q.id);
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        if (selectedAnswer && currentIndex !== idx) {
                           // Save current answer before jumping
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
                      className={`h-10 w-10 rounded-xl font-black text-xs transition-all flex items-center justify-center border-2
                        ${isCurrent ? 'bg-primary text-white border-primary shadow-lg scale-110 z-10' : 
                          isMarked ? 'bg-amber-50 border-amber-300 text-amber-600' :
                          isAnswered ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-transparent text-primary/40'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <Button onClick={() => finishExam(answers)} className="w-full mt-8 bg-red-50 text-red-500 hover:bg-red-100 border-none font-black text-xs rounded-xl h-10 shadow-sm">
                Finalizar Prova
              </Button>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3 space-y-6">
            <Progress value={progress} className="h-2 rounded-full bg-slate-100" />

            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardContent className="p-8 md:p-12 space-y-8">
                <div className="flex justify-between items-start gap-4">
                   <div className="space-y-1">
                      {currentQuestion.subjects?.name && (
                        <Badge className="bg-accent/10 text-accent border-none font-black text-[10px] uppercase px-4 h-6 mb-2">
                          {currentQuestion.subjects.name}
                        </Badge>
                      )}
                      <p className="text-lg md:text-xl font-bold text-primary italic leading-relaxed">
                        {currentQuestion.question_text}
                      </p>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => toggleReview(currentQuestion.id)} className={`shrink-0 h-12 w-12 rounded-2xl transition-all ${markedForReview.has(currentQuestion.id) ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300'}`}>
                      <Flag className="h-6 w-6" />
                   </Button>
                </div>

                <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} className="space-y-4">
                  {currentQuestion.options.map(opt => (
                    <Label
                      key={opt.key}
                      htmlFor={`opt-${opt.key}`}
                      className={`flex items-start gap-5 p-5 md:p-6 rounded-[2rem] border-2 cursor-pointer transition-all
                        ${selectedAnswer === opt.key
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 text-slate-600'}`}
                    >
                      <RadioGroupItem id={`opt-${opt.key}`} value={opt.key} className="mt-1 shrink-0" />
                      <div className="flex gap-4">
                        <span className={`font-black italic text-lg shrink-0 ${selectedAnswer === opt.key ? 'text-primary' : 'text-slate-300'}`}>
                          {opt.key})
                        </span>
                        <span className="font-medium text-sm md:text-base leading-relaxed">{opt.text}</span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>

                <div className="flex flex-col md:flex-row gap-4 pt-4">
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
                    className="flex-1 h-14 rounded-2xl border-2 font-black text-primary"
                  >
                    <ChevronLeft className="h-5 w-5 mr-2" /> Anterior
                  </Button>
                  
                  <Button
                    onClick={handleAnswer}
                    disabled={!selectedAnswer && currentIndex + 1 >= questions.length}
                    className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl hover:scale-[1.02] transition-all"
                  >
                    {currentIndex + 1 < questions.length ? (
                      <>Próxima Questão <ChevronRight className="h-5 w-5 ml-2" /></>
                    ) : (
                      <>Finalizar Prova <Save className="h-5 w-5 ml-2 text-accent" /></>
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
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="p-8 text-center space-y-4">
            <Award className={`h-16 w-16 mx-auto ${pct >= 60 ? 'text-accent' : 'text-muted-foreground'}`} />
            <h2 className="text-3xl font-black text-primary italic">{pct >= 60 ? 'Parabéns!' : 'Continue praticando!'}</h2>
            <p className="text-muted-foreground font-medium">{activeExam?.title}</p>
            <div className="flex justify-center gap-8 py-4">
              <div className="text-center">
                <p className="text-4xl font-black text-green-500">{correctCount}</p>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Acertos</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-red-400">{answers.length - correctCount}</p>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Erros</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-primary">{pct}%</p>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Aproveitamento</p>
              </div>
            </div>
            <Progress value={pct} className="h-3 rounded-full" />
            <div className="flex gap-3 pt-2">
              <Button onClick={() => { setPageState('list'); fetchExams(); }} variant="outline" className="flex-1 h-12 rounded-2xl font-black">
                <RotateCw className="h-4 w-4 mr-2" /> Escolher outra prova
              </Button>
              <Button onClick={() => startExam(activeExam!)} className="flex-1 h-12 rounded-2xl bg-primary text-white font-black shadow-xl">
                Refazer esta prova
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-black text-primary italic px-2">Gabarito Comentado</h3>
          {answers.map((ans, i) => {
            const isCorrect = ans.selected === ans.correct;
            return (
              <Card key={ans.questionId} className="border-none shadow-lg bg-white rounded-[2rem]">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    {isCorrect
                      ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      : <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    }
                    <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase">Questão {i + 1}</Badge>
                    {ans.subject && <Badge className="bg-accent/10 text-accent border-none font-black text-[9px] uppercase">{ans.subject}</Badge>}
                  </div>
                  <p className="text-sm font-bold text-primary italic leading-relaxed line-clamp-3">{ans.question_text}</p>
                  <div className="space-y-1.5">
                    {ans.options.map(opt => {
                      const isCorrectOpt = opt.key === ans.correct;
                      const isSelectedOpt = opt.key === ans.selected;
                      return (
                        <div key={opt.key} className={`flex items-center gap-3 p-2.5 rounded-xl text-xs font-medium
                          ${isCorrectOpt ? 'bg-green-50 text-green-700' : ''}
                          ${isSelectedOpt && !isCorrect ? 'bg-red-50 text-red-500 line-through' : ''}
                          ${!isCorrectOpt && !isSelectedOpt ? 'text-muted-foreground' : ''}
                        `}>
                          <span className="font-black italic w-4">{opt.key})</span>
                          <span>{opt.text}</span>
                          {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  {ans.explanation && (
                    <div className="bg-slate-50 rounded-xl p-3 mt-2">
                      <p className="text-xs font-bold text-muted-foreground italic">{ans.explanation}</p>
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
