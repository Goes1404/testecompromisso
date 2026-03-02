
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
  PanelRightOpen,
  Target,
  Lightbulb,
  Zap,
  Award
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
      <p className="text-sm font-black uppercase tracking-[0.3em] text-white animate-pulse">Sintonizando Estúdio</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500">
      
      {/* CABEÇALHO FIXO */}
      <header className="sticky top-0 bg-primary text-white px-6 h-16 flex items-center justify-between shrink-0 z-50 shadow-xl border-b border-white/5">
        <div className="flex items-center gap-4 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/10 h-10 w-10 shrink-0 text-white transition-all">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="h-3 w-3 text-accent" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{trail?.category}</p>
            </div>
            <h1 className="text-sm md:text-base font-black italic leading-none truncate max-w-[200px] md:max-w-md">{trail?.title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6 shrink-0">
          <div className="hidden md:flex flex-col items-end gap-1.5 w-48">
            <div className="flex justify-between w-full text-[10px] font-black uppercase text-white/40">
              <span>Evolução</span>
              <span className="text-accent">{Math.round(videoProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-accent transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${videoProgress}%` }} />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isEnrolled && (
              <Button onClick={handleEnroll} disabled={isEnrolling} className="hidden md:flex bg-accent text-accent-foreground font-black text-xs uppercase h-10 px-6 rounded-xl shadow-lg border-none hover:scale-105 active:scale-95 transition-all">
                {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                Fixar Trilha
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-xl text-white h-10 w-10 hover:bg-white/10 transition-all" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelRightClose className="h-6 w-6" /> : <PanelRightOpen className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        
        {/* CONTEÚDO PRINCIPAL (EXPANSÍVEL) */}
        <main className={`flex-1 flex flex-col bg-white min-w-0 shadow-inner transition-all duration-500 ease-in-out`}>
          <div className="w-full aspect-video bg-black relative group shadow-2xl shrink-0 overflow-hidden">
            {activeContent?.type === 'video' ? (
              <div id="youtube-player" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-primary text-white p-10 text-center">
                <div className="h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center mb-6 relative border border-white/10 shadow-2xl">
                  <Layout className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tight max-w-2xl">{activeContent?.title || "Selecione um Material"}</h3>
                <p className="text-sm text-white/40 mt-4 italic font-medium">Use o console abaixo para interagir com os recursos deste módulo.</p>
              </div>
            )}
          </div>

          {/* CONSOLE DE ESTUDOS - ROLAGEM DO NAVEGADOR */}
          <Tabs defaultValue="summary" className="flex flex-col bg-white">
            <TabsList className="sticky top-16 grid w-full grid-cols-4 h-14 bg-slate-950 p-0 gap-0 shrink-0 shadow-2xl border-b border-white/5 z-40">
              {[
                { id: "summary", label: "Roteiro", icon: BookOpen },
                { id: "quiz", label: "Prática", icon: BrainCircuit },
                { id: "support", label: "Live", icon: Video },
                { id: "attachments", label: "Anexos", icon: Paperclip }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="data-[state=active]:bg-white data-[state=active]:text-primary h-full rounded-none font-black text-[10px] md:text-xs uppercase tracking-[0.15em] transition-all gap-3 border-none text-white/40 hover:text-white/80"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="p-6 md:p-10 bg-slate-50/30 min-h-[400px]">
               <TabsContent value="summary" className="mt-0 outline-none animate-in fade-in duration-500">
                  <div className="max-w-5xl mx-auto space-y-10 pb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Target className="h-5 w-5 text-accent" />
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary/40">Plano de Aprendizado</h2>
                          </div>
                          <h3 className="text-2xl md:text-3xl font-black text-primary italic leading-tight">{activeContent?.title}</h3>
                          <p className="text-base md:text-lg font-medium text-primary/70 leading-relaxed italic whitespace-pre-line border-l-4 border-accent/20 pl-6 py-2">
                            {activeContent?.description || "Inicie este material para fortalecer seus fundamentos técnicos. Este conteúdo foi estrategicamente selecionado para o seu perfil acadêmico."}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <Card className="p-6 border-none shadow-xl bg-white rounded-3xl space-y-4 group hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-center gap-4 text-primary">
                              <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                <Zap className="h-5 w-5" />
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-widest">Ação Necessária</span>
                            </div>
                            <p className="text-sm font-medium italic opacity-70 leading-relaxed">Assista ao vídeo e anote os pontos de dúvida crítica para a próxima live de mentoria.</p>
                          </Card>
                          <Card className="p-6 border-none shadow-xl bg-white rounded-3xl space-y-4 group hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-center gap-4 text-primary">
                              <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                <Award className="h-5 w-5" />
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-widest">Meta de Fixação</span>
                            </div>
                            <p className="text-sm font-medium italic opacity-70 leading-relaxed">Realizar o mini-assessment logo após a aula para validar o progresso técnico.</p>
                          </Card>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <Card className="p-8 border-none shadow-2xl bg-primary text-white rounded-[2.5rem] relative overflow-hidden group">
                          <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-3xl group-hover:scale-125 transition-transform" />
                          <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                              <Lightbulb className="h-6 w-6 text-accent" />
                              <span className="text-[11px] font-black uppercase tracking-widest">Sugestão Aurora IA</span>
                            </div>
                            <p className="text-sm md:text-base font-medium leading-relaxed italic opacity-90">
                              "Pausar o conteúdo a cada 15 minutos para explicar em voz alta o que foi aprendido aumenta a retenção em até 60%."
                            </p>
                          </div>
                        </Card>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-3">Habilidades em Foco</h4>
                          <div className="flex flex-wrap gap-3">
                            {['Raciocínio Lógico', 'Análise Crítica', 'Base Teórica', 'Prática Técnica'].map(tag => (
                              <Badge key={tag} variant="outline" className="bg-white border-muted/20 text-primary/60 font-bold text-[10px] uppercase px-4 h-8 rounded-xl italic shadow-sm hover:border-accent/30 transition-all">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
               </TabsContent>

               <TabsContent value="quiz" className="mt-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-3">
                        <BrainCircuit className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-primary italic leading-none">Avaliação de Consolidação</h2>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1.5">Validar Aprendizado</p>
                      </div>
                    </div>
                    
                    {activeContent?.url?.includes('quiz') || activeContent?.url?.includes('form') ? (
                      <Card className="p-16 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-8 shadow-2xl group transition-all hover:border-accent/40">
                         <div className="h-24 w-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform">
                            <Layers className="h-12 w-12 text-accent" />
                         </div>
                         <div className="space-y-3">
                            <p className="text-2xl font-black text-primary italic">Ambiente de Simulado Ativo</p>
                            <p className="text-sm text-muted-foreground font-medium italic max-w-sm mx-auto">Esta aula possui uma avaliação vinculada em plataforma externa segura.</p>
                         </div>
                         <Button asChild className="bg-primary text-white h-16 rounded-2xl font-black px-12 shadow-2xl hover:scale-105 active:scale-95 transition-all text-base border-none">
                           <a href={activeContent?.url} target="_blank" rel="noopener noreferrer">
                             ABRIR LABORATÓRIO 
                             <ArrowRight className="ml-3 h-5 w-5 text-accent" />
                           </a>
                         </Button>
                      </Card>
                    ) : (
                      <div className="text-center py-20 bg-slate-100/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 opacity-40">
                        <HelpCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-xs font-black uppercase tracking-[0.3em] italic text-primary/40">Nenhum exercício vinculado a este módulo</p>
                      </div>
                    )}
                  </div>
               </TabsContent>

               <TabsContent value="attachments" className="mt-0 outline-none animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {activeContent?.type === 'pdf' || activeContent?.url?.includes('.pdf') ? (
                      <Card className="p-6 border-none shadow-xl bg-white rounded-3xl flex items-center gap-6 group hover:bg-primary transition-all duration-500 cursor-pointer overflow-hidden relative">
                        <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-white/10 group-hover:text-white shadow-inner transition-all">
                          <FileText className="h-7 w-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[10px] text-accent group-hover:text-white/60 uppercase tracking-[0.2em] mb-1">Material de Apoio</p>
                          <p className="text-base font-black text-primary group-hover:text-white italic leading-tight truncate">Fundamentos Técnicos.pdf</p>
                        </div>
                        <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-full text-primary group-hover:text-white hover:bg-white/20 shrink-0 border-none">
                          <a href={activeContent?.url} target="_blank" rel="noopener noreferrer"><Paperclip className="h-5 w-5" /></a>
                        </Button>
                      </Card>
                    ) : (
                      <div className="col-span-full py-20 text-center opacity-20 border-2 border-dashed rounded-[2.5rem] bg-muted/5">
                        <p className="text-sm font-black italic uppercase tracking-widest">Sem anexos pedagógicos para este material.</p>
                      </div>
                    )}
                  </div>
               </TabsContent>
            </div>
          </Tabs>
        </main>

        {/* EMENTA LATERAL (DIREITA) - RELATIVA PARA EMPURRAR O CONTEÚDO NO DESKTOP */}
        <aside className={`
          bg-white border-l transition-all duration-500 ease-in-out flex flex-col shrink-0 overflow-hidden
          ${sidebarOpen ? 'w-full lg:w-[320px] opacity-100' : 'w-0 border-l-0 opacity-0'}
          fixed inset-y-0 right-0 z-30 lg:sticky lg:top-16 lg:h-[calc(100vh-64px)]
        `}>
          <div className="flex flex-col h-full overflow-hidden">
            {/* SELETOR DE MÓDULOS */}
            <div className="p-6 bg-slate-50 border-b shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">Ementa da Jornada</h2>
                <Badge className="bg-primary text-white text-[10px] font-black border-none px-3 h-6 rounded-full">{modules.length} Módulos</Badge>
              </div>
              
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 scrollbar-thin">
                {modules.map((module, idx) => (
                  <button 
                    key={module.id}
                    onClick={() => {
                      setActiveModuleId(module.id);
                      if (contents[module.id]?.length > 0) setActiveContentId(contents[module.id][0].id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border-2 relative overflow-hidden group ${
                      activeModuleId === module.id 
                        ? 'bg-primary text-white border-primary shadow-xl' 
                        : 'bg-white border-transparent hover:border-accent/20 text-primary/60'
                    }`}>
                    <div className="flex items-center gap-4 relative z-10">
                      <span className={`text-base font-black italic transition-colors ${activeModuleId === module.id ? 'text-accent' : 'text-primary/20'}`}>
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <p className="font-black text-xs uppercase tracking-wider truncate flex-1">{module.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* MATERIAIS DO MÓDULO - ROLAGEM INDEPENDENTE */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
               <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-accent" />
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Materiais da Unidade</h3>
               </div>
               
               <div className="space-y-2 pb-10">
                 {contents[activeModuleId || ""]?.map((content) => (
                    <button 
                      key={content.id}
                      onClick={() => {
                        setActiveContentId(content.id);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' }); // Volta ao topo ao mudar conteúdo
                      }}
                      className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 border-2 ${
                        activeContentId === content.id 
                          ? 'bg-accent/5 border-accent/40 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-accent/20 hover:bg-slate-50'
                      }`}>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          activeContentId === content.id ? 'bg-accent text-white shadow-lg' : 'bg-slate-100 text-primary/30'
                        }`}>
                           {content.type === 'video' ? <PlayCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-black text-xs uppercase tracking-wider truncate transition-colors ${
                            activeContentId === content.id ? 'text-primary' : 'text-primary/60'
                          }`}>{content.title}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 leading-none mt-1">{content.type}</p>
                        </div>
                        {activeContentId === content.id && (
                          <div className="h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                        )}
                    </button>
                 ))}
                 {(!contents[activeModuleId || ""] || contents[activeModuleId || ""].length === 0) && (
                   <div className="py-12 text-center border-4 border-dashed rounded-[2rem] opacity-20 bg-muted/5">
                      <p className="text-[10px] font-black uppercase italic tracking-widest">Sem Materiais Vinculados</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
