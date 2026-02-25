"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FilePlus, ListChecks, PlusCircle, FlaskConical, AlertCircle } from 'lucide-react';
import { QuestionsDashboard } from '@/components/QuestionsDashboard';
import { QuestionsList } from '@/components/QuestionsList';
import { createClient } from '@/app/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type Subject = {
    id: string;
    name: string;
};
type QuestionOption = { key: string; text: string };
type ParsedQuestion = {
    tempId: string;
    question_number_in_source: number;
    question_text: string;
    options: QuestionOption[];
    correct_answer: string;
    year: number;
    subject_id: string;
};

const parseExamText = (rawText: string, defaultSubjectId: string): { questions: ParsedQuestion[], errors: string[] } => {
    const questions: ParsedQuestion[] = [];
    let errors: string[] = [];
    const questionMarkers = Array.from(rawText.matchAll(/Questão\s*(\d+)/gi)).map(match => ({ number: parseInt(match[1]), index: match.index, rawText: match[0] }));
    if (questionMarkers.length === 0) return { questions: [], errors: ["Nenhuma questão encontrada."] };
    questionMarkers.forEach((marker, i) => {
        const startIdx = marker.index;
        const endIdx = (i + 1 < questionMarkers.length) ? questionMarkers[i + 1].index : rawText.length;
        let block = rawText.substring(startIdx!, endIdx);
        const altMarkers = Array.from(block.matchAll(/^[A-E][\.)]/gm)).map(m => ({ letter: m[0][0], index: m.index }));
        if (altMarkers.length >= 4) {
            try {
                const enunciadoStart = block.indexOf(marker.rawText) + marker.rawText.length;
                const enunciadoEnd = altMarkers[0].index;
                const question_text = block.substring(enunciadoStart, enunciadoEnd).trim();
                const options = altMarkers.map((alt, j) => {
                    const optStart = alt.index! + alt.letter.length + 1;
                    const optEnd = (j + 1 < altMarkers.length) ? altMarkers[j + 1].index : block.length;
                    return { key: alt.letter, text: block.substring(optStart, optEnd).trim() };
                });
                questions.push({ tempId: `q-${marker.number}`, question_number_in_source: marker.number, question_text, options, correct_answer: 'A', year: new Date().getFullYear(), subject_id: defaultSubjectId });
            } catch (e) { errors.push(`Erro na Questão ${marker.number}`); }
        }
    });
    return { questions, errors };
};

export default function QuestionBankPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [entryMode, setEntryMode] = useState<'bulk' | 'manual'>('bulk');
    const [isSaving, setIsSaving] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [rawText, setRawText] = useState('');
    const [extractedQuestions, setExtractedQuestions] = useState<ParsedQuestion[]>([]);
    const [view, setView] = useState<'upload' | 'validate' | 'finished'>('upload');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [manualQuestion, setManualQuestion] = useState({ question_text: '', year: new Date().getFullYear(), subject_id: '', correct_answer: '' });
    const [manualOptions, setManualOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });

    useEffect(() => {
        const fetchSubjects = async () => {
            const supabase = createClient();
            const { data, error } = await supabase.from('subjects').select('id, name');
            if (error) {
                toast({ title: "Erro ao buscar matérias", description: error.message, variant: 'destructive' });
            } else if (data) {
                setSubjects(data);
                const uncat = data.find(s => s.name === 'Não Categorizado');
                if (uncat && !manualQuestion.subject_id) setManualQuestion(prev => ({ ...prev, subject_id: uncat.id! }));
            }
        };
        fetchSubjects();
    }, [toast, manualQuestion.subject_id]);

    const handleAnalyze = () => {
        const defaultSubjectId = subjects.find(s => s.name === 'Não Categorizado')?.id || subjects[0]?.id;
        if (!rawText.trim() || !defaultSubjectId) return;
        setIsAnalyzing(true);
        setTimeout(() => {
            const { questions, errors } = parseExamText(rawText, defaultSubjectId);
            if (errors.length > 0) toast({ title: "Erro na Análise", description: errors.join('\n'), variant: 'destructive' });
            setExtractedQuestions(questions);
            setView('validate');
            setIsAnalyzing(false);
        }, 500);
    };

    const handleSaveSingleQuestion = async () => {
        if (!user) {
            toast({ title: "Não Autenticado", description: "Faça login para salvar questões.", variant: "destructive" });
            return;
        }

        if (!manualQuestion.question_text || !manualQuestion.subject_id || !manualQuestion.correct_answer || Object.values(manualOptions).some(opt => !opt)) {
            toast({ title: "Campos Incompletos", description: "Preencha todos os campos.", variant: "destructive" });
            return;
        }
        
        setIsSaving(true);
        try {
            const supabase = createClient();
            const optionsToSave: QuestionOption[] = Object.entries(manualOptions).map(([key, text]) => ({ key, text }));
            const { error } = await supabase.from('questions').insert([{ 
                ...manualQuestion, 
                options: optionsToSave,
                teacher_id: user.id
            }]);

            if (error) {
                if (error.message.includes("correct_answer")) {
                    throw new Error("Erro de Coluna: A coluna 'correct_answer' não foi encontrada. Rode o script SQL no Supabase.");
                }
                throw error;
            }

            toast({ title: "Questão Salva!", description: "A nova questão foi adicionada ao banco." });
            setManualQuestion({ question_text: '', year: new Date().getFullYear(), subject_id: subjects.find(s => s.name === 'Não Categorizado')?.id || '', correct_answer: '' });
            setManualOptions({ A: '', B: '', C: '', D: '', E: '' });
        } catch (err: any) {
            toast({ title: "Falha na Persistência", description: err.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSeedExample = async () => {
        if (!user || isSaving) return;
        const biologySubject = subjects.find(s => s.name === 'Biologia')?.id || subjects[0]?.id;
        if (!biologySubject) {
            toast({ title: "Aguardando Matérias", description: "Carregando dados do banco...", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const supabase = createClient();
            const example = {
                question_text: "Qual organela é responsável pela respiração celular?",
                year: 2024,
                subject_id: biologySubject,
                correct_answer: "B",
                teacher_id: user.id,
                options: [
                    { key: "A", text: "Complexo de Golgi" },
                    { key: "B", text: "Mitocôndria" },
                    { key: "C", text: "Ribossomo" },
                    { key: "D", text: "Lisossomo" }
                ]
            };

            const { error } = await supabase.from('questions').insert([example]);
            if (error) throw error;
            
            toast({ title: "Exemplo Gerado!", description: "Questão de Biologia adicionada com sucesso." });
            window.location.reload();
        } catch (err: any) {
            toast({ title: "Erro no Teste", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center"><FilePlus className="h-6 w-6 text-accent" /></div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-primary italic leading-none">Gestão de Questões</h1>
                        <p className="text-muted-foreground text-xs font-medium">Repositório industrial de avaliações.</p>
                    </div>
                </div>
                <Button onClick={handleSeedExample} disabled={isSaving} variant="outline" className="rounded-xl border-dashed border-accent text-accent hover:bg-accent/5 h-12">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />} 
                    Gerar Exemplo de Teste
                </Button>
            </div>

            <QuestionsDashboard />

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-8 md:p-12">
                    <div className="flex bg-muted/10 p-1.5 rounded-2xl mb-10 w-fit mx-auto md:mx-0">
                        <Button 
                            variant={entryMode === 'bulk' ? 'default' : 'ghost'} 
                            onClick={() => setEntryMode('bulk')} 
                            className="rounded-xl font-bold h-11 px-6"
                        >
                            <ListChecks className="h-4 w-4 mr-2"/> Carga em Massa
                        </Button>
                        <Button 
                            variant={entryMode === 'manual' ? 'default' : 'ghost'} 
                            onClick={() => setEntryMode('manual')} 
                            className="rounded-xl font-bold h-11 px-6"
                        >
                            <PlusCircle className="h-4 w-4 mr-2"/> Cadastro Manual
                        </Button>
                    </div>

                    {entryMode === 'bulk' ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Conteúdo da Prova (Texto Bruto)</Label>
                                <Textarea 
                                    placeholder="Ex: Questão 1. Enunciado... A. Opção 1 B. Opção 2..." 
                                    className="min-h-[300px] rounded-[1.5rem] bg-muted/30 border-none p-6 font-medium text-sm leading-relaxed" 
                                    value={rawText} 
                                    onChange={(e) => setRawText(e.target.value)} 
                                />
                            </div>
                            <div className="flex justify-end pt-6 border-t border-muted/10">
                                <Button onClick={handleAnalyze} disabled={isAnalyzing || !rawText.trim()} className="h-14 rounded-2xl font-black px-10 bg-accent text-accent-foreground shadow-xl transition-all active:scale-95">
                                    {isAnalyzing ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "Extrair Questões do Texto"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Enunciado</Label>
                                <Textarea 
                                    placeholder="Digite o enunciado completo..." 
                                    className="rounded-[1.5rem] bg-muted/30 border-none min-h-[150px] p-6 font-medium italic" 
                                    value={manualQuestion.question_text} 
                                    onChange={e => setManualQuestion(prev => ({...prev, question_text: e.target.value}))} 
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['A', 'B', 'C', 'D', 'E'].map(key => (
                                    <div key={key} className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Alternativa {key}</Label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary/20 italic">{key}</span>
                                            <Input 
                                                placeholder="Texto da opção..." 
                                                className="pl-12 h-14 rounded-2xl bg-muted/30 border-none font-medium" 
                                                value={manualOptions[key as keyof typeof manualOptions]} 
                                                onChange={e => setManualOptions(prev => ({...prev, [key]: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Gabarito Oficial</Label>
                                    <Select value={manualQuestion.correct_answer} onValueChange={val => setManualQuestion(prev => ({...prev, correct_answer: val}))}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none font-bold">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {['A', 'B', 'C', 'D', 'E'].map(key => <SelectItem key={key} value={key} className="py-3 font-bold">Alternativa {key}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Matéria / Disciplina</Label>
                                    <Select value={manualQuestion.subject_id} onValueChange={val => setManualQuestion(prev => ({...prev, subject_id: val}))}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-none font-bold">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="py-3 font-bold">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-4">Ano de Aplicação</Label>
                                    <Input 
                                        type="number" 
                                        className="h-14 rounded-2xl bg-muted/30 border-none font-black text-center" 
                                        value={manualQuestion.year} 
                                        onChange={e => setManualQuestion(prev => ({...prev, year: parseInt(e.target.value, 10)}))}
                                    />
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