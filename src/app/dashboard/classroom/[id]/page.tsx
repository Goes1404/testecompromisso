
"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  FileText, 
  BookOpen, 
  PlayCircle, 
  BrainCircuit,
  Paperclip,
  Loader2,
  Video,
  Layout,
  Layers,
  ArrowRight,
  PlusCircle,
  Compass,
  PanelRightClose,
  PanelRightOpen,
  Target,
  Lightbulb,
  Zap,
  Award,
  Sparkles,
  ExternalLink,
  Maximize2,
  Minimize2,
  GripHorizontal,
  Plus,
  Minus,
  X
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import Script from "next/script";
import Link from "next/link";
import { InteractiveWorkbook } from "@/components/InteractiveWorkbook";
import { useIsMobile } from "@/hooks/use-mobile";

const DEMO_CONTENTS = [
  { id: 'demo-1', title: 'Fundamentos da Aprovação', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'Uma introdução essencial sobre como organizar seus estudos.' },
  { id: 'demo-2', title: 'Técnicas de Redação Nota 1000', type: 'video', url: 'https://www.youtube.com/watch?v=videoseries?list=PL3G1L-UIlpbj-X9ZPnCDX-vskRE_SkQuX', description: 'Aprenda a estruturar sua dissertação seguindo o padrão INEP.' }
];

export default function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trailId } = use(params);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [trail, setTrail] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, any[]>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showSimultaneousWorkbook, setShowSimultaneousWorkbook] = useState(false);
  
  // Estados do Mini-Player Flutuante
  const [miniPlayerPos, setMiniPlayerPos] = useState({ x: 20, y: 20 });
  const [miniPlayerWidth, setMiniPlayerWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const [videoProgress, setVideoProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolledLoading] = useState(false);
  
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);

  useEffect(() => {
    if (isMobile) {
      setMiniPlayerWidth(280);
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const loadTrailData = useCallback(async () => {
    if (!trailId || !user) return;
    try {
      setLoading(true);
      
      const { data: trailData, error: trailError } = await supabase.from('trails').select('*').eq('id', trailId).single();
      if (trailError || !trailData) {
        toast({ title: "Trilha não encontrada", variant: "destructive" });
        return;
      }
      setTrail(trailData);

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('trail_id', trailId)
        .maybeSingle();
      
      if (progressData) {
        setIsEnrolled(true);
        setVideoProgress(progressData.percentage || 0);
        setIsCompleted(progressData.percentage === 100);
      }

      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('trail_id', trailId)
        .order('order_index');
      
      if (!modulesData || modulesData.length === 0) {
        setIsDemoMode(true);
        setModules([{ id: 'demo-mod', title: 'Início Rápido' }]);
        setActiveModuleId('demo-mod');
        setContents({ 'demo-mod': DEMO_CONTENTS });
        setActiveContentId(DEMO_CONTENTS[0].id);
        setLoading(false);
        return;
      }

      setModules(modulesData);
      setActiveModuleId(modulesData[0].id);
      
      const moduleIds = modulesData.map(m => m.id);
      const { data: contentsData, error: contentsError } = await supabase
        .from('learning_contents')
        .select('*')
        .in('module_id', moduleIds)
        .order('order_index');
      
      if (contentsError) throw contentsError;

      const contentMap: Record<string, any[]> = {};
      contentsData?.forEach(c => {
        if (!contentMap[c.module_id]) contentMap[c.module_id] = [];
        contentMap[c.module_id].push(c);
      });

      if (!contentMap[modulesData[0].id] || contentMap[modulesData[0].id].length === 0) {
        contentMap[modulesData[0].id] = DEMO_CONTENTS;
        setIsDemoMode(true);
      }

      setContents(contentMap);
      if (contentMap[modulesData[0].id]?.length > 0) {
        setActiveContentId(contentMap[modulesData[0].id][0].id);
      }
    } catch (e: any) {
      console.error("Erro ao carregar aula:", e);
    } finally {
      setLoading(false);
    }
  }, [trailId, user, toast]);

  useEffect(() => {
    loadTrailData();
  }, [loadTrailData]);

  const handleEnroll = async () => {
    if (!user || !trailId || isEnrolling) return;
    setIsEnrolledLoading(true);
    try {
      const { error } = await supabase.from('user_progress').upsert({
        user_id: user.id,
        trail_id: trailId,
        percentage: videoProgress > 0 ? Math.round(videoProgress) : 0,
        last_accessed: new Date().toISOString()
      }, { onConflict: 'user_id,trail_id' });

      if (!error) {
        setIsEnrolled(true);
        toast({ title: "Trilha Fixada!" });
      }
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsEnrolledLoading(false);
    }
  };

  const updateServerProgress = useCallback(async (percentage: number) => {
    const completed = percentage >= 85;
    if (completed && !isCompleted && user && trailId && !isDemoMode) {
      setIsCompleted(true);
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        trail_id: trailId,
        percentage: Math.round(percentage),
        last_accessed: new Date().toISOString()
      }, { onConflict: 'user_id,trail_id' });
      toast({ title: "Progresso Registrado! ✅" });
    }
  }, [isCompleted, toast, user, trailId, isDemoMode]);

  const onPlayerStateChange = useCallback((event: any) => {
    if (event.data === 1) { // PLAYING
      progressInterval.current = setInterval(() => {
        try {
          if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
            const currentTime = playerRef.current.getCurrentTime();
            const duration = playerRef.current.getDuration();
            if (duration > 0) {
              const percent = (currentTime / duration) * 100;
              setVideoProgress(percent);
              updateServerProgress(percent);
            }
          }
        } catch (e) {
          console.warn("Erro tracking player", e);
        }
      }, 5000); 
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
  }, [updateServerProgress]);

  const initPlayer = useCallback(() => {
    const activeContent = contents[activeModuleId || ""]?.find(c => c.id === activeContentId);
    if (activeContent?.type === 'video' && isApiReady) {
      try {
        if (playerRef.current) playerRef.current.destroy();
        
        const vidUrl = activeContent.url || '';
        let vidId = '';
        if (vidUrl.includes('v=')) vidId = vidUrl.split('v=')[1].split('&')[0];
        else if (vidUrl.includes('youtu.be/')) vidId = vidUrl.split('youtu.be/')[1].split('?')[0];
        else if (vidUrl.includes('/embed/')) vidId = vidUrl.split('/embed/')[1].split('?')[0];
        else vidId = vidUrl;

        if (vidId && (window as any).YT) {
          playerRef.current = new (window as any).YT.Player('youtube-player', {
            videoId: vidId,
            playerVars: { 'autoplay': 0, 'modestbranding': 1, 'rel': 0, 'showinfo': 0 },
            events: { 'onStateChange': onPlayerStateChange }
          });
        }
      } catch (e) {
        console.error("Erro init player", e);
      }
    } else if (activeContent && activeContent.type !== 'video') {
      setVideoProgress(100);
    }
  }, [activeContentId, activeModuleId, contents, isApiReady, onPlayerStateChange]);

  useEffect(() => {
    initPlayer();
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [initPlayer]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    initialPos.current = { x: miniPlayerPos.x, y: miniPlayerPos.y };
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = dragStartPos.current.x - clientX;
    const deltaY = dragStartPos.current.y - clientY;
    
    setMiniPlayerPos({
      x: initialPos.current.x + deltaX,
      y: initialPos.current.y + deltaY
    });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const activeContent = contents[activeModuleId || ""]?.find(c => c.id === activeContentId);

  return (
    <div className="flex flex-col bg-slate-50 animate-in fade-in duration-500 min-h-screen overflow-hidden">
      <Script 
        src="https://www.youtube.com/iframe_api" 
        strategy="afterInteractive"
        onLoad={() => {
          (window as any).onYouTubeIframeAPIReady = () => setIsApiReady(true);
          if ((window as any).YT) setIsApiReady(true);
        }}
      />
      
      {/* CABEÇALHO CLASSE */}
      <header className="sticky top-0 bg-primary text-white px-4 h-16 flex items-center justify-between shrink-0 z-[60] shadow-xl border-b border-white/5">
        <div className="flex items-center gap-4 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10 h-10 w-10 shrink-0 text-white">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="h-3 w-3 text-accent" />
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{trail?.category || 'Demonstração'}</p>
            </div>
            <h1 className="text-sm md:text-lg font-black italic truncate max-w-[150px] md:max-w-xl">{trail?.title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden sm:flex flex-col items-end gap-1.5 w-32 md:w-48">
            <div className="flex justify-between w-full text-[9px] font-black uppercase text-white/40 tracking-widest">
              <span>EVOLUÇÃO</span>
              <span className="text-accent">{Math.round(videoProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-accent transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${videoProgress}%` }} />
            </div>
          </div>
          
          <Button variant="ghost" size="icon" className="rounded-xl text-white h-10 w-10 hover:bg-white/10" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelRightClose className="h-6 w-6" /> : <PanelRightOpen className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row items-start relative h-[calc(100vh-64px)] overflow-hidden">
        
        {/* ÁREA DE CONTEÚDO - ALTURA CONTROLADA PARA EVITAR SCROLL DA PÁGINA */}
        <main className={`flex-1 flex flex-col bg-white min-w-0 transition-all duration-500 h-full overflow-hidden`}>
          
          {/* PLAYER DE VÍDEO - MODO DINÂMICO */}
          <div 
            className={`transition-all duration-300 ease-in-out ${
              showSimultaneousWorkbook 
                ? 'fixed z-[70] shadow-[0_30px_80px_rgba(0,0,0,0.6)] rounded-[2rem] border-4 border-white overflow-hidden bg-black'
                : 'aspect-video bg-black relative shadow-2xl overflow-hidden shrink-0 ring-1 ring-white/10'
            }`}
            style={showSimultaneousWorkbook ? {
              bottom: `${miniPlayerPos.y}px`,
              right: `${miniPlayerPos.x}px`,
              width: `${miniPlayerWidth}px`,
              maxWidth: '90vw',
              aspectRatio: '16/9'
            } : {}}
          >
            {/* BARRA DE CONTROLE FLUTUANTE */}
            {showSimultaneousWorkbook && (
              <div 
                className="h-10 bg-slate-900 flex items-center justify-between px-4 cursor-move select-none z-20 absolute top-0 left-0 right-0 group"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                <div className="flex items-center gap-3">
                  <GripHorizontal className="h-4 w-4 text-white/40 group-hover:text-accent transition-colors" />
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Console</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setMiniPlayerWidth(prev => Math.min(prev + (isMobile ? 20 : 50), 800)); }} className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/60"><Plus className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setMiniPlayerWidth(prev => Math.max(prev - (isMobile ? 20 : 50), 150)); }} className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/60"><Minus className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setShowSimultaneousWorkbook(false); }} className="h-6 w-6 rounded-md hover:bg-red-600 flex items-center justify-center text-white"><Minimize2 className="h-3 w-3" /></button>
                </div>
              </div>
            )}

            {isDragging && <div className="absolute inset-0 z-30 bg-transparent" />}

            <div className={`w-full h-full ${showSimultaneousWorkbook ? 'mt-10' : ''}`} style={showSimultaneousWorkbook ? { height: 'calc(100% - 40px)' } : {}}>
              {activeContent?.type === 'video' ? (
                <div id="youtube-player" className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center gap-4">
                  <Layout className="h-10 w-10 text-accent opacity-20" />
                  <h3 className="text-lg font-black italic uppercase">{activeContent?.title || "Selecione"}</h3>
                </div>
              )}
            </div>
          </div>

          {/* MODO APOSTILA INTERATIVA */}
          {showSimultaneousWorkbook && activeContent?.workbook_id ? (
            <div className="flex-1 flex flex-col h-full animate-in slide-in-from-bottom-8 duration-700 relative z-10 overflow-hidden">
              <InteractiveWorkbook 
                materialId={activeContent.workbook_id}
                pdfUrl=""
                userName={profile?.name || "Estudante"}
                userCpf={profile?.id?.substring(0, 8) || "ID"}
              />
              {!isMobile && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[50] animate-in fade-in zoom-in-95 delay-500">
                  <Badge className="bg-primary text-white border-none font-black text-[10px] px-6 py-2 uppercase tracking-widest shadow-2xl flex items-center gap-3 rounded-full">
                    <Sparkles className="h-4 w-4 text-accent animate-pulse" /> ESTUDO SIMULTÂNEO ATIVO
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            /* CONSOLE DE ESTUDOS PADRÃO - COM ROLAGEM INTERNA */
            <Tabs defaultValue="summary" className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-900 p-0 gap-0 shadow-2xl border-b border-white/5 shrink-0">
                {[
                  { id: "summary", label: "Roteiro", icon: BookOpen },
                  { id: "quiz", label: "Prática", icon: BrainCircuit },
                  { id: "attachments", label: "Anexos", icon: Paperclip }
                ].map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="data-[state=active]:bg-white data-[state=active]:text-primary h-full rounded-none font-black text-[10px] uppercase tracking-[0.2em] gap-2 text-white/30 border-none transition-all"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-10">
                <TabsContent value="summary" className="mt-0 outline-none animate-in fade-in">
                    <div className="max-w-5xl mx-auto space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                          <div className="space-y-3">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center gap-2">
                              <Target className="h-4 w-4" /> Plano de Aula
                            </h2>
                            <h3 className="text-2xl md:text-4xl font-black text-primary italic leading-tight">{activeContent?.title}</h3>
                            <p className="text-sm md:text-lg font-medium text-primary/70 leading-relaxed italic border-l-4 border-accent pl-6 bg-white py-4 rounded-r-2xl shadow-sm">
                              {activeContent?.description || "Acompanhe este material técnico focado na sua aprovação."}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <Card className="p-8 border-none shadow-2xl bg-primary text-white rounded-[2.5rem] relative overflow-hidden">
                            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
                            <div className="relative z-10 space-y-4">
                              <div className="flex items-center gap-3">
                                <Lightbulb className="h-5 w-5 text-accent animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">IA Insight</span>
                              </div>
                              <p className="text-sm font-medium italic opacity-90 leading-relaxed">
                                "Praticar imediatamente após o conteúdo teórico fixa até 3x mais o conhecimento."
                              </p>
                            </div>
                          </Card>
                        </div>
                      </div>
                    </div>
                </TabsContent>

                <TabsContent value="quiz" className="mt-0 outline-none">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {activeContent?.workbook_id && (
                          <Card className="p-8 md:p-12 border-none shadow-2xl bg-white rounded-[3rem] group hover:shadow-primary/10 transition-all overflow-hidden relative">
                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                              <div className="h-20 w-20 rounded-[2rem] bg-accent/10 flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                                <BookOpen className="h-10 w-10 text-accent" />
                              </div>
                              <div className="flex-1 text-center md:text-left space-y-2">
                                <Badge className="bg-accent text-accent-foreground border-none font-black text-[8px] px-3 h-5 uppercase tracking-widest">Pedagógico</Badge>
                                <h3 className="text-2xl font-black text-primary italic leading-none">Apostila de Apoio</h3>
                                <p className="text-sm font-medium italic text-muted-foreground">Material específico para este capítulo. Estude simultaneamente com o vídeo!</p>
                              </div>
                              <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                                <Button onClick={() => setShowSimultaneousWorkbook(true)} className="bg-primary text-white h-14 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all gap-2">
                                  <Maximize2 className="h-4 w-4 text-accent" /> ESTUDO SIMULTÂNEO
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-8 rounded-2xl font-black text-[10px] uppercase border-2">
                                  <Link href={`/dashboard/library/book/${activeContent.workbook_id}`}>FOCO TOTAL</Link>
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )}
                        {!activeContent?.workbook_id && (
                          <div className="text-center py-20 opacity-30 border-4 border-dashed rounded-[3rem] flex flex-col items-center gap-4">
                            <BrainCircuit className="h-12 w-12" />
                            <p className="text-[10px] font-black uppercase italic tracking-[0.4em]">Sem atividades extras</p>
                          </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="attachments" className="mt-0 outline-none">
                    <div className="max-w-4xl mx-auto py-10 text-center opacity-20">
                      <Paperclip className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase italic tracking-[0.4em]">Sem anexos</p>
                    </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </main>

        {/* EMENTA LATERAL */}
        {sidebarOpen && (
          <aside className="lg:w-[350px] w-full border-l bg-white sticky top-16 self-start h-[calc(100vh-64px)] overflow-y-auto shrink-0 transition-all duration-500 shadow-2xl z-40">
            <div className="p-6 bg-slate-50 border-b">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 mb-6">Jornada Acadêmica</h2>
              <div className="space-y-2">
                {modules.map((module, idx) => (
                  <button 
                    key={module.id}
                    onClick={() => { setActiveModuleId(module.id); if (contents[module.id]?.length > 0) setActiveContentId(contents[module.id][0].id); setShowSimultaneousWorkbook(false); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border-2 flex items-center gap-4 relative overflow-hidden ${
                      activeModuleId === module.id ? 'bg-primary text-white border-primary shadow-xl translate-x-2' : 'bg-white border-transparent hover:border-accent/30'
                    }`}>
                    <span className={`text-sm font-black italic ${activeModuleId === module.id ? 'text-accent' : 'text-primary/20'}`}>{(idx + 1).toString().padStart(2, '0')}</span>
                    <p className="font-black text-[10px] uppercase tracking-wide truncate flex-1">{module.title}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4">
               <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-2">Materiais</h3>
               <div className="space-y-2 pb-10">
                 {contents[activeModuleId || ""]?.map((content) => (
                    <button 
                      key={content.id}
                      onClick={() => { setActiveContentId(content.id); setShowSimultaneousWorkbook(false); }}
                      className={`w-full text-left p-4 rounded-[1.5rem] transition-all flex items-center gap-4 border-2 ${
                        activeContentId === content.id ? 'bg-accent/10 border-accent/40 shadow-xl' : 'bg-slate-50 border-transparent hover:bg-white'
                      }`}>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${activeContentId === content.id ? 'bg-accent text-white shadow-lg' : 'bg-slate-200 text-primary/30'}`}>
                           {content.type === 'video' ? <PlayCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-black text-[10px] uppercase tracking-wide truncate ${activeContentId === content.id ? 'text-primary' : 'text-primary/60'}`}>{content.title}</p>
                          <Badge variant="outline" className="text-[7px] font-black h-4 px-1.5 border-muted/30 uppercase mt-1 opacity-60">{content.type}</Badge>
                        </div>
                    </button>
                 ))}
               </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
