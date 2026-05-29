'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Loader2, Award, RotateCw, BrainCircuit, Library, AlertCircle,
  Target, Shuffle, ClipboardList, CheckCircle2, XCircle, BookOpen,
  Timer, ChevronRight, Zap, Trophy, TrendingUp, Flame,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/app/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { SupportingTextBlock } from '@/components/SupportingTextBlock';
import {
  awardXP, checkAndAwardBadges, getTotalAnswered,
  XP_PER_CORRECT_QUESTION, XP_PER_SIMULADO_COMPLETE, BADGE_META,
} from '@/lib/gamification';

// ─── constants ────────────────────────────────────────────────────────────────
const ALL_TOPICS = '_all';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } },
};

type Mode = 'especifico' | 'materia' | 'completo';
type Subject     = { id: string; name: string; question_count: number };
type MicroTopic  = { id: string; name: string };
type Question    = {
  id: string; question_text: string;
  options: { key?: string; letter?: string; text: string }[];
  correct_answer: string; subjects: { name: string } | null;
  year: number; explanation?: string; supporting_text?: string; image_url?: string;
};
type Answer = {
  questionId: string; selected: string; correct: string; explanation?: string;
  question_text: string; options: { key?: string; letter?: string; text: string }[];
  subject: string | null;
};
type GameState = 'loading_subjects' | 'idle' | 'loading_questions' | 'active' | 'finished' | 'error';

// ─── SVG score ring ───────────────────────────────────────────────────────────
function ScoreRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function SimuladoPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [gameState, setGameState]             = useState<GameState>('loading_subjects');
  const [mode, setMode]                       = useState<Mode>('materia');
  const [subjects, setSubjects]               = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [microTopics, setMicroTopics]         = useState<MicroTopic[]>([]);
  const [selectedMicroTopicId, setSelectedMicroTopicId] = useState<string>(ALL_TOPICS);

  const [questions, setQuestions]   = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers]       = useState<Answer[]>([]);

  const [simSize, setSimSize]       = useState<number>(10);
  const [timeLeft, setTimeLeft]     = useState<number | null>(null);
  const [isPaused, setIsPaused]     = useState(false);

  // ── data fetching ──
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
    supabase.from('micro_topics').select('id, name').eq('subject_id', selectedSubjectId).order('name')
      .then(({ data }) => setMicroTopics(data ?? []));
  }, [selectedSubjectId, mode]);

  const buildQuery = () => {
    let q = supabase.from('questions').select('*, subjects(name)');
    if ((mode === 'materia' || mode === 'especifico') && selectedSubjectId)
      q = q.eq('subject_id', selectedSubjectId) as any;
    if (mode === 'especifico' && selectedMicroTopicId && selectedMicroTopicId !== ALL_TOPICS)
      q = q.eq('micro_topic_id', selectedMicroTopicId) as any;
    const audience = (
      profile?.exam_target || user?.user_metadata?.exam_target ||
      profile?.profile_type || user?.user_metadata?.profile_type || 'enem'
    ).toLowerCase().trim();
    const ua = audience.includes('etec') ? 'etec' : 'enem';
    q = q.or(`target_audience.eq.all,target_audience.eq.${ua},target_audience.is.null`) as any;
    return q.limit(200);
  };

  const startSimulado = useCallback(async () => {
    if (mode !== 'completo' && !selectedSubjectId) return;
    setGameState('loading_questions');
    try {
      const { data: raw, error } = await buildQuery();
      let items: any[] = [];
      if (error) {
        let fb = supabase.from('questions').select('*, subjects(name)');
        if (selectedSubjectId) fb = fb.eq('subject_id', selectedSubjectId) as any;
        const { data: f, error: e2 } = await fb.limit(200);
        if (e2) throw e2;
        items = f ?? [];
      } else {
        items = raw ?? [];
      }
      const shuffled = items.sort(() => 0.5 - Math.random()).slice(0, simSize);
      if (shuffled.length === 0) {
        toast({ title: 'Sem questões', description: 'Não há questões para este filtro.', variant: 'destructive' });
        setGameState('idle'); return;
      }
      const formatted: Question[] = shuffled.map((q: any) => {
        let opts = q.options;
        if (typeof opts === 'string') { try { opts = JSON.parse(opts); } catch { opts = []; } }
        return { ...q, options: opts ?? [], subjects: typeof q.subjects === 'string' ? JSON.parse(q.subjects) : q.subjects };
      });
      setQuestions(formatted); setCurrentIndex(0); setAnswers([]); setSelectedAnswer(null);
      setTimeLeft(formatted.length * 3.5 * 60); setIsPaused(false);
      setGameState('active');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      setGameState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedSubjectId, selectedMicroTopicId, profile, toast, simSize]);

  // ── timer ──
  useEffect(() => {
    if (gameState !== 'active' || timeLeft === null || isPaused) return;
    if (timeLeft <= 0) {
      toast({ title: 'Tempo esgotado!', description: 'Seu simulado será finalizado.', variant: 'destructive' });
      setGameState('finished'); return;
    }
    const t = setInterval(() => setTimeLeft(p => (p !== null ? p - 1 : null)), 1000);
    return () => clearInterval(t);
  }, [gameState, timeLeft, isPaused, toast]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const norm = (v: string | undefined | null) => (v ?? '').trim().toUpperCase();
  const score = answers.filter(a => norm(a.selected) === norm(a.correct)).length;
  const pct   = answers.length > 0 ? Math.round((score / answers.length) * 100) : 0;
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;
  const currentQuestion = questions[currentIndex];

  const handleNext = async () => {
    if (!selectedAnswer || !currentQuestion) return;
    const q = currentQuestion;
    const newAnswer: Answer = {
      questionId: q.id, selected: selectedAnswer, correct: q.correct_answer,
      explanation: q.explanation, question_text: q.question_text, options: q.options,
      subject: q.subjects?.name ?? null,
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (user) {
      supabase.from('student_question_answers').insert({
        student_id: user.id, question_id: q.id,
        selected_option: selectedAnswer,
        is_correct: norm(selectedAnswer) === norm(q.correct_answer),
      }).then(() => {});
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      const s = newAnswers.filter(a => norm(a.selected) === norm(a.correct)).length;
      if (user) {
        const xp = s * XP_PER_CORRECT_QUESTION + XP_PER_SIMULADO_COMPLETE;
        awardXP(user.id, xp).then(() => {});
        const total = await getTotalAnswered(user.id);
        const badges = await checkAndAwardBadges(user.id, {
          totalAnswered: total + newAnswers.length,
          isPerfectSimulado: s === newAnswers.length && newAnswers.length > 0,
        });
        if (badges.length > 0)
          toast({ title: '🏆 Conquista desbloqueada!', description: badges.map(b => BADGE_META[b].label).join(', ') });
        toast({ title: `+${xp} XP ganhos!`, description: `${s} acertos neste simulado.` });
      }
      setGameState('finished');
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════════════
  if (gameState === 'loading_subjects' || gameState === 'loading_questions') {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center flex-col gap-5">
        <div className="relative">
          <div className="h-20 w-20 rounded-3xl aurora-dark flex items-center justify-center">
            <BrainCircuit className="h-9 w-9 text-white animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-accent flex items-center justify-center">
            <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
          </div>
        </div>
        <p className="text-sm font-black text-primary italic animate-pulse">
          {gameState === 'loading_subjects' ? 'Carregando matérias...' : 'Montando seu simulado personalizado...'}
        </p>
        <p className="text-xs text-slate-400 font-medium">Aguarde um momento</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR
  // ════════════════════════════════════════════════════════════════════════════
  if (gameState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-5 px-4">
        <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div className="text-center">
          <p className="font-black text-xl text-primary italic">Algo deu errado</p>
          <p className="text-sm text-slate-400 mt-1">Não foi possível carregar as matérias.</p>
        </div>
        <Button onClick={fetchSubjects} className="rounded-xl bg-primary font-black px-8">
          <RotateCw className="h-4 w-4 mr-2" /> Tentar Novamente
        </Button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVE — question view
  // ════════════════════════════════════════════════════════════════════════════
  if (gameState === 'active' && currentQuestion) {
    const opt = (o: any) => o.key || o.letter || '';
    const urgentTime = timeLeft !== null && timeLeft < 300;

    return (
      <div className="max-w-3xl mx-auto pb-36 sm:pb-24 px-2 sm:px-4">

        {/* sticky progress header */}
        <div className="sticky top-2 z-30 mb-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl aurora-dark flex items-center justify-center shrink-0">
                  <BrainCircuit className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-black text-primary text-xs uppercase tracking-widest leading-none">
                    Questão {currentIndex + 1} <span className="text-slate-300">/</span> {questions.length}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                    {currentQuestion.subjects?.name || 'Geral'} · {currentQuestion.year}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* score so far */}
                <div className="hidden sm:flex items-center gap-1.5 bg-green-50 text-green-600 rounded-xl px-3 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-black">{answers.filter(a => norm(a.selected) === norm(a.correct)).length}</span>
                </div>

                {timeLeft !== null && (
                  <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors
                    ${urgentTime ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-50 text-slate-500'}`}
                  >
                    <Timer className="h-3.5 w-3.5" />
                    <span className="text-xs font-black tabular-nums">{formatTime(timeLeft)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform' }}
          >
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden mb-4">
              {/* question body */}
              <div className="p-6 sm:p-8 space-y-5 border-b border-slate-50">
                {currentQuestion.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentQuestion.image_url}
                    alt="Imagem da questão"
                    className="w-full rounded-2xl object-contain max-h-64 border border-slate-100"
                  />
                )}
                {currentQuestion.supporting_text && (
                  <SupportingTextBlock text={currentQuestion.supporting_text} />
                )}
                <p className="text-sm sm:text-base font-medium text-slate-800 leading-[1.8] italic whitespace-pre-wrap break-words">
                  {currentQuestion.question_text}
                </p>
              </div>

              {/* options */}
              <div className="p-6 sm:p-8">
                <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5">
                  <RadioGroup value={selectedAnswer ?? ''} onValueChange={setSelectedAnswer}>
                    {(currentQuestion.options || []).map((o: any) => {
                      const key = opt(o);
                      const isSelected = selectedAnswer === key;
                      return (
                        <motion.div key={key} variants={fadeUp} whileTap={{ scale: 0.985 }} style={{ willChange: 'transform' }}>
                          <div
                            onClick={() => setSelectedAnswer(key)}
                            className={`flex items-start gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer select-none
                              ${isSelected
                                ? 'border-primary bg-primary/5 shadow-[0_0_0_2px_rgba(255,107,0,0.1)]'
                                : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 active:border-primary/40'}`}
                          >
                            <RadioGroupItem value={key} id={`opt-${key}`} className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()} />
                            <div className="flex gap-2 sm:gap-3 min-w-0">
                              <span className={`font-black italic shrink-0 text-sm sm:text-base
                                ${isSelected ? 'text-primary' : 'text-slate-300'}`}>
                                {key.toUpperCase()}.
                              </span>
                              <span className="font-medium text-slate-700 text-sm sm:text-base whitespace-pre-wrap break-words">{o.text}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </RadioGroup>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* bottom CTA */}
        <div className="fixed bottom-16 left-0 right-0 z-40 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 sm:relative sm:bottom-auto sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <p className="hidden sm:block text-[10px] font-black uppercase text-slate-300 italic flex-1">Analise com calma.</p>
            <Button
              onClick={handleNext}
              disabled={selectedAnswer === null}
              className="w-full sm:w-auto h-12 sm:h-14 rounded-2xl font-black text-sm sm:text-base px-8 bg-primary shadow-xl active:scale-95 transition-transform flex items-center gap-2 touch-manipulation disabled:opacity-50 disabled:pointer-events-none"
            >
              {currentIndex < questions.length - 1
                ? <><span>Próxima Questão</span><ChevronRight className="h-4 w-4" /></>
                : <><Trophy className="h-4 w-4" /><span>Finalizar Simulado</span></>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINISHED
  // ════════════════════════════════════════════════════════════════════════════
  if (gameState === 'finished') {
    const resultColor = pct >= 70 ? 'text-green-500' : pct >= 50 ? 'text-amber-500' : 'text-red-400';
    const resultLabel = pct >= 70 ? 'Excelente!' : pct >= 50 ? 'Bom desempenho!' : 'Continue praticando!';
    const resultBg    = pct >= 70 ? 'from-green-500 to-emerald-600' : pct >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-400 to-rose-600';

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-700 pb-28 px-2 sm:px-4">

        {/* score card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          {/* hero strip */}
          <div className={`bg-gradient-to-r ${resultBg} p-6 flex items-center justify-between gap-4`}>
            <div>
              <p className="text-white/70 font-black text-[10px] uppercase tracking-widest mb-1">Simulado Concluído</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white italic leading-tight">{resultLabel}</h2>
            </div>
            <div className="relative shrink-0">
              <ScoreRing pct={pct} size={96} />
              <div className="absolute inset-0 flex items-center justify-center rotate-90">
                <p className="font-black text-white text-xl leading-none">{pct}<span className="text-sm">%</span></p>
              </div>
            </div>
          </div>

          {/* stats grid */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            {[
              { label: 'Acertos', value: score, color: 'text-green-500', icon: CheckCircle2 },
              { label: 'Erros',   value: answers.length - score, color: 'text-red-400', icon: XCircle },
              { label: 'Total',   value: answers.length, color: 'text-primary', icon: ClipboardList },
            ].map(s => (
              <div key={s.label} className="p-5 text-center">
                <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-slate-100">
            <Button
              onClick={() => { setGameState('idle'); setAnswers([]); }}
              className="w-full h-12 rounded-2xl bg-primary text-white font-black shadow-lg active:scale-95 transition-transform"
            >
              <RotateCw className="h-4 w-4 mr-2" /> Novo Simulado
            </Button>
          </div>
        </div>

        {/* gabarito */}
        <div>
          <h3 className="text-lg font-black text-primary italic px-1 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" /> Gabarito Comentado
          </h3>

          <div className="space-y-3">
            {answers.map((ans, i) => {
              const isCorrect = norm(ans.selected) === norm(ans.correct);
              const getKey = (o: any) => o.key || o.letter || '';
              return (
                <div key={ans.questionId} className={`bg-white rounded-[1.75rem] shadow-sm border overflow-hidden
                  ${isCorrect ? 'border-green-100' : 'border-red-100'}`}>
                  {/* top bar */}
                  <div className={`h-1 w-full ${isCorrect ? 'bg-green-400' : 'bg-red-400'}`} />

                  <div className="p-5 space-y-3">
                    {/* header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isCorrect
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        : <XCircle     className="h-4 w-4 text-red-400   shrink-0" />}
                      <span className={`text-[10px] font-black uppercase tracking-widest
                        ${isCorrect ? 'text-green-600' : 'text-red-400'}`}>
                        Questão {i + 1} — {isCorrect ? 'Acerto' : 'Erro'}
                      </span>
                      {ans.subject && (
                        <span className="ml-auto text-[9px] font-black uppercase bg-accent/10 text-accent px-2 py-0.5 rounded-lg">
                          {ans.subject}
                        </span>
                      )}
                    </div>

                    {/* question text */}
                    <p className="text-xs font-bold text-slate-600 italic leading-relaxed line-clamp-3">
                      {ans.question_text}
                    </p>

                    {/* options */}
                    <div className="space-y-1.5">
                      {(ans.options || []).map((opt: any) => {
                        const k = getKey(opt);
                        const isCorrectOpt  = norm(k) === norm(ans.correct);
                        const isSelectedOpt = norm(k) === norm(ans.selected);
                        const wasWrong = isSelectedOpt && !isCorrect;
                        return (
                          <div
                            key={k || opt.text}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs border transition-all
                              ${isCorrectOpt ? 'bg-green-50 border-green-200 text-green-700 font-bold' : ''}
                              ${wasWrong     ? 'bg-red-50   border-red-200   text-red-500   line-through' : ''}
                              ${!isCorrectOpt && !wasWrong ? 'bg-slate-50 border-transparent text-slate-500' : ''}`}
                          >
                            <span className="font-black italic w-4 shrink-0">{(k || '?').toUpperCase()})</span>
                            <span className="flex-1">{opt.text}</span>
                            {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                            {wasWrong     && <XCircle      className="h-3.5 w-3.5 text-red-400   shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* explanation */}
                    {ans.explanation && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                        <BookOpen className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-amber-700 italic leading-relaxed">{ans.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // IDLE — setup screen
  // ════════════════════════════════════════════════════════════════════════════
  const canStart = mode === 'completo' || !!selectedSubjectId;

  const MODES = [
    { id: 'materia'   as Mode, label: 'Por Matéria',      icon: Library,     desc: 'Escolha uma disciplina e pratique.',     color: 'text-blue-500',   bg: 'bg-blue-50' },
    { id: 'especifico'as Mode, label: 'Treino Específico', icon: Target,      desc: 'Filtre por micro-tópico com precisão.',  color: 'text-violet-500', bg: 'bg-violet-50' },
    { id: 'completo'  as Mode, label: 'Simulado Completo', icon: Shuffle,     desc: 'Questões de todas as matérias.',         color: 'text-accent',     bg: 'bg-accent/10' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-24 px-2 sm:px-4 animate-in fade-in duration-500">

      {/* ── hero ── */}
      <div className="aurora-dark rounded-[2.5rem] p-7 md:p-10 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-5 w-5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Prática Inteligente</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black italic text-white leading-none tracking-tight mb-2">
            Gerador de Listas
          </h1>
          <p className="text-white/60 font-medium text-sm leading-relaxed max-w-sm mb-6">
            Simulados personalizados para o seu ritmo de estudo.
          </p>

          {/* stats */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {[
              { label: 'Matérias',  value: subjects.length, icon: Library },
              { label: 'Tamanho',   value: `${simSize}q`,   icon: ClipboardList },
              { label: 'Tempo est.', value: `~${Math.round(simSize * 3.5)}m`, icon: Timer },
            ].map(s => (
              <div key={s.label} className="gradient-border flex items-center gap-2 bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl px-3.5 py-2.5 shrink-0 min-w-[100px]">
                <s.icon className="h-3.5 w-3.5 text-accent shrink-0" />
                <div>
                  <p className="text-white font-black text-base leading-none">{s.value}</p>
                  <p className="text-white/50 text-[9px] font-black uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── mode selector ── */}
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">Modo de Treino</p>
        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-3" variants={stagger} initial="hidden" animate="show">
          {MODES.map(m => (
            <motion.button
              key={m.id}
              variants={fadeUp}
              whileTap={{ scale: 0.97 }}
              style={{ willChange: 'transform' }}
              onClick={() => { setMode(m.id); setSelectedSubjectId(''); setSelectedMicroTopicId(ALL_TOPICS); }}
              className={`p-4 rounded-[1.75rem] border-2 text-left transition-all duration-200
                ${mode === m.id
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              <div className={`h-10 w-10 rounded-2xl ${mode === m.id ? 'aurora-dark' : m.bg} flex items-center justify-center mb-3`}>
                <m.icon className={`h-5 w-5 ${mode === m.id ? 'text-white' : m.color}`} />
              </div>
              <p className={`font-black text-sm leading-tight mb-1 ${mode === m.id ? 'text-primary' : 'text-slate-600'}`}>{m.label}</p>
              <p className="text-[11px] text-slate-400 font-medium leading-snug">{m.desc}</p>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── subject / topic filters ── */}
      <AnimatePresence>
        {(mode === 'materia' || mode === 'especifico') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6 space-y-4 mb-5"
          >
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Disciplina</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold text-sm focus:ring-accent">
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
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Micro-tópico (opcional)</Label>
                <Select value={selectedMicroTopicId} onValueChange={setSelectedMicroTopicId}>
                  <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold text-sm focus:ring-accent">
                    <SelectValue placeholder={microTopics.length === 0 ? 'Sem micro-tópicos' : 'Todos os tópicos'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value={ALL_TOPICS} className="font-bold">Todos os tópicos</SelectItem>
                    {microTopics.map(mt => (
                      <SelectItem key={mt.id} value={mt.id} className="font-bold">{mt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── completo settings ── */}
      <AnimatePresence>
        {mode === 'completo' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6 space-y-5 mb-5"
          >
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Quantidade de Questões</p>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 45, 90].map(n => (
                  <button
                    key={n}
                    onClick={() => setSimSize(n)}
                    className={`h-11 rounded-xl font-black text-sm transition-all
                      ${simSize === n
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {n === 90 ? <span className="text-[10px]">ENEM<br/>Real</span> : n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-accent/5 to-primary/5 rounded-2xl border border-accent/10">
              <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Timer className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs font-black text-primary">{simSize} questões · ~{Math.round(simSize * 3.5)} minutos</p>
                <p className="text-[10px] text-slate-400 font-medium">3,5 min por questão (padrão ENEM)</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── quick size picker for non-completo ── */}
      {mode !== 'completo' && (
        <div className="bg-white rounded-[1.75rem] shadow-sm border border-slate-100 p-5 mb-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Questões por sessão</p>
          <div className="flex gap-2">
            {[5, 10, 20, 30].map(n => (
              <button
                key={n}
                onClick={() => setSimSize(n)}
                className={`flex-1 h-10 rounded-xl font-black text-sm transition-all
                  ${simSize === n
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── start CTA ── */}
      <Button
        onClick={startSimulado}
        disabled={!canStart}
        className="btn-shimmer w-full h-14 rounded-2xl bg-primary text-white font-black text-base shadow-2xl glow-orange hover:scale-[1.02] active:scale-95 transition-transform [touch-action:manipulation] flex items-center justify-center gap-2"
      >
        <BrainCircuit className="h-5 w-5" />
        Iniciar Simulado
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>

      {!canStart && (
        <p className="text-center text-xs text-slate-400 font-medium mt-2">
          Selecione uma matéria para começar.
        </p>
      )}
    </div>
  );
}
