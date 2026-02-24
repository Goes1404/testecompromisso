
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, RotateCw, BrainCircuit, Library, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/lib/AuthProvider';
import { createClient } from '@/app/lib/supabase';

const SIMULATION_SIZE = 10;

type Question = {
  id: string;
  question_text: string;
  options: { letter: string; text: string }[];
  correct_answer: string;
  subjects: { name: string } | null;
  year: number;
};

type SubjectWithCount = {
    id: string;
    name: string;
    question_count: number;
}

type Answer = {
  questionId: string;
  selected: string;
  correct: string;
};

export default function SimuladoPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [gameState, setGameState] = useState<'loading_subjects' | 'idle' | 'loading_questions' | 'active' | 'finished' | 'error'>('loading_subjects');
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      setGameState('loading_subjects');
      try {
        const { data, error } = await supabase.rpc('get_subjects_with_question_count');
        if (error) throw error;
        setSubjects(data || []);
        setGameState('idle');
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setGameState('error');
      }
    };
    fetchSubjects();
  }, [supabase]);

  const fetchQuestions = useCallback(async (subjectId: string) => {
    setGameState('loading_questions');
    try {
        const { data, error } = await supabase.rpc('get_random_questions_for_subject', {
            p_subject_id: subjectId,
            p_limit: SIMULATION_SIZE
        });

        if (error) throw error;

        // Formatar os dados para garantir que options seja um array e subjects um objeto
        const formattedQuestions = (data || []).map((q: any) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : [],
            subjects: typeof q.subjects === 'string' ? JSON.parse(q.subjects) : q.subjects
        }));

        setQuestions(formattedQuestions);
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setSelectedAnswer(null);
        setGameState('active');
    } catch (error) {
        console.error('Error starting simulation:', error);
        setGameState('error');
    }
  }, [supabase]);

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;

    const newAnswer = {
      questionId: questions[currentQuestionIndex].id,
      selected: selectedAnswer,
      correct: questions[currentQuestionIndex].correct_answer,
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setGameState('finished');
    }
  };

  const score = answers.filter(a => a.selected === a.correct).length;

  if (gameState === 'loading_subjects' || gameState === 'loading_questions') {
    return (
      <div className="flex h-[calc(100vh-12rem)] w-full items-center justify-center flex-col gap-4">
        <Loader2 className={`h-12 w-12 animate-spin text-accent`} />
        <p className="text-sm font-black text-primary italic animate-pulse">
            {gameState === 'loading_subjects' ? 'Carregando matérias...' : 'Montando seu simulado...'}
        </p>
      </div>
    );
  }

  if (gameState === 'active') {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / questions.length) * 100;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            <div className='bg-white p-6 rounded-2xl shadow-sm border-b-4 border-accent'>
                <div className='flex justify-between items-center mb-4 gap-2'>
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-accent" />
                      <p className='font-black text-primary text-xs md:text-sm uppercase tracking-widest'>QUESTÃO {currentQuestionIndex + 1} / {questions.length}</p>
                    </div>
                    <Badge variant="outline" className='font-black text-[10px] uppercase bg-primary text-white border-none h-7 px-4'>
                        {currentQuestion.subjects?.name || 'Geral'} • {currentQuestion.year}
                    </Badge>
                </div>
                <Progress value={progress} className="h-1.5 bg-muted rounded-full" />
            </div>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className='p-8 md:p-12 bg-muted/5'>
                <CardDescription className="text-sm md:text-xl font-medium text-slate-800 leading-relaxed italic">
                "{currentQuestion.question_text}"
                </CardDescription>
            </CardHeader>
            <CardContent className='p-8 md:p-12 pt-2'>
                <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} className="space-y-3">
                {currentQuestion.options.map((opt) => (
                    <Label 
                    key={opt.letter} 
                    className={`flex items-start gap-4 text-xs md:text-base p-6 rounded-[1.5rem] border-2 transition-all cursor-pointer ${
                        selectedAnswer === opt.letter ? 'border-accent bg-accent/5' : 'border-muted/20 hover:border-accent/40'
                    }`}
                    >
                    <RadioGroupItem value={opt.letter} id={opt.letter} className="mt-1" />
                    <div className="flex gap-4">
                        <span className={`font-black italic ${selectedAnswer === opt.letter ? 'text-accent' : 'text-primary/30'}`}>
                        {opt.letter.toUpperCase()}.
                        </span>
                        <span className="font-medium text-slate-700">{opt.text}</span>
                    </div>
                    </Label>
                ))}
                </RadioGroup>
            </CardContent>
            </Card>

            <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white shadow-xl">
            <p className="hidden md:block text-[10px] font-black uppercase text-primary/40 px-4 italic">Analise com calma antes de marcar.</p>
            <Button 
                onClick={handleNextQuestion} 
                disabled={selectedAnswer === null} 
                className="w-full md:w-auto h-14 rounded-2xl font-black text-lg px-10 bg-primary shadow-xl"
            >
                {currentQuestionIndex < questions.length - 1 ? 'Próxima Questão' : 'Finalizar Simulado'}
            </Button>
            </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="flex h-[calc(100vh-12rem)] w-full items-center justify-center p-4">
        <Card className="w-full max-w-xl text-center p-12 md:p-16 shadow-2xl rounded-[3rem] bg-white border-none">
          <CardHeader>
            <div className="h-24 w-24 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Award className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-4xl font-black text-primary italic">Simulado Concluído!</CardTitle>
            <CardDescription className="text-xl font-medium mt-4">Você acertou {score} de {questions.length} questões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-10">
              <Button onClick={() => setGameState('idle')} className="w-full h-16 rounded-2xl bg-primary text-lg font-black shadow-xl">
                <RotateCw className="h-5 w-5 mr-3" /> Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (gameState === 'error') {
    return (
        <div className='flex h-[calc(100vh-12rem)] flex-col items-center justify-center text-center p-10 gap-4'>
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-2xl font-black text-primary italic">Ops! Sincronização Pendente</h2>
            <p className="text-muted-foreground max-w-md italic">Certifique-se de que o script SQL mestre foi executado no Supabase para habilitar as funções de simulado.</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4 rounded-xl h-12 px-8 border-primary/20">Tentar Novamente</Button>
        </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center shadow-inner">
                <Library className="h-7 w-7 text-accent"/>
            </div>
            <div>
                <h1 className="text-3xl font-black text-primary italic leading-none">Simulados por Matéria</h1>
                <p className="text-muted-foreground font-medium mt-1">Escolha um tema e teste seus conhecimentos agora.</p>
            </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {subjects.map(subject => (
                <Card key={subject.id} className={`border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col justify-between group hover:shadow-2xl transition-all duration-500 ${subject.question_count === 0 ? 'opacity-50 grayscale' : ''}`}>
                    <CardHeader className="p-8">
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black text-[8px] uppercase px-3 h-5 w-fit">FOCO TOTAL</Badge>
                        <CardTitle className='text-2xl font-black text-primary italic mt-4 group-hover:text-accent transition-colors'>{subject.name}</CardTitle>
                        <CardDescription className='font-medium italic mt-2'>{subject.question_count} questões prontas no banco.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <Button 
                            onClick={() => fetchQuestions(subject.id)}
                            disabled={subject.question_count < 1}
                            className='w-full h-14 rounded-2xl bg-primary text-white font-black text-sm uppercase shadow-xl active:scale-95 transition-all'
                        >
                            {subject.question_count < 1 ? `Em Breve` : 'Começar Simulado'}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
