"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardFooter, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Pin,
  CheckCircle2,
  Film,
  ListVideo,
  BookOpen,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getTrailCoverUrl, isPlaceholderImage } from "@/lib/trail-cover";

const TRAIL_CATEGORIES = ["Todos", "Matemática", "Linguagens", "Física", "Biologia", "História", "Geografia", "Atualidades", "Literatura", "Química", "Filosofia", "Sociologia"];

function getSafeTrailImage(url: string | null | undefined, title: string, category: string) {
  if (!url || isPlaceholderImage(url)) {
    return getTrailCoverUrl(title, category);
  }
  return url;
}

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
  const [typeFilter, setTypeFilter] = useState<'all' | 'standalone' | 'serie'>('all');

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
      const audience = (
        profile?.exam_target ||
        user?.user_metadata?.exam_target ||
        profile?.profile_type ||
        user?.user_metadata?.profile_type ||
        'enem'
      ).toLowerCase().trim();
      const userAudience = audience.includes('etec') ? 'etec' : 'enem';

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

      if (trailsResult.data) {
        setDbTrails(trailsResult.data);
      }
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

    // Check if currently pinned (exists in progress)
    const isPinned = allProgress?.find(p => p.trail_id === trailId);

    try {
      if (isPinned) {
        // Unpin: Delete the record
        // Note: For simplicity, this removes progress too. 
        // In a complex app we'd use a 'pinned' column, but here progress is treated as 'active trails'.
        const { error } = await supabase.from('user_progress').delete().eq('user_id', user.id).eq('trail_id', trailId);
        if (error) throw error;
        toast({ title: "Trilha Removida da Home 📌", description: "O item saiu da sua lista de acesso rápido." });
      } else {
        // Pin: Upsert the record
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
      }

      const { data: progressRes } = await supabase.from('user_progress').select('*').eq('user_id', user.id);
      if (progressRes) setAllProgress(progressRes);
    } catch (e: any) {
      toast({ title: "Falha na operação", variant: "destructive" });
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
      const matchesType = typeFilter === 'all' || (trail?.trail_type ?? 'standalone') === typeFilter;

      return matchesSearch && matchesCategory && matchesAudience && matchesType;
    });
  }, [dbTrails, searchTerm, activeCategory, activeAudience, typeFilter]);

  const hasActiveFilters = activeCategory !== "Todos" || activeAudience !== "all" || typeFilter !== "all" || searchTerm !== "";

  function clearFilters() {
    setActiveCategory("Todos");
    setActiveAudience("all");
    setTypeFilter("all");
    setSearchTerm("");
  }

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
      {/* Hero Banner */}
      <section className="aurora-dark relative overflow-hidden rounded-[2.5rem] p-8 md:p-16 text-white shadow-2xl text-center border border-white/5">
        <div className="absolute inset-0 dot-grid-dark opacity-20 pointer-events-none rounded-[2.5rem]" />
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 md:w-96 md:h-96 bg-primary/20 rounded-full blur-[80px] hidden md:block" />
        <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-primary/10 rounded-full blur-[60px] hidden md:block" />
        <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
          <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-[9px] px-4 py-1.5 uppercase tracking-wider shadow-xl">COMPROMISSO 360</Badge>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter leading-[0.9] uppercase">
            Sua Rota de <br /><span className="text-gradient-brand italic">Alta Performance</span>
          </h1>
          <p className="text-sm md:text-xl text-gray-400 font-medium italic leading-relaxed max-w-xl mx-auto">
            Escolha um dos eixos temáticos e inicie sua jornada guiada rumo ao sucesso acadêmico.
          </p>
        </div>
      </section>

      {/* Barra de Filtros Unificada */}
      <div className="sticky top-2 z-20 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 bg-white/80 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-slate-100">
          {/* Busca */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
            <Input
              placeholder="Pesquisar trilha..."
              className="pl-11 h-11 bg-slate-50 border-none shadow-none rounded-xl text-sm font-medium focus-visible:ring-accent focus-visible:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros inline */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Tipo */}
            <div className="flex items-center bg-slate-50 rounded-xl p-1 gap-1">
              {([
                { id: 'all' as const, label: 'Todos', icon: null as typeof Film | null },
                { id: 'standalone' as const, label: 'Aulas', icon: Film as typeof Film | null },
                { id: 'serie' as const, label: 'Séries', icon: ListVideo as typeof Film | null },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTypeFilter(id)}
                  aria-pressed={typeFilter === id}
                  className={`h-9 px-4 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5
                    ${typeFilter === id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-500 hover:text-primary hover:bg-white'}`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {label}
                </button>
              ))}
            </div>

            {/* Público */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-11 px-4 rounded-xl font-black text-[10px] uppercase gap-2 border-none shadow-none transition-all
                    ${activeAudience !== 'all' ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {AUDIENCE_FILTERS.find(f => f.id === activeAudience)?.label ?? 'Perfil'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-none shadow-2xl">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 px-3 py-2">Público-Alvo</DropdownMenuLabel>
                {AUDIENCE_FILTERS.map(filter => (
                  <DropdownMenuItem
                    key={filter.id}
                    onClick={() => setActiveAudience(filter.id)}
                    className={`rounded-xl px-3 py-2.5 font-bold text-xs cursor-pointer mb-1 ${activeAudience === filter.id ? 'bg-primary text-white' : ''}`}
                  >
                    {filter.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-11 px-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors font-black text-[10px] uppercase flex items-center gap-1.5"
                aria-label="Limpar todos os filtros"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Categorias */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TRAIL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={`rounded-full px-6 h-10 text-[10px] font-black uppercase tracking-widest shrink-0 transition-all shadow-sm border-none
                ${activeCategory === cat
                  ? 'bg-primary text-white shadow-primary/20 shadow-md'
                  : 'bg-white text-primary hover:bg-primary/5'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contagem de resultados */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
          {filteredTrails.length === 0
            ? 'Nenhuma trilha encontrada'
            : `${filteredTrails.length} trilha${filteredTrails.length !== 1 ? 's' : ''}`}
        </p>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-accent font-bold hover:underline">
            Ver todas
          </button>
        )}
      </div>

      {/* Grid de Trilhas */}
      {filteredTrails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="h-20 w-20 rounded-[2rem] bg-slate-100 flex items-center justify-center">
            <BookOpen className="h-9 w-9 text-slate-300" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-black text-primary italic">Nenhuma trilha encontrada</p>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou pesquisar outro termo.</p>
          </div>
          <Button onClick={clearFilters} variant="outline" className="rounded-2xl font-black text-xs uppercase tracking-wider mt-2">
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTrails.map((trail) => {
            const userProgress = allProgress?.find(p => p.trail_id === trail.id);
            const percentage = userProgress?.percentage || 0;
            const isPinned = !!userProgress;
            const teacherInitial = (trail.teacher_name || "M").charAt(0).toUpperCase();

            return (
              <Card key={trail.id} className="gradient-border group overflow-hidden border-none shadow-xl hover:shadow-2xl hover:glow-orange transition-[transform,box-shadow] duration-300 bg-white rounded-[2.5rem] flex flex-col h-full">
                <div className="relative aspect-video overflow-hidden shrink-0">
                  <Image
                    src={getSafeTrailImage(trail.image_url, trail.title, trail.category)}
                    alt={trail.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getTrailCoverUrl(trail.title, trail.category);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-60" />
                  <div className="absolute top-5 left-5 flex gap-2">
                    <Badge className="bg-white/95 backdrop-blur-md text-primary border-none shadow-lg px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-accent fill-accent" />
                      {trail.category}
                    </Badge>
                    {trail.trail_type === 'serie' ? (
                      <Badge className="bg-purple-600/90 backdrop-blur-md text-white border-none shadow-lg px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5">
                        <ListVideo className="h-3 w-3" /> SÉRIE
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/90 backdrop-blur-md text-white border-none shadow-lg px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5">
                        <Film className="h-3 w-3" /> AULA
                      </Badge>
                    )}
                  </div>

                  <button
                    onClick={() => handlePinTrail(trail.id)}
                    disabled={pinningId === trail.id}
                    aria-label={isPinned ? "Remover da Home" : "Fixar na Home"}
                    className={`absolute top-5 right-5 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-90 ${isPinned
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-primary'
                      }`}
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
                    <h3 className="text-2xl font-black text-primary italic leading-tight group-hover:text-accent transition-colors">
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
                      <span>{percentage === 100 ? 'Finalizada' : percentage > 0 ? 'Em andamento' : 'Não iniciada'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner border border-black/5">
                      <div
                        className="h-full bg-accent transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        style={{ width: `${percentage}%` }}
                        role="progressbar"
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                </CardContent>

                <div className="px-8 pb-8 pt-0 mt-auto">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full pt-6 border-t border-muted/10 gap-4 sm:gap-0">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Avatar baseado em inicial — sem dependência de URL externa */}
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm">
                        <span className="text-white font-black text-sm">{teacherInitial}</span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[10px] font-black text-primary italic leading-none truncate">{trail.teacher_name || "Mentor da Rede"}</span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Especialista</span>
                      </div>
                    </div>
                    <Button asChild className="btn-shimmer w-full sm:w-auto bg-primary text-white font-black text-[10px] uppercase h-12 px-6 sm:px-8 rounded-2xl shadow-xl active:scale-95 transition-[transform,box-shadow] [touch-action:manipulation] group/btn border-none shrink-0">
                      <Link href={`/dashboard/classroom/${trail.id}`}>
                        Entrar <ChevronRight className="h-4 w-4 ml-2 text-accent group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
