
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
  Compass,
  PanelRightClose,
  PanelRightOpen,
  Target,
  Lightbulb,
  Zap,
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
  const [showSimultaneousWorkbook, setShowSimultaneousWorkbook] = useState(false);
  
  const [miniPlayerPos, setMiniPlayerPos] = useState({ x: 20, y: 20 });
  const [miniPlayerWidth, setMiniPlayerWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const [videoProgress, setVideoProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  
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
        router.push("/dashboard/trails");
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
        setVideoProgress(progressData.percentage || 0);
        setIsCompleted(progressData.percentage === 100);
      }

      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('trail_id', trailId)
        .order('order_index');
      
      if (!modulesData || modulesData.length === 0) {
        setModules([]);
        setLoading(false);
        return;
      }

      setModules(modulesData);
      setActiveModuleId(modulesData[0].id);
      
      const moduleIds = modulesData.map(m => m.id);
      const { data: contentsData } = await supabase
        .from('learning_contents')
        .select('*')
        .in('module_id', moduleIds)
        .order('order_index');
      
      const contentMap: Record<string, any[]> = {};
      contentsData?.forEach(c => {
        if (!contentMap[c.module_id]) contentMap[c.module_id] = [];
        contentMap[c.module_id].push(c);
      });

      setContents(contentMap);
      if (contentMap[modulesData[0].id]?.length > 0) {
        setActiveContentId(contentMap[modulesData[0].id][0].id);
      }
    } catch (e: any) {
      console.error("Erro ao carregar aula:", e);
    } finally {
      setLoading(false);
    }
  }, [trailId, user, toast, router]);

  useEffect(() => {
    loadTrailData();
  }, [loadTrailData]);

  const updateServerProgress = useCallback(async (percentage: number) => {
    const completed = percentage >= 85;
    if (completed && !isCompleted && user && trailId) {
      setIsCompleted(true);
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        trail_id: trailId,
        percentage: Math.round(percentage),
        last_accessed: new Date().toISOString()
      }, { onConflict: 'user_id,trail_id' });
      toast({ title: "Aula Concluída! ✅" });
    }
  }, [isCompleted, toast, user, trailId]);

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

        if (vidId && (window as any).YT && typeof (window as any).YT.Player === 'function') {
          playerRef.current = new (window as any).YT.Player('youtube-player', {
            videoId: vidId,
            playerVars: { 'autoplay': 1, 'modestbranding': 1, 'rel': 0, 'showinfo': 0 },
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

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 bg-primary text-white">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse italic">Sincronizando Estúdio...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-slate-50 animate-in fade-in duration-500 min-h-screen ${showSimultaneousWorkbook ? 'overflow-hidden' : ''}`}>
      <Script 
        src="https://www.youtube.com/iframe_api" 
        strategy="afterInteractive"
        onLoad={() => {
          (window as any).onYouTubeIframeAPIReady = () => setIsApiReady(true);
          if ((window as any).YT && typeof (window as any).YT.Player === 'function') setIsApiReady(true);
        }}
      />
      
      <header className="sticky top-0 bg-primary text-white px-4 h-16 flex items-center justify-between shrink-0 z-[60] shadow-xl border-b border-white/5">
        <div className="flex items-center gap-4 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10 h-10 w-10 shrink-0 text-white">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="h-3 w-3 text-accent" />
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{trail?.category}</p>
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

      <div className={`flex flex-col lg:flex-row items-start relative ${showSimultaneousWorkbook ? 'h-[calc(100vh-64px)] overflow-hidden' : 'min-h-[calc(100vh-64px)]'}`}>
        <main className={`flex-1 flex flex-col bg-white min-w-0 transition-all duration-500 ${showSimultaneousWorkbook ? 'h-full overflow-hidden' : ''}`}>
          {modules.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-6 opacity-40">
              <Layout className="h-20 w-24 text-primary" />
              <div>
                <h2 className="text-3xl font-black italic text-primary uppercase">Estúdio em Preparação</h2>
                <p className="text-sm font-medium italic mt-2">Este mentor ainda está organizando os materiais desta trilha.</p>
              </div>
            </div>
          ) : (
            <>
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
                      <button onClick={(e) => { e.stopPropagation(); setMiniPlayerWidth(prev => Math.min(prev + 50, 800)); }} className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/60"><Plus className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setMiniPlayerWidth(prev => Math.max(prev - 50, 150)); }} className="h-6 w-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/60"><Minus className="h-3 w-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setShowSimultaneousWorkbook(false); }} className="h-6 w-6 rounded-md hover:bg-red-600 flex items-center justify-center text-white"><Minimize2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                )}

                <div className={`w-full h-full ${showSimultaneousWorkbook ? 'mt-10' : ''}`} style={showSimultaneousWorkbook ? { height: 'calc(100% - 40px)' } : {}}>
                  {activeContent?.type === 'video' ? (
                    <div key={activeContentId} id="youtube-player" className="w-full h-full bg-slate-950" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center gap-4">
                      <Layout className="h-8 w-8 text-accent opacity-20" />
                      <h3 className="text-base font-bold italic uppercase">{activeContent?.title || "Selecione um material ao lado"}</h3>
                    </div>
                  )}
                </div>
              </div>

              {showSimultaneousWorkbook && activeContent?.workbook_id ? (
                <div className="flex-1 flex flex-col h-full animate-in slide-in-from-bottom-8 duration-700 relative z-10 overflow-hidden">
                  <InteractiveWorkbook materialId={activeContent.workbook_id} userName={profile?.name || "Estudante"} userCpf={profile?.id?.substring(0, 8) || "ID"} />
                </div>
              ) : (
                <Tabs defaultValue="summary" className={`flex flex-col flex-1 ${showSimultaneousWorkbook ? 'overflow-hidden' : ''}`}>
                  <TabsList className="grid w-full grid-cols-3 h-12 bg-white p-0 gap-0 shadow-sm border-b border-muted/20 shrink-0">
                    {[
                      { id: "summary", label: "Roteiro", icon: BookOpen },
                      { id: "quiz", label: "Apoio", icon: BrainCircuit },
                      { id: "attachments", label: "Anexos", icon: Paperclip }
                    ].map((tab) => (
                      <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-slate-50/80 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary h-full rounded-none font-bold text-[10px] uppercase tracking-widest gap-2 text-muted-foreground border-none transition-all">
                        <tab.icon className="h-4 w-4" />
                        <span className="hidden md:inline">{tab.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <div className={`flex-1 bg-slate-50 p-6 md:p-10 ${showSimultaneousWorkbook ? 'overflow-y-auto' : ''}`}>
                    <TabsContent value="summary" className="mt-0 outline-none animate-in fade-in">
                        <div className="max-w-4xl mx-auto space-y-8">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-4">
                              <div className="space-y-2">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-primary/40 flex items-center gap-2"><Target className="h-3 w-3" /> Unidade Atual</h2>
                                <h3 className="text-xl md:text-3xl font-black text-primary italic leading-tight">{activeContent?.title}</h3>
                                <p className="text-sm md:text-base font-medium text-primary/70 leading-relaxed italic border-l-[3px] border-accent pl-5 bg-white py-3 pr-4 rounded-r-xl shadow-sm">
                                  {activeContent?.description || "Acompanhe este material técnico focado na sua aprovação."}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-6">
                              <Card className="p-6 border-none shadow-xl bg-primary text-white rounded-3xl relative overflow-hidden">
                                <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-accent/20 rounded-full blur-xl" />
                                <div className="relative z-10 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-accent animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">IA Insight</span>
                                  </div>
                                  <p className="text-xs font-medium italic opacity-90 leading-relaxed">
                                    "A revisão imediata fixa até 3x mais o conhecimento. Utilize as apostilas vinculadas."
                                  </p>
                                </div>
                              </Card>
                            </div>
                          </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="quiz" className="mt-0 outline-none">
                        <div className="max-w-3xl mx-auto space-y-6">
                            {activeContent?.workbook_id ? (
                              <Card className="p-6 md:p-8 border border-muted/20 shadow-lg bg-white rounded-3xl group hover:shadow-primary/5 transition-all overflow-hidden relative">
                                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                                  <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                                    <BookOpen className="h-8 w-8 text-accent" />
                                  </div>
                                  <div className="flex-1 text-center md:text-left space-y-1">
                                    <Badge className="bg-accent/10 text-accent border-none font-bold text-[8px] px-2 h-4 uppercase tracking-widest">Pedagógico</Badge>
                                    <h3 className="text-xl font-black text-primary italic leading-none">Apostila Interativa</h3>
                                    <p className="text-xs font-medium italic text-muted-foreground mt-1">Estude simultaneamente com o vídeo usando o modo split-screen.</p>
                                  </div>
                                  <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                                    <Button onClick={() => setShowSimultaneousWorkbook(true)} className="bg-primary text-white h-12 rounded-xl font-bold text-[10px] uppercase shadow-md hover:scale-105 transition-all gap-2 px-6">
                                      <Maximize2 className="h-4 w-4 text-accent" /> ESTUDO SIMULTÂNEO
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ) : (
                              <div className="text-center py-16 opacity-30 border-2 border-dashed rounded-3xl flex flex-col items-center gap-3">
                                <BrainCircuit className="h-8 w-8" />
                                <p className="text-[10px] font-bold uppercase italic tracking-[0.2em]">Sem atividades vinculadas</p>
                              </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="attachments" className="mt-0 outline-none">
                        <div className="max-w-3xl mx-auto py-10 text-center opacity-20">
                          <Paperclip className="h-8 w-8 mx-auto mb-3" />
                          <p className="text-[10px] font-bold uppercase italic tracking-[0.2em]">Nenhum anexo adicional</p>
                        </div>
                    </TabsContent>
                  </div>
                </Tabs>
              )}
            </>
          )}
        </main>

        {sidebarOpen && (
          <aside className="lg:w-[350px] w-full border-l border-muted/20 bg-slate-50/50 sticky top-16 self-start h-[calc(100vh-64px)] overflow-y-auto shrink-0 transition-all duration-500 z-40">
            <div className="p-5 bg-white border-b border-muted/20">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-4">Jornada Maestro</h2>
              <div className="space-y-1.5">
                {modules.map((module, idx) => (
                  <button 
                    key={module.id}
                    onClick={() => { setActiveModuleId(module.id); if (contents[module.id]?.length > 0) setActiveContentId(contents[module.id][0].id); setShowSimultaneousWorkbook(false); }}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-center gap-3 relative overflow-hidden ${
                      activeModuleId === module.id ? 'bg-white text-primary border-primary/20 shadow-sm translate-x-1' : 'bg-transparent border-transparent hover:bg-white'
                    }`}>
                    <span className={`text-xs font-black italic ${activeModuleId === module.id ? 'text-accent' : 'text-primary/20'}`}>{(idx + 1).toString().padStart(2, '0')}</span>
                    <p className="font-bold text-[10px] uppercase tracking-wider truncate flex-1">{module.title}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-3">
               <h3 className="text-[9px] font-bold text-primary/40 uppercase tracking-widest px-2">Materiais</h3>
               <div className="space-y-1.5 pb-10">
                 {contents[activeModuleId || ""]?.map((content) => (
                    <button 
                      key={content.id}
                      onClick={() => { setActiveContentId(content.id); setShowSimultaneousWorkbook(false); }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 border ${
                        activeContentId === content.id ? 'bg-white border-primary/10 shadow-sm' : 'bg-transparent border-transparent hover:bg-white'
                      }`}>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${activeContentId === content.id ? 'bg-primary/5 text-primary' : 'bg-slate-200/50 text-primary/30'}`}>
                           {content.type === 'video' ? <PlayCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold text-[10px] tracking-wide truncate ${activeContentId === content.id ? 'text-primary' : 'text-primary/60'}`}>{content.title}</p>
                          <Badge variant="outline" className="text-[7px] font-bold h-4 px-1 border-muted/30 uppercase mt-0.5 opacity-60 bg-white">{content.type}</Badge>
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
