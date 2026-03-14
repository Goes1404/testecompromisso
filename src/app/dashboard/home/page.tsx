"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Library,
  Bot,
  Loader2,
  Megaphone,
  AlertOctagon,
  Info,
  TrendingUp,
  PlayCircle,
  Video,
  FileText,
  FileCheck,
  Calculator,
  BrainCircuit
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider"; 
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

const priorityStyles: Record<'low' | 'medium' | 'high', { icon: any; color: string; bgColor: string }> = {
  low: { icon: Info, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  medium: { icon: Megaphone, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  high: { icon: AlertOctagon, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export default function DashboardHome() {
  const { user, profile, userRole, loading: isUserLoading } = useAuth();
  const router = useRouter();
  const dataFetchedRef = useRef(false);
  
  const [recommendedTrails, setRecommendedTrails] = useState<any[]>([]);
  const [libraryResources, setLibraryResources] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentProgress, setRecentProgress] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isUserLoading && userRole !== 'student') {
      if (userRole === 'admin') router.replace("/dashboard/admin/home");
      else if (userRole === 'teacher') router.replace("/dashboard/teacher/home");
    }
  }, [userRole, isUserLoading, router]);

  const fetchData = useCallback(async () => {
    // Otimização de requisições: Prevenir múltiplos disparos se o usuário for estável
    if (!user || !isSupabaseConfigured || dataFetchedRef.current) {
      if (dataFetchedRef.current) setLoadingData(false);
      return;
    }

    setLoadingData(true);
    dataFetchedRef.current = true;

    try {
      const [annRes, trailRes, progressRes, libRes] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(4),
        supabase.from('trails').select('*').or('status.eq.active,status.eq.published').limit(3),
        supabase.from('user_progress').select(`*, trail:trails(title, category, image_url)`).eq('user_id', user.id).order('last_accessed', { ascending: false }).limit(4),
        supabase.from('library_resources').select('*').order('created_at', { ascending: false }).limit(3)
      ]);

      if (annRes.data) setAnnouncements(annRes.data);
      if (trailRes.data) setRecommendedTrails(trailRes.data);
      if (progressRes.data) setRecentProgress(progressRes.data.filter((p: any) => p.trail));
      if (libRes.data) setLibraryResources(libRes.data);

    } catch (e: any) {
      console.error("Error loading dashboard data:", e);
      dataFetchedRef.current = false; // Permitir re-tentativa em caso de erro real
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && userRole === 'student') fetchData();
  }, [user, userRole, fetchData]);

  if (isUserLoading) return (
    <div className="flex flex-col h-96 items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sintonizando...</p>
    </div>
  );

  const userName = profile?.name?.split(' ')[0] || 'Estudante';

  const quickActions = [
    { label: "Checklist", icon: FileCheck, href: "/dashboard/student/documents", color: "bg-blue-500" },
    { label: "Simulado", icon: BrainCircuit, href: "/dashboard/student/simulados", color: "bg-purple-500" },
    { label: "Isenção", icon: Calculator, href: "/dashboard/student/documents?tab=exemption", color: "bg-amber-500" },
    { label: "Biblioteca", icon: Library, href: "/dashboard/library", color: "bg-green-500" },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500 px-1 relative">
      <section className="bg-primary p-8 md:p-12 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
         <div className="relative z-10 space-y-4">
           <div className="flex items-center gap-3">
             <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter leading-tight">Olá, {userName}! 👋</h1>
             <Badge className="bg-accent text-accent-foreground border-none font-black px-3 py-1 shadow-lg">
               <Bot className="h-3 w-3 mr-1.5" /> IA ATIVA
             </Badge>
           </div>
           <p className="text-sm md:text-lg text-white/80 font-medium leading-relaxed italic max-w-2xl">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loadingData ? (
                Array(2).fill(0).map((_, i) => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-2xl" />)
              ) : announcements.length === 0 ? (
                <p className="text-xs italic text-muted-foreground px-4 opacity-50">Nenhum aviso no momento.</p>
              ) : (
                announcements.map((ann: any) => {
                  const styles = priorityStyles[ann.priority as keyof typeof priorityStyles] || priorityStyles.low;
                  const Icon = styles.icon;
                  return (
                    <div key={ann.id} className={`p-4 rounded-2xl flex items-start gap-4 shadow-sm ${styles.bgColor} border border-black/5`}>
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${styles.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${styles.color} truncate`}>{ann.title}</p>
                        <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed font-medium italic">{ann.message}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-primary italic flex items-center gap-2 px-2 mb-4">
              <TrendingUp className="h-5 w-5 text-accent" /> Continuar Aprendizado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loadingData ? (
                Array(2).fill(0).map((_, i) => <div key={i} className="aspect-video bg-muted/20 animate-pulse rounded-[2rem]" />)
              ) : recentProgress.length === 0 ? (
                <div className="col-span-full py-12 text-center border-4 border-dashed rounded-[2.5rem] bg-muted/5 opacity-40">
                  <PlayCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-black italic text-primary">Inicie uma trilha agora.</p>
                </div>
              ) : (
                recentProgress.map((prog) => {
                  const trailData = prog.trail;
                  return (
                    <Link key={prog.id} href={`/dashboard/classroom/${prog.trail_id}`}>
                      <Card className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-white rounded-[2rem] flex flex-col">
                        <div className="relative aspect-[21/9] overflow-hidden bg-slate-100">
                          {trailData?.image_url && (
                            <Image src={trailData.image_url} alt={trailData.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent" />
                        </div>
                        <CardContent className="p-5 space-y-3">
                          <h3 className="font-black text-sm text-primary italic truncate">{trailData?.title || 'Trilha'}</h3>
                          <Progress value={prog.percentage} className="h-1 rounded-full" />
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
            <h3 className="text-xl font-black text-primary italic px-2 flex items-center gap-2">
              <Library className="h-5 w-5 text-accent" /> Acervo Digital
            </h3>
            <div className="space-y-4">
              {loadingData ? (
                Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-2xl" />)
              ) : libraryResources.length === 0 ? (
                <p className="text-xs italic text-muted-foreground px-4 opacity-50">Acervo vazio.</p>
              ) : (
                libraryResources.map((res) => (
                  <Card key={res.id} className="p-4 border-none shadow-lg bg-white rounded-2xl hover:shadow-xl transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                        {res.type === 'Video' ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-primary truncate italic">{res.title}</h4>
                      </div>
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-full text-accent">
                        <Link href="/dashboard/library"><TrendingUp className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
