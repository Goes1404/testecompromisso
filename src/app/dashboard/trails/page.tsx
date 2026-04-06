"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardFooter, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Search,
  Filter,
  Loader2,
  ChevronRight,
  Zap,
  TrendingUp,
  BookOpen,
  Pin,
  CheckCircle2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const TRAIL_CATEGORIES = ["Todos", "Matemática", "Linguagens", "Física", "Biologia", "História", "Geografia", "Atualidades", "Literatura", "Química", "Filosofia", "Sociologia"];
const AUDIENCE_FILTERS = [
  { id: "all", label: "Toda a Comunidade" },
  { id: "etec", label: "Perfil ETEC" },
  { id: "uni", label: "Perfil Enem e Vestibulares" }
];

export default function LearningTrailsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const dataFetchedRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activeAudience, setActiveAudience] = useState("all");
  
  const [dbTrails, setDbTrails] = useState<any[]>([]);
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinningId, setPinningId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Proteção Industrial: Só busca dados se o perfil estiver carregado
    if (!user || !profile || dataFetchedRef.current) return;
    
    setLoading(true);
    dataFetchedRef.current = true;

    try {
      const userAudience = profile?.profile_type === 'enem' ? 'enem' : 'etec';
      
      // Busca simples (sem filtro de coluna que pode não existir)
      let trailsResult = await supabase.from('trails')
        .select('*')
        .or('status.eq.active,status.eq.published')
        .order('created_at', { ascending: false });

      // Filtra por segmentação no front-end
      if (trailsResult.data) {
        trailsResult.data = trailsResult.data.filter(t => {
          if (!t.target_audience) return true;
          return t.target_audience === 'all' || t.target_audience === userAudience;
        });
      }

      const progressResult = await supabase.from('user_progress').select('*').eq('user_id', user.id);

      if (trailsResult.data) setDbTrails(trailsResult.data);
      if (progressResult.data) setAllProgress(progressResult.data);
    } catch (e: any) {
      console.error("Error loading trails:", e);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) fetchData();
  }, [user, profile, fetchData]);

  const handlePinTrail = async (trailId: string) => {
    if (!user || pinningId) return;
    setPinningId(trailId);
    
    try {
      const { error } = await supabase.from('user_progress').upsert({
          user_id: user.id,
          trail_id: trailId,
          last_accessed: new Date().toISOString()
        }, { onConflict: 'user_id,trail_id' });

      if (error) throw error;

      toast({
        title: "Trilha Fixada! 📌",
        description: "Acesse rapidamente pela Página Inicial."
      });
      
      const { data: progressRes } = await supabase.from('user_progress').select('*').eq('user_id', user.id);
      if (progressRes) setAllProgress(progressRes);
    } catch (e: any) {
      toast({ title: "Falha ao fixar", variant: "destructive" });
    } finally {
      setPinningId(null);
    }
  };

  const filteredTrails = useMemo(() => {
    if (!Array.isArray(dbTrails)) return [];
    return dbTrails.filter(trail => {
      const trailTitle = (trail?.title || '').toLowerCase();
      const trailCategory = (trail?.category || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      
      const matchesSearch = trailTitle.includes(query) || trailCategory.includes(query);
      const matchesCategory = activeCategory === "Todos" || trail?.category === activeCategory;
      const matchesAudience = activeAudience === "all" || trail?.target_audience === activeAudience || trail?.target_audience === "both" || !trail?.target_audience;
      
      return matchesSearch && matchesCategory && matchesAudience;
    });
  }, [dbTrails, searchTerm, activeCategory, activeAudience]);

  if (loading && !dataFetchedRef.current) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <p className="mt-6 text-primary font-black italic uppercase tracking-[0.3em] text-[10px] animate-pulse">Sintonizando Estúdio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1 md:px-4">
      <section className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-8 md:p-16 text-white shadow-2xl text-center border border-white/5">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 md:w-96 md:h-96 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />
        <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
          <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-[9px] px-4 py-1.5 uppercase tracking-wider shadow-xl">COMPROMISSO 360</Badge>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter leading-[0.9] uppercase">
            Sua Rota de <br/><span className="text-primary italic underline decoration-primary/30 decoration-8 underline-offset-8">Alta Performance</span>
          </h1>
          <p className="text-sm md:text-xl text-gray-400 font-medium italic leading-relaxed max-w-xl mx-auto">
            Escolha um dos eixos temáticos e inicie sua jornada guiada rumo ao sucesso acadêmico.
          </p>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
            <Input 
              placeholder="Pesquisar trilha..." 
              className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl text-base font-medium italic focus-visible:ring-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-14 px-8 rounded-2xl bg-white border-none shadow-xl font-black text-[10px] uppercase gap-3 hover:bg-muted/50 transition-all">
                <Filter className="h-5 w-5 text-accent" />
                Filtrar Perfil
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-none shadow-2xl">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-3">Público-Alvo</DropdownMenuLabel>
              {AUDIENCE_FILTERS.map(filter => (
                <DropdownMenuItem 
                  key={filter.id} 
                  onClick={() => setActiveAudience(filter.id)}
                  className={`rounded-xl px-3 py-3 font-bold text-xs cursor-pointer mb-1 ${activeAudience === filter.id ? 'bg-primary text-white' : ''}`}
                >
                  {filter.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-4 scrollbar-hide">
          {TRAIL_CATEGORIES.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-8 h-14 text-[10px] font-black uppercase tracking-widest shrink-0 transition-all shadow-md border-none ${activeCategory === cat ? 'bg-primary text-white scale-105 shadow-primary/20' : 'bg-white text-primary hover:bg-primary/5 hover:scale-105'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTrails.map((trail) => {
          const userProgress = allProgress?.find(p => p.trail_id === trail.id);
          const percentage = userProgress?.percentage || 0;
          const isPinned = !!userProgress;

          return (
            <Card key={trail.id} className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-white rounded-[2.5rem] flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
              <div className="relative aspect-video overflow-hidden shrink-0">
                <Image 
                  src={trail.image_url || `https://picsum.photos/seed/trail-${trail.id}/800/450`} 
                  alt={trail.title} 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-60" />
                <div className="absolute top-5 left-5">
                  <Badge className="bg-white/95 backdrop-blur-md text-primary border-none shadow-lg px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-accent fill-accent" />
                    {trail.category}
                  </Badge>
                </div>
                
                <button 
                  onClick={() => handlePinTrail(trail.id)}
                  disabled={pinningId === trail.id}
                  className={`absolute top-5 right-5 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90 ${
                    isPinned 
                      ? 'bg-accent text-accent-foreground' 
                      : 'bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-primary'
                  }`}
                  title={isPinned ? "Fixada na Home" : "Fixar na Home"}
                >
                  {pinningId === trail.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isPinned ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Pin className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              <CardContent className="p-8 flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                  <h3 className="text-2xl font-black text-primary italic leading-tight group-hover:text-accent transition-colors line-clamp-2">
                    {trail.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium italic line-clamp-3 opacity-80 leading-relaxed">
                    {trail.description || "Inicie agora esta jornada técnica projetada para fortalecer sua base acadêmica e acelerar sua aprovação."}
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-primary/40 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      {percentage}% Evoluído
                    </span>
                    <span>{percentage === 100 ? 'Finalizada' : 'Em andamento'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner border border-black/5">
                     <div className="h-full bg-accent transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="px-8 pb-8 pt-0 mt-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full pt-6 border-t border-muted/10 gap-4 sm:gap-0">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center border border-muted/10 overflow-hidden shrink-0 shadow-sm">
                      <Image 
                        src={`https://picsum.photos/seed/prof-${trail.id}/100/100`} 
                        alt="Mentor" 
                        width={40} 
                        height={40} 
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[10px] font-black text-primary italic leading-none truncate">{trail.teacher_name || "Mentor da Rede"}</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Especialista</span>
                    </div>
                  </div>
                  <Button asChild className="w-full sm:w-auto bg-primary text-white font-black text-[10px] uppercase h-12 px-6 sm:px-8 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all group/btn border-none shrink-0">
                    <Link href={`/dashboard/classroom/${trail.id}`}>
                      Entrar <ChevronRight className="h-4 w-4 ml-2 text-accent group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
