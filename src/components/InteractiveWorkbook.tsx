
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { fabric } from "fabric";
import { 
  Loader2, 
  Pencil, 
  Eraser, 
  Save, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown,
  CloudSync,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface InteractiveWorkbookProps {
  materialId: string;
  pdfUrl: string;
  userName: string;
  userCpf: string;
}

export function InteractiveWorkbook({ materialId, pdfUrl, userName, userCpf }: InteractiveWorkbookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement>>({});
  const fabricCanvases = useRef<Record<number, fabric.Canvas>>({});
  
  const [numPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [brushColor, setBrushColor] = useState("#FF0000");
  const [brushWidth, setBrushWidth] = useState(2);
  const [isEraser, setIsEraser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const getCleanJson = useCallback((page: number) => {
    const canvas = fabricCanvases.current[page];
    if (!canvas) return null;

    const objects = canvas.getObjects().map((obj: any) => {
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

    return {
      version: "1.0",
      viewport: {
        width: canvas.getWidth(),
        height: canvas.height
      },
      objects
    };
  }, []);

  const saveToLocalStorage = useCallback(() => {
    const allAnnotations: Record<number, any> = {};
    Object.keys(fabricCanvases.current).forEach(pageNum => {
      const page = parseInt(pageNum);
      const data = getCleanJson(page);
      if (data && data.objects.length > 0) {
        allAnnotations[page] = data;
      }
    });

    const payload = {
      materialId,
      annotations: allAnnotations,
      lastPage: currentPage,
      timestamp: Date.now()
    };

    localStorage.setItem(`workbook_draft_${materialId}`, JSON.stringify(payload));
  }, [materialId, currentPage, getCleanJson]);

  const syncWithSupabase = useCallback(async () => {
    if (isSaving) return;
    
    // Calcular progresso
    const percentage = Math.round((currentPage / numPages) * 100);
    
    // Consolidar anotações
    const allAnnotations: Record<number, any> = {};
    Object.keys(fabricCanvases.current).forEach(pageNum => {
      const page = parseInt(pageNum);
      const data = getCleanJson(page);
      if (data && data.objects.length > 0) {
        allAnnotations[page] = data;
      }
    });

    const payload = {
      material_id: materialId,
      percentage_explored: percentage,
      drawing_data: { pages: allAnnotations },
      updated_at: new Date().toISOString()
    };

    try {
      // Upsert no Supabase
      const { error: syncError } = await supabase
        .from('material_annotations')
        .upsert(payload, { onConflict: 'user_id,material_id' });

      if (syncError) throw syncError;
      
      localStorage.removeItem(`workbook_draft_${materialId}`);
    } catch (e) {
      console.error("Erro na sincronização Bulk:", e);
    }
  }, [materialId, currentPage, numPages, getCleanJson, isSaving]);

  // Listener para fechamento da aba (Bulk Save Strategy)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Usamos keepalive: true para garantir que a requisição finalize após o fechamento
      const percentage = Math.round((currentPage / numPages) * 100);
      const allAnnotations: Record<number, any> = {};
      Object.keys(fabricCanvases.current).forEach(pageNum => {
        const page = parseInt(pageNum);
        const data = getCleanJson(page);
        if (data && data.objects.length > 0) {
          allAnnotations[page] = data;
        }
      });

      const body = JSON.stringify({
        material_id: materialId,
        percentage_explored: percentage,
        drawing_data: { pages: allAnnotations }
      });

      // Em Next.js/Supabase, chamamos o fetch com keepalive
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/material_annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Prefer': 'resolution=merge-duplicates'
        },
        body,
        keepalive: true
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [materialId, currentPage, numPages, getCleanJson]);

  useEffect(() => {
    async function initPdf() {
      if (!pdfUrl) return;
      setLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setTotalPages(pdf.numPages);

        // Carregar rascunho anterior ou dados do Supabase
        const draft = localStorage.getItem(`workbook_draft_${materialId}`);
        const savedData = draft ? JSON.parse(draft) : null;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = canvasRefs.current[i];
          if (!canvas) continue;

          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context!, viewport }).promise;

          // Injetar Watermark no background do canvas PDF antes de sobrepor Fabric
          context!.font = "bold 14px Inter";
          context!.fillStyle = "rgba(0, 0, 0, 0.05)";
          context!.save();
          context!.rotate(-Math.PI / 4);
          for(let x=-500; x<canvas.width; x+=200) {
            for(let y=-500; y<canvas.height; y+=150) {
              context!.fillText(`${userName} • ${userCpf}`, x, y);
            }
          }
          context!.restore();

          // Inicializar Fabric.js por cima
          const fCanvas = new fabric.Canvas(`fabric-canvas-${i}`, {
            height: viewport.height,
            width: viewport.width,
            isDrawingMode: true
          });

          fCanvas.freeDrawingBrush.color = brushColor;
          fCanvas.freeDrawingBrush.width = brushWidth;

          // Restaurar anotações
          if (savedData?.annotations?.[i]) {
            fCanvas.loadFromJSON(savedData.annotations[i], () => fCanvas.renderAll());
          }

          fCanvas.on('path:created', () => saveToLocalStorage());
          fabricCanvases.current[i] = fCanvas;
        }

        if (savedData?.lastPage) setCurrentPage(savedData.lastPage);

      } catch (err: any) {
        console.error("Erro PDF:", err);
        setError("Não foi possível carregar o documento. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    }

    initPdf();

    return () => {
      Object.values(fabricCanvases.current).forEach(c => c.dispose());
    };
  }, [pdfUrl, materialId, userName, userCpf]);

  const toggleTool = (eraser: boolean) => {
    setIsEraser(eraser);
    Object.values(fabricCanvases.current).forEach(c => {
      c.isDrawingMode = !eraser;
      if (!eraser) {
        c.freeDrawingBrush.color = brushColor;
        c.freeDrawingBrush.width = brushWidth;
      }
    });
  };

  const changeColor = (color: string) => {
    setBrushColor(color);
    setIsEraser(false);
    Object.values(fabricCanvases.current).forEach(c => {
      c.isDrawingMode = true;
      c.freeDrawingBrush.color = color;
    });
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4 bg-slate-900">
        <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white italic">Falha de Renderização</h2>
          <p className="text-sm text-slate-400 max-w-xs">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} className="bg-primary text-white font-black rounded-xl h-12 px-8">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-900">
      {/* BARRA DE FERRAMENTAS LATERAL */}
      <aside className="w-full md:w-20 bg-slate-950 border-b md:border-b-0 md:border-r border-white/5 p-4 flex flex-row md:flex-col items-center justify-between md:justify-center gap-6 z-20 overflow-x-auto">
        <div className="flex flex-row md:flex-col gap-4">
          <Button 
            variant={!isEraser ? "default" : "ghost"} 
            size="icon" 
            onClick={() => toggleTool(false)}
            className={`h-12 w-12 rounded-2xl transition-all shadow-xl ${!isEraser ? 'bg-primary text-white' : 'text-slate-400 hover:bg-white/10'}`}
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <Button 
            variant={isEraser ? "default" : "ghost"} 
            size="icon" 
            onClick={() => toggleTool(true)}
            className={`h-12 w-12 rounded-2xl transition-all shadow-xl ${isEraser ? 'bg-accent text-accent-foreground' : 'text-slate-400 hover:bg-white/10'}`}
          >
            <Eraser className="h-5 w-5" />
          </Button>
        </div>

        <div className="w-px h-8 md:w-8 md:h-px bg-white/10" />

        <div className="flex flex-row md:flex-col gap-3">
          {["#FF0000", "#0088FF", "#00FF00", "#FFFFFF"].map(color => (
            <button 
              key={color} 
              onClick={() => changeColor(color)}
              className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${brushColor === color ? 'border-white ring-4 ring-white/10' : 'border-transparent opacity-60'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="w-px h-8 md:w-8 md:h-px bg-white/10" />

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={syncWithSupabase} 
          disabled={isSaving}
          className="h-12 w-12 rounded-2xl text-slate-400 hover:bg-white/10"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudSync className="h-5 w-5" />}
        </Button>
      </aside>

      {/* ÁREA DO DOCUMENTO */}
      <div 
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 overflow-y-auto scrollbar-hide bg-slate-900 p-4 md:p-8 flex flex-col items-center gap-12 relative no-swipe"
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md z-10 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Sincronizando Páginas...</p>
          </div>
        )}

        {Array.from({ length: numPages }).map((_, i) => (
          <div 
            key={i + 1} 
            className="relative shadow-[0_30px_100px_rgba(0,0,0,0.5)] rounded-sm bg-white overflow-hidden transition-transform duration-500 hover:scale-[1.01]"
            onMouseEnter={() => setCurrentPage(i + 1)}
          >
            <canvas 
              ref={el => { if(el) canvasRefs.current[i + 1] = el; }} 
              className="block"
            />
            <div className="absolute inset-0 z-10">
              <canvas id={`fabric-canvas-${i + 1}`} />
            </div>
            {/* Overlay de Segurança Visual */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none opacity-20">
              <p className="text-[8px] font-black text-black uppercase tracking-widest">{userName} | ID {userCpf}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CONTROLES DE NAVEGAÇÃO FLUTUANTES */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-2xl px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-6 z-30">
        <p className="text-[10px] font-black text-white uppercase tracking-widest">
          PÁGINA <span className="text-accent italic text-sm">{currentPage}</span> / {numPages}
        </p>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentPage === 1}
            onClick={() => {
              const prevPage = Math.max(1, currentPage - 1);
              containerRef.current?.children[prevPage - 1]?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-8 w-8 rounded-lg text-white hover:bg-white/10"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentPage === numPages}
            onClick={() => {
              const nextPage = Math.min(numPages, currentPage + 1);
              containerRef.current?.children[nextPage - 1]?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-8 w-8 rounded-lg text-white hover:bg-white/10"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
