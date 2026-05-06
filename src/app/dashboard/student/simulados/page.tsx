
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Award, RotateCw, BrainCircuit, Library, AlertCircle, Target, Shuffle, ClipboardList, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/app/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { awardXP, checkAndAwardBadges, getTotalAnswered, XP_PER_CORRECT_QUESTION, XP_PER_SIMULADO_COMPLETE, BADGE_META } from '@/lib/gamification';

const SIMULATION_SIZE = 10;
const ALL_TOPICS = '_all';

type Mode = 'especifico' | 'materia' | 'completo';

type Subject = { id: string; name: string; question_count: number };
type MicroTopic = { id: string; name: string };
type Question = {
  id: string;
  question_text: string;
  options: { key?: string; letter?: string; text: string }[];
  correct_answer: string;
  subjects: { name: string } | null;
  year: number;
  explanation?: string;
};
type Answer = {
  questionId: string;
  selected: string;
  correct: string;
  explanation?: string;
  question_text: string;
  options: { key?: string; letter?: string; text: string }[];
  subject: string | null;
};

type GameState = 'loading_subjects' | 'idle' | 'loading_questions' | 'active' | 'finished' | 'error';

export default function SimuladoPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>('loading_subjects');
  const [mode, setMode] = useState<Mode>('materia');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [microTopics, setMicroTopics] = useState<MicroTopic[]>([]);
  // Use '_all' as sentinel to avoid empty string in SelectItem
  const [selectedMicroTopicId, setSelectedMicroTopicId] = useState<string>(ALL_TOPICS);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setGameState('loading_subjects');
    try {
      const { data, error } = await supabase.rpc('get_subjects_with_question_count');
      if (error) {
        const { data: fb } = await supabase.from('subjects').select('id, name').order('name');
        setSubjects((fb ?? []).map(s => ({ id: s.id, name: s.name, question_count: 0 })));
      } else {
        setSubjects(data ?? []);
      }
      setGameState('idle');
    } catch {
      setGameState('error');
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  useEffect(() => {
    if (!selectedSubjectId || mode !== 'especifico') { setMicroTopics([]); return; }
    supabase
      .from('micro_topics')
      .select('id, name')
      .eq('subject_id', selectedSubjectId)
      .order('name')
      .then(({ data }) => setMicroTopics(data ?? []));
  }, [selectedSubjectId, mode]);

  const buildQuery = () => {
    let q = supabase.from('questions').select('*, subjects(name)');

    // Only apply subject filter if a subject is actually selected
    if ((mode === 'materia' || mode === 'especifico') && selectedSubjectId) {
      q = q.eq('subject_id', selectedSubjectId) as any;
    }

    // Only apply micro-topic filter if one is selected (not the sentinel value)
    if (mode === 'especifico' && selectedMicroTopicId && selectedMicroTopicId !== ALL_TOPICS) {
      q = q.eq('micro_topic_id', selectedMicroTopicId) as any;
    }

    if (profile?.profile_type) {
      q = q.or(`target_audience.eq.all,target_audience.eq.${profile.profile_type},target_audience.is.null`) as any;
    } else {
      q = q.or('target_audience.eq.all,target_audience.eq.student,target_audience.is.null') as any;
    }
    return q.limit(200);
  };

  const startSimulado = useCallback(async () => {
    if (mode !== 'completo' && !selectedSubjectId) return;
    setGameState('loading_questions');
    setActiveSubjectId(selectedSubjectId || null);
    try {
      const { data: raw, error } = await buildQuery();
      let items: any[] = [];

      if (error) {
        // Fallback without target_audience filter — only filter by subject if one is selected
        let fbQuery = supabase.from('questions').select('*, subjects(name)');
        if (selectedSubjectId) {
          fbQuery = fbQuery.eq('subject_id', selectedSubjectId) as any;
        }
        const { data: fb, error: fbErr } = await fbQuery.limit(200);
        if (fbErr) throw fbErr;
        items = fb ?? [];
      } else {
        items = raw ?? [];
      }

      const shuffled = items.sort(() => 0.5 - Math.random()).slice(0, SIMULATION_SIZE);

      if (shuffled.length === 0) {
        toast({ title: 'Sem questões', description: 'Não há questões para este filtro.', variant: 'destructive' });
        setGameState('idle');
        return;
      }

      const formatted: Question[] = shuffled.map((q: any) => {
        let opts = q.options;
        if (typeof opts === 'string') { try { opts = JSON.parse(opts); } catch { opts = []; } }
        return { ...q, options: opts ?? [], subjects: typeof q.subjects === 'string' ? JSON.parse(q.subjects) : q.subjects };
      });

      setQuestions(formatted);
      setCurrentIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setGameState('active');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      setGameState('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedSubjectId, selectedMicroTopicId, profile, toast]);

  const handleNext = async () => {
    if (!selectedAnswer || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    const newAnswer: Answer = {
      questionId: q.id,
      selected: selectedAnswer,
      correct: q.correct_answer,
      explanation: q.explanation,
      question_text: q.question_text,
      options: q.options,
      subject: q.subjects?.name ?? null,
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    // Record answer for analytics
    if (user) {
      supabase.from('student_question_answers').insert({
        student_id: user.id,
        question_id: q.id,
        selected_option: selectedAnswer,
        is_correct: selectedAnswer === q.correct_answer,
      }).then(() => {});
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      // Finish
      const score = newAnswers.filter(a => a.selected === a.correct).length;
      const total = newAnswers.length;

      // Save simulation attempt
      if (user && activeSubjectId) {
        supabase.from('simulation_attempts').insert({
          user_id: user.id, subject_id: activeSubjectId, score, total_questions: total,
        }).then(() => {});
      }

      // Award XP
      if (user) {
        const xpGained = score * XP_PER_CORRECT_QUESTION + XP_PER_SIMULADO_COMPLETE;
        awardXP(user.id, xpGained).then(() => {});

        const totalAnswered = await getTotalAnswered(user.id);
        const newBadges = await checkAndAwardBadges(user.id, {
          totalAnswered: totalAnswered + total,
          isPerfectSimulado: score === total && total > 0,
        });

        if (newBadges.length > 0) {
          toast({
            title: `🏆 Conquista desbloqueada!`,
            description: newBadges.map(b => BADGE_META[b].label).join(', '),
          });
        }
        toast({ title: `+${xpGained} XP ganhos!`, description: `${score} acertos neste simulado.` });
      }

      setGameState('finished');
    }
  };

  const score = answers.filter(a => a.selected === a.correct).length;
  const pct = answers.length > 0 ? Math.round((score / answers.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  // ── LOADING ──
  if (gameState === 'loading_subjects' || gameState === 'loading_questions') {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-sm font-black text-primary italic animate-pulse">
          {gameState === 'loading_subjects' ? 'Carregando matérias...' : 'Montando seu simulado...'}
        </p>
      </div>
    );
  }

  // ── ERROR ──
  if (gameState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-500 font-bold italic">Ocorreu um erro ao carregar os dados.</p>
        <Button onClick={fetchSubjects} variant="outline">Tentar Novamente</Button>
      </div>
    );
  }

  // ── ACTIVE ──
  if (gameState === 'active' && currentQuestion) {
    const opt = (o: any) => o.key || o.letter || '';
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border-b-4 border-accent">
          <div className="flex justify-between items-center mb-4 gap-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-accent" />
              <p className="font-black text-primary text-xs md:text-sm uppercase tracking-widest">
                QUESTÃO {currentIndex + 1} / {questions.length}
              </p>
            </div>
            <Badge variant="outline" className="font-black text-[10px] uppercase bg-primary text-white border-none h-7 px-4">
              {currentQuestion.subjects?.name || 'Geral'} • {currentQuestion.year}
            </Badge>
          </div>
          <Progress value={progress} className="h-1.5 bg-muted rounded-full" />
        </div>

        <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
          <CardHeader className="p-6 md:p-8 bg-muted/5">
            <CardDescription className="text-sm md:text-lg font-medium text-slate-800 leading-[1.8] italic whitespace-pre-wrap break-words">
              {currentQuestion.question_text}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4">
            <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer} className="space-y-3">
              {(currentQuestion.options || []).map((o: any) => (
                <Label
                  key={opt(o)}
                  className={`flex items-start gap-4 text-xs md:text-base p-4 md:p-6 rounded-xl md:rounded-[1.5rem] border-2 transition-all cursor-pointer ${
                    selectedAnswer === opt(o) ? 'border-accent bg-accent/5' : 'border-muted/20 hover:border-accent/40'
                  }`}
                >
                  <RadioGroupItem value={opt(o)} id={opt(o)} className="mt-1" />
                  <div className="flex gap-2 md:gap-4">
                    <span className={`font-black italic shrink-0 ${selectedAnswer === opt(o) ? 'text-accent' : 'text-primary/30'}`}>
                      {opt(o).toUpperCase()}.
                    </span>
                    <span className="font-medium text-slate-700 whitespace-pre-wrap break-words">{o.text}</span>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center bg-white/50 backdrop-blur-md p-3 rounded-2xl border border-white shadow-xl">
          <p className="hidden md:block text-[10px] font-black uppercase text-primary/40 px-4 italic">Analise com calma.</p>
          <Button
            onClick={handleNext}
            disabled={selectedAnswer === null}
            className="w-full md:w-auto h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-lg px-8 bg-primary shadow-xl"
          >
            {currentIndex < questions.length - 1 ? 'Próxima Questão' : 'Finalizar Simulado'}
          </Button>
        </div>
      </div>
    );
  }

  // ── FINISHED ──
  if (gameState === 'finished') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24 px-4">
        {/* Score Card */}
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="p-8 text-center space-y-4">
            <div className={`h-20 w-20 rounded-2xl flex items-center justify-center mx-auto ${pct >= 60 ? 'bg-green-100' : 'bg-amber-100'}`}>
              <Award className={`h-10 w-10 ${pct >= 60 ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <h2 className="text-3xl font-black text-primary italic">Simulado Concluído!</h2>
            <div className="flex justify-center gap-8 py-2">
              <div className="text-center">
                <p className="text-4xl font-black text-green-500">{score}</p>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Acertos</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-red-400">{answers.length - score}</p>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Erros</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-primary">{pct}%</p>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Aproveitamento</p>
              </div>
            </div>
            <Progress value={pct} className="h-3 rounded-full" />
            <Button
              onClick={() => { setGameState('idle'); setAnswers([]); }}
              className="w-full h-12 rounded-2xl bg-primary text-white font-black shadow-xl mt-2"
            >
              <RotateCw className="h-5 w-5 mr-2" /> Novo Simulado
            </Button>
          </CardContent>
        </Card>

        {/* Gabarito Comentado */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-primary italic px-2">Gabarito Comentado</h3>
          {answers.map((ans, i) => {
            const isCorrect = ans.selected === ans.correct;
            const getOptKey = (o: any) => o.key || o.letter || '';
            return (
              <Card key={ans.questionId} className="border-none shadow-lg bg-white rounded-[2rem]">
                <CardContent className="p-6 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {isCorrect
                      ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      : <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    }
                    <Badge className={`border-none font-black text-[9px] uppercase ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                      Questão {i + 1} — {isCorrect ? 'Acerto' : 'Erro'}
                    </Badge>
                    {ans.subject && (
                      <Badge className="bg-accent/10 text-accent border-none font-black text-[9px] uppercase">{ans.subject}</Badge>
                    )}
                  </div>

                  {/* Question text */}
                  <p className="text-sm font-bold text-primary italic leading-relaxed line-clamp-3">{ans.question_text}</p>

                  {/* Options with color feedback */}
                  <div className="space-y-1.5">
                    {(ans.options || []).map((opt: any) => {
                      const key = getOptKey(opt);
                      const isCorrectOpt = key === ans.correct;
                      const isSelectedOpt = key === ans.selected;
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 p-2.5 rounded-xl text-xs font-medium transition-all
                            ${isCorrectOpt ? 'bg-green-50 border border-green-200 text-green-700' : ''}
                            ${isSelectedOpt && !isCorrect ? 'bg-red-50 border border-red-200 text-red-500 line-through' : ''}
                            ${!isCorrectOpt && !isSelectedOpt ? 'text-muted-foreground bg-slate-50' : ''}
                          `}
                        >
                          <span className="font-black italic w-5 shrink-0">{key.toUpperCase()})</span>
                          <span className="flex-1">{opt.text}</span>
                          {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />}
                          {isSelectedOpt && !isCorrect && <XCircle className="h-3.5 w-3.5 text-red-400 ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {ans.explanation && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-1 flex gap-2">
                      <BookOpen className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-amber-700 italic leading-relaxed">{ans.explanation}</p>
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

  // ── IDLE — GERADOR DE LISTAS ──
  const canStart = mode === 'completo'
    || (mode === 'materia' && !!selectedSubjectId)
    || (mode === 'especifico' && !!selectedSubjectId);

  const MODES = [
    { id: 'materia' as Mode, label: 'Por Matéria', icon: Library, desc: 'Escolha uma disciplina e pratique.' },
    { id: 'especifico' as Mode, label: 'Treino Específico', icon: Target, desc: 'Filtre por micro-tópico.' },
    { id: 'completo' as Mode, label: 'Simulado Completo', icon: Shuffle, desc: 'Questões de todas as matérias.' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 px-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center">
          <ClipboardList className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-primary italic">Gerador de Listas</h1>
          <p className="text-muted-foreground font-medium italic text-sm">Escolha o modo de treino ideal para você.</p>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setSelectedSubjectId(''); setSelectedMicroTopicId(ALL_TOPICS); }}
            className={`p-5 rounded-[2rem] border-2 text-left transition-all hover:shadow-lg ${
              mode === m.id ? 'border-primary bg-primary/5 shadow-xl' : 'border-muted/20 bg-white'
            }`}
          >
            <m.icon className={`h-6 w-6 mb-3 ${mode === m.id ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className={`font-black text-sm ${mode === m.id ? 'text-primary' : 'text-primary/60'}`}>{m.label}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      {(mode === 'materia' || mode === 'especifico') && (
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white animate-in slide-in-from-top-4 duration-300">
          <CardContent className="p-8 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Disciplina</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none font-bold text-sm">
                  <SelectValue placeholder="Selecione uma matéria..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id} className="font-bold">
                      {s.name} {s.question_count > 0 ? `· ${s.question_count} questões` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === 'especifico' && selectedSubjectId && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Micro-tópico (opcional)</Label>
                <Select value={selectedMicroTopicId} onValueChange={setSelectedMicroTopicId}>
                  <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none font-bold text-sm">
                    <SelectValue placeholder={microTopics.length === 0 ? 'Sem micro-tópicos cadastrados' : 'Todos os tópicos'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {/* Using '_all' sentinel instead of empty string — Radix UI forbids empty string values */}
                    <SelectItem value={ALL_TOPICS} className="font-bold">Todos os tópicos</SelectItem>
                    {microTopics.map(mt => (
                      <SelectItem key={mt.id} value={mt.id} className="font-bold">{mt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === 'completo' && (
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-[2rem] p-6 border border-primary/10 text-center">
          <Shuffle className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="font-black text-primary italic">Simulado completo com {SIMULATION_SIZE} questões aleatórias de todas as matérias.</p>
          <p className="text-xs text-muted-foreground font-medium mt-1">Igual ao formato do ENEM e vestibulares.</p>
        </div>
      )}

      <Button
        onClick={startSimulado}
        disabled={!canStart}
        className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-2xl hover:scale-[1.02] transition-all active:scale-95"
      >
        <BrainCircuit className="h-6 w-6 mr-2" />
        Iniciar Simulado
      </Button>
    </div>
  );
}
