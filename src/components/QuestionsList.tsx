'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, Trash2, Loader2, Search, Filter } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function QuestionsList() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
    const [questionToEdit, setQuestionToEdit] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({
        question_text: '',
        year: '',
        subject_id: '',
        correct_answer: '',
        options: []
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all');

    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: questionsData, error: qError } = await supabase
                .from('questions')
                .select('*, subject:subjects(name)')
                .order('created_at', { ascending: false });

            if (qError) throw qError;
            setQuestions(questionsData || []);

            const { data: subjectsData, error: sError } = await supabase
                .from('subjects')
                .select('*')
                .order('name');

            if (sError) throw sError;
            setSubjects(subjectsData || []);
        } catch (error: any) {
            toast({ title: "Erro ao carregar banco", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (questionToEdit) {
            setEditForm({
                question_text: questionToEdit.question_text || '',
                year: (questionToEdit.year || '').toString(),
                subject_id: questionToEdit.subject_id || '',
                correct_answer: questionToEdit.correct_answer || 'A',
                options: questionToEdit.options || []
            });
        }
    }, [questionToEdit]);

    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            const text = (q.question_text || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            const matchesSearch = text.includes(search);
            const matchesSubject = subjectFilter === 'all' || q.subject_id === subjectFilter;
            return matchesSearch && matchesSubject;
        });
    }, [questions, searchTerm, subjectFilter]);

    const handleDelete = async () => {
        if (!questionToDelete) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase.from('questions').delete().eq('id', questionToDelete);
            if (error) throw error;
            setQuestions(prev => prev.filter(q => q.id !== questionToDelete));
            toast({ title: "Questão removida", description: "O item foi excluído do banco oficial." });
        } catch (error: any) {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setQuestionToDelete(null);
        }
    };

    const handleUpdate = async () => {
        if (!questionToEdit) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('questions')
                .update({
                    question_text: editForm.question_text,
                    year: parseInt(editForm.year) || null,
                    subject_id: editForm.subject_id,
                    correct_answer: editForm.correct_answer,
                    options: editForm.options
                })
                .eq('id', questionToEdit.id);

            if (error) throw error;
            toast({ title: "Questão atualizada!" });
            setQuestionToEdit(null);
            fetchData();
        } catch (error: any) {
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) return <ListSkeleton />;

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <CardTitle className="text-2xl font-black text-primary italic">Explorar Banco</CardTitle>
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">
                            {filteredQuestions.length} Itens Encontrados
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                            <SelectTrigger className="w-full sm:w-[200px] h-12 rounded-xl bg-muted/30 border-none font-bold">
                                <Filter className="h-4 w-4 mr-2 text-primary/40" />
                                <SelectValue placeholder="Matéria" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="all" className="font-bold">Todas as Matérias</SelectItem>
                                {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="relative w-full sm:w-[250px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar enunciado..." 
                                className="pl-11 h-12 bg-muted/30 border-none rounded-xl font-medium italic"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-muted/10">
                        {filteredQuestions.map((question) => (
                            <div key={question.id} className="p-6 md:px-8 hover:bg-accent/5 transition-all group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-primary/5 text-primary border-none font-black text-[8px] uppercase px-3 h-5">
                                                {question.subject?.name || 'Geral'}
                                            </Badge>
                                            <span className="text-[10px] font-bold text-muted-foreground italic">PROVA {question.year}</span>
                                        </div>
                                        <p className="font-bold text-primary leading-relaxed text-sm line-clamp-2 italic">
                                            "{question.question_text || 'Sem enunciado'}"
                                        </p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-muted-foreground hover:bg-white hover:shadow-md transition-all">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-none shadow-2xl">
                                            <DropdownMenuItem onClick={() => setQuestionToEdit(question)} className="rounded-xl font-bold cursor-pointer">
                                                <Pencil className="mr-2 h-4 w-4 text-accent" /> Editar Questão
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-muted/50" />
                                            <DropdownMenuItem onClick={() => setQuestionToDelete(question.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 rounded-xl font-bold cursor-pointer">
                                                <Trash2 className="mr-2 h-4 w-4" /> Excluir Item
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                        {filteredQuestions.length === 0 && (
                            <div className="py-20 text-center opacity-30">
                                <Search className="h-12 w-12 mx-auto mb-4" />
                                <p className="font-black italic">Nenhuma questão encontrada com estes filtros.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black italic text-primary">Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium italic text-primary/60">
                            Esta ação removerá permanentemente o item do banco de simulados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 flex gap-3">
                        <AlertDialogCancel className="flex-1 rounded-xl h-12 font-black border-none bg-muted/20">Cancelar</AlertDialogCancel>
                        <Button onClick={handleDelete} disabled={isProcessing} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 font-black">
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir Agora"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!questionToEdit} onOpenChange={(open) => !open && setQuestionToEdit(null)}>
                <DialogContent className="rounded-[2.5rem] p-10 bg-white border-none shadow-2xl max-w-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic text-primary">Editar Questão</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase opacity-40">Matéria</Label>
                                <Select value={editForm.subject_id} onValueChange={(v) => setEditForm({...editForm, subject_id: v})}>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase opacity-40">Gabarito</Label>
                                <Select value={editForm.correct_answer} onValueChange={(v) => setEditForm({...editForm, correct_answer: v})}>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-black text-accent">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['A', 'B', 'C', 'D', 'E'].map(l => <SelectItem key={l} value={l}>OPÇÃO {l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase opacity-40">Enunciado</Label>
                            <Textarea 
                                className="min-h-[150px] rounded-2xl bg-muted/30 border-none font-medium italic"
                                value={editForm.question_text}
                                onChange={e => setEditForm({...editForm, question_text: e.target.value})}
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[9px] font-black uppercase opacity-40">Alternativas (A-E)</Label>
                            {editForm.options.map((opt: any, idx: number) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center font-black italic shrink-0">{opt.letter}</div>
                                    <Input 
                                        className="h-10 rounded-xl bg-muted/30 border-none font-medium text-xs"
                                        value={opt.text}
                                        onChange={e => {
                                            const newOpts = [...editForm.options];
                                            newOpts[idx].text = e.target.value;
                                            setEditForm({...editForm, options: newOpts});
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdate} disabled={isProcessing} className="w-full h-14 bg-primary text-white font-black text-lg rounded-2xl shadow-xl">
                            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Gravar Alterações"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ListSkeleton() {
    return (
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white animate-pulse">
            <CardHeader className="p-8">
                <Skeleton className="h-8 w-1/3" />
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-6 w-3/4" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
