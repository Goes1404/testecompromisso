
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
  CheckCircle2,
  Plus
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider"; 
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  category: string;
}

interface Announcement {
  id: number;
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
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [recentProgress, setRecentProgress] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [isStarting, setIsStarting] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoadingProgress(true);
    try {
      // Busca o progresso e tenta trazer os detalhes da trilha via relacionamento
      const { data: progress, error } = await supabase
        .from('user_progress')
        .select(`
          id, 
          percentage, 
          last_accessed, 
          trail_id,
          trails (
            title, 
            category, 
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false })
        .limit(5);
      
      if (error) {
        // Se o erro for de relacionamento, explicamos melhor no console
        if (error.message.includes('relationship')) {
          console.warn("Atenção: Relacionamento entre user_progress e trails não encontrado no banco. Rode o SQL fornecido.");
        } else {
          console.error("Erro Supabase Progresso:", error.message, error.details);
        }
        setRecentProgress([]);
        return;
      }

      // Mapeia garantindo que a trilha existe para evitar erros de renderização
      const mappedProgress = progress?.map(p => ({
        ...p,
        trail: Array.isArray(p.trails) ? p.trails[0] : p.trails
      })).filter(p => p.trail);

      setRecentProgress(mappedProgress || []);
    } catch (e: any) {
      console.error("Erro fatal ao buscar progresso:", e.message || e);
    } finally {
      setLoadingProgress(false);
    }
  }, [user]);

  useEffect(() => {
    async function fetchHomeData() {
      if (!user) return;

      setLoadingAnnouncements(true);
      setAnnouncements([
           { id: 2, title: 'Simulados de Março', message: 'Os novos simulados de Biologia e Química já estão disponíveis no banco de questões.', priority: 'medium' },
           { id: 1, title: 'Boas-vindas à Rede Compromisso!', message: 'Explore as trilhas de estudo e use o simulador de isenção para garantir seus direitos.', priority: 'low' },
      ]);
      setLoadingAnnouncements(false);

      setLoadingLibrary(true);
      try {
        const { data: featured } = await supabase
          .from('trails')
          .select('*')
          .or('status.eq.active,status.eq.published')
          .limit(3);
        
        setLibraryItems(featured?.map(f => ({ 
          id: f.id, 
          title: f.title, 
          description: f.description, 
          category: f.category 
        })) || []);
      } catch (e) {
        console.error("Erro ao buscar biblioteca recomendada");
      } finally {
        setLoadingLibrary(false);
      }

      await fetchProgress();
    }
    fetchHomeData();
  }, [user, fetchProgress]);

  const handleQuickStart = async (trailId: string) => {
    if (!user || isStarting || !isSupabaseConfigured) return;
    
    setIsStarting(trailId);
    try {
      const { data: existing } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('trail_id', trailId)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase.from('user_progress').insert({
          user_id: user.id,
          trail_id: trailId,
          percentage: 0,
          last_accessed: new Date().toISOString()
        });

        if (insertError) throw insertError;
        toast({ title: "Trilha Iniciada!", description: "Ela agora aparece na sua lista de atividades recentes." });
      } else {
        await supabase
          .from('user_progress')
          .update({ last_accessed: new Date().toISOString() })
          .eq('id', existing.id);
        
        toast({ title: "Atividade Retomada", description: "A trilha foi movida para o topo da sua lista." });
      }

      await fetchProgress();
    } catch (e: any) {
      console.error("Erro ao iniciar trilha:", e.message || e);
      toast({ title: "Erro ao sincronizar", description: "Verifique se a tabela de progresso foi criada corretamente com Foreign Keys.", variant: "destructive" });
    } finally {
      setIsStarting(null);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex flex-col h-96 items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sintonizando Portal...</p>
      </div>
    );
  }

  const userName = profile?.name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Estudante';

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
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
             Transforme dedicação em conquistas reais. Suas trilhas ativas estão logo abaixo.
           </p>
         </div>
      </section>

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
              <div className="space-y-3">
                {announcements.map(ann => {
                  const Icon = priorityStyles[ann.priority].icon;
                  const color = priorityStyles[ann.priority].color;
                  const bgColor = priorityStyles[ann.priority].bgColor;
                  return (
                    <div key={ann.id} className={`p-4 rounded-xl flex items-start gap-4 shadow-sm ${bgColor} animate-in slide-in-from-left duration-500`}>
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${color}`}>{ann.title}</p>
                        <p className="text-xs text-slate-600">{ann.message}</p>
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
              {recentProgress.length > 0 && (
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted/20 px-3 py-1 rounded-full">
                  Últimas 5 trilhas ativas
                </span>
              )}
            </div>
            
            {loadingProgress ? (
              <div className="py-20 flex justify-center flex-col items-center gap-4 border-2 border-dashed rounded-[2.5rem]">
                <Loader2 className="animate-spin text-accent h-8 w-8" />
                <p className="text-[10px] font-black uppercase text-muted-foreground">Sincronizando Atividades...</p>
              </div>
            ) : recentProgress.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {recentProgress.map((prog) => {
                  const isFinished = prog.percentage === 100;
                  const trailData = prog.trail;
                  
                  if (!trailData) return null;

                  return (
                    <Link key={prog.id} href={`/dashboard/classroom/${prog.trail_id}`}>
                      <Card className={`border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-white rounded-3xl p-5 flex flex-col md:flex-row items-center gap-6 group relative overflow-hidden ${isFinished ? 'bg-slate-50/50' : ''}`}>
                        {isFinished && (
                          <div className="absolute top-0 right-0 p-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500 opacity-20" />
                          </div>
                        )}
                        <div className={`h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${isFinished ? 'bg-green-50 text-green-600' : 'bg-accent/10 text-accent'}`}>
                          {isFinished ? <CheckCircle2 className="h-8 w-8" /> : <PlayCircle className="h-8 w-8" />}
                        </div>
                        <div className="flex-1 space-y-2 w-full">
                          <div className="flex justify-between items-center">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isFinished ? 'text-green-600' : 'text-accent'}`}>
                              {trailData.category} {isFinished && '• CONCLUÍDA'}
                            </span>
                            <span className="text-[8px] font-black text-primary/40 uppercase flex items-center gap-1 italic">
                              <Clock className="h-3 w-3"/> {prog.last_accessed ? formatDistanceToNow(new Date(prog.last_accessed), { addSuffix: true, locale: ptBR }) : 'Recém iniciada'}
                            </span>
                          </div>
                          <h3 className="font-black text-base text-primary italic leading-none truncate max-w-[300px]">
                            {trailData.title}
                          </h3>
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-black text-primary/40 uppercase">Evolução</span>
                              <span className={`text-[10px] font-black italic ${isFinished ? 'text-green-600' : 'text-accent'}`}>{prog.percentage}%</span>
                            </div>
                            <Progress value={prog.percentage} className="h-1 rounded-full overflow-hidden bg-muted">
                               <div className={`h-full transition-all duration-1000 ${isFinished ? 'bg-green-500' : 'bg-accent'}`} style={{ width: `${prog.percentage}%` }} />
                            </Progress>
                          </div>
                        </div>
                        <ChevronRight className="hidden md:block h-5 w-5 text-muted-foreground/30 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                      </Card>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center border-4 border-dashed rounded-[2.5rem] bg-muted/5 opacity-40">
                <PlayCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-black italic text-primary">Inicie sua primeira trilha ao lado!</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mt-2">Suas trilhas aparecerão aqui automaticamente.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
            <h3 className="text-xl font-black text-primary italic px-2">Sistema Monitorado</h3>
            <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] p-8 overflow-hidden relative group">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-3xl bg-white/10 flex items-center justify-center shadow-lg"><ShieldCheck className="h-8 w-8 text-accent" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Rede Compromisso</p>
                    <p className="text-xl font-black italic">Status: Operacional</p>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-accent">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Dica da Aurora</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed italic opacity-80">"Comece uma das recomendações abaixo e veja seu dashboard ganhar vida."</p>
                </div>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-black h-12 rounded-2xl shadow-xl transition-all border-none">
                  <Link href="/dashboard/chat">Falar com Mentor</Link>
                </Button>
              </div>
            </Card>

            <h3 className="text-xl font-black text-primary italic px-2">Sugestões de Início</h3>
            <div className="space-y-4">
              {loadingLibrary ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-accent h-6 w-6" />
                  <p className="text-[8px] font-black uppercase opacity-40">Buscando Recomendações...</p>
                </div>
              ) : libraryItems.length > 0 ? libraryItems.map((item) => (
                <Card key={item.id} className="p-4 border-none shadow-lg bg-white rounded-2xl hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-xl bg-muted/30 relative overflow-hidden shrink-0">
                      <Image src={`https://picsum.photos/seed/${item.id}/100/100`} alt={item.title} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge className="bg-primary/5 text-primary text-[7px] border-none font-black uppercase mb-1">{item.category}</Badge>
                      <h4 className="font-black text-xs text-primary truncate italic">{item.title}</h4>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleQuickStart(item.id)}
                      disabled={isStarting === item.id}
                      className="h-8 w-8 rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-white shrink-0"
                    >
                      {isStarting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-10 opacity-20 border-2 border-dashed rounded-2xl">
                  <Library className="mx-auto mb-2 h-6 w-6" />
                  <p className="text-[8px] font-black uppercase">Acervo Vazio</p>
                </div>
              )}
              <Button asChild variant="ghost" className="w-full text-[10px] font-black uppercase text-accent hover:bg-accent/5">
                <Link href="/dashboard/trails">Ver Catálogo Completo <ChevronRight className="ml-1 h-3 w-3"/></Link>
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
