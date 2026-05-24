"use client";

export const runtime = 'edge';

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { useAuth } from "@/lib/AuthProvider";
import Script from "next/script";
import { supabase } from "@/app/lib/supabase";
import { 
  Loader2, ChevronLeft, Send, CheckCircle2, XCircle, Award, 
  ChevronUp, ChevronDown 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const InteractiveWorkbook = dynamic(
  () => import("@/components/InteractiveWorkbook").then(mod => mod.InteractiveWorkbook),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Carregando Prova Digital...</p>
      </div>
    )
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
  const [result, setResult] = useState<{ score: number, total: number, triRange: string } | null>(null);

  // Mobile Tray State
  const [isTrayExpanded, setIsTrayExpanded] = useState(false);

  useEffect(() => {
    async function loadExam() {
      if (!id) return;
      try {
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('id, title, exam_type, pdf_url')
          .eq('id', id)
          .single();

        if (examError || !examData || !examData.pdf_url) {
          toast({ title: 'Erro', description: 'Prova não encontrada ou sem PDF.', variant: 'destructive' });
          router.push("/dashboard/student/provas");
          return;
        }
        setExam(examData);

        const { data: qData, error: qError } = await supabase
          .from('exam_questions')
          .select('id, question_id, order_index, question:questions(id, correct_answer, subjects(name))')
          .eq('exam_id', id)
          .order('order_index', { ascending: true });

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

  const handleSelectAnswer = (qId: string, option: string) => {
    if (result) return; // Cannot change answers after submission
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = async () => {
    if (!user || !exam) return;
    
    // Check if all questions are answered
    if (Object.keys(answers).length < questions.length) {
      if (!confirm("Você deixou questões em branco. Deseja entregar a prova mesmo assim?")) {
        return;
      }
    }

    setIsSubmitting(true);
    let correctCount = 0;
    
    const formattedAnswers = questions.map(q => {
      const selected = answers[q.question.id] || null;
      const correct = q.question.correct_answer;
      if (selected === correct) correctCount++;
      return { question_id: q.question.id, selected, correct };
    });

    let triRange = '';
    if (exam.exam_type.toLowerCase() === 'enem') {
      const percentage = correctCount / questions.length;
      if (percentage < 0.2) triRange = '300 - 450';
      else if (percentage < 0.4) triRange = '450 - 550';
      else if (percentage < 0.6) triRange = '550 - 650';
      else if (percentage < 0.8) triRange = '650 - 750';
      else triRange = '750 - 850+';
    } else {
      triRange = 'N/A';
    }

    try {
      await supabase.from('exam_attempts').insert({
        user_id: user.id,
        exam_id: exam.id,
        score: correctCount,
        total_questions: questions.length,
        answers: formattedAnswers
      });
      
      setResult({ score: correctCount, total: questions.length, triRange });
      setIsTrayExpanded(true); // Auto expand results on submit
      toast({ title: 'Prova Finalizada!', description: `Você acertou ${correctCount} questões.` });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Carregando Prova e Gabarito...</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-slate-950 overflow-hidden select-none">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js" strategy="afterInteractive" />

      {/* Esquerda: PDF Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-white/5" style={{ minHeight: 0 }}>
        <header className="h-14 bg-slate-950 flex items-center px-4 shrink-0 z-50 gap-3 border-b border-white/5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl shrink-0 h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xs md:text-sm font-black text-white italic truncate">{exam?.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] font-black text-accent uppercase tracking-widest">Simulado Digital</span>
              <span className="text-[8.5px] font-semibold text-slate-500">•</span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{exam?.exam_type}</span>
            </div>
          </div>

          {/* Resumo de Respostas (Mobile) */}
          <span className="text-[10px] font-black text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg shrink-0 md:hidden">
            {answeredCount} / {questions.length} Respondidas
          </span>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <InteractiveWorkbook
            materialId={exam?.id || ''}
            pdfUrl={exam?.pdf_url}
            userName={profile?.name || user?.email || "Estudante"}
            userCpf={profile?.id?.substring(0, 8) || "ID"}
          />
        </main>
      </div>

      {/* Direita: Gabarito Lateral (Sleek Dark Drawer) */}
      <div className={`w-full md:w-80 flex flex-col bg-slate-950 border-t md:border-t-0 md:border-l border-white/5 shadow-2xl z-40 shrink-0 overflow-hidden transition-all duration-300 ${
        isTrayExpanded ? 'h-[50vh] md:h-auto' : 'h-14 md:h-auto'
      }`}>
        
        {/* Cabeçalho do Gabarito (Funciona como toggle no mobile) */}
        <div 
          onClick={() => {
            if (window.innerWidth < 768) {
              setIsTrayExpanded(!isTrayExpanded);
            }
          }}
          className="px-4 py-3 bg-slate-900 border-b border-white/5 flex justify-between items-center shrink-0 cursor-pointer md:cursor-default relative"
        >
          {/* Mobile Handle Indicator */}
          <div className="w-8 h-1 bg-white/10 rounded-full mx-auto mb-1.5 md:hidden block absolute top-1.5 left-1/2 -translate-x-1/2" />
          
          <div className="pt-1 md:pt-0">
            <h2 className="font-black text-white italic leading-none text-sm md:text-base">Gabarito</h2>
            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1 hidden md:block">
              Selecione as opções correspondentes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-white border border-primary/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
              {questions.length} Questões
            </Badge>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-400 md:hidden hover:bg-white/5 rounded-xl shrink-0"
            >
              <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isTrayExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Lista de Questões / Grade de Respostas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
          {result ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {/* Resumo do Resultado */}
              <div className="text-center p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-inner">
                <Award className="h-10 w-10 text-accent mx-auto mb-2" />
                <p className="text-2xl md:text-3xl font-black text-white italic">{result.score} / {result.total}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Questões Acertadas</p>
                <p className="text-xs font-black text-accent mt-3 uppercase tracking-wider">
                  Rendimento: {Math.round((result.score / result.total) * 100)}%
                </p>
              </div>

              {exam?.exam_type.toLowerCase() === 'enem' && (
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Simulação TRI INEP</p>
                  <p className="text-xl font-black text-accent italic">{result.triRange}</p>
                </div>
              )}

              {/* Lista Detalhada do Gabarito */}
              <div className="space-y-2 pt-2">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3 px-1">Gabarito Oficial</p>
                {questions.map((q, idx) => {
                  const selected = answers[q.question.id];
                  const correct = q.question.correct_answer;
                  const isRight = selected === correct;
                  
                  return (
                    <div 
                      key={q.id} 
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isRight 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xs text-slate-400 w-5">{idx + 1}.</span>
                        {isRight ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="font-black text-sm uppercase">{selected || '-'}</span>
                      </div>
                      
                      {!isRight && (
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          Gabarito: {correct}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Formulário Interativo de Respostas */
            <div className="space-y-2.5">
              {questions.map((q, idx) => {
                const currentAnswer = answers[q.question.id];
                return (
                  <div 
                    key={q.id} 
                    className="flex items-center gap-3 px-2 py-2 hover:bg-white/[0.02] rounded-xl border border-transparent hover:border-white/5 transition-all"
                  >
                    <span className={`font-black text-xs w-6 shrink-0 text-center ${
                      currentAnswer ? 'text-accent' : 'text-slate-500'
                    }`}>
                      {idx + 1}.
                    </span>
                    
                    <div className="flex gap-1.5 flex-1 justify-between">
                      {['A', 'B', 'C', 'D', 'E'].map(letter => {
                        const isSelected = currentAnswer === letter;
                        return (
                          <button
                            key={letter}
                            onClick={() => handleSelectAnswer(q.question.id, letter)}
                            className={`h-9 w-9 md:h-8 md:w-8 rounded-xl font-black text-xs transition-all flex-1 max-w-[2.2rem] flex items-center justify-center
                              ${isSelected 
                                ? 'bg-gradient-to-br from-accent to-accent/80 text-white shadow-lg shadow-accent/20 border-none scale-105' 
                                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'
                              }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botão de Entrega */}
        {!result && (
          <div className="p-4 bg-slate-950 border-t border-white/5 shrink-0">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-accent text-white font-black text-xs uppercase tracking-widest hover:bg-accent/90 active:scale-95 transition-all border-none shadow-lg shadow-accent/25"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Entregar Simulado
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
