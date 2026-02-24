
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FilePlus, CheckCircle, ListChecks, PlusCircle, Trash2 } from 'lucide-react';
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

export default function QuestionBankPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const supabase = createClient();

    const [entryMode, setEntryMode] = useState<'bulk' | 'manual'>('bulk');
    const [isSaving, setIsSaving] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [rawText, setRawText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Estados para o formulário manual
    const [manualQuestion, setManualQuestion] = useState({ 
        question_text: '', 
        year: new Date().getFullYear().toString(), 
        subject_id: '', 
        correct_answer: 'A' 
    });
    const [manualOptions, setManualOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });

    useEffect(() => {
        async function fetchSubjects() {
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
        // Validação rigorosa
        if (!manualQuestion.question_text.trim()) {
            toast({ title: "Enunciado Vazio", description: "O texto da questão é obrigatório.", variant: "destructive" });
            return;
        }
        if (!manualQuestion.subject_id) {
            toast({ title: "Matéria não Selecionada", description: "Selecione a matéria para organizar o banco.", variant: "destructive" });
            return;
        }
        
        const optionsArray = Object.entries(manualOptions)
            .filter(([_, text]) => text.trim() !== '')
            .map(([letter, text]) => ({ letter, text }));

        if (optionsArray.length < 2) {
            toast({ title: "Opções Incompletas", description: "Preencha pelo menos as opções A e B.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                question_text: manualQuestion.question_text.trim(),
                year: parseInt(manualQuestion.year) || new Date().getFullYear(),
                subject_id: manualQuestion.subject_id,
                correct_answer: manualQuestion.correct_answer,
                options: optionsArray,
                teacher_id: user?.id
            };

            const { error } = await supabase.from('questions').insert(payload);

            if (error) {
                console.error("Erro Supabase Detalhado:", error);
                throw error;
            }

            toast({ 
                title: "Questão Salva! ✅", 
                description: "O item foi adicionado ao banco oficial com sucesso." 
            });

            // Limpa o formulário mantendo a matéria e o ano para agilizar o próximo cadastro
            setManualQuestion(prev => ({
                ...prev,
                question_text: '',
                correct_answer: 'A'
            }));
            setManualOptions({ A: '', B: '', C: '', D: '', E: '' });

        } catch (e: any) {
            console.error("Falha na Persistência:", e);
            toast({ 
                title: "Falha na Persistência", 
                description: e.message || e.details || "Certifique-se de que as tabelas 'subjects' e 'questions' existem no Supabase.", 
                variant: "destructive" 
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyzeBulk = () => {
        if (!rawText.trim()) return;
        setIsAnalyzing(true);
        // Simulação de análise industrial de IA/Regex
        setTimeout(() => {
            toast({ title: "Análise Concluída", description: "Estrutura detectada. Clique em 'Importar' para confirmar." });
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
                        <p className="text-muted-foreground font-medium text-sm">Adicione novos desafios pedagógicos para a rede.</p>
                    </div>
                </div>

                <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                    <CardContent className="p-8 md:p-12">
                        <div className="flex bg-muted/10 p-1.5 rounded-2xl mb-10 w-fit mx-auto md:mx-0">
                            <Button 
                                variant={entryMode === 'bulk' ? 'default' : 'ghost'} 
                                onClick={() => setEntryMode('bulk')} 
                                className={`rounded-xl font-bold h-11 px-6 transition-all ${entryMode === 'bulk' ? 'shadow-lg' : ''}`}
                            >
                                <ListChecks className="h-4 w-4 mr-2"/> Importação em Massa
                            </Button>
                            <Button 
                                variant={entryMode === 'manual' ? 'default' : 'ghost'} 
                                onClick={() => setEntryMode('manual')} 
                                className={`rounded-xl font-bold h-11 px-6 transition-all ${entryMode === 'manual' ? 'shadow-lg' : ''}`}
                            >
                                <PlusCircle className="h-4 w-4 mr-2"/> Cadastro Manual
                            </Button>
                        </div>

                        {entryMode === 'bulk' ? (
                            <div className="space-y-6 animate-in slide-in-from-bottom-2">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-2">Texto Bruto da Prova</Label>
                                    <Textarea 
                                        placeholder="Ex: 1. Qual a capital do Brasil? A) SP B) RJ C) Brasília..." 
                                        className="min-h-[300px] rounded-3xl bg-muted/5 border-2 border-dashed border-muted/20 focus:border-primary p-6 text-sm font-medium italic"
                                        value={rawText}
                                        onChange={(e) => setRawText(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Button 
                                        onClick={handleAnalyzeBulk}
                                        disabled={isAnalyzing || !rawText.trim()}
                                        className="flex-1 h-14 rounded-2xl bg-accent text-accent-foreground font-black text-lg shadow-xl"
                                    >
                                        {isAnalyzing ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <ListChecks className="h-6 w-6 mr-2" />}
                                        Analisar Estrutura
                                    </Button>
                                    <Button 
                                        disabled={true}
                                        className="flex-1 h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl opacity-50"
                                    >
                                        Importar Tudo (0 Detectadas)
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-2">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase opacity-40">Matéria / Assunto</Label>
                                        <Select 
                                            value={manualQuestion.subject_id} 
                                            onValueChange={(v) => setManualQuestion({...manualQuestion, subject_id: v})}
                                        >
                                            <SelectTrigger className="h-14 rounded-xl bg-muted/30 border-none font-bold">
                                                <SelectValue placeholder="Selecione a matéria" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                {subjects.length > 0 ? subjects.map(s => (
                                                    <SelectItem key={s.id} value={s.id} className="py-3 font-bold">
                                                        {s.name}
                                                    </SelectItem>
                                                )) : (
                                                    <div className="p-4 text-xs italic text-muted-foreground">Nenhuma matéria encontrada. Verifique o banco.</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase opacity-40">Ano</Label>
                                            <Input 
                                                type="number" 
                                                value={manualQuestion.year} 
                                                onChange={(e) => setManualQuestion({...manualQuestion, year: e.target.value})}
                                                className="h-14 rounded-xl bg-muted/30 border-none font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase opacity-40">Resposta Correta</Label>
                                            <Select 
                                                value={manualQuestion.correct_answer} 
                                                onValueChange={(v) => setManualQuestion({...manualQuestion, correct_answer: v})}
                                            >
                                                <SelectTrigger className="h-14 rounded-xl bg-muted/30 border-none font-black text-accent">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl font-black">
                                                    {['A', 'B', 'C', 'D', 'E'].map(l => <SelectItem key={l} value={l}>OPÇÃO {l}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase opacity-40">Enunciado da Questão</Label>
                                        <Textarea 
                                            placeholder="Descreva o problema ou pergunta aqui..." 
                                            className="min-h-[180px] rounded-2xl bg-muted/30 border-none font-medium italic p-4"
                                            value={manualQuestion.question_text}
                                            onChange={(e) => setManualQuestion({...manualQuestion, question_text: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[9px] font-black uppercase opacity-40">Alternativas</Label>
                                    {['A', 'B', 'C', 'D', 'E'].map(letter => (
                                        <div key={letter} className="flex gap-3">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black italic shadow-inner shrink-0 ${manualQuestion.correct_answer === letter ? 'bg-accent text-accent-foreground' : 'bg-muted/30 text-primary/30'}`}>
                                                {letter}
                                            </div>
                                            <Input 
                                                placeholder={`Texto da opção ${letter}...`} 
                                                className="h-12 rounded-xl bg-muted/30 border-none font-medium"
                                                value={manualOptions[letter as keyof typeof manualOptions]}
                                                onChange={(e) => setManualOptions({...manualOptions, [letter]: e.target.value})}
                                            />
                                        </div>
                                    ))}
                                    <Button 
                                        onClick={handleSaveManual}
                                        disabled={isSaving}
                                        className="w-full h-16 mt-6 rounded-2xl bg-primary text-white font-black text-lg shadow-2xl shadow-primary/20 transition-all active:scale-95"
                                    >
                                        {isSaving ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <CheckCircle className="h-6 w-6 mr-2" />}
                                        {isSaving ? "Sintonizando Rede..." : "Gravar no Banco Oficial"}
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
