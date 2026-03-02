
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
  CheckCircle2,
  HelpCircle,
  Layout,
  Layers,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Compass,
  PanelRightClose,
  PanelRightOpen
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

export default function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trailId } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [trail, setTrail] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, any[]>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [videoProgress, setVideoProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolledLoading] = useState(false);
  
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);

  const loadTrailData = useCallback(async () => {
    if (!trailId || !user) return;
    try {
      setLoading(true);
      
      const { data: trailData } = await supabase.from('trails').select('*').eq('id', trailId).single();
      if (!trailData) {
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
        toast({ title: "Fixado no Dashboard!", description: "Acompanhe seu progresso pela página inicial." });
      } else {
        throw error;
      }
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsEnrolledLoading(false);
    }
  };

  const updateServerProgress = useCallback(async (percentage: number) => {
    const completed = percentage >= 80;
    if (completed && !isCompleted && user && trailId) {
      setIsCompleted(true);
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        trail_id: trailId,
        percentage: Math.round(percentage),
        last_accessed: new Date().toISOString()
      }, { onConflict: 'user_id,trail_id' });
      toast({ title: "Progresso Registrado! ✅" });
    }
  }, [isCompleted, toast, user, trailId]);

  const onPlayerStateChange = useCallback((event: any) => {
    if (event.data === 1) { 
      progressInterval.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          if (duration > 0) {
            const percent = (currentTime / duration) * 100;
            setVideoProgress(percent);
            updateServerProgress(percent);
          }
        }
      }, 5000); 
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
  }, [updateServerProgress]);

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      (window as any).onYouTubeIframeAPIReady = () => setIsApiReady(true);
    } else if (typeof window !== "undefined" && (window as any).YT) {
      setIsApiReady(true);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (playerRef.current) playerRef.current.destroy();
    };
  }, []);

  const activeContent = contents[activeModuleId || ""]?.find(c => c.id === activeContentId);

  useEffect(() => {
    if (activeContent?.type === 'video' && isApiReady) {
      if (playerRef.current) playerRef.current.destroy();
      
      const vidUrl = activeContent.url || '';
      let vidId = '';
      if (vidUrl.includes('v=')) vidId = vidUrl.split('v=')[1].split('&')[0];
      else if (vidUrl.includes('youtu.be/')) vidId = vidUrl.split('youtu.be/')[1].split('?')[0];
      else vidId = vidUrl;

      if (vidId) {
        playerRef.current = new (window as any).YT.Player('youtube-player', {
          videoId: vidId,
          playerVars: { 'autoplay': 0, 'modestbranding': 1, 'rel': 0, 'showinfo': 0 },
          events: { 'onStateChange': onPlayerStateChange }
        });
      }
    } else if (activeContent && activeContent.type !== 'video') {
      setVideoProgress(100);
    }
  }, [activeContentId, activeContent, isApiReady, onPlayerStateChange]);

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center gap-6 bg-slate-900">
      <Loader2 className="animate-spin h-12 w-12 text-accent" />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white animate-pulse">Sintonizando Estúdio</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 animate-in fade-in duration-500 overflow-hidden">
      
      <header className="bg-primary text-white px-4 h-14 flex items-center justify-between shrink-0 z-20 shadow-xl border-b border-white/5">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10 h-8 w-8 shrink-0 text-white">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Compass className="h-2.5 w-2.5 text-accent" />
              <p className="text-[7px] font-black uppercase tracking-widest text-white/40">{trail?.category}</p>
            </div>
            <h1 className="text-xs font-black italic leading-none truncate max-w-[120px] md:max-w-[200px]">{trail?.title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex flex-col items-end gap-1 w-32">
            <div className="flex justify-between w-full text-[7px] font-black uppercase text-white/40">
              <span>Evolução</span>
              <span className="text-accent">{Math.round(videoProgress)}%</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${videoProgress}%` }} />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEnrolled && (
              <Button onClick={handleEnroll} disabled={isEnrolling} className="hidden md:flex bg-accent text-accent-foreground font-black text-[8px] uppercase h-8 px-4 rounded-lg shadow-lg border-none">
                {isEnrolling ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <PlusCircle className="h-3 w-3 mr-1.5" />}
                Fixar
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-lg text-white h-8 w-8 hover:bg-white/10" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        <main className="flex-1 flex flex-col bg-white overflow-hidden relative min-w-0">
          <div className="w-full aspect-video md:aspect-[21/9] bg-black relative group shadow-2xl shrink-0">
            {activeContent?.type === 'video' ? (
              <div id="youtube-player" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-primary text-white p-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center mb-4 relative">
                  <Layout className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-sm md:text-lg font-black italic uppercase tracking-tight max-w-lg">{activeContent?.title || "Selecione um Material"}</h3>
                <p className="text-[8px] text-white/40 mt-2 italic font-medium">Use o console abaixo para interagir.</p>
              </div>
            )}
          </div>

          <Tabs defaultValue="summary" className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
            <TabsList className="grid w-full grid-cols-4 h-12 bg-slate-950 p-0 gap-0 shrink-0 shadow-2xl">
              {[
                { id: "summary", label: "Guia", icon: BookOpen },
                { id: "quiz", label: "Prática", icon: BrainCircuit },
                { id: "support", label: "Live", icon: Video },
                { id: "attachments", label: "Anexos", icon: Paperclip }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="data-[state=active]:bg-white data-[state=active]:text-primary h-full rounded-none font-black text-[8px] uppercase tracking-[0.1em] transition-all gap-2 border-none text-white/40 hover:text-white/80"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
               <TabsContent value="summary" className="mt-0 outline-none animate-in slide-in-from-bottom-2">
                  <div className="max-w-4xl space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg rotate-2">
                        <Sparkles className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-primary italic leading-none">Diretrizes da Mentoria</h2>
                        <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mt-1">Instruções Técnicas</p>
                      </div>
                    </div>
                    
                    <Card className="border-none shadow-xl bg-white p-6 rounded-2xl border-l-4 border-accent relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3 text-accent">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Recomendações Aurora</span>
                        </div>
                        <p className="text-xs leading-relaxed text-primary/80 font-medium italic whitespace-pre-line">
                          {activeContent?.description || "Este conteúdo foi estrategicamente curado para fortalecer sua base de conhecimento. Foque nos conceitos fundamentais e anote dúvidas críticas."}
                        </p>
                      </div>
                    </Card>
                  </div>
               </TabsContent>

               <TabsContent value="quiz" className="mt-0 outline-none animate-in slide-in-from-bottom-2">
                  <div className="max-w-4xl space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
                        <BrainCircuit className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-primary italic leading-none">Atividade de Fixação</h2>
                        <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mt-1">Consolidação</p>
                      </div>
                    </div>
                    
                    {activeContent?.url?.includes('quiz') || activeContent?.url?.includes('form') ? (
                      <Card className="p-10 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-center space-y-4 shadow-md">
                         <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Layers className="h-6 w-6 text-accent" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-sm font-black text-primary italic">Ambiente de Simulado Externo</p>
                            <p className="text-[9px] text-muted-foreground font-medium italic">Avaliação vinculada em plataforma externa segura.</p>
                         </div>
                         <Button asChild className="bg-primary text-white h-10 rounded-xl font-black px-8 shadow-xl hover:scale-105 transition-all text-[10px] border-none">
                           <a href={activeContent?.url} target="_blank" rel="noopener noreferrer">
                             ABRIR LABORATÓRIO 
                             <ArrowRight className="ml-2 h-3.5 w-3.5 text-accent" />
                           </a>
                         </Button>
                      </Card>
                    ) : (
                      <div className="text-center py-10 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200 opacity-40">
                        <HelpCircle className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                        <p className="text-[8px] font-black uppercase tracking-widest italic text-primary/40">Nenhum quiz vinculado</p>
                      </div>
                    )}
                  </div>
               </TabsContent>

               <TabsContent value="attachments" className="mt-0 outline-none animate-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeContent?.type === 'pdf' || activeContent?.url?.includes('.pdf') ? (
                      <Card className="p-3 border-none shadow-lg bg-white rounded-xl flex items-center gap-3 group hover:bg-primary transition-all duration-500 cursor-pointer overflow-hidden relative">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-white/10 group-hover:text-white shadow-inner transition-all">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[7px] text-accent group-hover:text-white/60 uppercase tracking-widest mb-0.5">Apoio</p>
                          <p className="text-[10px] font-black text-primary group-hover:text-white italic leading-tight truncate">Material Técnico.pdf</p>
                        </div>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary group-hover:text-white hover:bg-white/20 shrink-0 border-none">
                          <a href={activeContent?.url} target="_blank" rel="noopener noreferrer"><Paperclip className="h-3.5 w-3.5" /></a>
                        </Button>
                      </Card>
                    ) : (
                      <div className="col-span-full py-10 text-center opacity-20 border-2 border-dashed rounded-2xl">
                        <p className="text-[10px] font-black italic">Sem anexos para este material.</p>
                      </div>
                    )}
                  </div>
               </TabsContent>
            </div>
          </Tabs>
        </main>

        <aside className={`
          absolute inset-y-0 right-0 w-full sm:w-64 lg:w-72 bg-white border-l z-30 transition-transform duration-300 ease-in-out transform
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:relative flex flex-col shadow-2xl lg:shadow-none shrink-0
        `}>
          <div className="p-4 bg-slate-50 border-b shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/40">Ementa da Jornada</h2>
              <Badge className="bg-primary/5 text-primary text-[7px] font-black border-none px-1.5">{modules.length} Caps</Badge>
            </div>
            
            <div className="space-y-1 max-h-[35vh] overflow-y-auto pr-1 scrollbar-hide">
              {modules.map((module, idx) => (
                <button 
                  key={module.id}
                  onClick={() => {
                    setActiveModuleId(module.id);
                    if (contents[module.id]?.length > 0) setActiveContentId(contents[module.id][0].id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all border relative overflow-hidden group ${
                    activeModuleId === module.id 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-white border-transparent hover:bg-slate-100 text-primary/60'
                  }`}>
                  <div className="flex items-center gap-2.5 relative z-10">
                    <span className={`text-xs font-black italic ${activeModuleId === module.id ? 'text-accent' : 'text-primary/20'}`}>
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <p className="font-black text-[8px] uppercase tracking-wider truncate flex-1">{module.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
             <div className="flex items-center gap-1.5 mb-2">
                <Layers className="h-2.5 w-2.5 text-accent" />
                <h3 className="text-[8px] font-black text-primary uppercase tracking-[0.1em]">Materiais da Unidade</h3>
             </div>
             
             <div className="space-y-1.5">
               {contents[activeModuleId || ""]?.map((content) => (
                  <button 
                    key={content.id}
                    onClick={() => {
                      setActiveContentId(content.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-2.5 border ${
                      activeContentId === content.id 
                        ? 'bg-accent/5 border-accent/30 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-accent/20 hover:bg-slate-50'
                    }`}>
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                        activeContentId === content.id ? 'bg-accent text-white' : 'bg-slate-100 text-primary/30'
                      }`}>
                         {content.type === 'video' ? <PlayCircle className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black text-[8px] uppercase tracking-wider truncate ${
                          activeContentId === content.id ? 'text-primary' : 'text-primary/60'
                        }`}>{content.title}</p>
                        <p className="text-[6px] font-bold text-muted-foreground uppercase opacity-60 leading-none mt-0.5">{content.type}</p>
                      </div>
                      {activeContentId === content.id && (
                        <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      )}
                  </button>
               ))}
               {(!contents[activeModuleId || ""] || contents[activeModuleId || ""].length === 0) && (
                 <div className="py-6 text-center border-2 border-dashed rounded-xl opacity-20 bg-muted/5">
                    <p className="text-[7px] font-black uppercase italic">Sem Materiais</p>
                 </div>
               )}
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
