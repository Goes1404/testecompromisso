
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    FilePlus, 
    ListChecks, 
    PlusCircle, 
    Sparkles, 
    CheckCircle2, 
    Trash2, 
    Database, 
    BrainCircuit,
    ZapOff,
    Save,
    ArrowRight
} from 'lucide-react';
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
    explanation?: string;
};

export default function QuestionBankPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [entryMode, setEntryMode] = useState<'bulk' | 'manual'>('bulk');
    const [isSaving, setIsSaving] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Bulk States
    const [rawText, setRawText] = useState('');
    const [extractedQuestions, setExtractedQuestions] = useState<ParsedQuestion[]>([]);
    
    // AI Status State (Used for bulk extraction)
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Manual States
    const [manualQuestion, setManualQuestion] = useState({ question_text: '', year: new Date().getFullYear(), subject_id: '', correct_answer: '' });
    const [manualOptions, setManualOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });
    
    const [bulkSubjectId, setBulkSubjectId] = useState<string>('');

    useEffect(() => {
        const fetchSubjects = async () => {
            const { data, error } = await supabase.from('subjects').select('id, name').order('name');
            if (!error && data) {
                setSubjects(data);
                const uncat = data.find(s => s.name === 'Não Categorizado') || data[0];
                if (uncat) {
                    setManualQuestion(prev => ({ ...prev, subject_id: uncat.id }));
                    setBulkSubjectId(uncat.id);
                }
            }
        };
        fetchSubjects();
    }, []);

    const handleAnalyzeBulk = async () => {
        toast({ title: "Funcionalidade Indisponível", description: "O motor de IA (Aurora) foi desativado.", variant: 'destructive' });
    };

    const handleSaveProcessed = async () => {
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
            toast({ title: "Banco Atualizado!", description: "Questões gravadas com sucesso." });
            setExtractedQuestions([]);
            setRawText('');
        } catch (e: any) {
            toast({ title: "Erro ao gravar", description: e.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSingle = async () => {
        if (!user || !manualQuestion.question_text || !manualQuestion.subject_id) return;
        setIsSaving(true);
        try {
            const options: QuestionOption[] = Object.entries(manualOptions)
                .filter(([_, text]) => text.trim() !== '')
                .map(([key, text]) => ({ key, text }));
            
            const { error } = await supabase.from('questions').insert([{ 
                ...manualQuestion, 
                options,
                teacher_id: user.id
            }]);
            if (error) throw error;
            toast({ title: "Questão Salva!" });
            setManualQuestion(prev => ({ ...prev, question_text: '' }));
            setManualOptions({ A: '', B: '', C: '', D: '', E: '' });
        } catch (err: any) {
            toast({ title: "Falha ao salvar", description: err.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24 px-1">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-3">
                        <Database className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-primary italic leading-none">Banco de Questões</h1>
                        <p className="text-muted-foreground font-medium italic">Gestão estratégica de avaliações e simulados.</p>
                    </div>
                </div>
            </header>

            <QuestionsDashboard />

            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-dashed p-8 md:p-12">
                    <div className="flex flex-wrap bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border w-fit mx-auto md:mx-0 shadow-sm">
                        <Button variant={entryMode === 'bulk' ? 'default' : 'ghost'} onClick={() => {setEntryMode('bulk'); setExtractedQuestions([]);}} className={`rounded-xl font-black text-[10px] uppercase tracking-widest h-11 px-6 ${entryMode === 'bulk' ? 'bg-primary text-white shadow-lg' : ''}`}>
                            <ListChecks className="h-4 w-4 mr-2"/> Carga em Massa
                        </Button>
                        <Button variant={entryMode === 'manual' ? 'default' : 'ghost'} onClick={() => setEntryMode('manual')} className={`rounded-xl font-black text-[10px] uppercase tracking-widest h-11 px-6 ${entryMode === 'manual' ? 'bg-primary text-white shadow-lg' : ''}`}>
                            <PlusCircle className="h-4 w-4 mr-2"/> Manual
                        </Button>
                    </div>
                </CardHeader>
                
                <CardContent className="p-8 md:p-12">
                    {entryMode === 'bulk' && (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Texto Bruto da Prova</Label>
                                <Textarea 
                                    placeholder="Cole aqui o texto copiado de um PDF ou documento..." 
                                    className="min-h-[300px] rounded-[2rem] bg-muted/30 border-none p-8 font-medium text-sm leading-relaxed italic" 
                                    value={rawText} 
                                    onChange={(e) => setRawText(e.target.value)} 
                                />
                            </div>
                            <Button disabled className="w-full h-16 rounded-2xl bg-slate-100 text-slate-400 font-black text-lg shadow-none cursor-not-allowed">
                                <ZapOff className="h-6 w-6 mr-2" />
                                Extração IA Desabilitada
                            </Button>
                        </div>
                    )}

                    {entryMode === 'manual' && (
                        <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Enunciado da Questão</Label>
                                <Textarea placeholder="Digite o texto da pergunta..." className="rounded-[1.5rem] bg-muted/30 border-none min-h-[150px] p-6 font-medium italic" value={manualQuestion.question_text} onChange={e => setManualQuestion(prev => ({...prev, question_text: e.target.value}))} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['A', 'B', 'C', 'D', 'E'].map(key => (
                                    <div key={key} className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Opção {key}</Label>
                                        <Input placeholder={`Texto da alternativa ${key}...`} className="h-14 rounded-2xl bg-muted/30 border-none font-medium pl-6" value={manualOptions[key as keyof typeof manualOptions]} onChange={e => setManualOptions(prev => ({...prev, [key]: e.target.value}))} />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Gabarito</Label>
                                    <Select value={manualQuestion.correct_answer} onValueChange={val => setManualQuestion(prev => ({...prev, correct_answer: val}))}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none font-bold"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {['A', 'B', 'C', 'D', 'E'].map(key => <SelectItem key={key} value={key} className="font-bold">Alternativa {key}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Disciplina</Label>
                                    <Select value={manualQuestion.subject_id} onValueChange={val => setManualQuestion(prev => ({...prev, subject_id: val}))}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none font-bold"><SelectValue placeholder="Matéria" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Ano Referência</Label>
                                    <Input type="number" className="h-14 rounded-2xl bg-muted/30 border-none font-black text-center" value={manualQuestion.year} onChange={e => setManualQuestion(prev => ({...prev, year: parseInt(e.target.value, 10)}))} />
                                </div>
                            </div>
                            <Button onClick={handleSaveSingle} disabled={isSaving || !manualQuestion.question_text} className="w-full h-16 bg-primary text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-95">
                                {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Save className="h-6 w-6 mr-2" />}
                                Salvar no Repositório
                            </Button>
                        </div>
                    )}

                    {extractedQuestions.length > 0 && (
                        <div className="mt-12 pt-12 border-t border-dashed space-y-8 animate-in slide-in-from-bottom-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50 p-6 rounded-3xl border border-muted/20">
                                <div>
                                    <h3 className="text-xl font-black text-primary italic">Área de Curadoria ({extractedQuestions.length})</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Vincule as questões a uma matéria para finalizar a importação.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Select value={bulkSubjectId} onValueChange={setBulkSubjectId}>
                                        <SelectTrigger className="w-56 h-12 rounded-xl bg-white border-none shadow-md font-bold"><SelectValue placeholder="Vincular Matéria" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleSaveProcessed} disabled={isSaving || !bulkSubjectId} className="h-12 px-8 rounded-xl bg-primary text-white font-black shadow-lg">
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2 text-accent" />}
                                        Validar e Salvar Tudo
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {extractedQuestions.map((q, i) => (
                                    <Card key={i} className="border-none shadow-lg bg-white p-6 rounded-[2rem] relative group hover:shadow-xl transition-all">
                                        <button onClick={() => setExtractedQuestions(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-50 shadow-sm">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Badge className="bg-primary/5 text-primary border-none font-black text-[8px] uppercase px-3">QUESTÃO {i+1}</Badge>
                                            <Badge className="bg-accent/10 text-accent border-none font-black text-[8px] uppercase px-3">{q.year}</Badge>
                                        </div>
                                        <p className="text-sm font-bold text-primary italic leading-relaxed mb-6 line-clamp-4">"{q.question_text}"</p>
                                        <div className="space-y-2">
                                            {q.options.map(opt => (
                                                <div key={opt.key} className={`flex items-center gap-3 p-3 rounded-xl border text-[10px] font-medium ${q.correct_answer === opt.key ? 'bg-green-50 border-green-100 text-green-700' : 'bg-slate-50 border-transparent text-muted-foreground'}`}>
                                                    <span className="font-black italic">{opt.key})</span>
                                                    <span className="truncate">{opt.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {q.explanation && (
                                            <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                                <p className="text-[9px] font-black uppercase text-blue-600 mb-1 flex items-center gap-1.5">
                                                    <BrainCircuit className="h-3 w-3" /> Resolução Comentada
                                                </p>
                                                <p className="text-[10px] text-blue-800 font-medium italic leading-relaxed">{q.explanation}</p>
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <section className="pt-8">
                 <div className="flex items-center justify-between px-2 mb-6">
                    <h2 className="text-2xl font-black text-primary italic flex items-center gap-3">
                        <ArrowRight className="h-6 w-6 text-accent" />
                        Histórico do Repositório
                    </h2>
                 </div>
                 <QuestionsList />
            </section>
        </div>
    );
}
