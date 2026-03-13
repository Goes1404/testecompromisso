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
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import Script from "next/script";
import Link from "next/link";

// Conteúdo de Exemplo caso a trilha esteja vazia
const DEMO_CONTENTS = [
  { id: 'demo-1', title: 'Fundamentos da Aprovação', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', description: 'Uma introdução essencial sobre como organizar seus estudos.' },
  { id: 'demo-2', title: 'Técnicas de Redação Nota 1000', type: 'video', url: 'https://www.youtube.com/watch?v=videoseries?list=PL3G1L-UIlpbj-X9ZPnCDX-vskRE_SkQuX', description: 'Aprenda a estruturar sua dissertação seguindo o padrão INEP.' }
];

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
  const [isDemoMode, setIsDemoMode] = useState(false);
  
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
        // Se não houver módulos, entramos em modo demo para mostrar exemplos
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

      // Se o primeiro módulo não tem conteúdo real, também mostramos demo
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

  if (loading) return (
    <div className="flex flex-col min-h-[60vh] items-center justify-center gap-4">
      <Loader2 className="animate-spin h-14 w-14 text-accent" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sintonizando Estúdio de Aprendizado...</p>
    </div>
  );

  const activeContent = contents[activeModuleId || ""]?.find(c => c.id === activeContentId);

  return (
    <div className="flex flex-col bg-slate-50 animate-in fade-in duration-500 min-h-screen">
      <Script 
        src="https://www.youtube.com/iframe_api" 
        strategy="afterInteractive"
        onLoad={() => {
          (window as any).onYouTubeIframeAPIReady = () => setIsApiReady(true);
          if ((window as any).YT) setIsApiReady(true);
        }}
      />
      
      {/* CABEÇALHO CLASSE */}
      <header className="sticky top-0 bg-primary text-white px-4 h-16 flex items-center justify-between shrink-0 z-50 shadow-xl border-b border-white/5">
        <div className="flex items-center gap-4 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10 h-10 w-10 shrink-0 text-white">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="h-3 w-3 text-accent" />
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{trail?.category || 'Demonstração'}</p>
            </div>
            <h1 className="text-sm md:text-lg font-black italic truncate max-w-[200px] md:max-w-xl">{trail?.title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end gap-1.5 w-32 md:w-48">
            <div className="flex justify-between w-full text-[9px] font-black uppercase text-white/40 tracking-widest">
              <span>EVOLUÇÃO</span>
              <span className="text-accent">{Math.round(videoProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
               <div className="h-full bg-accent transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${videoProgress}%` }} />
            </div>
          </div>
          
          {!isEnrolled && (
            <Button onClick={handleEnroll} disabled={isEnrolling} className="hidden md:flex bg-accent text-accent-foreground font-black text-[10px] uppercase h-10 px-6 rounded-xl shadow-lg hover:scale-105 transition-all">
              {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
              FIXAR TRILHA
            </Button>
          )}
          <Button variant="ghost" size="icon" className="rounded-xl text-white h-10 w-10 hover:bg-white/10" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelRightClose className="h-6 w-6" /> : <PanelRightOpen className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row items-start relative min-h-[calc(100vh-64px)]">
        
        {/* ÁREA DE CONTEÚDO */}
        <main className={`flex-1 flex flex-col bg-white min-w-0 transition-all duration-500`}>
          <div className="w-full aspect-video bg-black relative shadow-2xl overflow-hidden shrink-0 ring-1 ring-white/10">
            {activeContent?.type === 'video' ? (
              <div id="youtube-player" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-10 text-center gap-6">
                <div className="h-20 w-20 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                  <Layout className="h-10 w-10 text-accent" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter">{activeContent?.title || "Selecione um Material"}</h3>
                  <p className="text-xs md:text-sm text-white/40 italic font-medium max-w-md mx-auto">Use o roteiro pedagógico abaixo para interagir com este módulo.</p>
                </div>
              </div>
            )}
          </div>

          {/* CONSOLE DE ESTUDOS */}
          <Tabs defaultValue="summary" className="flex flex-col flex-1">
            <TabsList className="grid w-full grid-cols-4 h-14 bg-slate-900 p-0 gap-0 shadow-2xl border-b border-white/5 shrink-0">
              {[
                { id: "summary", label: "Roteiro", icon: BookOpen },
                { id: "quiz", label: "Prática", icon: BrainCircuit },
                { id: "support", label: "Links", icon: Video },
                { id: "attachments", label: "Anexos", icon: Paperclip }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="data-[state=active]:bg-white data-[state=active]:text-primary h-full rounded-none font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] gap-3 text-white/30 border-none transition-all"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="p-6 md:p-10 bg-slate-50/50 flex-1">
               <TabsContent value="summary" className="mt-0 outline-none animate-in fade-in">
                  <div className="max-w-5xl mx-auto space-y-8">
                    {isDemoMode && (
                      <div className="p-6 bg-accent/10 border-2 border-dashed border-accent/20 rounded-[2rem] flex items-center gap-6 animate-in slide-in-from-top-4">
                        <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center text-accent-foreground shrink-0 shadow-lg"><Sparkles className="h-8 w-8" /></div>
                        <div>
                          <p className="text-sm font-black text-primary uppercase tracking-widest italic">Modo Demonstração</p>
                          <p className="text-xs font-medium text-primary/60 italic mt-1 leading-relaxed">
                            Esta trilha ainda não possui materiais carregados pelo mentor. Exibindo exemplos educativos do YouTube para sua experiência.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Target className="h-5 w-5 text-accent" />
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary/40">Plano de Aprendizado</h2>
                          </div>
                          <h3 className="text-3xl md:text-4xl font-black text-primary italic leading-tight tracking-tight">{activeContent?.title}</h3>
                          <p className="text-lg font-medium text-primary/70 leading-relaxed italic border-l-4 border-accent pl-6 py-2 bg-white rounded-r-2xl shadow-sm">
                            {activeContent?.description || "Inicie este material para fortalecer seus fundamentos técnicos e acelerar sua aprovação."}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <Card className="p-6 border-none shadow-xl bg-white rounded-[2rem] space-y-4 group hover:shadow-2xl transition-all">
                            <div className="flex items-center gap-3 text-primary">
                              <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-inner group-hover:bg-accent group-hover:text-white transition-all"><Zap className="h-5 w-5" /></div>
                              <span className="text-xs font-black uppercase tracking-widest">Ação Sugerida</span>
                            </div>
                            <p className="text-sm font-medium italic text-primary/60 leading-relaxed">Assista ao vídeo e anote os pontos de dúvida para a mentoria semanal.</p>
                          </Card>
                          <Card className="p-6 border-none shadow-xl bg-white rounded-[2rem] space-y-4 group hover:shadow-2xl transition-all">
                            <div className="flex items-center gap-3 text-primary">
                              <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center"><Award className="h-5 w-5" /></div>
                              <span className="text-xs font-black uppercase tracking-widest">Meta de Aula</span>
                            </div>
                            <p className="text-sm font-medium italic text-primary/60 leading-relaxed">Realize o mini-assessment integrado logo após o vídeo para validar a retenção.</p>
                          </Card>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <Card className="p-8 border-none shadow-2xl bg-primary text-white rounded-[2.5rem] relative overflow-hidden group">
                          <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-150" />
                          <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                              <Lightbulb className="h-6 w-6 text-accent animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Insight Aurora IA</span>
                            </div>
                            <p className="text-sm md:text-lg font-medium leading-relaxed italic opacity-90 tracking-tight">
                              "Estudos indicam que pausar o vídeo a cada 12 minutos para processar o conteúdo aumenta a retenção acadêmica em até 45%."
                            </p>
                          </div>
                        </Card>

                        <div className="space-y-4 px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-1">Competências Desenvolvidas</h4>
                          <div className="flex flex-wrap gap-2">
                            {['Análise Crítica', 'Lógica Estrutural', 'Base Teórica', 'Prática Industrial', 'Foco'].map(tag => (
                              <Badge key={tag} variant="outline" className="bg-white border-muted/20 text-primary/60 font-black text-[9px] uppercase px-4 py-1.5 rounded-xl italic shadow-sm hover:border-accent/40 transition-all">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
               </TabsContent>

               <TabsContent value="quiz" className="mt-0 outline-none animate-in slide-in-from-bottom-4">
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-2">
                        <BrainCircuit className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-primary italic leading-none">Laboratório de Prática</h2>
                        <p className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-widest">Validar Aprendizado Industrial</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {activeContent?.workbook_id && (
                        <Card className="p-10 border-none shadow-2xl bg-white rounded-[3rem] group hover:shadow-primary/10 transition-all overflow-hidden relative">
                          <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                            <BookOpen className="h-40 w-40" />
                          </div>
                          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                            <div className="h-20 w-20 rounded-[2rem] bg-accent/10 flex items-center justify-center shadow-inner shrink-0 group-hover:rotate-6 transition-transform">
                              <BookOpen className="h-10 w-10 text-accent" />
                            </div>
                            <div className="flex-1 text-center md:text-left space-y-2">
                              <Badge className="bg-accent text-accent-foreground border-none font-black text-[8px] px-3 h-5 uppercase tracking-widest">Apostila Vinculada</Badge>
                              <h3 className="text-2xl font-black text-primary italic leading-none">Exercícios do Módulo</h3>
                              <p className="text-sm font-medium italic text-muted-foreground">O mentor vinculou um material específico para este capítulo. Pratique agora!</p>
                            </div>
                            <Button asChild className="bg-primary text-white h-14 px-8 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all shrink-0">
                              <Link href={`/dashboard/library/book/${activeContent.workbook_id}`}>
                                ABRIR APOSTILA <ExternalLink className="ml-2 h-4 w-4 text-accent" />
                              </Link>
                            </Button>
                          </div>
                        </Card>
                      )}

                      {activeContent?.type === 'quiz' || activeContent?.url?.includes('quiz') || activeContent?.url?.includes('form') ? (
                        <Card className="p-12 bg-white border-4 border-dashed border-slate-200 rounded-[3rem] text-center space-y-8 shadow-2xl hover:border-accent transition-all duration-500">
                           <div className="h-20 w-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto shadow-inner">
                              <Layers className="h-10 w-10 text-accent" />
                           </div>
                           <div className="space-y-3">
                              <p className="text-3xl font-black text-primary italic">Assessment Online</p>
                              <p className="text-sm md:text-lg text-muted-foreground font-medium italic max-w-md mx-auto">Esta aula possui uma avaliação técnica externa vinculada.</p>
                           </div>
                           <Button asChild className="bg-primary text-white h-16 rounded-[1.5rem] font-black px-12 shadow-2xl text-base hover:scale-105 transition-all">
                             <a href={activeContent?.url} target="_blank" rel="noopener noreferrer">
                               ABRIR EXERCÍCIOS 
                               <ArrowRight className="ml-3 h-5 w-5 text-accent" />
                             </a>
                           </Button>
                        </Card>
                      ) : null}

                      {!activeContent?.workbook_id && activeContent?.type !== 'quiz' && !activeContent?.url?.includes('quiz') && (
                        <div className="text-center py-24 bg-white/50 rounded-[3rem] border-4 border-dashed border-slate-200 opacity-40 flex flex-col items-center gap-4">
                          <BrainCircuit className="h-12 w-12 text-primary/20" />
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] italic text-primary/40">Sem exercícios vinculados a este material</p>
                        </div>
                      )}
                    </div>
                  </div>
               </TabsContent>

               <TabsContent value="support" className="mt-0 outline-none animate-in slide-in-from-bottom-4">
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl">
                        <Video className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-primary italic leading-none">Links de Aula</h2>
                        <p className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-widest">Recursos Externos do Mentor</p>
                      </div>
                    </div>

                    {activeContent?.type === 'video' ? (
                      <Card className="p-8 border-none shadow-xl bg-white rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="h-14 w-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
                            <PlayCircle className="h-8 w-8" />
                          </div>
                          <div>
                            <p className="text-lg font-black text-primary italic">Assista no Youtube</p>
                            <p className="text-xs font-medium text-muted-foreground">Caso prefira, você pode assistir este material diretamente na plataforma oficial.</p>
                          </div>
                        </div>
                        <Button asChild variant="outline" className="h-12 px-8 rounded-xl border-2 border-primary/10 font-black text-[10px] uppercase">
                          <a href={activeContent?.url} target="_blank" rel="noopener noreferrer">ABRIR LINK <ExternalLink className="ml-2 h-4 w-4 text-accent" /></a>
                        </Button>
                      </Card>
                    ) : (
                      <div className="text-center py-24 bg-white/50 rounded-[3rem] border-4 border-dashed border-slate-200 opacity-40">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] italic text-primary/40">Nenhum link adicional registrado.</p>
                      </div>
                    )}
                  </div>
               </TabsContent>

               <TabsContent value="attachments" className="mt-0 outline-none animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto pb-10">
                    {activeContent?.type === 'pdf' || activeContent?.url?.includes('.pdf') || activeContent?.type === 'file' ? (
                      <Card className="p-6 border-none shadow-xl bg-white rounded-[2rem] flex items-center gap-6 group hover:bg-primary transition-all duration-700 cursor-pointer overflow-hidden border-2 border-transparent hover:border-white/20">
                        <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-white/10 group-hover:text-white transition-all shadow-inner">
                          <FileText className="h-7 w-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[9px] text-accent group-hover:text-white/60 uppercase tracking-[0.2em]">Material de Apoio</p>
                          <p className="text-lg font-black text-primary group-hover:text-white italic leading-tight truncate">Download_Material.pdf</p>
                        </div>
                        <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-full text-primary group-hover:text-white hover:bg-white/20">
                          <a href={activeContent?.url} target="_blank" rel="noopener noreferrer"><Paperclip className="h-5 w-5" /></a>
                        </Button>
                      </Card>
                    ) : (
                      <div className="col-span-full py-24 text-center opacity-20 border-4 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center gap-4">
                        <Paperclip className="h-12 w-12" />
                        <p className="text-[10px] font-black uppercase italic tracking-[0.4em]">Sem anexos pedagógicos disponíveis.</p>
                      </div>
                    )}
                  </div>
               </TabsContent>
            </div>
          </Tabs>
        </main>

        {/* EMENTA LATERAL */}
        {sidebarOpen && (
          <aside className="lg:w-[350px] w-full border-l bg-white sticky top-16 self-start h-[calc(100vh-64px)] overflow-y-auto shrink-0 transition-all duration-500 shadow-2xl z-40">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">Jornada de Estudo</h2>
                <Badge className="bg-primary text-white text-[9px] font-black px-3 h-6 rounded-xl shadow-lg">{modules.length} CAPÍTULOS</Badge>
              </div>
              
              <div className="space-y-2">
                {modules.map((module, idx) => (
                  <button 
                    key={module.id}
                    onClick={() => {
                      setActiveModuleId(module.id);
                      if (contents[module.id]?.length > 0) setActiveContentId(contents[module.id][0].id);
                    }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border-2 flex items-center gap-4 relative overflow-hidden group ${
                      activeModuleId === module.id 
                        ? 'bg-primary text-white border-primary shadow-2xl translate-x-2' 
                        : 'bg-white border-transparent hover:border-accent/30 text-primary/60'
                    }`}>
                    <span className={`text-sm font-black italic transition-colors ${activeModuleId === module.id ? 'text-accent' : 'text-primary/20'}`}>
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <p className="font-black text-[10px] uppercase tracking-[0.15em] truncate flex-1">{module.title}</p>
                    {activeModuleId === module.id && <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-accent" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4">
               <div className="flex items-center gap-3 mb-2 px-2">
                  <Layers className="h-4 w-4 text-accent" />
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Materiais da Unidade</h3>
               </div>
               
               <div className="space-y-2 pb-10">
                 {contents[activeModuleId || ""]?.map((content) => (
                    <button 
                      key={content.id}
                      onClick={() => {
                        setActiveContentId(content.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left p-4 rounded-[1.5rem] transition-all flex items-center gap-4 border-2 ${
                        activeContentId === content.id 
                          ? 'bg-accent/10 border-accent/40 shadow-xl scale-[1.02]' 
                          : 'bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-white'
                      }`}>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-inner ${
                          activeContentId === content.id ? 'bg-accent text-white shadow-lg rotate-3' : 'bg-slate-200/50 text-primary/30'
                        }`}>
                           {content.type === 'video' ? <PlayCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-black text-[10px] uppercase tracking-wide truncate transition-colors ${
                            activeContentId === content.id ? 'text-primary' : 'text-primary/60'
                          }`}>{content.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[7px] font-black h-4 px-1.5 border-muted/30 uppercase opacity-60">{content.type}</Badge>
                            {activeContentId === content.id && <span className="text-[7px] font-bold text-accent uppercase animate-pulse">Assistindo</span>}
                          </div>
                        </div>
                    </button>
                 ))}
                 {(!contents[activeModuleId || ""] || contents[activeModuleId || ""].length === 0) && (
                   <div className="py-10 text-center border-2 border-dashed rounded-[2rem] opacity-20 bg-muted/5">
                      <p className="text-[10px] font-black uppercase italic tracking-widest">Sem materiais</p>
                   </div>
                 )}
               </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
