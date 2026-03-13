"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { fabric } from "fabric";
import { 
  Loader2, 
  Pencil, 
  Eraser, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Cloud,
  AlertTriangle,
  Maximize,
  Hash,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

// Configurar o worker do PDF.js - Versão 4.x usa .mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface InteractiveWorkbookProps {
  materialId: string;
  pdfUrl: string;
  userName: string;
  userCpf: string;
}

export function InteractiveWorkbook({ materialId, pdfUrl, userName, userCpf }: InteractiveWorkbookProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const renderTaskRef = useRef<any>(null);
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [inputPage, setInputPage] = useState("1");
  const [loading, setLoading] = useState(true);
  const [brushColor, setBrushColor] = useState("#FF0000");
  const [isEraser, setIsEraser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // Salva anotações da página atual no LocalStorage
  const savePageDraft = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const objects = fabricCanvasRef.current.getObjects().map((obj: any) => {
      if (obj.type === 'path') {
        return {
          type: 'path',
          left: obj.left,
          top: obj.top,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          path: obj.path
        };
      }
      return null;
    }).filter(Boolean);

    const pageData = {
      version: "1.0",
      viewport: {
        width: fabricCanvasRef.current.getWidth(),
        height: fabricCanvasRef.current.getHeight()
      },
      objects
    };

    const draftStr = localStorage.getItem(`workbook_draft_${materialId}`);
    const draft = draftStr ? JSON.parse(draftStr) : { annotations: {} };
    
    draft.annotations[currentPage] = pageData;
    draft.lastPage = currentPage;
    draft.timestamp = Date.now();

    localStorage.setItem(`workbook_draft_${materialId}`, JSON.stringify(draft));
  }, [materialId, currentPage]);

  // Sincronização final com Supabase
  const syncWithSupabase = useCallback(async () => {
    if (isSaving || !user) return;
    setIsSaving(true);
    
    const draftStr = localStorage.getItem(`workbook_draft_${materialId}`);
    if (!draftStr) {
      setIsSaving(false);
      return;
    }

    try {
      const draft = JSON.parse(draftStr);
      const percentage = Math.round((currentPage / numPages) * 100);

      const { error: syncError } = await supabase
        .from('material_annotations')
        .upsert({
          user_id: user.id,
          material_id: materialId,
          percentage_explored: percentage,
          drawing_data: { pages: draft.annotations },
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,material_id' });

      if (syncError) throw syncError;
      
      toast({ title: "Progresso Salvo!", description: "Anotações sincronizadas com a nuvem." });
    } catch (e: any) {
      console.error("Erro sincronização:", e.message || e);
      toast({ 
        title: "Erro ao sincronizar", 
        description: "Houve um problema ao salvar na nuvem, mas seu rascunho local está seguro.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  }, [materialId, currentPage, numPages, isSaving, toast, user]);

  // Carregar PDF inicial
  useEffect(() => {
    async function loadPdf() {
      if (!pdfUrl) return;
      setLoading(true);
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        
        const draftStr = localStorage.getItem(`workbook_draft_${materialId}`);
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if (draft.lastPage) {
            const pageToLoad = Math.min(draft.lastPage, pdf.numPages);
            setCurrentPage(pageToLoad);
            setInputPage(pageToLoad.toString());
          }
        }
      } catch (err) {
        setError("Erro ao carregar o arquivo PDF.");
      } finally {
        setLoading(false);
      }
    }
    loadPdf();
  }, [pdfUrl, materialId]);

  // Renderizar Página Atual
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    setLoading(true);

    try {
      const page = await pdfDoc.getPage(pageNum);
      
      // Cálculo de Escala Responsiva
      const containerWidth = containerRef.current?.clientWidth || 800;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth - 40) / unscaledViewport.width;
      const viewport = page.getViewport({ scale: Math.min(scale, 2) }); // Limite de 2x para nitidez

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (renderTaskRef.current) renderTaskRef.current.cancel();
      const renderTask = page.render({ canvasContext: context!, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;

      // Injetar Marca d'água
      context!.font = "bold 12px Inter";
      context!.fillStyle = "rgba(0, 0, 0, 0.04)";
      context!.save();
      context!.rotate(-Math.PI / 4);
      for(let x=-500; x<canvas.width; x+=200) {
        for(let y=-500; y<canvas.height; y+=150) {
          context!.fillText(`${userName} • ${userCpf}`, x, y);
        }
      }
      context!.restore();

      // Configurar Camada de Desenho (Fabric)
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
      
      const fCanvas = new fabric.Canvas('fabric-layer', {
        height: viewport.height,
        width: viewport.width,
        isDrawingMode: !isEraser,
        selection: !isEraser // Permite selecionar apenas se não for desenho
      });

      fCanvas.freeDrawingBrush.color = brushColor;
      fCanvas.freeDrawingBrush.width = 3;

      // Carregar anotações existentes para esta página
      const draftStr = localStorage.getItem(`workbook_draft_${materialId}`);
      const draft = draftStr ? JSON.parse(draftStr) : null;
      if (draft?.annotations?.[pageNum]) {
        fCanvas.loadFromJSON(draft.annotations[pageNum], () => fCanvas.renderAll());
      }

      // Logica da Borracha: Se clicar em um traço no modo borracha, remove ele
      fCanvas.on('mouse:down', (options) => {
        if (isEraser && options.target) {
          fCanvas.remove(options.target);
          savePageDraft();
        }
      });

      fCanvas.on('path:created', () => savePageDraft());
      fabricCanvasRef.current = fCanvas;

    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error("Erro render:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [pdfDoc, userName, userCpf, materialId, brushColor, isEraser, savePageDraft]);

  useEffect(() => {
    if (pdfDoc) renderPage(currentPage);
  }, [currentPage, pdfDoc, renderPage]);

  const changePage = (offset: number) => {
    const next = Math.max(1, Math.min(numPages, currentPage + offset));
    if (next !== currentPage) {
      setCurrentPage(next);
      setInputPage(next.toString());
    }
  };

  const jumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    let target = parseInt(inputPage);
    
    if (isNaN(target)) {
      setInputPage(currentPage.toString());
      return;
    }

    // Lógica de limite solicitada
    if (target > numPages) {
      target = numPages;
    } else if (target < 1) {
      target = 1;
    }

    setCurrentPage(target);
    setInputPage(target.toString());
  };

  const toggleTool = (eraser: boolean) => {
    setIsEraser(eraser);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.isDrawingMode = !eraser;
      // Cursor de borracha ou caneta
      fabricCanvasRef.current.defaultCursor = eraser ? 'cell' : 'crosshair';
    }
  };

  const clearCurrentPage = () => {
    if (confirm("Deseja apagar todas as anotações desta página?")) {
      fabricCanvasRef.current?.clear();
      savePageDraft();
    }
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900 text-white gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="font-bold italic">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden select-none">
      {/* TOOLBAR SUPERIOR - RESPONSIVA */}
      <div className="bg-slate-950 border-b border-white/5 p-2 md:p-4 flex flex-wrap items-center justify-between gap-4 z-30 shadow-2xl">
        <div className="flex items-center gap-2">
          <Button 
            variant={!isEraser ? "default" : "ghost"} 
            size="icon" 
            onClick={() => toggleTool(false)}
            title="Caneta de Anotação"
            className={`h-10 w-10 md:h-12 md:w-12 rounded-xl transition-all ${!isEraser ? 'bg-primary text-white scale-110 shadow-lg' : 'text-slate-400'}`}
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <Button 
            variant={isEraser ? "default" : "ghost"} 
            size="icon" 
            onClick={() => toggleTool(true)}
            title="Borracha (Clique no traço para apagar)"
            className={`h-10 w-10 md:h-12 md:w-12 rounded-xl transition-all ${isEraser ? 'bg-accent text-accent-foreground scale-110 shadow-lg' : 'text-slate-400'}`}
          >
            <Eraser className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearCurrentPage}
            title="Limpar Página Inteira"
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />
          <div className="flex gap-2">
            {["#FF0000", "#0088FF", "#00FF00", "#FFFFFF"].map(color => (
              <button 
                key={color} 
                onClick={() => { setBrushColor(color); toggleTool(false); }}
                className={`h-6 w-6 md:h-8 md:w-8 rounded-full border-2 transition-all ${brushColor === color ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={syncWithSupabase} 
            disabled={isSaving} 
            title="Salvar na Nuvem"
            className="text-slate-400 hover:text-accent transition-colors"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Cloud className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* ÁREA DO DOCUMENTO */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start bg-slate-900 scrollbar-hide no-swipe">
        <div className="relative shadow-[0_50px_100px_rgba(0,0,0,0.6)] rounded-sm bg-white overflow-hidden transition-all duration-500">
          {loading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Sincronizando Página...</p>
            </div>
          )}
          <canvas ref={canvasRef} className="block" />
          <div className="absolute inset-0 z-10">
            <canvas id="fabric-layer" />
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO INFERIOR */}
      <div className="bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 p-4 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" onClick={() => changePage(-currentPage)} disabled={currentPage === 1} className="text-white hover:bg-white/10 h-10 w-10">
            <ChevronsLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => changePage(-1)} disabled={currentPage === 1} className="text-white hover:bg-white/10 h-10 w-10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>

        <form onSubmit={jumpToPage} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 group focus-within:border-accent/50 transition-all">
          <Hash className="h-3 w-3 text-accent" />
          <Input 
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onBlur={jumpToPage}
            className="w-12 h-8 bg-transparent border-none text-center font-black text-white p-0 focus-visible:ring-0 text-lg italic"
          />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">DE {numPages}</span>
          <button type="submit" className="hidden" />
        </form>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" onClick={() => changePage(1)} disabled={currentPage === numPages} className="text-white hover:bg-white/10 h-10 w-10">
            <ChevronRight className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => changePage(numPages - currentPage)} disabled={currentPage === numPages} className="text-white hover:bg-white/10 h-10 w-10">
            <ChevronsRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
          <Maximize className="h-3 w-3" />
          Renderização Protegida
        </div>
      </div>
    </div>
  );
}
