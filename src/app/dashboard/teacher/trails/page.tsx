"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  LayoutDashboard, 
  Search, 
  Loader2, 
  Database, 
  Eye, 
  Globe, 
  Lock, 
  Sparkles,
  Wand2,
  CheckCircle2,
  ArrowRight,
  Trash2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  
  const [newTrail, setNewTrail] = useState({ title: "", category: "Matemática", description: "", target_audience: "all" });

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

  useEffect(() => {
    fetchTrails();
  }, [user]);

  const handleCreateTrail = async () => {
    if (!newTrail.title || !user || isSubmitting) {
      if(!newTrail.title) toast({ title: "Título obrigatório", variant: "destructive" });
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
        image_url: `https://picsum.photos/seed/trail-${Date.now()}/600/400`
      };

      if (newTrail.target_audience !== "all") {
         trailData.target_audience = newTrail.target_audience;
      }

      let { data, error } = await supabase
        .from('trails')
        .insert([trailData])
        .select()
        .single();

      if (error && error?.code === '42703') {
          console.warn("Retrying without new columns...");
          const { target_audience, image_url, ...fallbackPayload } = trailData;
          const retry = await supabase
            .from('trails')
            .insert([fallbackPayload])
            .select()
            .single();
          data = retry.data;
          error = retry.error;
      }

      if (error) throw new Error(error.message);

      toast({ title: "Trilha Criada!", description: "Continue editando os módulos para publicar." });
      setTrails(prev => [data, ...prev]);
      router.refresh();
      
      setIsCreateDialogOpen(false);
      setNewTrail({ title: "", category: "Matemática", description: "", target_audience: "all" });
      setTimeout(() => { document.body.style.pointerEvents = ""; }, 500);

    } catch (e: any) {
      console.error("Falha ao criar trilha:", e);
      toast({ title: "Erro de Persistência", description: e?.message || "Ocorreu um erro ao salvar.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrail = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta trilha permanentemente? Todos os módulos e conteúdos vinculados serão removidos.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTrails(prev => prev.filter(t => t.id !== id));
      toast({ title: "Trilha excluída com sucesso!" });
      router.refresh();
    } catch (e: any) {
      console.error("Erro ao excluir trilha:", e);
      toast({ title: "Falha na exclusão", description: e.message, variant: "destructive" });
    }
  };

  const filteredTrails = trails.filter(t => 
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-primary italic leading-none">Gestão de Trilhas</h1>
          <p className="text-muted-foreground font-medium text-sm md:text-base">Administre caminhos pedagógicos e publique para a rede.</p>
        </div>
        <div className="flex items-center gap-3">
          
          {/* CRIAÇÃO MANUAL */}
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setTimeout(() => document.body.style.pointerEvents = "", 100);
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-primary text-white font-black px-6 md:px-8 shadow-xl hover:scale-105 transition-all">
                <Plus className="h-5 w-5 md:h-6 md:w-6 mr-2" /> Nova Trilha Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 bg-white w-[95vw] sm:w-full max-w-lg border-none shadow-2xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-xl font-black italic text-primary">Configurar Trilha</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase opacity-40">Título da Trilha</Label>
                  <Input placeholder="Ex: Fundamentos de IA" className="h-10 rounded-xl bg-muted/30 border-none font-bold" value={newTrail.title} onChange={(e) => setNewTrail({ ...newTrail, title: e.target.value })} disabled={isSubmitting} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase opacity-40">Categoria</Label>
                    <Select value={newTrail.category} onValueChange={(v) => setNewTrail({ ...newTrail, category: v })} disabled={isSubmitting}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold">
                        <SelectValue placeholder="Matéria Principal" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl max-h-60">
                        {EDUCATIONAL_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase opacity-40">Público-Alvo</Label>
                    <Select value={newTrail.target_audience} onValueChange={(v) => setNewTrail({ ...newTrail, target_audience: v })} disabled={isSubmitting}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none font-bold">
                        <SelectValue placeholder="Todos os Alunos" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        <SelectItem value="all">Todos os Alunos</SelectItem>
                        <SelectItem value="etec">Apenas ETEC</SelectItem>
                        <SelectItem value="enem">Apenas ENEM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase opacity-40">Descrição Geral</Label>
                  <Textarea placeholder="O que o aluno aprenderá nesta jornada?" className="min-h-[60px] md:min-h-[60px] rounded-xl bg-muted/30 border-none font-medium resize-none px-3 py-2" value={newTrail.description} onChange={(e) => setNewTrail({ ...newTrail, description: e.target.value })} disabled={isSubmitting} />
                </div>
              </div>
              <DialogFooter className="mt-2 md:mt-2">
                <Button onClick={handleCreateTrail} disabled={isSubmitting || !newTrail.title} className="w-full h-12 md:h-12 bg-primary text-white font-black text-base md:text-base rounded-2xl shadow-xl">
                  {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                  {isSubmitting ? "Gravando..." : "Criar Trilha"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-xl group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
        <Input placeholder="Pesquisar entre suas trilhas..." className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic focus-visible:ring-accent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Banco de Dados...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredTrails.map((trail) => {
            const isActive = trail.status === 'active' || trail.status === 'published';
            
            return (
              <Card key={trail.id} className="border-none shadow-xl overflow-hidden group bg-white rounded-[2rem] flex flex-col hover:shadow-2xl transition-all duration-500">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img src={trail.image_url || `https://picsum.photos/seed/trail-${trail.id}/600/400`} alt={trail.title || "Trilha"} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute top-4 left-4">
                    <Badge className={`${isActive ? 'bg-green-600' : 'bg-orange-500'} text-white border-none px-4 py-1 font-black text-[10px] uppercase shadow-lg flex items-center gap-2`}>
                      {isActive ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {isActive ? 'PÚBLICA' : 'RASCUNHO'}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-6 md:p-8 pb-4">
                  <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">{trail.category || "Geral"}</span>
                  <CardTitle className="text-xl font-black italic truncate mt-2 group-hover:text-accent transition-colors">{trail.title}</CardTitle>
                </CardHeader>
                <CardFooter className="p-6 md:p-8 pt-4 border-t border-muted/10 mt-auto flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-accent hover:bg-accent/10" asChild title="Simular Visão do Aluno">
                      <Link href={`/dashboard/classroom/${trail.id}`}>
                        <Eye className="h-5 w-5" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteTrail(trail.id)}
                      className="h-10 w-10 rounded-full text-red-500 hover:bg-red-50" 
                      title="Excluir Trilha"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button variant="ghost" className="text-accent font-black text-[10px] uppercase group/btn" asChild>
                    <Link href={`/dashboard/teacher/trails/${trail.id}`}>Gerenciar <LayoutDashboard className="h-4 w-4 ml-2 group-hover/btn:rotate-12 transition-transform" /></Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
          {filteredTrails.length === 0 && (
            <div className="col-span-full py-20 text-center border-4 border-dashed border-muted/20 rounded-[3rem] bg-muted/5 animate-in fade-in duration-1000">
              <Database className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="font-black text-primary italic text-xl">Nenhuma trilha encontrada</p>
              <p className="text-muted-foreground font-medium mt-2">Inicie uma nova trilha ou ajuste seus filtros.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
