
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Library,
  Bot,
  ShieldCheck,
  Loader2,
  Sparkles,
  Megaphone,
  AlertOctagon,
  Info,
  TrendingUp,
  Clock,
  PlayCircle,
  ChevronRight,
  Plus,
  Zap,
  FileText,
  Video,
  FileCheck,
  Calculator,
  BrainCircuit
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider"; 
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  category: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

const priorityStyles = {
  low: { icon: Info, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  medium: { icon: Megaphone, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  high: { icon: AlertOctagon, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export default function DashboardHome() {
  const { user, profile, loading: isUserLoading } = useAuth();
  const { toast } = useToast();
  const [recommendedTrails, setRecommendedTrails] = useState<LibraryItem[]>([]);
  const [loadingTrails, setLoadingTrails] = useState(true);
  const [libraryResources, setLibraryResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [recentProgress, setRecentProgress] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [isStarting, setIsStarting] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoadingProgress(true);
    try {
      const { data: progress, error } = await supabase
        .from('user_progress')
        .select(`
          id, 
          percentage, 
          last_accessed, 
          trail_id,
          trail:trails (
            title, 
            category, 
            image_url,
            teacher_name
          )
        `)
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false })
        .limit(4);
      
      if (error) {
        console.error("Erro Supabase Progresso:", error.message);
        setRecentProgress([]);
        return;
      }

      const mappedProgress = progress?.map(p => {
        const trailData = Array.isArray(p.trail) ? p.trail[0] : p.trail;
        return { ...p, trail: trailData };
      }).filter(p => p.trail) || [];

      setRecentProgress(mappedProgress);
    } catch (e: any) {
      console.error("Erro fatal ao buscar progresso:", e);
    } finally {
      setLoadingProgress(false);
    }
  }, [user]);

  useEffect(() => {
    async function fetchHomeData() {
      if (!user) return;

      // Buscar Comunicados Reais do Banco
      setLoadingAnnouncements(true);
      try {
        const { data: annData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(2);
        
        if (annData && annData.length > 0) {
          setAnnouncements(annData);
        } else {
          setAnnouncements([
            { id: '1', title: 'Boas-vindas!', message: 'Explore as trilhas de estudo e o simulador de isenção.', priority: 'low' }
          ]);
        }
      } catch (e) {
        console.error("Erro comunicados");
      } finally {
        setLoadingAnnouncements(false);
      }

      setLoadingTrails(true);
      try {
        const { data: featured } = await supabase
          .from('trails')
          .select('*')
          .or('status.eq.active,status.eq.published')
          .limit(3);
        
        setRecommendedTrails(featured?.map(f => ({ 
          id: f.id, 
          title: f.title, 
          description: f.description, 
          category: f.category 
        })) || []);
      } catch (e) {
        console.error("Erro trilhas");
      } finally {
        setLoadingTrails(false);
      }

      setLoadingResources(true);
      try {
        const { data: res } = await supabase
          .from('library_resources')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(2);
        setLibraryResources(res || []);
      } catch (e) {
        console.error("Erro acervo");
      } finally {
        setLoadingResources(false);
      }

      await fetchProgress();
    }
    fetchHomeData();
  }, [user, fetchProgress]);

  const handleQuickStart = async (trailId: string) => {
    if (!user || isStarting || !isSupabaseConfigured) return;
    
    setIsStarting(trailId);
    try {
      const { error: upsertError } = await supabase.from('user_progress').upsert({
        user_id: user.id,
        trail_id: trailId,
        last_accessed: new Date().toISOString()
      }, { onConflict: 'user_id,trail_id' });

      if (upsertError) throw upsertError;
      
      toast({ title: "Trilha Adicionada! 🚀", description: "Ela agora aparece no seu Dashboard." });
      await fetchProgress();
    } catch (e: any) {
      toast({ title: "Erro ao sincronizar", variant: "destructive" });
    } finally {
      setIsStarting(null);
    }
  };

  if (isUserLoading) return (
    <div className="flex flex-col h-96 items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sintonizando Portal...</p>
    </div>
  );

  const userName = profile?.name?.split(' ')[0] || 'Estudante';

  const quickActions = [
    { label: "Checklist", icon: FileCheck, href: "/dashboard/student/documents", color: "bg-blue-500" },
    { label: "Simulado", icon: BrainCircuit, href: "/dashboard/student/simulados", color: "bg-purple-500" },
    { label: "Isenção", icon: Calculator, href: "/dashboard/financial-aid", color: "bg-amber-500" },
    { label: "Biblioteca", icon: Library, href: "/dashboard/library", color: "bg-green-500" },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700 px-1">
      <section className="bg-primary p-8 md:p-12 rounded-[2.5rem] text-primary-foreground relative overflow-hidden shadow-2xl">
         <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
         <div className="relative z-10 space-y-4">
           <div className="flex items-center gap-3">
             <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter leading-tight">Olá, {userName}! 👋</h1>
             <Badge className="bg-accent text-accent-foreground border-none font-black px-3 py-1 shadow-lg animate-bounce">
               <Bot className="h-3 w-3 mr-1.5" /> IA ATIVA
             </Badge>
           </div>
           <p className="text-sm md:text-lg text-primary-foreground/80 font-medium leading-relaxed italic max-w-2xl">
             Sua jornada rumo à aprovação está sendo monitorada com inteligência.
           </p>
         </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
          <Link key={i} href={action.href}>
            <Card className="border-none shadow-xl bg-white hover:bg-muted/5 transition-all group rounded-2xl overflow-hidden cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl ${action.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="font-black text-[10px] md:text-xs uppercase tracking-widest text-primary italic">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-black text-primary italic flex items-center gap-2 px-2 mb-4">
              <Megaphone className="h-5 w-5 text-accent" /> Mural de Avisos
            </h2>
            {loadingAnnouncements ? (
              <div className="py-10 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-[2.5rem] bg-white/50">
                <Loader2 className="animate-spin text-accent h-8 w-8" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {announcements.map(ann => {
                  const Icon = priorityStyles[ann.priority]?.icon || Info;
                  const color = priorityStyles[ann.priority]?.color || 'text-slate-500';
                  const bgColor = priorityStyles[ann.priority]?.bgColor || 'bg-slate-100';
                  return (
                    <div key={ann.id} className={`p-4 rounded-2xl flex items-start gap-4 shadow-sm ${bgColor} animate-in slide-in-from-left duration-500 border border-black/5`}>
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${color} truncate`}>{ann.title}</p>
                        <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed font-medium italic">{ann.message}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between px-2 mb-4">
              <h2 className="text-xl font-black text-primary italic flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" /> Continuar Aprendizado
              </h2>
            </div>
            
            {loadingProgress ? (
              <div className="py-20 flex justify-center flex-col items-center gap-4 border-2 border-dashed rounded-[2.5rem]">
                <Loader2 className="animate-spin text-accent h-8 w-8" />
              </div>
            ) : recentProgress.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentProgress.map((prog, index) => {
                  const trailData = prog.trail;
                  if (!trailData) return null;
                  return (
                    <Link key={prog.id} href={`/dashboard/classroom/${prog.trail_id}`}>
                      <Card className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-white rounded-[2rem] flex flex-col relative animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="relative aspect-[21/9] overflow-hidden">
                          <Image src={trailData.image_url || `https://picsum.photos/seed/${prog.trail_id}/600/300`} alt={trailData.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-60" />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 backdrop-blur-md text-primary border-none shadow-lg flex items-center gap-1.5 px-2 py-1 rounded-lg">
                              <Zap className="h-3 w-3 text-accent fill-accent" />
                              <span className="text-[8px] font-black uppercase tracking-wider">{trailData.category}</span>
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-5 space-y-3">
                          <h3 className="font-black text-sm text-primary italic leading-tight group-hover:text-accent transition-colors duration-300 line-clamp-1">{trailData.title}</h3>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[8px] font-black text-muted-foreground uppercase">
                              <span>Evolução</span>
                              <span className="text-accent">{prog.percentage}%</span>
                            </div>
                            <Progress value={prog.percentage} className="h-1 rounded-full bg-muted overflow-hidden">
                               <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${prog.percentage}%` }} />
                            </Progress>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center border-4 border-dashed rounded-[2.5rem] bg-muted/5 opacity-40">
                <PlayCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-black italic text-primary">Nenhuma trilha iniciada</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
            <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] p-8 overflow-hidden relative group">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-3xl bg-white/10 flex items-center justify-center shadow-lg"><ShieldCheck className="h-8 w-8 text-accent" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status da Conta</p>
                    <p className="text-xl font-black italic">Operacional</p>
                  </div>
                </div>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-black h-12 rounded-2xl shadow-xl transition-all border-none">
                  <Link href="/dashboard/chat">Chat com Mentores</Link>
                </Button>
              </div>
            </Card>

            <h3 className="text-xl font-black text-primary italic px-2 flex items-center gap-2">
              <Library className="h-5 w-5 text-accent" /> Acervo Digital
            </h3>
            <div className="space-y-4">
              {loadingResources ? (
                <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-accent h-6 w-6" /></div>
              ) : libraryResources.length > 0 ? libraryResources.map((res) => (
                <Card key={res.id} className="p-4 border-none shadow-lg bg-white rounded-2xl hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary group-hover:text-white">
                      {res.type === 'Video' ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black text-accent uppercase tracking-widest">{res.category}</p>
                      <h4 className="font-bold text-xs text-primary truncate italic">{res.title}</h4>
                    </div>
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-full text-accent">
                      <Link href="/dashboard/library"><ChevronRight className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-10 opacity-20 border-2 border-dashed rounded-2xl">
                  <p className="text-[8px] font-black uppercase">Acervo em Curadoria</p>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
