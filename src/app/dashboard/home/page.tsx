
"use client";

import { useState, useEffect } from "react";
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
  CheckCircle2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider"; 
import { supabase } from "@/app/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [recentProgress, setRecentProgress] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    async function fetchHomeData() {
      if (!user) return;

      setLoadingAnnouncements(true);
      // Simulação de avisos (geralmente fixos do polo)
      setAnnouncements([
           { id: 2, title: 'Manutenção Programada', message: 'A plataforma passará por uma manutenção rápida na próxima sexta-feira às 23h.', priority: 'medium' },
           { id: 1, title: 'Boas-vindas à Plataforma Compromisso!', message: 'Explore as trilhas de estudo e não hesite em usar o fórum para tirar dúvidas.', priority: 'low' },
      ]);
      setLoadingAnnouncements(false);

      setLoadingLibrary(true);
      // Busca trilhas em destaque como acervo
      const { data: featured } = await supabase.from('trails').select('*').limit(4);
      setLibraryItems(featured?.map(f => ({ id: f.id, title: f.title, description: f.description, category: f.category })) || []);
      setLoadingLibrary(false);

      setLoadingProgress(true);
      // Busca as últimas 5 trilhas acessadas pelo usuário
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*, trail:trails(title, category, image_url)')
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false })
        .limit(5);
      
      setRecentProgress(progress || []);
      setLoadingProgress(false);
    }
    fetchHomeData();
  }, [user]);

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
             Transforme dedicação em conquistas reais. O futuro começa com o que você aprende hoje.
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
                  Exibindo {recentProgress.length} mais recentes
                </span>
              )}
            </div>
            {loadingProgress ? (
              <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-accent h-8 w-8" /></div>
            ) : recentProgress.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {recentProgress.map((prog) => {
                  const isFinished = prog.percentage === 100;
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
                              {prog.trail?.category} {isFinished && '• CONCLUÍDA'}
                            </span>
                            <span className="text-[8px] font-black text-primary/40 uppercase flex items-center gap-1 italic">
                              <Clock className="h-3 w-3"/> {formatDistanceToNow(new Date(prog.last_accessed), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                          <h3 className="font-black text-base text-primary italic leading-none truncate max-w-[300px]">
                            {prog.trail?.title}
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
                <p className="font-black italic text-primary">Inicie sua primeira trilha!</p>
                <Button asChild variant="ghost" className="text-[10px] uppercase font-black mt-2 text-accent">
                  <Link href="/dashboard/trails">Explorar Trilhas</Link>
                </Button>
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
                  <p className="text-[11px] font-medium leading-relaxed italic opacity-80">"Complete seus simulados semanais para ganhar badges de elite."</p>
                </div>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-black h-12 rounded-2xl shadow-xl transition-all border-none">
                  <Link href="/dashboard/chat">Falar com Mentor</Link>
                </Button>
              </div>
            </Card>

            <h3 className="text-xl font-black text-primary italic px-2">Acervo Recomendado</h3>
            <div className="space-y-4">
              {libraryItems.map((item) => (
                <Link key={item.id} href={`/dashboard/classroom/${item.id}`} className="block">
                  <Card className="p-4 border-none shadow-lg bg-white rounded-2xl hover:shadow-xl transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-muted/30 relative overflow-hidden shrink-0">
                        <Image src={`https://picsum.photos/seed/${item.id}/100/100`} alt={item.title} fill className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge className="bg-primary/5 text-primary text-[7px] border-none font-black uppercase mb-1">{item.category}</Badge>
                        <h4 className="font-black text-xs text-primary truncate italic">{item.title}</h4>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
}
