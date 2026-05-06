
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
      setPageState('active');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      setPageState('list');
    }
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
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{activeExam?.title}</p>
            <p className="text-sm font-bold text-primary">Questão {currentIndex + 1} de {questions.length}</p>
          </div>
          <div className="text-right">
            {currentQuestion.subjects?.name && (
              <Badge className="bg-accent/10 text-accent border-none font-black text-[10px] uppercase">{currentQuestion.subjects.name}</Badge>
            )}
          </div>
        </div>

        <Progress value={progress} className="h-2 rounded-full" />

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white">
          <CardContent className="p-8 space-y-6">
            <p className="text-base font-bold text-primary italic leading-relaxed">{currentQuestion.question_text}</p>

            <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} className="space-y-3">
              {currentQuestion.options.map(opt => (
                <Label
                  key={opt.key}
                  htmlFor={`opt-${opt.key}`}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all font-medium text-sm
                    ${selectedAnswer === opt.key
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent bg-muted/30 hover:bg-muted/60 text-muted-foreground'}`}
                >
                  <RadioGroupItem id={`opt-${opt.key}`} value={opt.key} className="shrink-0" />
                  <span className="font-black text-xs mr-1 italic">{opt.key})</span>
                  <span>{opt.text}</span>
                </Label>
              ))}
            </RadioGroup>

            <Button
              onClick={handleAnswer}
              disabled={!selectedAnswer}
              className="w-full h-12 rounded-2xl bg-primary text-white font-black text-base shadow-xl hover:scale-[1.02] transition-all active:scale-95"
            >
              {currentIndex + 1 < questions.length ? 'Próxima Questão' : 'Ver Resultado'}
            </Button>
          </CardContent>
        </Card>
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
