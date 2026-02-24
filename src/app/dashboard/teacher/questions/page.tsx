'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FilePlus, CheckCircle, ListChecks, PlusCircle, AlertCircle } from 'lucide-react';
import { QuestionsDashboard } from '@/components/QuestionsDashboard';
import { QuestionsList } from '@/components/QuestionsList';
import { createClient, isSupabaseConfigured } from '@/app/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function QuestionBankPage() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [entryMode, setEntryMode] = useState<'bulk' | 'manual'>('manual');
    const [isSaving, setIsSaving] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [rawText, setRawText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const [manualQuestion, setManualQuestion] = useState({ 
        question_text: '', 
        year: new Date().getFullYear().toString(), 
        subject_id: '', 
        correct_answer: 'A' 
    });
    const [manualOptions, setManualOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });

    useEffect(() => {
        async function fetchSubjects() {
            if (!isSupabaseConfigured) return;
            const supabase = createClient();
            try {
                const { data, error } = await supabase.from('subjects').select('*').order('name');
                if (error) throw error;
                if (data) setSubjects(data);
            } catch (e: any) {
                console.error("Erro ao carregar matérias:", e.message);
            }
        }
        fetchSubjects();
    }, []);

    const handleSaveManual = async () => {
        if (!user) {
            toast({ title: "Acesso Negado", description: "Você precisa estar logado para salvar questões.", variant: "destructive" });
            return;
        }

        if (!isSupabaseConfigured) {
            toast({ title: "Configuração Pendente", description: "As chaves do Supabase não foram configuradas no ambiente.", variant: "destructive" });
            return;
        }

        if (!manualQuestion.question_text.trim() || !manualQuestion.subject_id || isSaving) {
            toast({ title: "Dados Incompletos", description: "Preencha o enunciado e selecione a matéria.", variant: "destructive" });
            return;
        }
        
        const optionsArray = Object.entries(manualOptions)
            .filter(([_, text]) => text.trim() !== '')
            .map(([letter, text]) => ({ letter, text }));

        if (optionsArray.length < 2) {
            toast({ title: "Opções Incompletas", description: "Preencha ao menos duas alternativas.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const supabase = createClient();

        try {
            const payload = {
                question_text: manualQuestion.question_text.trim(),
                year: parseInt(manualQuestion.year) || new Date().getFullYear(),
                subject_id: manualQuestion.subject_id,
                correct_answer: manualQuestion.correct_answer,
                options: optionsArray,
                teacher_id: user.id
            };

            const { error } = await supabase.from('questions').insert([payload]);

            if (error) {
                if (error.message.includes("cache de esquema") || error.message.includes("column") || error.message.includes("not found")) {
                    throw new Error("Sincronização Necessária: Execute o script SQL no Supabase para criar a coluna 'correct_answer'.");
                }
                if (error.message.includes("row-level security")) {
                    throw new Error("Erro de Permissão (RLS): Certifique-se de executar o script SQL de políticas no Supabase.");
                }
                throw error;
            }

            toast({ title: "Questão Salva! ✅", description: "Item adicionado ao banco oficial." });
            
            setManualQuestion(prev => ({ ...prev, question_text: '', correct_answer: 'A' }));
            setManualOptions({ A: '', B: '', C: '', D: '', E: '' });

        } catch (e: any) {
            console.error("Erro Supabase Insert:", e);
            
            // Tratamento específico para o AbortError
            if (e.name === 'AbortError' || e.message?.includes('aborted')) {
                toast({ 
                    title: "Instabilidade de Rede", 
                    description: "A requisição foi interrompida pelo navegador. Verifique sua internet e tente salvar novamente.", 
                    variant: "destructive" 
                });
            } else {
                toast({ 
                    title: "Falha na Persistência", 
                    description: e.message || "Verifique a conexão ou as permissões do banco.", 
                    variant: "destructive" 
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyzeBulk = () => {
        if (!rawText.trim()) return;
        setIsAnalyzing(true);
        setTimeout(() => {
            toast({ title: "Aurora Analisando...", description: "Estamos processando a estrutura do seu texto." });
            setIsAnalyzing(false);
        }, 1500);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
            <QuestionsDashboard />

            <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg">
                        <FilePlus className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-primary italic leading-none">Alimentar Banco</h1>
                        <p className="text-muted-foreground font-medium text-sm italic">Adicione novos desafios pedagógicos para a rede.</p>
                    </div>
                </div>

                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                    <CardContent className="p-8 md:p-12">
                        <div className="flex bg-muted/10 p-1.5 rounded-2xl mb-10 w-fit mx-auto md:mx-0">
                            <Button variant={entryMode === 'bulk' ? 'default' : 'ghost'} onClick={() => setEntryMode('bulk')} className="rounded-xl font-bold h-11 px-6">
                                <ListChecks className="h-4 w-4 mr-2"/> Carga em Massa
                            </Button>
                            <Button variant={entryMode === 'manual' ? 'default' : 'ghost'} onClick={() => setEntryMode('manual')} className="rounded-xl font-bold h-11 px-6">
                                <PlusCircle className="h-4 w-4 mr-2"/> Manual
                            </Button>
                        </div>

                        {entryMode === 'bulk' ? (
                            <div className="space-y-6 animate-in slide-in-from-bottom-2">
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-800">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p className="text-xs font-medium">A carga em massa via Aurora IA está em fase Beta. Por enquanto, utilize o modo Manual para precisão industrial.</p>
                                </div>
                                <Textarea 
                                    placeholder="Cole aqui o texto da prova para análise..." 
                                    className="min-h-[300px] rounded-3xl bg-muted/5 border-2 border-dashed border-muted/20 p-6 text-sm italic"
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                />
                                <Button onClick={handleAnalyzeBulk} disabled={isAnalyzing || !rawText.trim()} className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-black text-lg shadow-xl">
                                    {isAnalyzing ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : "Analisar com Aurora IA"}
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-2">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase opacity-40">Selecione a Matéria</Label>
                                        <Select value={manualQuestion.subject_id} onValueChange={(v) => setManualQuestion({...manualQuestion, subject_id: v})}>
                                            <SelectTrigger className="h-14 rounded-xl bg-muted/30 border-none font-bold">
                                                <SelectValue placeholder="Matéria..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                {subjects.length > 0 ? subjects.map(s => (
                                                    <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>
                                                )) : (
                                                    <SelectItem value="loading" disabled>Carregando matérias...</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase opacity-40">Ano</Label>
                                            <Input type="number" value={manualQuestion.year} onChange={(e) => setManualQuestion({...manualQuestion, year: e.target.value})} className="h-14 rounded-xl bg-muted/30 border-none font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase opacity-40">Gabarito</Label>
                                            <Select value={manualQuestion.correct_answer} onValueChange={(v) => setManualQuestion({...manualQuestion, correct_answer: v})}>
                                                <SelectTrigger className="h-14 rounded-xl bg-muted/30 border-none font-black text-accent"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-none shadow-2xl">{['A', 'B', 'C', 'D', 'E'].map(l => <SelectItem key={l} value={l}>LETRA {l}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase opacity-40">Enunciado</Label>
                                        <Textarea placeholder="Digite a questão..." className="min-h-[180px] rounded-2xl bg-muted/30 border-none italic p-4 font-medium" value={manualQuestion.question_text} onChange={(e) => setManualQuestion({...manualQuestion, question_text: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-[9px] font-black uppercase opacity-40">Alternativas</Label>
                                    {['A', 'B', 'C', 'D', 'E'].map(letter => (
                                        <div key={letter} className="flex gap-3">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black shrink-0 shadow-sm transition-all ${manualQuestion.correct_answer === letter ? 'bg-accent text-accent-foreground scale-105' : 'bg-muted/30 text-primary/30'}`}>{letter}</div>
                                            <Input placeholder={`Texto da opção ${letter}...`} className="h-12 rounded-xl bg-muted/30 border-none font-medium" value={manualOptions[letter as keyof typeof manualOptions]} onChange={(e) => setManualOptions({...manualOptions, [letter]: e.target.value})} />
                                        </div>
                                    ))}
                                    <Button onClick={handleSaveManual} disabled={isSaving} className="w-full h-16 mt-6 rounded-2xl bg-primary text-white font-black text-lg shadow-2xl transition-all active:scale-95">
                                        {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <CheckCircle className="h-6 w-6 mr-2" />}
                                        Gravar Questão no Banco
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="pt-10">
                 <QuestionsList />
            </div>
        </div>
    );
}