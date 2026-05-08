'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/app/lib/supabase';

export type Subject = { id: string; name: string };
export type QuestionOption = { key: string; text: string };
export type ParsedQuestion = {
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
export type ExtractionProgress = {
    currentChunk: number;
    totalChunks: number;
    phase: 'idle' | 'analyzing' | 'done' | 'error';
    questionsFound: number;
    elapsedSeconds: number;
};
export type ImgItem = { id: string; file: File; url: string };
export type UploadRecord = {
    id: string;
    timestamp: string;
    filename: string;
    questionCount: number;
    status: 'completed' | 'partial' | 'error';
};

type ExtractionContextType = {
    isAnalyzing: boolean;
    progress: ExtractionProgress;
    extractedQuestions: ParsedQuestion[];
    rawText: string;
    pdfUrl: string | null;
    autoImageQueue: ImgItem[];
    uploadHistory: UploadRecord[];
    setExtractedQuestions: React.Dispatch<React.SetStateAction<ParsedQuestion[]>>;
    setRawText: (text: string) => void;
    setPdfUrl: (url: string | null) => void;
    setAutoImageQueue: React.Dispatch<React.SetStateAction<ImgItem[]>>;
    clearExtraction: () => void;
    startExtraction: (params: {
        text: string;
        imageQueue: ImgItem[];
        subjects: Subject[];
        bulkSubjectId: string;
        filename?: string;
    }) => void;
    handleImageUpload: (tempId: string, file: File) => Promise<void>;
};

const ExtractionContext = createContext<ExtractionContextType | null>(null);

export function useExtraction() {
    const ctx = useContext(ExtractionContext);
    if (!ctx) throw new Error('useExtraction must be used within ExtractionProvider');
    return ctx;
}

// ---- subject resolution (runs in context, not page) ----
const ALIAS: Record<string, string> = {
    'linguagens': 'Português', 'linguagens e codigos': 'Português',
    'linguagens codigos e suas tecnologias': 'Português', 'lingua portuguesa': 'Português',
    'portugues': 'Português', 'literatura': 'Português', 'redacao': 'Português',
    'matematica e suas tecnologias': 'Matemática', 'matematica': 'Matemática',
    'ciencias da natureza e suas tecnologias': 'Física', 'ciencias da natureza': 'Física',
    'fisica': 'Física', 'quimica': 'Química', 'biologia': 'Biologia',
    'ciencias biologicas': 'Biologia', 'ciencias': 'Biologia',
    'ciencias humanas e suas tecnologias': 'História', 'ciencias humanas': 'História',
    'humanidades': 'História', 'historia': 'História', 'geografia': 'Geografia',
    'filosofia': 'Filosofia', 'sociologia': 'Sociologia',
    'ingles': 'Inglês', 'lingua inglesa': 'Inglês', 'english': 'Inglês',
    'espanhol': 'Espanhol', 'lingua espanhola': 'Espanhol',
    'artes': 'Artes', 'arte': 'Artes', 'educacao fisica': 'Educação Física',
    'ed fisica': 'Educação Física', 'informatica': 'Informática',
    'computacao': 'Informática', 'tecnologia da informacao': 'Informática',
};

function resolveSubjectId(name: string | undefined, list: Subject[]): string | undefined {
    if (!name || list.length === 0) return undefined;
    const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const nm = n(name);
    const exact = list.find(s => n(s.name) === nm);
    if (exact) return exact.id;
    const canonical = ALIAS[nm];
    if (canonical) {
        const hit = list.find(s => n(s.name) === n(canonical));
        if (hit) return hit.id;
        const partial = list.find(s => n(s.name).includes(n(canonical)) || n(canonical).includes(n(s.name)));
        if (partial) return partial.id;
    }
    const partial = list.find(s => n(s.name).includes(nm) || nm.includes(n(s.name)));
    return partial?.id;
}

// -------------------------------------------------------

export function ExtractionProvider({ children }: { children: ReactNode }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState<ExtractionProgress>({
        currentChunk: 0, totalChunks: 0, phase: 'idle', questionsFound: 0, elapsedSeconds: 0,
    });
    const [extractedQuestions, setExtractedQuestions] = useState<ParsedQuestion[]>([]);
    const [rawText, setRawTextState] = useState('');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [autoImageQueue, setAutoImageQueue] = useState<ImgItem[]>([]);
    const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([]);

    const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isAnalyzingRef = useRef(false);
    const uploadedTempIds = useRef(new Set<string>());
    const extractedRef = useRef<ParsedQuestion[]>([]);
    useEffect(() => { extractedRef.current = extractedQuestions; }, [extractedQuestions]);

    // Load from localStorage on mount
    useEffect(() => {
        const raw = localStorage.getItem('draft_raw_text');
        const extracted = localStorage.getItem('draft_extracted_questions');
        const history = localStorage.getItem('upload_history');
        if (raw) setRawTextState(raw);
        if (extracted) { try { setExtractedQuestions(JSON.parse(extracted)); } catch {} }
        if (history) { try { setUploadHistory(JSON.parse(history)); } catch {} }
    }, []);

    // Persist rawText
    useEffect(() => {
        if (rawText) localStorage.setItem('draft_raw_text', rawText);
        else localStorage.removeItem('draft_raw_text');
    }, [rawText]);

    // Persist extractedQuestions (strip non-serializable File objects)
    useEffect(() => {
        if (extractedQuestions.length > 0) {
            const safe = extractedQuestions.map(({ _autoFileToUpload, ...q }) => q);
            localStorage.setItem('draft_extracted_questions', JSON.stringify(safe));
        } else {
            localStorage.removeItem('draft_extracted_questions');
        }
    }, [extractedQuestions]);

    const setRawText = useCallback((text: string) => setRawTextState(text), []);

    const deleteImageFromStorage = useCallback(async (url: string) => {
        try {
            const m = url.match(/question-images\/(.+)$/);
            if (m?.[1]) await supabase.storage.from('question-images').remove([m[1]]);
        } catch {}
    }, []);

    const handleImageUpload = useCallback(async (tempId: string, file: File) => {
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem (PNG, JPG, WEBP).', variant: 'destructive' });
            return;
        }
        setExtractedQuestions(prev => prev.map(q => q._tempId === tempId ? { ...q, _uploadingImage: true } : q));
        try {
            const cur = extractedRef.current.find(q => q._tempId === tempId);
            if (cur?.image_url) await deleteImageFromStorage(cur.image_url);
            const ext = file.name.split('.').pop();
            const path = `questions/${Date.now()}_${tempId}.${ext}`;
            const { error: upErr } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path);
            setExtractedQuestions(prev => prev.map(q =>
                q._tempId === tempId ? { ...q, image_url: urlData.publicUrl, _uploadingImage: false } : q
            ));
            toast({ title: 'Imagem vinculada!', description: 'A imagem foi associada à questão.' });
        } catch (e: any) {
            toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' });
            setExtractedQuestions(prev => prev.map(q => q._tempId === tempId ? { ...q, _uploadingImage: false } : q));
        }
    }, [deleteImageFromStorage]);

    // Auto-trigger uploads for questions marked with _autoFileToUpload
    useEffect(() => {
        extractedQuestions.forEach(q => {
            if (q._autoFileToUpload && q._tempId && !uploadedTempIds.current.has(q._tempId)) {
                uploadedTempIds.current.add(q._tempId);
                setTimeout(() => handleImageUpload(q._tempId!, q._autoFileToUpload!), 500);
            }
        });
    }, [extractedQuestions, handleImageUpload]);

    const clearExtraction = useCallback(() => {
        extractedRef.current.forEach(q => { if (q.image_url) deleteImageFromStorage(q.image_url); });
        setExtractedQuestions([]);
        setRawTextState('');
        setAutoImageQueue([]);
        setPdfUrl(null);
        uploadedTempIds.current.clear();
        localStorage.removeItem('draft_raw_text');
        localStorage.removeItem('draft_extracted_questions');
    }, [deleteImageFromStorage]);

    const startExtraction = useCallback(async ({
        text, imageQueue, subjects, bulkSubjectId, filename = 'Prova',
    }: {
        text: string; imageQueue: ImgItem[]; subjects: Subject[];
        bulkSubjectId: string; filename?: string;
    }) => {
        if (!text.trim() || isAnalyzingRef.current) return;
        isAnalyzingRef.current = true;
        setIsAnalyzing(true);
        setExtractedQuestions([]);
        uploadedTempIds.current.clear();

        let elapsed = 0;
        elapsedRef.current = setInterval(() => {
            elapsed++;
            setProgress(p => ({ ...p, elapsedSeconds: elapsed }));
        }, 1000);

        const CHUNK_SIZE = 4500;
        const OVERLAP = 800;
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += (CHUNK_SIZE - OVERLAP)) {
            chunks.push(text.substring(i, i + CHUNK_SIZE));
            if (i + CHUNK_SIZE >= text.length) break;
        }

        setProgress({ currentChunk: 0, totalChunks: chunks.length, phase: 'analyzing', questionsFound: 0, elapsedSeconds: 0 });

        const seenTexts = new Set<string>();
        let imageIndex = 0;
        let totalFound = 0;

        const saveHistory = (status: UploadRecord['status'], count: number) => {
            const record: UploadRecord = {
                id: Math.random().toString(36).substring(2, 9),
                timestamp: new Date().toISOString(),
                filename,
                questionCount: count,
                status,
            };
            setUploadHistory(prev => {
                const updated = [record, ...prev].slice(0, 10);
                localStorage.setItem('upload_history', JSON.stringify(updated));
                return updated;
            });
        };

        try {
            for (let i = 0; i < chunks.length; i++) {
                if (i > 0) await new Promise(r => setTimeout(r, 700));
                setProgress(p => ({ ...p, currentChunk: i + 1 }));

                let response: Response | null = null;
                for (let attempt = 0; attempt < 3; attempt++) {
                    response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [{
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
      "question_text": "Enunciado completo.",
      "supporting_text": "Texto de base (se houver).",
      "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, {"key": "C", "text": "..."}, {"key": "D", "text": "..."}, {"key": "E", "text": "..."}],
      "correct_answer": "LETRA_DA_CORRETA",
      "year": 2024,
      "subject_name": "Matéria"
    }
  ]
}

TEXTO PARA ANÁLISE (Trecho ${i + 1}/${chunks.length}):\n${chunks[i]}`,
                            }],
                        }),
                    });
                    if (response.status !== 429 && response.status !== 504) break;
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                }

                if (!response?.ok) {
                    if (response?.status === 429) { toast({ description: `Limite atingido. Parte ${i + 1} ignorada.`, variant: 'destructive' }); continue; }
                    if (response?.status === 504) { toast({ description: `Timeout na parte ${i + 1}. Pulando.`, variant: 'destructive' }); continue; }
                    throw new Error(`Erro no servidor na parte ${i + 1}.`);
                }

                let data: any;
                try { data = JSON.parse(await response.text()); }
                catch { toast({ description: `Formato inválido na parte ${i + 1}. Pulando.`, variant: 'destructive' }); continue; }
                if (!data.success) { toast({ description: `Erro da Aurora na parte ${i + 1}.`, variant: 'destructive' }); continue; }

                const clean = (data.result?.response || '').trim()
                    .replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
                try {
                    const jsonMatch = clean.match(/\{[\s\S]*"questions"[\s\S]*\}/);
                    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
                    const chunkQs = parsed.questions || (Array.isArray(parsed) ? parsed : []);

                    const unique: any[] = [];
                    chunkQs.forEach((q: any) => {
                        const norm = (q.question_text || '')
                            .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
                            .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
                        if (!seenTexts.has(norm) && norm.length > 10) { seenTexts.add(norm); unique.push(q); }
                    });

                    const mapped = unique.map((q: any) => {
                        const needsImage = (q.question_text + ' ' + (q.supporting_text || '')).toUpperCase().includes('[IMAGEM_PENDENTE]');
                        const base = {
                            ...q,
                            _tempId: Math.random().toString(36).substring(2, 9),
                            subject_id: resolveSubjectId(q.subject_name, subjects) || bulkSubjectId,
                        };
                        if (needsImage && imageIndex < imageQueue.length) {
                            const f = imageQueue[imageIndex].file;
                            imageIndex++;
                            return { ...base, _autoFileToUpload: f, _uploadingImage: true };
                        }
                        return base;
                    });

                    setExtractedQuestions(prev => [...prev, ...mapped]);
                    totalFound += unique.length;
                    setProgress(p => ({ ...p, questionsFound: totalFound }));
                } catch {
                    if (clean.includes('"questions"'))
                        toast({ description: `Aviso: Parte ${i + 1} pode estar incompleta.`, variant: 'destructive' });
                }
            }

            setProgress(p => ({ ...p, phase: 'done' }));
            toast({ title: 'Extração concluída!', description: `${totalFound} questões encontradas.` });
            saveHistory(totalFound > 0 ? 'completed' : 'error', totalFound);

        } catch (e: any) {
            setProgress(p => ({ ...p, phase: 'error' }));
            toast({ title: 'Falha na Extração', description: e.message, variant: 'destructive' });
            saveHistory(totalFound > 0 ? 'partial' : 'error', totalFound);
        } finally {
            if (elapsedRef.current) clearInterval(elapsedRef.current);
            isAnalyzingRef.current = false;
            setIsAnalyzing(false);
        }
    }, [deleteImageFromStorage]);

    return (
        <ExtractionContext.Provider value={{
            isAnalyzing, progress, extractedQuestions, rawText, pdfUrl, autoImageQueue, uploadHistory,
            setExtractedQuestions, setRawText, setPdfUrl, setAutoImageQueue,
            clearExtraction, startExtraction, handleImageUpload,
        }}>
            {children}
        </ExtractionContext.Provider>
    );
}
