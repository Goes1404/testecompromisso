"use client";

export const runtime = 'edge';

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { useAuth } from "@/lib/AuthProvider";
import Script from "next/script";
import { supabase } from "@/app/lib/supabase";
import { Loader2, ChevronLeft, Send, CheckCircle2, XCircle, Award } from "lucide-react";
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
      // Dummy TRI estimation logic
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

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-900 overflow-hidden select-none">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js" strategy="afterInteractive" />
      
      {/* Esquerda: PDF (InteractiveWorkbook) */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-screen border-b md:border-b-0 md:border-r border-white/10">
        <header className="h-14 bg-slate-950 flex items-center px-4 shrink-0 z-50">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10 rounded-full mr-3">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black text-white italic truncate">{exam?.title}</h1>
            <p className="text-[8px] text-accent uppercase tracking-widest mt-0.5">PDF Interativo</p>
          </div>
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

      {/* Direita: Gabarito Lateral */}
      <div className="w-full md:w-80 h-[40vh] md:h-screen bg-white flex flex-col shadow-2xl z-40">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-black text-primary italic leading-none">Gabarito</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Marque suas respostas</p>
          </div>
          <Badge variant="outline" className="text-[10px] font-black uppercase bg-white">{questions.length} Questões</Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {result ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
                <Award className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-green-600">{result.score} / {result.total}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-green-700/60 mt-1">Acertos</p>
                <p className="text-sm font-bold text-green-800 mt-2">Aproveitamento: {Math.round((result.score / result.total) * 100)}%</p>
              </div>
              
              {exam?.exam_type.toLowerCase() === 'enem' && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/50 text-center mb-1">Simulação TRI INEP</p>
                  <p className="text-xl font-black text-primary text-center italic">{result.triRange}</p>
                </div>
              )}

              <div className="space-y-2 pt-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Revisão</p>
                {questions.map((q, idx) => {
                  const selected = answers[q.question.id];
                  const correct = q.question.correct_answer;
                  const isRight = selected === correct;
                  return (
                    <div key={q.id} className={`flex items-center justify-between p-3 rounded-xl border ${isRight ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xs w-6">{idx + 1}.</span>
                        {isRight ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        <span className={`font-bold text-sm ${isRight ? 'text-green-700' : 'text-red-600'}`}>{selected || '-'}</span>
                      </div>
                      {!isRight && <span className="text-[10px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-md">Gabarito: {correct}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div key={q.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <span className="font-black text-slate-400 text-xs w-6">{idx + 1}.</span>
                  <div className="flex gap-1.5 flex-1 justify-between">
                    {['A', 'B', 'C', 'D', 'E'].map(letter => {
                      const isSelected = answers[q.question.id] === letter;
                      return (
                        <button
                          key={letter}
                          onClick={() => handleSelectAnswer(q.question.id, letter)}
                          className={`h-8 w-8 rounded-full font-black text-xs transition-all ${isSelected ? 'bg-primary text-white shadow-md scale-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!result && (
          <div className="p-4 bg-white border-t shrink-0">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-accent text-white font-black text-sm uppercase tracking-wider hover:bg-accent/90"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Entregar Prova
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
