'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FilePlus, ListChecks, PlusCircle, Sparkles, CheckCircle2, Trash2, Database, AlertCircle } from 'lucide-react';
import { QuestionsDashboard } from '@/components/QuestionsDashboard';
import { QuestionsList } from '@/components/QuestionsList';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type Subject = { id: string; name: string };
type QuestionOption = { key: string; text: string };
type ParsedQuestion = {
    question_text: string;
    options: QuestionOption[];
    correct_answer: string;
    year: number;
};

export default function QuestionBankPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [entryMode, setEntryMode] = useState<'bulk' | 'manual'>('bulk');
    const [isSaving, setIsSaving] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [rawText, setRawText] = useState('');
    const [extractedQuestions, setExtractedQuestions] = useState<ParsedQuestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [manualQuestion, setManualQuestion] = useState({ question_text: '', year: new Date().getFullYear(), subject_id: '', correct_answer: '' });
    const [manualOptions, setManualOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });
    const [bulkSubjectId, setBulkSubjectId] = useState<string>('');

    useEffect(() => {
        const fetchSubjects = async () => {
            const { data, error } = await supabase.from('subjects').select('id, name');
            if (!error && data) {
                setSubjects(data);
                const uncat = data.find(s => s.name === 'Não Categorizado');
                if (uncat) {
                    setManualQuestion(prev => ({ ...prev, subject_id: uncat.id }));
                    setBulkSubjectId(uncat.id);
                }
            }
        };
        fetchSubjects();
    }, []);

    const handleAnalyze = async () => {
        if (!rawText.trim() || isAnalyzing) return;
        
        setIsAnalyzing(true);
        setExtractedQuestions([]);
        
        try {
            const response = await fetch('/api/genkit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flowId: 'bulkQuestionParser',
                    input: { rawText: rawText }
                })
            });

            const data = await response.json();
            if (data.success && data.result?.questions) {
                setExtractedQuestions(data.result.questions);
                toast({ title: "Análise Concluída!", description: `${data.result.questions.length} questões identificadas pela Aurora.` });
            } else {
                throw new Error(data.error || "A IA não conseguiu extrair questões válidas.");
            }
        } catch (error: any) {
            toast({ title: "Erro na Aurora", description: error.message, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveBulk = async () => {
        if (!user || extractedQuestions.length === 0 || !bulkSubjectId) return;
        
        setIsSaving(true);
        try {
            const itemsToInsert = extractedQuestions.map(q => ({
                question_text: q.question_text,
                options: q.options,
                correct_answer: q.correct_answer,
                year: q.year,
                subject_id: bulkSubjectId,
                teacher_id: user.id
            }));

            const { error } = await supabase.from('questions').insert(itemsToInsert);
            if (error) throw error;

            toast({ title: "Carga Finalizada!", description: "Todas as questões foram gravadas no repositório." });
            setExtractedQuestions([]);
            setRawText('');
            // Forçar reload suave ou atualizar lista
            window.location.reload();
        } catch (e: any) {
            toast({ title: "Erro ao gravar", description: e.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSingleQuestion = async () => {
        if (!user || !manualQuestion.question_text || !manualQuestion.subject_id) return;
        
        setIsSaving(true);
        try {
            const options: QuestionOption[] = Object.entries(manualOptions).map(([key, text]) => ({ key, text }));
            const { error } = await supabase.from('questions').insert([{ 
                ...manualQuestion, 
                options,
                teacher_id: user.id
            }]);

            if (error) throw error;

            toast({ title: "Questão Salva!" });
            setManualQuestion(prev => ({ ...prev, question_text: '' }));
            setManualOptions({ A: '', B: '', C: '', D: '', E: '' });
            window.location.reload();
        } catch (err: any) {
            toast({ title: "Falha na Persistência", description: err.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center"><FilePlus className="h-6 w-6 text-accent" /></div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-primary italic leading-none">Gestão de Questões</h1>
                        <p className="text-muted-foreground text-xs font-medium italic">Repositório industrial de avaliações.</p>
                    </div>
                </div>
            </div>

            <QuestionsDashboard />

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-8 md:p-12">
                    <div className="flex bg-muted/10 p-1.5 rounded-2xl mb-10 w-fit mx-auto md:mx-0">
                        <Button variant={entryMode === 'bulk' ? 'default' : 'ghost'} onClick={() => setEntryMode('bulk')} className="rounded-xl font-bold h-11 px-6">
                            <ListChecks className="h-4 w-4 mr-2"/> Carga em Massa (IA)
                        </Button>
                        <Button variant={entryMode === 'manual' ? 'default' : 'ghost'} onClick={() => setEntryMode('manual')} className="rounded-xl font-bold h-11 px-6">
                            <PlusCircle className="h-4 w-4 mr-2"/> Cadastro Manual
                        </Button>
                    </div>

                    {entryMode === 'bulk' ? (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Conteúdo Bruto da Prova</Label>
                                    <Badge className="bg-accent/10 text-accent border-none font-black text-[8px] uppercase px-3 py-1">Aurora Parser Ativo</Badge>
                                </div>
                                <Textarea 
                                    placeholder="Cole aqui o texto da prova... Ex: 1. Qual o valor de X? A) 1 B) 2..." 
                                    className="min-h-[250px] rounded-[1.5rem] bg-muted/30 border-none p-6 font-medium text-sm leading-relaxed italic" 
                                    value={rawText} 
                                    onChange={(e) => setRawText(e.target.value)} 
                                />
                                <Button onClick={handleAnalyze} disabled={isAnalyzing || !rawText.trim()} className="w-full h-14 rounded-2xl font-black text-base bg-accent text-accent-foreground shadow-xl hover:scale-[1.02] transition-all">
                                    {isAnalyzing ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Sparkles className="h-6 w-6 mr-2" />}
                                    {isAnalyzing ? "Aurora está lendo o texto..." : "Analisar Texto com IA"}
                                </Button>
                            </div>

                            {extractedQuestions.length > 0 && (
                                <div className="space-y-6 pt-10 border-t border-dashed animate-in slide-in-from-bottom-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-black text-primary italic">Questões Detectadas ({extractedQuestions.length})</h3>
                                            <p className="text-xs text-muted-foreground font-medium">Revise os dados antes de gravar no banco oficial.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Select value={bulkSubjectId} onValueChange={setBulkSubjectId}>
                                                <SelectTrigger className="w-48 h-11 rounded-xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                                    {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Button onClick={handleSaveBulk} disabled={isSaving} className="h-11 px-8 rounded-xl bg-primary text-white font-black shadow-lg">
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                                                Gravar Tudo
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {extractedQuestions.map((q, i) => (
                                            <Card key={i} className="border-none shadow-md bg-slate-50 p-5 rounded-2xl relative group">
                                                <button onClick={() => setExtractedQuestions(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white text-red-400 opacity-0 group-hover:opacity-100 transition-all shadow-sm flex items-center justify-center hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <Badge className="bg-primary/5 text-primary border-none font-black text-[8px] uppercase mb-3">Questão {i+1} • {q.year}</Badge>
                                                <p className="text-xs font-bold text-primary italic line-clamp-3 mb-4">"{q.question_text}"</p>
                                                <div className="space-y-1">
                                                    {q.options.slice(0, 3).map(opt => (
                                                        <div key={opt.key} className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                                            <span className={`font-black ${q.correct_answer === opt.key ? 'text-green-600' : ''}`}>{opt.key})</span>
                                                            <span className="truncate">{opt.text}</span>
                                                        </div>
                                                    ))}
                                                    {q.options.length > 3 && <p className="text-[8px] text-muted-foreground opacity-40">... + {q.options.length - 3} opções</p>}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Enunciado</Label>
                                <Textarea placeholder="Digite o enunciado completo..." className="rounded-[1.5rem] bg-muted/30 border-none min-h-[150px] p-6 font-medium italic" value={manualQuestion.question_text} onChange={e => setManualQuestion(prev => ({...prev, question_text: e.target.value}))} />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['A', 'B', 'C', 'D', 'E'].map(key => (
                                    <div key={key} className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Alternativa {key}</Label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary/20 italic">{key}</span>
                                            <Input placeholder="Texto da opção..." className="pl-12 h-14 rounded-2xl bg-muted/30 border-none font-medium" value={manualOptions[key as keyof typeof manualOptions]} onChange={e => setManualOptions(prev => ({...prev, [key]: e.target.value}))} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Gabarito Oficial</Label>
                                    <Select value={manualQuestion.correct_answer} onValueChange={val => setManualQuestion(prev => ({...prev, correct_answer: val}))}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none font-bold"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {['A', 'B', 'C', 'D', 'E'].map(key => <SelectItem key={key} value={key} className="py-3 font-bold">Alternativa {key}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Matéria / Disciplina</Label>
                                    <Select value={manualQuestion.subject_id} onValueChange={val => setManualQuestion(prev => ({...prev, subject_id: val}))}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none font-bold"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="py-3 font-bold">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Ano</Label>
                                    <Input type="number" className="h-14 rounded-2xl bg-muted/30 border-none font-black text-center" value={manualQuestion.year} onChange={e => setManualQuestion(prev => ({...prev, year: parseInt(e.target.value, 10)}))} />
                                </div>
                            </div>

                            <div className="flex justify-end pt-8 border-t border-muted/10">
                                <Button onClick={handleSaveSingleQuestion} disabled={isSaving} className="h-16 rounded-2xl font-black px-12 bg-primary text-white shadow-xl hover:bg-primary/95 transition-all">
                                    {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "Gravar no Repositório"}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="pt-10">
                 <QuestionsList />
            </div>
        </div>
    );
}
