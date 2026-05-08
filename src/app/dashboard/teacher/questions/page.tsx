
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
    ArrowRight,
    Scroll,
    Upload,
    FileText,
    BookOpen,
    CheckCircle2,
    Sparkles,
    ImageIcon,
    X,
} from 'lucide-react';
import { useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
const QuestionsDashboard = dynamic(
    () => import('@/components/QuestionsDashboard').then(m => ({ default: m.QuestionsDashboard })),
    { ssr: false }
);
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
type MicroTopic = { id: string; name: string };
type QuestionOption = { key: string; text: string };
type ParsedQuestion = {
    _tempId?: string;
    question_text: string;
    options: QuestionOption[];
    correct_answer: string;
    year: number;
    explanation?: string;
    subject_name?: string;
    subject_id?: string;
    micro_topic_id?: string;
    supporting_text?: string;
    image_url?: string;
    _uploadingImage?: boolean;
    _autoFileToUpload?: File;
};

type ExtractionProgress = {
    currentChunk: number;
    totalChunks: number;
    phase: 'idle' | 'analyzing' | 'done' | 'error';
    questionsFound: number;
    elapsedSeconds: number;
};

export default function QuestionBankPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [entryMode, setEntryMode] = useState<'bulk' | 'manual'>('bulk');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Bulk States
    const [rawText, setRawText] = useState('');
    const [extractedQuestions, setExtractedQuestions] = useState<ParsedQuestion[]>([]);
    const [autoImageQueue, setAutoImageQueue] = useState<{ id: string, file: File, url: string }[]>([]);
    const [draggedImgIndex, setDraggedImgIndex] = useState<number | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);


    // Manual States
    const [manualQuestion, setManualQuestion] = useState({ question_text: '', year: new Date().getFullYear(), subject_id: '', correct_answer: '', target_audience: 'all', explanation: '', micro_topic_id: '' });
    const [manualOptions, setManualOptions] = useState({ A: '', B: '', C: '', D: '', E: '' });

    const [bulkSubjectId, setBulkSubjectId] = useState<string>('');
    const [bulkTargetAudience, setBulkTargetAudience] = useState<string>('all');
    const [microTopics, setMicroTopics] = useState<MicroTopic[]>([]);
    const [manualMicroTopics, setManualMicroTopics] = useState<MicroTopic[]>([]);

    // Exam creation states
    const [createExam, setCreateExam] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [examType, setExamType] = useState('enem');
    const [examYear, setExamYear] = useState(new Date().getFullYear());
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Draft Persistence: Load from localStorage on mount
    useEffect(() => {
        const savedRaw = localStorage.getItem('draft_raw_text');
        const savedExtracted = localStorage.getItem('draft_extracted_questions');
        if (savedRaw) setRawText(savedRaw);
        if (savedExtracted) {
            try {
                setExtractedQuestions(JSON.parse(savedExtracted));
            } catch (e) {
                console.error("Erro ao carregar rascunho de questões", e);
            }
        }
    }, []);

    // Draft Persistence: Save rawText
    useEffect(() => {
        if (rawText) {
            localStorage.setItem('draft_raw_text', rawText);
        } else {
            localStorage.removeItem('draft_raw_text');
        }
    }, [rawText]);

    // Draft Persistence: Save extractedQuestions
    useEffect(() => {
        if (extractedQuestions.length > 0) {
            localStorage.setItem('draft_extracted_questions', JSON.stringify(extractedQuestions));
        } else {
            localStorage.removeItem('draft_extracted_questions');
        }
    }, [extractedQuestions]);


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

    // Fetch micro-topics when manual subject changes
    useEffect(() => {
        if (!manualQuestion.subject_id) { setManualMicroTopics([]); return; }
        supabase
            .from('micro_topics')
            .select('id, name')
            .eq('subject_id', manualQuestion.subject_id)
            .order('name')
            .then(({ data }) => setManualMicroTopics(data ?? []));
    }, [manualQuestion.subject_id]);

    // Fetch micro-topics when bulk subject changes
    useEffect(() => {
        if (!bulkSubjectId) { setMicroTopics([]); return; }
        supabase
            .from('micro_topics')
            .select('id, name')
            .eq('subject_id', bulkSubjectId)
            .order('name')
            .then(({ data }) => setMicroTopics(data ?? []));
    }, [bulkSubjectId]);

    const resolveSubjectId = (name: string | undefined, subjectList: Subject[]): string | undefined => {
        if (!name || subjectList.length === 0) return undefined;
        const normalized = name.toLowerCase().trim();
        const exact = subjectList.find(s => s.name.toLowerCase() === normalized);
        if (exact) return exact.id;
        const partial = subjectList.find(s => s.name.toLowerCase().includes(normalized) || normalized.includes(s.name.toLowerCase()));
        return partial?.id;
    };

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [progress, setProgress] = useState<ExtractionProgress>({
        currentChunk: 0, totalChunks: 0, phase: 'idle', questionsFound: 0, elapsedSeconds: 0,
    });
    const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsReadingFile(true);
        setAutoImageQueue([]); // Reseta a fila ao carregar nova prova

        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            setPdfUrl(null); // Reset PDF view for TXT files
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                setRawText(text || '');
                toast({ title: 'Arquivo carregado!', description: `${file.name} — ${text.length} caracteres. Clique em "Extrair Questões" para analisar.` });
                setIsReadingFile(false);
            };
            reader.onerror = () => {
                toast({ title: 'Erro ao ler arquivo', variant: 'destructive' });
                setIsReadingFile(false);
            };
            reader.readAsText(file, 'UTF-8');
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            // Create a local URL for the PDF preview
            const url = URL.createObjectURL(file);
            setPdfUrl(url);

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const typedarray = new Uint8Array(ev.target?.result as ArrayBuffer);

                try {
                    // Load pdfjs-dist dynamically from CDN if not already loaded
                    if (!(window as any).pdfjsLib) {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
                        script.type = 'module';
                        document.head.appendChild(script);
                        await new Promise((resolve) => { script.onload = resolve; });
                    }

                    const pdfjsLib = (window as any).pdfjsLib;
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';
                    const tempImages: { id: string, file: File, url: string }[] = [];

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);

                        // --- 1. Extração de Imagens Automática (Hook) ---
                        try {
                            const ops = await page.getOperatorList();
                            for (let j = 0; j < ops.fnArray.length; j++) {
                                if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject || ops.fnArray[j] === pdfjsLib.OPS.paintJpegXObject) {
                                    const imgKey = ops.argsArray[j][0];
                                    page.objs.get(imgKey, (imgObj: any) => {
                                        if (!imgObj) return;
                                        // Filtro anti-lixo: ignora logos e pequenos ícones
                                        if (imgObj.width < 100 || imgObj.height < 100) return;

                                        const canvas = document.createElement('canvas');
                                        canvas.width = imgObj.width;
                                        canvas.height = imgObj.height;
                                        const ctx = canvas.getContext('2d');
                                        if (!ctx) return;

                                        if (imgObj instanceof ImageBitmap || imgObj.tagName === 'IMG') {
                                            ctx.drawImage(imgObj, 0, 0, imgObj.width, imgObj.height);
                                        } else if (imgObj.data) {
                                            try {
                                                const imgData = new ImageData(new Uint8ClampedArray(imgObj.data), imgObj.width, imgObj.height);
                                                ctx.putImageData(imgData, 0, 0);
                                            } catch (err) { return; }
                                        }

                                        canvas.toBlob((blob) => {
                                            if (blob) {
                                                const f = new File([blob], `auto_img_p${i}_${j}.png`, { type: 'image/png' });
                                                tempImages.push({ id: Math.random().toString(36).substr(2, 9), file: f, url: URL.createObjectURL(blob) });
                                            }
                                        }, 'image/png');
                                    });
                                }
                            }
                        } catch (err) {
                            console.warn("Falha silenciosa ao extrair imagem da página", i);
                        }

                        // --- 2. Extração de Texto ---
                        const textContent = await page.getTextContent();

                        // Agrupar itens por linha (baseado na coordenada Y) para manter estrutura
                        const items = textContent.items as any[];
                        let lastY = -1;
                        let pageText = '';

                        for (const item of items) {
                            if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                                pageText += '\n'; // Quebra de linha se a coordenada Y mudar significativamente
                            }
                            pageText += item.str + ' ';
                            lastY = item.transform[5];
                        }

                        fullText += `--- PÁGINA ${i} ---\n` + pageText + '\n\n';
                    }

                    if (fullText.trim().length > 50) {
                        // Detecta PDFs escaneados (imagem sem texto selecionável)
                        const textOnly = fullText.replace(/--- PÁGINA \d+ ---/g, '').trim();
                        const avgCharsPerPage = textOnly.length / pdf.numPages;
                        if (avgCharsPerPage < 80) {
                            toast({
                                title: 'Atenção: PDF possivelmente digitalizado',
                                description: 'Poucas palavras detectadas por página. Este arquivo pode ser uma imagem escaneada — os resultados da Aurora serão imprecisos.',
                                variant: 'destructive'
                            });
                        }

                        setRawText(fullText.trim());

                        // Aguarda 1s para o async do canvas terminar e salva a fila
                        setTimeout(() => {
                            setAutoImageQueue(tempImages);
                            const imgMsg = tempImages.length > 0 ? ` Detectamos ${tempImages.length} imagens para vínculo automático.` : '';
                            toast({ title: 'PDF carregado com sucesso!', description: `${file.name} extraído.${imgMsg}` });
                        }, 1000);

                    } else {
                        throw new Error('Texto insuficiente extraído');
                    }
                } catch (err) {
                    console.error('PDF Error:', err);
                    toast({
                        title: 'Erro ao extrair PDF',
                        description: 'Este PDF pode ser uma imagem ou estar protegido. Tente copiar e colar o texto manualmente.',
                        variant: 'destructive'
                    });
                } finally {
                    setIsReadingFile(false);
                }
            };
            reader.onerror = () => {
                toast({ title: 'Erro ao ler arquivo', variant: 'destructive' });
                setIsReadingFile(false);
            };
            reader.readAsArrayBuffer(file);
        } else {
            toast({ title: 'Formato não suportado', description: 'Use arquivos .txt ou .pdf com texto selecionável.', variant: 'destructive' });
            setIsReadingFile(false);
        }
        // Reset input so same file can be re-uploaded
        e.target.value = '';
    };

    const deleteImageFromStorage = async (url: string) => {
        try {
            // Extrai o caminho do arquivo a partir da URL pública do Supabase
            const pathMatch = url.match(/question-images\/(.+)$/);
            if (pathMatch && pathMatch[1]) {
                await supabase.storage.from('question-images').remove([pathMatch[1]]);
            }
        } catch (e) {
            console.error("Erro ao deletar imagem órfã do storage:", e);
        }
    };

    const handleAnalyzeBulk = async () => {
        if (!rawText.trim()) {
            toast({ title: "Texto vazio", description: "Cole o conteúdo da prova antes de analisar.", variant: "destructive" });
            return;
        }

        setIsAnalyzing(true);
        setExtractedQuestions([]);

        // Inicia timer de segundos decorridos
        let elapsed = 0;
        elapsedRef.current = setInterval(() => {
            elapsed++;
            setProgress(p => ({ ...p, elapsedSeconds: elapsed }));
        }, 1000);

        try {
            // CHUNK_SIZE reduzido para evitar Timeout na Vercel (504 Gateway Timeout)
            const CHUNK_SIZE = 7000; 
            const OVERLAP = 1000;
            const chunks: string[] = [];

            for (let i = 0; i < rawText.length; i += (CHUNK_SIZE - OVERLAP)) {
                chunks.push(rawText.substring(i, i + CHUNK_SIZE));
                if (i + CHUNK_SIZE >= rawText.length) break;
            }

            setProgress({ currentChunk: 0, totalChunks: chunks.length, phase: 'analyzing', questionsFound: 0, elapsedSeconds: 0 });

            const seenTexts = new Set<string>();
            let imageIndex = 0;

            for (let i = 0; i < chunks.length; i++) {
                // Delay entre chunks para respeitar rate limits da API (exceto o primeiro)
                if (i > 0) await new Promise(r => setTimeout(r, 700));

                setProgress(p => ({ ...p, currentChunk: i + 1 }));

                // Retry automático em caso de 429 (rate limit esgotado)
                let response: Response | null = null;
                for (let attempt = 0; attempt < 3; attempt++) {
                    response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [
                                {
                                    role: 'user',
                                    content: `Você é um extrator de alta precisão especializado em exames brasileiros (ENEM, ETEC, FUVEST).
Sua missão é extrair questões de múltipla escolha mantendo a INTEGRIDADE do contexto.

REGRAS DE OURO PARA CONTEXTO COMPARTILHADO:
1. IDENTIFIQUE GRUPOS: Fique atento a frases como "As questões X a Y referem-se ao texto...", "Considere a imagem para responder às questões...".
2. PERSISTÊNCIA: Se um "Texto de Apoio" ou "Imagem" for base para múltiplas questões, você DEVE replicar esse conteúdo INTEGRALMENTE no campo "supporting_text" de CADA UMA dessas questões. Nunca deixe uma questão sem o seu texto de base se ele existir no trecho.
3. MARCADORES DE IMAGEM: Sempre que houver menção a "Figura", "Gráfico", "Charge", "Mapa" ou "Tabela Visual" que não possa ser transcrita, insira [IMAGEM_PENDENTE] no "supporting_text" ou no início do "question_text".
4. NÃO RESUMA: Mantenha o enunciado e o texto de apoio exatamente como estão no original.

ESTRUTURA JSON EXIGIDA:
{
  "questions": [
    {
      "question_text": "Enunciado completo. Se houver imagem, use [IMAGEM_PENDENTE].",
      "supporting_text": "Texto, poema, ou referência que serve de base para a questão. Se for um grupo de questões, repita este texto em todas.",
      "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, {"key": "C", "text": "..."}, {"key": "D", "text": "..."}, {"key": "E", "text": "..."}],
      "correct_answer": "LETRA_DA_CORRETA",
      "year": 2024,
      "subject_name": "Matéria"
    }
  ]
}

TEXTO PARA ANÁLISE (Trecho ${i + 1}/${chunks.length}):\n${chunks[i]}`
                                }
                            ]
                        })
                    });
                    if (response.status !== 429) break;
                    // Espera antes de retry (backoff exponencial)
                    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                }

                if (!response || !response.ok) {
                    if (response?.status === 429) {
                        toast({ description: `Limite de requisições atingido. Parte ${i + 1} ignorada.`, variant: 'destructive' });
                        continue;
                    }
                    if (response?.status === 504) throw new Error(`Tempo esgotado na parte ${i + 1}. Tente um texto menor.`);
                    throw new Error(`Erro no servidor na parte ${i + 1}.`);
                }

                let data;
                try {
                    const textResponse = await response.text();
                    data = JSON.parse(textResponse);
                } catch {
                    throw new Error(`A Aurora retornou formato inválido na parte ${i + 1}. Verifique sua conexão.`);
                }

                if (!data.success) throw new Error(data.error || "Erro na análise da Aurora.");

                const responseText = data.result?.response || '';
                const cleanText = responseText.trim()
                    .replace(/^```json\s*/m, '')
                    .replace(/```\s*$/m, '')
                    .trim();

                const jsonMatch = cleanText.match(/\{[\s\S]*"questions"[\s\S]*\}/);
                try {
                    const jsonToParse = jsonMatch ? jsonMatch[0] : cleanText;
                    const parsed = JSON.parse(jsonToParse);
                    const chunkQuestions = parsed.questions || (Array.isArray(parsed) ? parsed : []);

                    // --- CARREGAMENTO PROGRESSIVO (STREAMING UI) ---
                    const uniqueChunkQuestions: any[] = [];
                    chunkQuestions.forEach((q: any) => {
                        // Normalização robusta: remove acentos e símbolos para melhor deduplicação
                        const normalizedText = (q.question_text || '')
                            .toLowerCase()
                            .normalize('NFD').replace(/[̀-ͯ]/g, '')
                            .replace(/[^a-z0-9\s]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                        if (!seenTexts.has(normalizedText) && normalizedText.length > 10) {
                            seenTexts.add(normalizedText);
                            uniqueChunkQuestions.push(q);
                        }
                    });

                    const withIds = uniqueChunkQuestions.map((q: any) => ({
                        ...q,
                        _tempId: Math.random().toString(36).substring(2, 9),
                        subject_id: resolveSubjectId(q.subject_name, subjects) || bulkSubjectId,
                    }));

                    const autoMapped = withIds.map((q: any) => {
                        const textToSearch = (q.question_text + " " + (q.supporting_text || "")).toUpperCase();
                        const needsImage = textToSearch.includes('[IMAGEM_PENDENTE]');

                        if (needsImage && imageIndex < autoImageQueue.length) {
                            const matchedFile = autoImageQueue[imageIndex].file;
                            imageIndex++;
                            return { ...q, _autoFileToUpload: matchedFile, _uploadingImage: true };
                        }
                        return q;
                    });

                    // Atualiza a tela IMEDIATAMENTE com os resultados parciais!
                    setExtractedQuestions(prev => [...prev, ...autoMapped]);
                    setProgress(p => ({ ...p, questionsFound: p.questionsFound + uniqueChunkQuestions.length }));

                    setTimeout(() => {
                        autoMapped.forEach((q: any) => {
                            if (q._autoFileToUpload) handleImageUpload(q._tempId, q._autoFileToUpload);
                        });
                    }, 500);

                } catch (e) {
                    console.error("Erro ao parsear JSON da parte", i, responseText);
                    if (cleanText.includes('"questions"')) {
                        toast({ description: `Aviso: Parte ${i + 1} pode estar incompleta.`, variant: 'destructive' });
                    }
                }
            }

            setProgress(p => ({ ...p, phase: 'done' }));
            
            toast({ title: `Processo concluído!`, description: `A extração de todas as partes foi finalizada.` });
        } catch (e: any) {
            console.error("Erro na análise em massa:", e);
            setProgress(p => ({ ...p, phase: 'error' }));
            toast({ title: "Falha na Extração", description: e.message || "Erro ao processar o texto com a Aurora.", variant: "destructive" });
        } finally {
            if (elapsedRef.current) clearInterval(elapsedRef.current);
            setIsAnalyzing(false);
        }
    };

    const handleSaveProcessed = async () => {
        if (!user || extractedQuestions.length === 0) return;
        setIsSaving(true);
        try {
            const itemsToInsert = extractedQuestions.map(q => {
                const item: any = {
                    question_text: q.question_text,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    year: q.year,
                    subject_id: q.subject_id || bulkSubjectId,
                    teacher_id: user.id
                };
                if (q.explanation) item.explanation = q.explanation;
                if (q.supporting_text) item.supporting_text = q.supporting_text;
                if (q.image_url) item.image_url = q.image_url;
                if (bulkTargetAudience !== 'all') item.target_audience = bulkTargetAudience;
                return item;
            });

            const { data: insertedQuestions, error } = await supabase.from('questions').insert(itemsToInsert).select('id');

            if (error) throw error;

            if (createExam && examTitle.trim() && insertedQuestions && insertedQuestions.length > 0) {
                const { data: examData, error: examErr } = await supabase
                    .from('exams')
                    .insert({ title: examTitle.trim(), year: examYear, exam_type: examType, teacher_id: user.id })
                    .select('id')
                    .single();
                if (examErr) throw examErr;

                const examQs = insertedQuestions.map((q: any, idx: number) => ({
                    exam_id: examData.id,
                    question_id: q.id,
                    order_index: idx,
                }));
                const { error: eqErr } = await supabase.from('exam_questions').insert(examQs);
                if (eqErr) throw eqErr;
                toast({ title: "Prova Completa criada!", description: `"${examTitle}" com ${insertedQuestions.length} questões.` });
            } else {
                toast({ title: "Banco Atualizado!", description: "Questões gravadas com sucesso." });
            }

            setExtractedQuestions([]);
            setRawText('');
            setCreateExam(false);
            setExamTitle('');
        } catch (e: any) {
            toast({ title: "Erro ao gravar", description: e.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (tempId: string, file: File) => {
        if (!file.type.startsWith('image/')) {
            toast({ title: "Arquivo inválido", description: "Selecione uma imagem (PNG, JPG, WEBP).", variant: "destructive" });
            return;
        }
        setExtractedQuestions(prev => prev.map(q => q._tempId === tempId ? { ...q, _uploadingImage: true } : q));
        try {
            // Se já existir uma imagem nesta questão, deleta a antiga do storage para economizar custos
            const currentQuestion = extractedQuestions.find(q => q._tempId === tempId);
            if (currentQuestion && currentQuestion.image_url) {
                await deleteImageFromStorage(currentQuestion.image_url);
            }

            const ext = file.name.split('.').pop();
            const path = `questions/${Date.now()}_${tempId}.${ext}`;
            const { error: upErr } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path);
            const publicUrl = urlData.publicUrl;
            setExtractedQuestions(prev => prev.map(q =>
                q._tempId === tempId ? { ...q, image_url: publicUrl, _uploadingImage: false } : q
            ));
            toast({ title: "Imagem vinculada!", description: "A imagem foi associada à questão." });
        } catch (e: any) {
            toast({ title: "Erro no upload", description: e.message || "Verifique se o bucket 'question-images' existe no Supabase.", variant: "destructive" });
            setExtractedQuestions(prev => prev.map(q => q._tempId === tempId ? { ...q, _uploadingImage: false } : q));
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

            // Include micro_topic_id if selected
            if (manualQuestion.micro_topic_id) insertData.micro_topic_id = manualQuestion.micro_topic_id;

            // Only include newer columns if filled
            if (manualQuestion.explanation) insertData.explanation = manualQuestion.explanation;
            if (manualQuestion.target_audience !== 'all') insertData.target_audience = manualQuestion.target_audience;

            const { error } = await supabase.from('questions').insert([insertData]);

            if (error) throw error;
            toast({ title: "Questão Salva!" });
            setManualQuestion(prev => ({ ...prev, question_text: '', explanation: '', micro_topic_id: '' }));
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
                        <Button variant={entryMode === 'bulk' ? 'default' : 'ghost'} onClick={() => { setEntryMode('bulk'); setExtractedQuestions([]); }} className={`rounded-xl font-black text-[10px] uppercase tracking-widest h-10 px-6 ${entryMode === 'bulk' ? 'bg-primary text-white shadow-lg' : ''}`}>
                            <ListChecks className="h-4 w-4 mr-2" /> Carga em Massa
                        </Button>
                        <Button variant={entryMode === 'manual' ? 'default' : 'ghost'} onClick={() => setEntryMode('manual')} className={`rounded-xl font-black text-[10px] uppercase tracking-widest h-10 px-6 ${entryMode === 'manual' ? 'bg-primary text-white shadow-lg' : ''}`}>
                            <PlusCircle className="h-4 w-4 mr-2" /> Manual
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    {entryMode === 'bulk' && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                            {/* Upload hint */}
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                                <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                                <p className="text-xs font-bold text-blue-700">
                                    Cole o texto da prova abaixo <span className="font-black">ou</span> faça upload de um arquivo <span className="font-black">.txt / .pdf</span> com texto selecionável.
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".txt,.pdf,text/plain,application/pdf"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isReadingFile}
                                    className="shrink-0 h-9 rounded-xl border-blue-200 text-blue-600 font-black text-xs hover:bg-blue-100"
                                >
                                    {isReadingFile
                                        ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Lendo...</>
                                        : <><Upload className="h-4 w-4 mr-1" />Upload</>}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                <div className={`${pdfUrl ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Texto Bruto da Prova</Label>
                                        <Textarea
                                            placeholder="Cole aqui o texto copiado de um PDF ou documento..."
                                            className="min-h-[250px] rounded-2xl bg-muted/30 border-none p-4 font-medium text-sm leading-relaxed italic"
                                            value={rawText}
                                            onChange={(e) => setRawText(e.target.value)}
                                        />
                                        <div className="flex justify-between items-center px-2">
                                            {rawText && (
                                                <p className="text-[10px] text-muted-foreground font-medium">
                                                    {rawText.length.toLocaleString('pt-BR')} caracteres · {rawText.split('\n').length} linhas
                                                </p>
                                            )}
                                            {rawText && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Limpa imagens órfãs ao descartar tudo
                                                        extractedQuestions.forEach(q => { if (q.image_url) deleteImageFromStorage(q.image_url); });
                                                        setRawText('');
                                                        setExtractedQuestions([]);
                                                        setAutoImageQueue([]);
                                                        localStorage.clear();
                                                        setPdfUrl(null);
                                                    }}
                                                    className="h-6 text-[8px] font-black text-red-400 hover:text-red-600 uppercase"
                                                >
                                                    Limpar Tudo
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <Button onClick={handleAnalyzeBulk} disabled={isAnalyzing || !rawText.trim()} className="w-full h-12 rounded-2xl bg-primary text-white font-black text-base shadow-xl hover:scale-[1.02] transition-all active:scale-95 mt-2">
                                        {isAnalyzing ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Analisando com Aurora IA...</> : <><BrainCircuit className="h-5 w-5 mr-2" />Extrair Questões com Aurora IA</>}
                                    </Button>
                                </div>

                                {pdfUrl && (
                                    <div className="lg:col-span-5 h-[400px] bg-slate-900 rounded-[2rem] overflow-hidden border-4 border-slate-800 shadow-2xl relative">
                                        <div className="absolute top-4 left-4 z-10">
                                            <Badge className="bg-primary text-white border-none text-[8px] font-black uppercase px-3">PDF Original</Badge>
                                        </div>
                                        <iframe src={pdfUrl} className="w-full h-full border-none" />
                                    </div>
                                )}
                            </div>

                            {/* Overlay de progresso */}
                            {isAnalyzing && (
                                <div className="mt-4 p-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 space-y-5 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-black text-primary italic text-base leading-tight">Aurora está analisando a prova...</p>
                                            <p className="text-xs text-muted-foreground font-medium">Isso pode levar de 30 segundos a alguns minutos. Não feche esta página.</p>
                                        </div>
                                    </div>

                                    {/* Barra de progresso */}
                                    {progress.totalChunks > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                                                <span>Parte {progress.currentChunk} de {progress.totalChunks}</span>
                                                <span>{Math.round((progress.currentChunk / progress.totalChunks) * 100)}%</span>
                                            </div>
                                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                                                    style={{ width: `${Math.max(5, (progress.currentChunk / progress.totalChunks) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Métricas em tempo real */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                                            <p className="text-2xl font-black text-primary">{progress.questionsFound}</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Questões encontradas</p>
                                        </div>
                                        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                                            <p className="text-2xl font-black text-accent">{progress.totalChunks > 0 ? progress.totalChunks : '—'}</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Partes do texto</p>
                                        </div>
                                        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                                            <p className="text-2xl font-black text-slate-600">{progress.elapsedSeconds}s</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Tempo decorrido</p>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-center text-muted-foreground font-medium italic">
                                        A Aurora também está identificando textos de apoio e imagens referenciadas pelas questões.
                                    </p>
                                </div>
                            )}

                            {/* Galeria de Imagens Detectadas (Drag and Drop) */}
                            {autoImageQueue.length > 0 && (
                                <div className="mt-6 p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 animate-in fade-in duration-500">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div>
                                            <Label className="text-sm font-black uppercase text-primary flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4" />
                                                Fila de Imagens Detectadas ({autoImageQueue.length})
                                            </Label>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Arraste para reordenar. Ao extrair, a IA associará as imagens na exata ordem visual. Você também pode arrastar uma imagem daqui direto para uma questão!
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setAutoImageQueue([])} className="h-8 text-[10px] font-black text-red-400 hover:bg-red-50 hover:text-red-600 uppercase">
                                            <Trash2 className="h-3 w-3 mr-1" /> Limpar Galeria
                                        </Button>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                        {autoImageQueue.map((img, idx) => (
                                            <div
                                                key={img.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    setDraggedImgIndex(idx);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    e.dataTransfer.setData('application/x-auto-image', idx.toString());
                                                }}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    if (draggedImgIndex === null || draggedImgIndex === idx) return;
                                                    const newQueue = [...autoImageQueue];
                                                    const draggedItem = newQueue[draggedImgIndex];
                                                    newQueue.splice(draggedImgIndex, 1);
                                                    newQueue.splice(idx, 0, draggedItem);
                                                    setAutoImageQueue(newQueue);
                                                    setDraggedImgIndex(null);
                                                }}
                                                className="relative w-32 h-32 shrink-0 rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary cursor-grab active:cursor-grabbing group shadow-sm bg-white"
                                            >
                                                <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-lg z-10 shadow-md">
                                                    #{idx + 1}
                                                </div>
                                                <button
                                                    onClick={() => setAutoImageQueue(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                                <Image src={img.url} alt={`Detectada ${idx}`} fill className="object-contain p-2" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {entryMode === 'manual' && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Enunciado da Questão</Label>
                                <Textarea placeholder="Digite o texto da pergunta..." className="rounded-2xl bg-muted/30 border-none min-h-[80px] p-4 font-medium italic text-sm" value={manualQuestion.question_text} onChange={e => setManualQuestion(prev => ({ ...prev, question_text: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {['A', 'B', 'C', 'D', 'E'].map(key => (
                                    <div key={key} className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Opção {key}</Label>
                                        <Input placeholder={`Texto da alternativa ${key}...`} className="h-10 rounded-xl bg-muted/30 border-none font-medium pl-4 text-sm" value={manualOptions[key as keyof typeof manualOptions]} onChange={e => setManualOptions(prev => ({ ...prev, [key]: e.target.value }))} />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Gabarito</Label>
                                    <Select value={manualQuestion.correct_answer} onValueChange={val => setManualQuestion(prev => ({ ...prev, correct_answer: val }))}>
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {['A', 'B', 'C', 'D', 'E'].map(key => <SelectItem key={key} value={key} className="font-bold">Alternativa {key}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Disciplina</Label>
                                    <Select value={manualQuestion.subject_id} onValueChange={val => setManualQuestion(prev => ({ ...prev, subject_id: val }))}>
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="Matéria" /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-sm">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {manualMicroTopics.length > 0 && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Micro-tópico</Label>
                                        <Select
                                            value={manualQuestion.micro_topic_id || '_none'}
                                            onValueChange={val => setManualQuestion(prev => ({ ...prev, micro_topic_id: val === '_none' ? '' : val }))}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold text-sm"><SelectValue placeholder="Selecionar tópico (opcional)" /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                {/* Use '_none' sentinel — Radix UI forbids empty string values */}
                                                <SelectItem value="_none" className="font-bold text-sm">Nenhum (Geral)</SelectItem>
                                                {manualMicroTopics.map(mt => <SelectItem key={mt.id} value={mt.id} className="font-bold text-sm">{mt.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-2">Público Alvo</Label>
                                    <Select value={manualQuestion.target_audience} onValueChange={val => setManualQuestion(prev => ({ ...prev, target_audience: val }))}>
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
                                    <Input type="number" className="h-10 rounded-xl bg-muted/30 border-none font-black text-center text-sm" value={manualQuestion.year} onChange={e => setManualQuestion(prev => ({ ...prev, year: parseInt(e.target.value, 10) }))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Explicação Pedagógica (Opcional)</Label>
                                <Textarea
                                    placeholder="Justifique a resposta correta para auxiliar o estudo do aluno..."
                                    className="rounded-2xl bg-muted/30 border-none min-h-[60px] p-4 font-medium italic text-sm"
                                    value={(manualQuestion as any).explanation || ''}
                                    onChange={e => setManualQuestion(prev => ({ ...prev, explanation: e.target.value } as any))}
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
                            <div className="bg-slate-50 p-6 rounded-3xl border border-muted/20 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-black text-primary italic">Área de Curadoria ({extractedQuestions.length})</h3>
                                        <p className="text-xs text-muted-foreground font-medium">Matérias detectadas pela IA por questão. Ajuste se necessário.</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Select value={bulkTargetAudience} onValueChange={setBulkTargetAudience}>
                                            <SelectTrigger className="w-full md:w-40 h-10 rounded-xl bg-white border-none shadow-md font-bold text-xs"><SelectValue placeholder="Público Alvo" /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                <SelectItem value="all" className="font-bold text-xs">Todos</SelectItem>
                                                <SelectItem value="etec" className="font-bold text-xs">ETEC/FATEC</SelectItem>
                                                <SelectItem value="enem" className="font-bold text-xs">ENEM</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="text-xs text-muted-foreground font-medium">Fallback matéria:</div>
                                        <Select value={bulkSubjectId} onValueChange={setBulkSubjectId}>
                                            <SelectTrigger className="w-full md:w-44 h-10 rounded-xl bg-white border-none shadow-md font-bold text-xs"><SelectValue placeholder="Matéria padrão" /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-dashed">
                                    <Switch id="create-exam" checked={createExam} onCheckedChange={setCreateExam} />
                                    <Label htmlFor="create-exam" className="font-black text-sm text-primary cursor-pointer flex items-center gap-2">
                                        <Scroll className="h-4 w-4 text-accent" />
                                        Criar também como Prova Completa
                                    </Label>
                                </div>

                                {createExam && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-300">
                                        <div className="md:col-span-1 space-y-1">
                                            <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Título da Prova</Label>
                                            <Input placeholder="Ex: ENEM 2023 — 1ª Aplicação" className="h-10 rounded-xl bg-white border-none shadow-md font-bold text-xs" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Tipo</Label>
                                            <Select value={examType} onValueChange={setExamType}>
                                                <SelectTrigger className="h-10 rounded-xl bg-white border-none shadow-md font-bold text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                                    <SelectItem value="enem" className="font-bold text-xs">ENEM</SelectItem>
                                                    <SelectItem value="etec" className="font-bold text-xs">ETEC/FATEC</SelectItem>
                                                    <SelectItem value="fuvest" className="font-bold text-xs">FUVEST</SelectItem>
                                                    <SelectItem value="unicamp" className="font-bold text-xs">UNICAMP</SelectItem>
                                                    <SelectItem value="outro" className="font-bold text-xs">Outro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Ano</Label>
                                            <Input type="number" className="h-10 rounded-xl bg-white border-none shadow-md font-black text-center text-xs" value={examYear} onChange={e => setExamYear(parseInt(e.target.value, 10))} />
                                        </div>
                                    </div>
                                )}

                                <Button onClick={handleSaveProcessed} disabled={isSaving || (!bulkSubjectId) || (createExam && !examTitle.trim())} className="w-full h-12 rounded-xl bg-primary text-white font-black shadow-lg">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2 text-accent" />}
                                    Validar e Salvar Tudo
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {extractedQuestions.map((q, i) => (
                                    <Card
                                        key={i}
                                        className={`border-none shadow-lg bg-white p-6 rounded-[2rem] relative group transition-all duration-300
                                            ${dragOverId === q._tempId ? 'ring-4 ring-primary bg-primary/5 scale-[1.02] z-10' : 'hover:shadow-xl'}
                                        `}
                                        onPaste={(e: React.ClipboardEvent) => {
                                            const items = e.clipboardData.items;
                                            for (let j = 0; j < items.length; j++) {
                                                if (items[j].type.indexOf("image") !== -1) {
                                                    const blob = items[j].getAsFile();
                                                    if (blob) handleImageUpload(q._tempId!, blob);
                                                }
                                            }
                                        }}
                                        onDragEnter={() => setDragOverId(q._tempId || null)}
                                        onDragLeave={() => setDragOverId(null)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverId(q._tempId || null); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOverId(null);
                                            const file = e.dataTransfer.files?.[0];
                                            if (file && file.type.startsWith('image/')) {
                                                handleImageUpload(q._tempId!, file);
                                                return;
                                            }
                                            const autoImgIdx = e.dataTransfer.getData('application/x-auto-image');
                                            if (autoImgIdx) {
                                                const img = autoImageQueue[parseInt(autoImgIdx, 10)];
                                                if (img) handleImageUpload(q._tempId!, img.file);
                                            }
                                        }}
                                    >
                                        {/* Overlay de Upload Supremo */}
                                        {q._uploadingImage && (
                                            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-[2rem] animate-in fade-in">
                                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3 drop-shadow-md" />
                                                <span className="text-xs font-black text-primary uppercase tracking-widest bg-white/80 px-4 py-1 rounded-full">Anexando Imagem...</span>
                                            </div>
                                        )}

                                        <button onClick={() => {
                                            const url = q.image_url;
                                            setExtractedQuestions(prev => prev.filter(item => item._tempId !== q._tempId));
                                            if (url) deleteImageFromStorage(url); // Deleta do storage ao excluir questão
                                        }} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-50 shadow-sm">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                                            <Badge className="bg-primary/5 text-primary border-none font-black text-[8px] uppercase px-3">QUESTÃO {i + 1}</Badge>
                                            <Badge className="bg-accent/10 text-accent border-none font-black text-[8px] uppercase px-3">{q.year}</Badge>
                                            {q.subject_name && (
                                                <Badge className="bg-green-50 text-green-600 border-none font-black text-[8px] uppercase px-3">IA: {q.subject_name}</Badge>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[8px] font-black uppercase text-slate-400 hover:text-accent"
                                                onClick={() => {
                                                    const current = q.question_text;
                                                    const updated = current.includes('[IMAGEM_PENDENTE]') ? current.replace('[IMAGEM_PENDENTE]', '') : current + ' [IMAGEM_PENDENTE]';
                                                    setExtractedQuestions(prev => prev.map((item) => item._tempId === q._tempId ? { ...item, question_text: updated } : item));
                                                }}
                                            >
                                                <ImageIcon className="h-3 w-3 mr-1" /> Marcar Imagem
                                            </Button>
                                        </div>

                                        {/* Detecção de Imagem Pendente e Upload */}
                                        {(q.question_text.includes('[IMAGEM_PENDENTE]') || q.supporting_text?.includes('[IMAGEM_PENDENTE]') || (q as any).image_url) && (
                                            <div className={`mb-4 p-4 rounded-2xl border-2 border-dashed transition-all ${(q as any).image_url ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                                                {(q as any).image_url ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-green-600 uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Imagem Vinculada</span>
                                                            <Button variant="ghost" size="sm" onClick={async () => {
                                                                const url = (q as any).image_url;
                                                                setExtractedQuestions(prev => prev.map((item) => item._tempId === q._tempId ? { ...item, image_url: undefined } : item));
                                                                if (url) await deleteImageFromStorage(url);
                                                            }} className="h-6 text-[8px] font-black text-red-400 hover:text-red-600">Remover</Button>
                                                        </div>
                                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-green-100">
                                                            <Image src={(q as any).image_url} alt="Questão" fill className="object-cover" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-3">
                                                        <div className="flex items-center justify-center gap-2 text-amber-600">
                                                            <Sparkles className="h-4 w-4 animate-pulse" />
                                                            <span className="text-[10px] font-black uppercase">Imagem Necessária</span>
                                                        </div>
                                                        <p className="text-[10px] text-amber-700 font-medium italic">Esta questão faz referência a um gráfico ou imagem do PDF.</p>
                                                        <label className="flex items-center justify-center w-full h-10 px-4 bg-white border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
                                                            <Upload className="h-4 w-4 text-amber-600 mr-2" />
                                                            <span className="text-[10px] font-black text-amber-600 uppercase">
                                                                {q._uploadingImage ? 'Enviando...' : 'Selecionar Imagem'}
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                disabled={q._uploadingImage}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) handleImageUpload(q._tempId!, f);
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-3 mb-4">
                                            {q.supporting_text !== undefined && (
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Texto de Apoio / Contexto</Label>
                                                    <Textarea
                                                        value={q.supporting_text}
                                                        onChange={e => setExtractedQuestions(prev => prev.map((item) => item._tempId === q._tempId ? { ...item, supporting_text: e.target.value } : item))}
                                                        className="text-[11px] bg-amber-50/50 border-amber-100 rounded-xl min-h-[60px] font-medium leading-relaxed italic"
                                                        placeholder="Cole aqui o texto que serve de base para esta questão..."
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Enunciado</Label>
                                                <Textarea
                                                    value={q.question_text}
                                                    onChange={e => setExtractedQuestions(prev => prev.map((item) => item._tempId === q._tempId ? { ...item, question_text: e.target.value } : item))}
                                                    className="text-xs font-bold text-primary italic leading-relaxed min-h-[80px] bg-slate-50/50 border-none rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <Label className="text-[9px] font-black uppercase opacity-40 ml-1 mb-1 block">Disciplina Vinculada</Label>
                                            <Select
                                                value={q.subject_id || ''}
                                                onValueChange={val => setExtractedQuestions(prev => prev.map((item) => item._tempId === q._tempId ? { ...item, subject_id: val } : item))}
                                            >
                                                <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-none font-bold text-xs w-full">
                                                    <SelectValue placeholder="Selecionar matéria..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                                    {subjects.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
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
