
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
    
    
    // Manual States
    const [manualQuestion, setManualQuestion] = useState({ question_text: '', year: new Date().getFullYear(), subject_id: '', correct_answer: '', target_audience: 'all', explanation: '' });
    const [manualOptions, setManualOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });
    
    const [bulkSubjectId, setBulkSubjectId] = useState<string>('');
    const [bulkTargetAudience, setBulkTargetAudience] = useState<string>('all');

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const { data, error } = await supabase.from('subjects').select('id, name').order('name');
                if (error) throw error;
                if (data && data.length > 0) {
                    setSubjects(data);
                    const uncat = data.find(s => s.name === 'Não Categorizado') || data[0];
                    if (uncat) {
                        setManualQuestion(prev => ({ ...prev, subject_id: uncat.id }));
                        setBulkSubjectId(uncat.id);
                    }
                } else {
                    toast({ title: "Base Vazia", description: "Nenhuma disciplina cadastrada.", variant: "destructive" });
                }
            } catch (err: any) {
                toast({ title: "Erro na Conexão", description: "Não foi possível carregar as disciplinas.", variant: "destructive" });
            }
        };
        fetchSubjects();
    }, [toast]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyzeBulk = async () => {
        if (!rawText.trim()) {
            toast({ title: "Texto vazio", description: "Cole o conteúdo da prova antes de analisar.", variant: "destructive" });
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: `Analise o texto abaixo e extraia TODAS as questões de múltipla escolha encontradas. Responda EXCLUSIVAMENTE com um JSON válido contendo a chave "questions" que mapeia para um array de objetos. Cada objeto deve ter: "question_text" (string com o enunciado completo), "options" (array de objetos com "key" e "text"), "correct_answer" (string com a letra), "year" (número), "explanation" (string curta explicando por que a resposta está certa). Se não conseguir identificar o gabarito, coloque "A" como padrão. Se não identificar o ano, use ${new Date().getFullYear()}.\n\nTEXTO DA PROVA:\n${rawText}`
                        }
                    ]
                })
            });

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || "Erro na análise da Aurora IA.");
            }

            const responseText = data.result?.response || '';
            
            // Tentar extrair JSON da resposta
            let parsed: any;
            const jsonMatch = responseText.match(/\{[\s\S]*"questions"[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                // Tenta parsear a resposta inteira como JSON
                parsed = JSON.parse(responseText);
            }

            const questions = parsed.questions || parsed;
            
            if (Array.isArray(questions) && questions.length > 0) {
                setExtractedQuestions(questions);
                toast({ title: `${questions.length} questões extraídas!`, description: "Revise e vincule a uma matéria antes de salvar." });
            } else {
                toast({ title: "Nenhuma questão encontrada", description: "A Aurora não conseguiu identificar questões no texto. Tente um formato mais claro.", variant: "destructive" });
            }
        } catch (e: any) {
            console.error("Erro na análise em massa:", e);
            toast({ title: "Falha na Extração", description: e.message || "Erro ao processar o texto com a Aurora.", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveProcessed = async () => {
        if (!user || extractedQuestions.length === 0 || !bulkSubjectId) return;
        setIsSaving(true);
        try {
            const itemsToInsert = extractedQuestions.map(q => {
                const item: any = {
                    question_text: q.question_text,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    year: q.year,
                    subject_id: bulkSubjectId,
                    teacher_id: user.id
                };
                
                // Only include optional/newer columns if they have values
                if (q.explanation) item.explanation = q.explanation;
                if (bulkTargetAudience !== 'all') item.target_audience = bulkTargetAudience;
                
                return item;
            });
            let { error } = await supabase.from('questions').insert(itemsToInsert);
            
            if (error && (error?.message?.includes('target_audience') || error?.code === '42703')) {
                console.warn("Coluna target_audience ausente ao salvar lote de questões. Retrying sem segmentação.");
                const fallbackItems = itemsToInsert.map(({ target_audience, ...rest }: any) => rest);
                const retry = await supabase.from('questions').insert(fallbackItems);
                error = retry.error;
            }

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
            
            const insertData: any = { 
                question_text: manualQuestion.question_text,
                year: manualQuestion.year,
                subject_id: manualQuestion.subject_id,
                correct_answer: manualQuestion.correct_answer,
                options,
                teacher_id: user.id
            };

            // Only include newer columns if filled
            if (manualQuestion.explanation) insertData.explanation = manualQuestion.explanation;
            if (manualQuestion.target_audience !== 'all') insertData.target_audience = manualQuestion.target_audience;

            let { error } = await supabase.from('questions').insert([insertData]);

            if (error && (error?.message?.includes('target_audience') || error?.code === '42703')) {
                console.warn("Coluna target_audience ausente ao salvar questão manual. Retrying sem segmentação.");
                const { target_audience, ...fallbackQuestion } = manualQuestion;
                const retry = await supabase.from('questions').insert([{ 
                    ...fallbackQuestion, 
                    options,
                    teacher_id: user.id
                }]);
                error = retry.error;
            }

            if (error) throw error;
            toast({ title: "Questão Salva!" });
            setManualQuestion(prev => ({ ...prev, question_text: '', explanation: '' }));
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
                <CardHeader className="bg-slate-50/50 border-b border-dashed p-6">
                    <div className="flex flex-wrap bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border w-fit mx-auto md:mx-0 shadow-sm">
                        <Button variant={entryMode === 'bulk' ? 'default' : 'ghost'} onClick={() => {setEntryMode('bulk'); setExtractedQuestions([]);}} className={`rounded-xl font-black text-[10px] uppercase tracking-widest h-10 px-6 ${entryMode === 'bulk' ? 'bg-primary text-white shadow-lg' : ''}`}>
                            <ListChecks className="h-4 w-4 mr-2"/> Carga em Massa
                        </Button>
                        <Button variant={entryMode === 'manual' ? 'default' : 'ghost'} onClick={() => setEntryMode('manual')} className={`rounded-xl font-black text-[10px] uppercase tracking-widest h-10 px-6 ${entryMode === 'manual' ? 'bg-primary text-white shadow-lg' : ''}`}>
                            <PlusCircle className="h-4 w-4 mr-2"/> Manual
                        </Button>
                    </div>
                </CardHeader>
                
                <CardContent className="p-6">
                    {entryMode === 'bulk' && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Texto Bruto da Prova</Label>
                                <Textarea 
                                    placeholder="Cole aqui o texto copiado de um PDF ou documento..." 
                                    className="min-h-[150px] rounded-2xl bg-muted/30 border-none p-4 font-medium text-sm leading-relaxed italic" 
                                    value={rawText} 
                                    onChange={(e) => setRawText(e.target.value)} 
                                />
                            </div>
                            <Button onClick={handleAnalyzeBulk} disabled={isAnalyzing || !rawText.trim()} className="w-full h-12 rounded-2xl bg-primary text-white font-black text-base shadow-xl hover:scale-[1.02] transition-all active:scale-95 mt-2">
                                {isAnalyzing ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Analisando com Aurora IA...</> : <><BrainCircuit className="h-5 w-5 mr-2" /> Extrair Questões com Aurora IA</>}
                            </Button>
                        </div>
                    )}

                    {entryMode === 'manual' && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Enunciado da Questão</Label>
                                <Textarea placeholder="Digite o texto da pergunta..." className="rounded-2xl bg-muted/30 border-none min-h-[80px] p-4 font-medium italic text-sm" value={manualQuestion.question_text} onChange={e => setManualQuestion(prev => ({...prev, question_text: e.target.value}))} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {['A', 'B', 'C', 'D', 'E'].map(key => (
                                    <div key={key} className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Opção {key}</Label>
                                        <Input placeholder={`Texto da alternativa ${key}...`} className="h-10 rounded-xl bg-muted/30 border-none font-medium pl-4 text-sm" value={manualOptions[key as keyof typeof manualOptions]} onChange={e => setManualOptions(prev => ({...prev, [key]: e.target.value}))} />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Gabarito</Label>
                                    <Select value={manualQuestion.correct_answer} onValueChange={val => setManualQuestion(prev => ({...prev, correct_answer: val}))}>
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {['A', 'B', 'C', 'D', 'E'].map(key => <SelectItem key={key} value={key} className="font-bold">Alternativa {key}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Disciplina</Label>
                                    <Select value={manualQuestion.subject_id} onValueChange={val => setManualQuestion(prev => ({...prev, subject_id: val}))}>
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="Matéria" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-sm">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Público Alvo</Label>
                                    <Select value={manualQuestion.target_audience} onValueChange={val => setManualQuestion(prev => ({...prev, target_audience: val}))}>
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="Turma" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            <SelectItem value="all" className="font-bold text-sm">Todos (Geral)</SelectItem>
                                            <SelectItem value="etec" className="font-bold text-sm border-l-4 border-l-blue-500">Foco ETEC / FATEC</SelectItem>
                                            <SelectItem value="enem" className="font-bold text-sm border-l-4 border-l-amber-500">Foco ENEM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Ano Referência</Label>
                                    <Input type="number" className="h-10 rounded-xl bg-muted/30 border-none font-black text-center text-sm" value={manualQuestion.year} onChange={e => setManualQuestion(prev => ({...prev, year: parseInt(e.target.value, 10)}))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Explicação Pedagógica (Opcional)</Label>
                                <Textarea 
                                    placeholder="Justifique a resposta correta para auxiliar o estudo do aluno..." 
                                    className="rounded-2xl bg-muted/30 border-none min-h-[60px] p-4 font-medium italic text-sm" 
                                    value={(manualQuestion as any).explanation || ''} 
                                    onChange={e => setManualQuestion(prev => ({...prev, explanation: e.target.value} as any))} 
                                />
                            </div>
                            <Button onClick={handleSaveSingle} disabled={isSaving || !manualQuestion.question_text} className="w-full h-12 bg-primary text-white font-black text-base rounded-2xl shadow-xl transition-all active:scale-95 mt-2">
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
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
                                <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
                                    <Select value={bulkTargetAudience} onValueChange={setBulkTargetAudience}>
                                        <SelectTrigger className="w-full md:w-40 h-12 rounded-xl bg-white border-none shadow-md font-bold text-xs"><SelectValue placeholder="Público Alvo" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            <SelectItem value="all" className="font-bold text-xs">Todos</SelectItem>
                                            <SelectItem value="etec" className="font-bold text-xs border-l-4 border-l-blue-500">ETEC/FATEC</SelectItem>
                                            <SelectItem value="enem" className="font-bold text-xs border-l-4 border-l-amber-500">ENEM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={bulkSubjectId} onValueChange={setBulkSubjectId}>
                                        <SelectTrigger className="w-full md:w-56 h-12 rounded-xl bg-white border-none shadow-md font-bold text-xs"><SelectValue placeholder="Vincular Matéria" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleSaveProcessed} disabled={isSaving || !bulkSubjectId} className="w-full md:w-auto h-12 px-8 rounded-xl bg-primary text-white font-black shadow-lg">
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2 text-accent" />}
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
