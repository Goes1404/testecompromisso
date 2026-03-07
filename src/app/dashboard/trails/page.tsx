
"use client";

import { useState, useMemo, useEffect } from "react";
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
  Layers, 
  PlayCircle, 
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Loader2,
  ChevronRight,
  Zap,
  Clock
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";

const TRAIL_CATEGORIES = ["Todos", "Matemática", "Tecnologia", "Linguagens", "Física", "Biologia", "História", "Geografia"];
const AUDIENCE_FILTERS = [
  { id: "all", label: "Toda a Comunidade" },
  { id: "etec", label: "Perfil ETEC" },
  { id: "uni", label: "Perfil Vestibular" }
];

export default function LearningTrailsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activeAudience, setActiveAudience] = useState("all");
  
  const [dbTrails, setDbTrails] = useState<any[]>([]);
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const { data: trails, error: trailsError } = await supabase
          .from('trails')
          .select('*')
          .or('status.eq.active,status.eq.published')
          .order('created_at', { ascending: false });

        if (trailsError) throw trailsError;

        const { data: progress } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id);

        setDbTrails(trails || []);
        setAllProgress(progress || []);
      } catch (e) {
        console.error("Erro ao sincronizar trilhas:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-accent" />
        <p className="mt-6 text-primary font-black italic uppercase tracking-[0.3em] text-xs animate-pulse">Sintonizando Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20 px-2 md:px-4">
      {/* Hero Section Modernizada */}
      <section className="relative overflow-hidden bg-primary rounded-[2rem] md:rounded-[3rem] p-8 md:p-20 text-white shadow-2xl">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 md:w-96 md:h-96 bg-accent/20 rounded-full blur-[60px] md:blur-[120px]" />
        <div className="relative z-10 space-y-6 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent text-accent-foreground border-none font-black text-[9px] md:text-[11px] px-4 py-1.5 rounded-full shadow-lg">CATÁLOGO 2024</Badge>
            <span className="text-white/40 text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] hidden sm:inline">Tecnologia a serviço da sua aprovação</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter leading-[0.95]">
            Trilhas de <span className="text-accent underline underline-offset-8 md:underline-offset-[16px] decoration-4 md:decoration-8">Alta Performance</span>
          </h1>
          <p className="text-base md:text-xl text-white/70 font-medium italic leading-relaxed max-w-2xl">
            Escolha sua jornada e inicie agora o caminho técnico para conquistar sua vaga na universidade ou mercado.
          </p>
        </div>
      </section>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Buscar trilha ou matéria..." 
            className="pl-14 h-14 md:h-16 bg-white border-none shadow-xl rounded-2xl md:rounded-[1.5rem] text-sm md:text-lg font-medium italic focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-14 md:h-16 px-6 md:px-10 rounded-2xl md:rounded-[1.5rem] bg-white border-none shadow-xl hover:bg-muted transition-all font-black text-xs uppercase tracking-widest gap-3 flex-1 md:flex-none">
                <Filter className={`h-5 w-5 ${activeAudience !== 'all' ? 'text-accent' : ''}`} />
                Público-Alvo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-none shadow-2xl">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-3 py-3">Filtrar Perfil</DropdownMenuLabel>
              {AUDIENCE_FILTERS.map(filter => (
                <DropdownMenuItem 
                  key={filter.id} 
                  onClick={() => setActiveAudience(filter.id)}
                  className={`rounded-xl px-3 py-3.5 font-bold text-sm cursor-pointer mb-1 transition-colors ${activeAudience === filter.id ? 'bg-primary text-white shadow-lg' : 'hover:bg-muted'}`}
                >
                  {filter.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
        <div className="flex items-center gap-3 min-w-max">
          {TRAIL_CATEGORIES.map(cat => (
            <Button 
              key={cat} 
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-6 md:px-10 h-11 md:h-14 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-none shadow-md ${activeCategory === cat ? 'bg-primary text-white scale-105 shadow-primary/30' : 'bg-white text-primary hover:bg-muted'}`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
        {filteredTrails.length > 0 ? (
          filteredTrails.map((trail, index) => {
            const userProgress = allProgress?.find(p => p.trail_id === trail.id);
            const percentage = userProgress?.percentage || 0;
            const isCompleted = percentage === 100;

            return (
              <Card key={trail.id} className="group overflow-hidden border-none shadow-xl hover:shadow-2xl md:hover:-translate-y-4 transition-all duration-500 bg-white rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col relative animate-in fade-in slide-in-from-bottom-10" style={{ animationDelay: `${index * 100}ms` }}>
                
                <div className="relative aspect-[16/10] overflow-hidden cursor-pointer">
                  <Image 
                    src={trail.image_url || `https://picsum.photos/seed/${trail.id}/800/600`} 
                    alt={trail.title} 
                    fill 
                    className="object-cover transition-transform duration-1000 md:group-hover:scale-110"
                    priority={index < 3}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent opacity-70 md:group-hover:opacity-50 transition-opacity duration-500" />
                  
                  <div className="absolute top-6 left-6 flex gap-2">
                    <Badge className="bg-white/90 backdrop-blur-md text-primary border-none shadow-xl flex items-center gap-2 px-4 py-2 rounded-2xl">
                      <Zap className="h-4 w-4 text-accent fill-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{trail.category}</span>
                    </Badge>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 hidden md:block">
                    <Button asChild className="w-full bg-accent text-accent-foreground font-black h-14 rounded-2xl shadow-2xl border-none">
                      <Link href={`/dashboard/classroom/${trail.id}`}>
                        <PlayCircle className="h-5 w-5 mr-3" />
                        {percentage > 0 ? 'CONTINUAR ESTUDOS' : 'INICIAR TRILHA AGORA'}
                      </Link>
                    </Button>
                  </div>
                </div>
                
                <CardHeader className="p-8 md:p-10 space-y-4 flex-1">
                  <div className="space-y-3">
                    <CardTitle className="text-2xl md:text-3xl font-black text-primary italic leading-[1.1] md:group-hover:text-accent transition-colors duration-300 line-clamp-2">
                      {trail.title}
                    </CardTitle>
                    <p className="text-xs md:text-base text-muted-foreground font-medium leading-relaxed line-clamp-3 italic opacity-80">
                      {trail.description || "Esta jornada acadêmica foi desenhada estrategicamente para fortalecer suas bases e acelerar sua aprovação."}
                    </p>
                  </div>

                  <div className="pt-4 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <span className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-accent" />
                        )}
                        {isCompleted ? 'Trilha Concluída' : `${percentage}% Evoluído`}
                      </span>
                      <span className="flex items-center gap-1.5 opacity-40"><Clock className="h-3 w-3"/> Ativo Agora</span>
                    </div>
                    <Progress value={percentage} className="h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                       <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${percentage}%` }} />
                    </Progress>
                  </div>
                </CardHeader>
                
                <CardFooter className="px-8 md:px-10 pb-8 md:pb-10 pt-0 mt-auto">
                  <div className="flex items-center justify-between w-full pt-6 border-t border-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center border-2 border-white shadow-lg overflow-hidden shrink-0">
                        <Image 
                          src={`https://picsum.photos/seed/prof-${trail.id}/100/100`} 
                          alt="Mentor" 
                          width={40} 
                          height={40} 
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-primary italic leading-none">
                          {trail.teacher_name || "Mentor Especialista"}
                        </span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Líder Pedagógico</span>
                      </div>
                    </div>
                    <Button asChild variant="ghost" className="text-accent group/link flex items-center gap-2 font-black text-[10px] uppercase p-0 h-auto hover:bg-transparent">
                      <Link href={`/dashboard/classroom/${trail.id}`}>
                        Acessar Sala <ChevronRight className="h-4 w-4 md:group-hover/link:translate-x-1.5 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-24 md:py-40 text-center border-4 border-dashed border-muted/20 rounded-[3rem] md:rounded-[5rem] bg-white/50 animate-in zoom-in-95 duration-700">
            <Layers className="h-20 md:h-32 w-20 md:w-32 text-muted-foreground/20 mx-auto mb-8" />
            <p className="font-black text-primary italic text-2xl md:text-4xl uppercase tracking-tighter">Nenhuma Trilha Sintonizada</p>
            <p className="text-sm md:text-lg text-muted-foreground font-medium mt-4 max-w-sm mx-auto italic">Os mentores estão preparando novos conteúdos. Verifique novamente em instantes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
