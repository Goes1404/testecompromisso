"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  LayoutDashboard,
  Search,
  Loader2,
  Database,
  Eye,
  Globe,
  Lock,
  Trash2,
  Layers,
  Film,
  ListVideo,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { EDUCATIONAL_CATEGORIES } from "@/lib/constants";

export default function TeacherTrailsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [trails, setTrails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTrail, setNewTrail] = useState({ title: "", category: "Matemática", description: "", target_audience: "all", image_url: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Merge mode
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [serieName, setSerieName] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  const fetchTrails = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trails')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTrails(data || []);
    } catch (e) {
      console.error("Erro ao buscar trilhas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrails(); }, [user]);

  const handleCreateTrail = async () => {
    if (!newTrail.title || !user || isSubmitting) {
      if (!newTrail.title) toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const trailData: any = {
        title: newTrail.title,
        category: newTrail.category,
        description: newTrail.description,
        teacher_id: user.id,
        teacher_name: profile?.name || user.user_metadata?.full_name || "Professor",
        status: "draft",
        trail_type: "standalone",
        image_url: newTrail.image_url,
      };

      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const filePath = `trails/cover-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('learning-contents').upload(filePath, coverFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('learning-contents').getPublicUrl(filePath);
          trailData.image_url = urlData.publicUrl;
        }
      }
      if (!trailData.image_url) {
        trailData.image_url = `https://picsum.photos/seed/trail-${Date.now()}/600/400`;
      }
      if (newTrail.target_audience !== "all") {
        trailData.target_audience = newTrail.target_audience;
      }

      const { data, error } = await supabase.from('trails').insert([trailData]).select().single();
      if (error) throw new Error(error.message);

      toast({ title: "Trilha Criada!", description: "Continue editando os módulos para publicar." });
      setTrails(prev => [data, ...prev]);
      setIsCreateDialogOpen(false);
      setNewTrail({ title: "", category: "Matemática", description: "", target_audience: "all", image_url: "" });
      setCoverFile(null);
      setTimeout(() => { document.body.style.pointerEvents = ""; }, 500);
    } catch (e: any) {
      toast({ title: "Erro ao criar trilha", description: e?.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrail = async (id: string) => {
    if (!confirm("Tem certeza? Todos os módulos e conteúdos vinculados serão removidos.")) return;
    try {
      const { error } = await supabase.from('trails').delete().eq('id', id);
      if (error) throw error;
      setTrails(prev => prev.filter(t => t.id !== id));
      toast({ title: "Trilha excluída." });
    } catch (e: any) {
      toast({ title: "Falha na exclusão", description: e.message, variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleMergeTrails = async () => {
    if (selectedIds.size < 2 || !serieName.trim() || !user || isMerging) return;
    setIsMerging(true);

    const ids = Array.from(selectedIds);
    const firstTrail = trails.find(t => t.id === ids[0]);

    try {
      // 1. Criar a trilha série
      const { data: serie, error: serieErr } = await supabase
        .from('trails')
        .insert({
          title: serieName.trim(),
          category: firstTrail?.category || "Geral",
          description: `Série criada a partir de ${ids.length} aulas.`,
          teacher_id: user.id,
          teacher_name: profile?.name || user.user_metadata?.full_name || "Professor",
          status: firstTrail?.status || "draft",
          trail_type: "serie",
          target_audience: firstTrail?.target_audience || "all",
          image_url: firstTrail?.image_url || `https://picsum.photos/seed/serie-${Date.now()}/600/400`,
        })
        .select('id')
        .single();

      if (serieErr || !serie) throw new Error(serieErr?.message || "Falha ao criar série");

      // 2. Reassociar os módulos de cada trilha selecionada para a série
      for (const trailId of ids) {
        const { error: modErr } = await supabase
          .from('modules')
          .update({ trail_id: serie.id })
          .eq('trail_id', trailId);
        if (modErr) throw new Error(`Módulos de ${trailId}: ${modErr.message}`);
      }

      // 3. Remover as trilhas originais
      const { error: delErr } = await supabase.from('trails').delete().in('id', ids);
      if (delErr) throw new Error(delErr.message);

      toast({ title: "Série criada!", description: `"${serieName}" agrupa ${ids.length} aulas.` });
      setIsMergeDialogOpen(false);
      setSerieName("");
      setSelectedIds(new Set());
      setMergeMode(false);
      await fetchTrails();
    } catch (e: any) {
      toast({ title: "Erro ao criar série", description: e.message, variant: "destructive" });
    } finally {
      setIsMerging(false);
    }
  };

  const filteredTrails = trails.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20 px-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-primary italic leading-none">Gestão de Trilhas</h1>
          <p className="text-muted-foreground font-medium text-sm">Administre aulas avulsas e séries pedagógicas.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Modo Unificar */}
          {mergeMode ? (
            <Button
              variant="outline"
              onClick={() => { setMergeMode(false); setSelectedIds(new Set()); }}
              className="rounded-xl h-12 border-2 font-black text-sm px-5 gap-2"
            >
              <X className="h-4 w-4" /> Cancelar
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setMergeMode(true)}
              className="rounded-xl h-12 border-2 border-primary/20 font-black text-sm px-5 gap-2 hover:border-primary hover:bg-primary/5"
            >
              <Layers className="h-4 w-4 text-primary" /> Criar Série
            </Button>
          )}

          {/* Nova Trilha Manual */}
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setTimeout(() => { document.body.style.pointerEvents = ""; }, 100);
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-primary text-white font-black px-6 md:px-8 shadow-xl hover:scale-105 transition-all">
                <Plus className="h-5 w-5 mr-2" /> Nova Aula
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] p-5 md:p-6 bg-white w-[95vw] sm:w-full max-w-lg border-none shadow-2xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-black italic text-primary">Nova Aula / Trilha</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase opacity-40">Título</Label>
                  <Input placeholder="Ex: Funções do 2º Grau" className="h-10 rounded-xl bg-muted/30 border-none font-bold" value={newTrail.title} onChange={(e) => setNewTrail({ ...newTrail, title: e.target.value })} disabled={isSubmitting} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase opacity-40">Categoria</Label>
                    <Select value={newTrail.category} onValueChange={(v) => setNewTrail({ ...newTrail, category: v })} disabled={isSubmitting}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl max-h-60">
                        {EDUCATIONAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase opacity-40">Público-Alvo</Label>
                    <Select value={newTrail.target_audience} onValueChange={(v) => setNewTrail({ ...newTrail, target_audience: v })} disabled={isSubmitting}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="etec">Apenas ETEC</SelectItem>
                        <SelectItem value="enem">Apenas ENEM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase opacity-40">Capa (arquivo ou URL)</Label>
                  <div className="flex flex-col gap-2">
                    <Input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="h-10 rounded-xl bg-muted/30 border-2 border-dashed border-primary/20 cursor-pointer p-1.5 file:mr-4 file:py-1 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-white" disabled={isSubmitting} />
                    {!coverFile && (
                      <Input placeholder="Ou URL: https://..." className="h-10 rounded-xl bg-muted/30 border-none font-bold text-xs" value={newTrail.image_url} onChange={(e) => setNewTrail({ ...newTrail, image_url: e.target.value })} disabled={isSubmitting} />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase opacity-40">Descrição</Label>
                  <Textarea placeholder="O que o aluno aprenderá?" className="min-h-[60px] rounded-xl bg-muted/30 border-none font-medium resize-none px-3 py-2" value={newTrail.description} onChange={(e) => setNewTrail({ ...newTrail, description: e.target.value })} disabled={isSubmitting} />
                </div>
              </div>
              <DialogFooter className="mt-2">
                <Button onClick={handleCreateTrail} disabled={isSubmitting || !newTrail.title} className="w-full h-12 bg-primary text-white font-black rounded-2xl shadow-xl">
                  {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                  {isSubmitting ? "Gravando..." : "Criar Aula"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Barra de merge mode */}
      {mergeMode && (
        <div className="flex items-center justify-between bg-primary/5 border-2 border-primary/20 rounded-2xl px-6 py-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <p className="font-black text-primary text-sm">
              {selectedCount === 0 ? "Selecione 2 ou mais aulas para unificar em uma série" : `${selectedCount} aula${selectedCount > 1 ? 's' : ''} selecionada${selectedCount > 1 ? 's' : ''}`}
            </p>
          </div>
          <Button
            onClick={() => setIsMergeDialogOpen(true)}
            disabled={selectedCount < 2}
            className="h-10 px-6 rounded-xl bg-primary text-white font-black text-sm shadow-lg disabled:opacity-40"
          >
            <ListVideo className="h-4 w-4 mr-2" /> Unificar em Série
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xl group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
        <Input placeholder="Pesquisar trilhas..." className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic focus-visible:ring-accent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Dialog Criar Série */}
      <Dialog open={isMergeDialogOpen} onOpenChange={(open) => {
        setIsMergeDialogOpen(open);
        if (!open) setTimeout(() => { document.body.style.pointerEvents = ""; }, 100);
      }}>
        <DialogContent className="rounded-[2rem] p-6 bg-white max-w-md border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic text-primary flex items-center gap-2">
              <ListVideo className="h-5 w-5 text-accent" /> Criar Série
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground font-medium">
              As <strong>{selectedCount} aulas</strong> selecionadas vão se tornar capítulos desta série. As aulas originais serão removidas.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase opacity-40">Nome da Série</Label>
              <Input
                placeholder="Ex: Matemática — Funções Completo"
                className="h-11 rounded-xl bg-muted/30 border-none font-bold"
                value={serieName}
                onChange={(e) => setSerieName(e.target.value)}
                disabled={isMerging}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleMergeTrails(); }}
              />
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700">Aulas que serão unificadas:</p>
              <ul className="mt-1 space-y-0.5">
                {Array.from(selectedIds).map(id => {
                  const t = trails.find(x => x.id === id);
                  return <li key={id} className="text-xs text-amber-800 font-medium">• {t?.title}</li>;
                })}
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsMergeDialogOpen(false)} className="flex-1 h-11 rounded-xl font-black">
              Cancelar
            </Button>
            <Button
              onClick={handleMergeTrails}
              disabled={isMerging || !serieName.trim()}
              className="flex-1 h-11 rounded-xl bg-primary text-white font-black shadow-xl"
            >
              {isMerging ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ListVideo className="h-4 w-4 mr-2" />}
              {isMerging ? "Criando..." : "Criar Série"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grid de trilhas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredTrails.map((trail) => {
            const isActive = trail.status === 'active' || trail.status === 'published';
            const isSerie = trail.trail_type === 'serie';
            const isSelected = selectedIds.has(trail.id);

            return (
              <Card
                key={trail.id}
                onClick={() => mergeMode && toggleSelect(trail.id)}
                className={`border-none shadow-xl overflow-hidden group bg-white rounded-[2rem] flex flex-col transition-all duration-300
                  ${mergeMode ? 'cursor-pointer hover:shadow-2xl' : 'hover:shadow-2xl'}
                  ${isSelected ? 'ring-4 ring-primary shadow-primary/20' : ''}
                `}
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img
                    src={trail.image_url || `https://picsum.photos/seed/trail-${trail.id}/600/400`}
                    alt={trail.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  {/* Overlay seleção */}
                  {mergeMode && (
                    <div className={`absolute inset-0 transition-all ${isSelected ? 'bg-primary/30' : 'bg-black/10'}`}>
                      <div className="absolute top-4 right-4">
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-lg
                          ${isSelected ? 'bg-primary border-primary' : 'bg-white/80 border-white'}`}>
                          {isSelected && <span className="text-white text-xs font-black">✓</span>}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Badges status + tipo */}
                  <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                    <Badge className={`${isActive ? 'bg-green-600' : 'bg-orange-500'} text-white border-none px-3 py-1 font-black text-[10px] uppercase shadow-lg flex items-center gap-1.5`}>
                      {isActive ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {isActive ? 'PÚBLICA' : 'RASCUNHO'}
                    </Badge>
                    <Badge className={`${isSerie ? 'bg-purple-600' : 'bg-blue-500'} text-white border-none px-3 py-1 font-black text-[10px] uppercase shadow-lg flex items-center gap-1.5`}>
                      {isSerie ? <ListVideo className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                      {isSerie ? 'SÉRIE' : 'AULA'}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="p-6 md:p-8 pb-4">
                  <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">{trail.category || "Geral"}</span>
                  <CardTitle className="text-xl font-black italic truncate mt-2 group-hover:text-accent transition-colors">{trail.title}</CardTitle>
                </CardHeader>

                <CardFooter className="p-6 md:p-8 pt-4 border-t border-muted/10 mt-auto flex justify-between items-center">
                  {!mergeMode && (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-accent hover:bg-accent/10" asChild title="Ver como aluno">
                        <Link href={`/dashboard/classroom/${trail.id}`}>
                          <Eye className="h-5 w-5" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTrail(trail.id)} className="h-10 w-10 rounded-full text-red-500 hover:bg-red-50" title="Excluir">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                  {mergeMode ? (
                    <p className="text-xs text-muted-foreground font-bold w-full text-center">
                      {isSelected ? 'Selecionada ✓' : 'Clique para selecionar'}
                    </p>
                  ) : (
                    <Button variant="ghost" className="text-accent font-black text-[10px] uppercase group/btn" asChild>
                      <Link href={`/dashboard/teacher/trails/${trail.id}`}>
                        Gerenciar <LayoutDashboard className="h-4 w-4 ml-2 group-hover/btn:rotate-12 transition-transform" />
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}

          {filteredTrails.length === 0 && (
            <div className="col-span-full py-20 text-center border-4 border-dashed border-muted/20 rounded-[3rem] bg-muted/5">
              <Database className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="font-black text-primary italic text-xl">Nenhuma trilha encontrada</p>
              <p className="text-muted-foreground font-medium mt-2">Crie uma nova aula ou ajuste a pesquisa.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
