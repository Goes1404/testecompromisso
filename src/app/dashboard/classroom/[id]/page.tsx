
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  FileSearch,
  Layout,
  Layers
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

export default function ClassroomPage() {
  const params = useParams();
  const trailId = params?.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [trail, setTrail] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, any[]>>({});
  
  const [videoProgress, setVideoProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadTrailData = useCallback(async () => {
    if (!trailId) return;
    try {
      setLoading(true);
      
      const { data: trailData } = await supabase.from('trails').select('*').eq('id', trailId).single();
      if (!trailData) {
        toast({ title: "Trilha não encontrada", variant: "destructive" });
        return;
      }
      setTrail(trailData);

      const { data: modulesData } = await supabase.from('modules').select('*').eq('trail_id', trailId).order('order_index');
      if (!modulesData || modulesData.length === 0) {
        setModules([]);
        setLoading(false);
        return;
      }
      setModules(modulesData);
      
      setActiveModuleId(modulesData[0].id);
      
      const moduleIds = modulesData.map(m => m.id);
      const { data: contentsData } = await supabase.from('learning_contents').select('*').in('module_id', moduleIds).order('order_index');
      
      const contentMap: Record<string, any[]> = {};
      contentsData?.forEach(c => {
        if (!contentMap[c.module_id]) contentMap[c.module_id] = [];
        contentMap[c.module_id].push(c);
      });
      setContents(contentMap);

      if (contentMap[modulesData[0].id]?.length > 0) {
        setActiveContentId(contentMap[modulesData[0].id][0].id);
      }
    } catch (e) {
      console.error("Erro ao carregar aula:", e);
    } finally {
      setLoading(false);
    }
  }, [trailId, toast]);

  useEffect(() => {
    loadTrailData();
  }, [loadTrailData]);

  const updateServerProgress = useCallback(async (percentage: number) => {
    const completed = percentage >= 80;
    if (completed && !isCompleted && user && trailId) {
      setIsCompleted(true);
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        trail_id: trailId,
        percentage: Math.round(percentage),
        last_accessed: new Date().toISOString()
      });
      toast({ 
        title: "Conteúdo Concluído!", 
        description: "Seu progresso industrial foi registrado." 
      });
    }
  }, [isCompleted, toast, user, trailId]);

  const onPlayerStateChange = useCallback((event: any) => {
    if (event.data === 1) { // PLAYING
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
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
  }, [updateServerProgress]);

  useEffect(() => {
    // Carregamento resiliente da API do YouTube
    const loadYoutubeApi = () => {
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        
        (window as any).onYouTubeIframeAPIReady = () => {
          setIsApiReady(true);
        };
      } else if ((window as any).YT && (window as any).YT.Player) {
        setIsApiReady(true);
      }
    };

    loadYoutubeApi();

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
    };
  }, []);

  const activeContent = contents[activeModuleId || ""]?.find(c => c.id === activeContentId);

  useEffect(() => {
    if (activeContent?.type === 'video' && isApiReady) {
      const playerElement = document.getElementById('youtube-player');
      if (!playerElement) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
      
      const vidUrl = activeContent.url || '';
      let vidId = '';
      
      if (vidUrl.includes('v=')) vidId = vidUrl.split('v=')[1].split('&')[0];
      else if (vidUrl.includes('youtu.be/')) vidId = vidUrl.split('youtu.be/')[1].split('?')[0];
      else vidId = vidUrl;

      if (vidId) {
        try {
          playerRef.current = new (window as any).YT.Player('youtube-player', {
            videoId: vidId,
            playerVars: { 'autoplay': 0, 'modestbranding': 1, 'rel': 0 },
            events: {
              'onStateChange': onPlayerStateChange
            }
          });
        } catch (e) {
          console.error("Falha ao instanciar player:", e);
        }
      }
    } else {
      if (activeContent && activeContent.type !== 'video') setVideoProgress(100);
    }
  }, [activeContentId, activeContent, isApiReady, onPlayerStateChange]);

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4 bg-background">
      <Loader2 className="animate-spin h-12 w-12 text-accent" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Sintonizando Ambiente de Estudo...</p>
    </div>
  );

  if (modules.length === 0) return (
    <div className="flex flex-col h-screen items-center justify-center gap-6 bg-background p-10 text-center">
      <Layers className="h-20 w-20 text-muted-foreground/20" />
      <h2 className="text-2xl font-black text-primary italic">Trilha em Construção</h2>
      <p className="text-muted-foreground max-w-sm">Esta jornada pedagógica ainda não possui capítulos publicados. Volte em breve!</p>
      <Button onClick={() => router.back()} variant="outline" className="rounded-xl px-8 h-12 border-primary/20">Voltar para Trilhas</Button>
    </div>
  );

  return (
    <div className="app-container animate-in fade-in duration-500 space-y-6">
        <header className="bg-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => router.back()} className="rounded-full h-10 w-10 hover:bg-primary/5 flex items-center justify-center transition-colors">
            <ChevronLeft className="h-6 w-6 text-primary" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-primary italic leading-none truncate max-w-[300px]">{trail?.title}</h1>
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Capítulo Ativo: {modules.find(m => m.id === activeModuleId)?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full max-w-xs ml-auto">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest">Monitor de Engajamento</span>
              <span className="text-[10px] font-black text-accent italic">{Math.round(videoProgress)}%</span>
            </div>
            <Progress value={videoProgress} className="h-1.5 bg-muted rounded-full" />
          </div>
          {videoProgress >= 80 && <Badge className="bg-green-100 text-green-700 border-none font-black h-8 px-3 text-[10px]">CONCLUÍDO</Badge>}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        <div className="col-span-12 lg:col-span-8 flex flex-col bg-white rounded-[2rem] shadow-xl overflow-hidden border relative">
          <div className="w-full aspect-video bg-slate-950 shrink-0">
            {activeContent?.type === 'video' ? (
              <div id="youtube-player" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-white p-10 text-center">
                <Layout className="h-16 w-16 text-accent/20 mb-4" />
                <h3 className="text-xl font-black italic uppercase tracking-widest">{activeContent?.title || "Selecione um Material"}</h3>
                <p className="text-sm text-slate-400 mt-2">Este é um recurso pedagógico complementar. Use as abas abaixo para instruções.</p>
              </div>
            )}
          </div>

          <Tabs defaultValue="summary" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4 bg-muted/30 p-1 h-14 rounded-none border-b shrink-0">
              <TabsTrigger value="summary" className="gap-2 font-black text-[9px] uppercase tracking-widest"><BookOpen className="h-4 w-4 text-accent"/>Resumo</TabsTrigger>
              <TabsTrigger value="quiz" className="gap-2 font-black text-[9px] uppercase tracking-widest"><BrainCircuit className="h-4 w-4 text-accent"/>Atividade</TabsTrigger>
              <TabsTrigger value="live" className="gap-2 font-black text-[9px] uppercase tracking-widest"><Video className="h-4 w-4 text-red-500"/>Suporte</TabsTrigger>
              <TabsTrigger value="materials" className="gap-2 font-black text-[9px] uppercase tracking-widest"><Paperclip className="h-4 w-4 text-blue-500"/>Anexo</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollable-content" ref={scrollRef}>
               <TabsContent value="summary" className="mt-0 outline-none">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl font-black text-primary italic">Orientações do Mentor</h2>
                    </div>
                    <Card className="border-none shadow-sm bg-muted/5 p-6 rounded-2xl">
                      <p className="text-sm md:text-base leading-relaxed text-primary/80 font-medium italic whitespace-pre-line">
                        {activeContent?.description || "Inicie o estudo analisando este material. Siga as orientações do seu mentor para fixar o conhecimento."}
                      </p>
                    </Card>
                  </div>
               </TabsContent>
               <TabsContent value="quiz" className="mt-0 outline-none">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                          <BrainCircuit className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black text-primary italic">Prática & Simulado</h2>
                      </div>
                      <Badge className="bg-primary text-white border-none font-black text-[8px] px-3 uppercase tracking-widest">IA Aurora</Badge>
                    </div>
                    {activeContent?.type === 'quiz' || activeContent?.url?.includes('quiz') || activeContent?.url?.includes('form') ? (
                      <div className="grid gap-6">
                        <div className="p-8 bg-muted/5 border-2 border-dashed rounded-[2.5rem] text-center">
                           <p className="text-sm font-bold text-primary italic mb-6">Este recurso requer interação em janela externa ou simulado integrado.</p>
                           <Button asChild className="w-full md:w-auto bg-primary h-14 rounded-2xl font-black shadow-xl px-10">
                             <a href={activeContent?.url} target="_blank" rel="noopener noreferrer">Abrir Atividade Prática</a>
                           </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-muted/5 rounded-[2.5rem] border-2 border-dashed border-muted/20">
                        <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-sm font-bold text-muted-foreground italic">Nenhum quiz vinculado a este item específico.</p>
                      </div>
                    )}
                  </div>
               </TabsContent>
               <TabsContent value="live" className="mt-0 outline-none">
                  <div className="text-center py-20 bg-muted/5 rounded-[2.5rem]">
                    <Video className="h-12 w-12 mx-auto mb-4 text-red-500 opacity-30" />
                    <p className="font-black italic text-primary">Dúvidas sobre este conteúdo?</p>
                    <p className="text-[10px] text-muted-foreground mt-2 uppercase font-black tracking-widest">Use o chat da Aurora ou consulte a agenda de encontros no menu principal.</p>
                  </div>
               </TabsContent>
               <TabsContent value="materials" className="mt-0 outline-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeContent?.type === 'pdf' || activeContent?.url?.includes('.pdf') || activeContent?.type === 'file' ? (
                      <Card className="p-6 border-none shadow-md bg-white rounded-2xl flex items-center gap-4 group cursor-pointer hover:bg-primary transition-all">
                        <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-white/10 group-hover:text-white"><FileText className="h-6 w-6" /></div>
                        <div>
                          <p className="font-black text-xs text-primary group-hover:text-white uppercase tracking-widest">Apoio Pedagógico</p>
                          <p className="text-[10px] text-muted-foreground group-hover:text-white/60">Acessar Anexo</p>
                        </div>
                        <Button asChild variant="ghost" size="icon" className="ml-auto text-primary group-hover:text-white">
                          <a href={activeContent?.url} target="_blank" rel="noopener noreferrer"><Paperclip className="h-4 w-4" /></a>
                        </Button>
                      </Card>
                    ) : (
                      <div className="col-span-full py-10 text-center opacity-30 italic font-medium text-sm">Nenhum anexo adicional para este recurso.</div>
                    )}
                  </div>
               </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Sidebar de Conteúdos */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 min-h-0">
           <Card className="bg-primary text-white shadow-2xl p-6 rounded-[2.5rem] border-none overflow-hidden relative shrink-0">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-4">Capítulos da Jornada</h2>
            <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-hide">
              {modules.map((module, idx) => (
                <button 
                  key={module.id}
                  onClick={() => {
                    setActiveModuleId(module.id);
                    if (contents[module.id]?.length > 0) setActiveContentId(contents[module.id][0].id);
                  }}
                  className={`w-full text-left p-4 rounded-2xl transition-all relative overflow-hidden group ${activeModuleId === module.id ? 'bg-white text-primary shadow-xl' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}>
                  <div className="flex items-center gap-4 relative z-10">
                    <span className={`text-xl font-black italic ${activeModuleId === module.id ? 'text-accent' : 'text-white/20'}`}>{idx + 1}</span>
                    <p className="font-black text-xs uppercase tracking-wider truncate">{module.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="bg-white shadow-2xl p-6 rounded-[2.5rem] flex-1 flex flex-col min-h-0 border">
             <h2 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] mb-6 px-2">Material do Capítulo</h2>
             <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 scrollbar-thin">
              {contents[activeModuleId || ""]?.map((content, idx) => (
                  <button 
                    key={content.id}
                    onClick={() => setActiveContentId(content.id)}
                    className={`w-full text-left p-4 rounded-[1.5rem] transition-all flex items-center gap-4 border-2 ${activeContentId === content.id ? 'bg-accent/5 border-accent shadow-lg' : 'bg-muted/10 border-transparent hover:bg-muted/20'}`}>
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${activeContentId === content.id ? 'bg-accent text-white' : 'bg-white text-primary/40'}`}>
                         {content.type === 'video' && <PlayCircle className="h-5 w-5" />}
                         {content.type === 'quiz' && <BrainCircuit className="h-5 w-5" />}
                         {content.type === 'pdf' && <FileText className="h-5 w-5" />}
                         {content.type === 'text' && <FileSearch className="h-5 w-5" />}
                         {content.type === 'file' && <Paperclip className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black text-[10px] uppercase tracking-widest truncate ${activeContentId === content.id ? 'text-accent' : 'text-primary/60'}`}>{content.title}</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-60 mt-0.5">{content.type}</p>
                      </div>
                      {activeContentId === content.id && <CheckCircle2 className="h-4 w-4 text-accent ml-auto shrink-0" />}
                  </button>
              ))}
              {(!contents[activeModuleId || ""] || contents[activeModuleId || ""].length === 0) && (
                <div className="text-center py-10 opacity-30">
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Capítulo vazio</p>
                </div>
              )}
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
