
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  ChevronLeft, 
  Trash2, 
  FileText, 
  Loader2, 
  LayoutDashboard, 
  Youtube, 
  Sparkles,
  BookOpen,
  Eye,
  CheckCircle2,
  Globe,
  BrainCircuit,
  Settings2,
  Video,
  FileCode
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

export default function TrailManagementPage() {
  const params = useParams();
  const trailId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [trail, setTrail] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [contents, setContents] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  
  const [moduleForm, setModuleForm] = useState({ title: "" });
  const [contentForm, setContentForm] = useState({ 
    title: "", 
    type: "video", 
    url: "", 
    description: "" 
  });

  const loadData = useCallback(async () => {
    if (!trailId) return;
    setLoading(true);
    try {
      // 1. Carregar Dados da Trilha
      const { data: trailData, error: trailError } = await supabase
        .from('trails')
        .select('*')
        .eq('id', trailId)
        .single();
      
      if (trailError) throw trailError;
      setTrail(trailData);

      // 2. Carregar Módulos
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('trail_id', trailId)
        .order('order_index');
      
      if (modulesError) throw modulesError;
      const sortedModules = modulesData || [];
      setModules(sortedModules);

      // 3. Carregar Conteúdos dos Módulos
      if (sortedModules.length > 0) {
        const moduleIds = sortedModules.map(m => m.id);
        const { data: contentsData, error: contentsError } = await supabase
          .from('learning_contents')
          .select('*')
          .in('module_id', moduleIds)
          .order('order_index');
        
        if (contentsError) throw contentsError;

        const contentMap: Record<string, any[]> = {};
        contentsData?.forEach(c => {
          if (!contentMap[c.module_id]) contentMap[c.module_id] = [];
          contentMap[c.module_id].push(c);
        });
        setContents(contentMap);
      }
    } catch (e: any) {
      console.error("Erro ao carregar estúdio:", e);
      toast({ title: "Erro de Conexão", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [trailId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async () => {
    if (isPublishing || !trail) return;
    setIsPublishing(true);
    
    const newStatus = trail.status === 'active' ? 'draft' : 'active';
    
    const { error } = await supabase
      .from('trails')
      .update({ status: newStatus })
      .eq('id', trailId);

    if (!error) {
      setTrail({ ...trail, status: newStatus });
      toast({ 
        title: newStatus === 'active' ? "Trilha Publicada!" : "Trilha em Rascunho", 
        description: newStatus === 'active' ? "Os alunos já podem iniciar os estudos." : "A trilha foi ocultada dos alunos."
      });
    } else {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
    setIsPublishing(false);
  };

  const handleAddModule = async () => {
    if (!moduleForm.title.trim() || isSubmitting || !user) return;
    setIsSubmitting(true);
    
    const { data, error } = await supabase.from('modules').insert({
      trail_id: trailId,
      title: moduleForm.title,
      order_index: modules.length
    }).select().single();

    if (!error) {
      setModules(prev => [...prev, data]);
      setContents(prev => ({...prev, [data.id]: []}));
      toast({ title: "Capítulo Criado!", description: "Agora você pode adicionar aulas a ele." });
      setModuleForm({ title: "" });
      setIsModuleDialogOpen(false);
    } else {
      toast({ title: "Erro ao criar capítulo", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleAddContent = async () => {
    if (!activeModuleId || !contentForm.title || isSubmitting) return;
    setIsSubmitting(true);
    
    const { data, error } = await supabase.from('learning_contents').insert({
      module_id: activeModuleId,
      title: contentForm.title,
      type: contentForm.type,
      url: contentForm.url,
      description: contentForm.description,
      order_index: contents[activeModuleId]?.length || 0
    }).select().single();

    if (!error) {
      setContents(prev => ({
        ...prev,
        [activeModuleId]: [...(prev[activeModuleId] || []), data]
      }));
      toast({ title: "Aula Anexada!", description: "O material pedagógico já está disponível." });
      setContentForm({ title: "", type: "video", url: "", description: "" });
      setIsContentDialogOpen(false);
    } else {
      toast({ title: "Erro ao anexar aula", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteModule = async (id: string) => {
    if (deletingId || !confirm("Deseja realmente excluir este capítulo e todo seu conteúdo?")) return;
    setDeletingId(id);
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (!error) {
      setModules(prev => prev.filter(m => m.id !== id));
      toast({ title: "Capítulo removido com sucesso." });
    } else {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
    setDeletingId(null);
  };

  const handleDeleteContent = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    const { error } = await supabase.from('learning_contents').delete().eq('id', id);
    if (!error) {
      setContents(prev => {
          const newContents = {...prev};
          for(const modId in newContents) {
              newContents[modId] = newContents[modId].filter(c => c.id !== id);
          }
          return newContents;
      });
      toast({ title: "Aula removida." });
    } else {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
    setDeletingId(null);
  };

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4 bg-background px-4">
      <Loader2 className="animate-spin h-14 w-14 text-accent" />
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sintonizando Estúdio Master...</p>
        <p className="text-[8px] font-bold text-muted-foreground uppercase">Carregando Módulos e Conteúdos</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8 md:space-y-12 animate-in fade-in duration-700 pb-24">
      {/* Header do Estúdio */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-muted/10">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="rounded-full h-12 w-12 bg-muted/30 hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-primary italic leading-none tracking-tight">{trail?.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={trail?.status === 'active' ? 'default' : 'outline'} className={`text-[9px] font-black uppercase tracking-widest px-3 h-6 ${trail?.status === 'active' ? 'bg-green-600 border-none' : 'border-orange-500 text-orange-500'}`}>
                {trail?.status === 'active' ? 'PÚBLICA' : 'RASCUNHO'}
              </Badge>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">• {modules.length} Capítulos</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="rounded-xl h-12 border-primary/20 text-primary font-black hover:bg-primary/5 px-6" asChild>
            <Link href={`/dashboard/classroom/${trailId}`}><Eye className="h-5 w-5 mr-2" /> Visualizar como Aluno</Link>
          </Button>
          <Button onClick={() => setIsModuleDialogOpen(true)} className="bg-primary text-white font-black rounded-xl shadow-lg h-12 px-8 hover:scale-105 transition-all">
            <Plus className="h-5 w-5 mr-2" /> Novo Capítulo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Lista de Módulos (Central) */}
        <div className="lg:col-span-8 space-y-8">
          {modules.length === 0 ? (
            <Card className="border-4 border-dashed border-muted/20 bg-muted/5 rounded-[3rem] p-20 text-center flex flex-col items-center gap-4">
              <Settings2 className="h-16 w-16 text-muted-foreground/30" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-primary italic">Inicie sua Jornada</h3>
                <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">Crie seu primeiro capítulo para começar a anexar materiais pedagógicos.</p>
              </div>
              <Button onClick={() => setIsModuleDialogOpen(true)} className="bg-accent text-accent-foreground font-black px-10 h-14 rounded-2xl shadow-xl mt-4">
                Criar Módulo 01
              </Button>
            </Card>
          ) : (
            modules.map((mod, idx) => (
              <Card key={mod.id} className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem] transition-all hover:shadow-primary/5 group">
                <CardHeader className="bg-muted/10 p-6 md:p-8 flex flex-row items-center justify-between border-b border-muted/20">
                  <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-3xl bg-primary text-white flex items-center justify-center font-black text-xl italic shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </div>
                    <div>
                      <CardTitle className="text-xl md:text-2xl font-black text-primary italic leading-none">{mod.title}</CardTitle>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Unidade Pedagógica</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteModule(mod.id)} 
                      disabled={deletingId === mod.id} 
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-full h-10 w-10"
                    >
                      {deletingId === mod.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                    <Button 
                      onClick={() => { setActiveModuleId(mod.id); setIsContentDialogOpen(true); }} 
                      className="bg-accent text-accent-foreground hover:bg-accent/90 font-black text-[10px] uppercase rounded-xl h-10 px-5 shadow-lg gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Aula
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-4">
                  <div className="space-y-3">
                    {contents[mod.id]?.map((content) => (
                      <div key={content.id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-muted/20 hover:bg-white hover:shadow-2xl transition-all group/item border-2 border-transparent hover:border-accent/20">
                        <div className="flex items-center gap-5 overflow-hidden">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 transition-transform group-hover/item:scale-110 ${
                            content.type === 'video' ? 'bg-red-50 text-red-600' : 
                            content.type === 'quiz' ? 'bg-orange-50 text-orange-600' : 
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {content.type === 'video' ? <Youtube className="h-6 w-6" /> : 
                             content.type === 'quiz' ? <BrainCircuit className="h-6 w-6" /> : 
                             <FileText className="h-6 w-6" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm md:text-base text-primary truncate leading-none">{content.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-[7px] font-black uppercase bg-white border-none shadow-sm px-2 h-4">{content.type}</Badge>
                              <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[200px] italic">{content.url || 'Conteúdo interno'}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-full hover:bg-red-500 hover:text-white opacity-0 group-hover/item:opacity-100 transition-all shadow-sm" 
                          onClick={() => handleDeleteContent(content.id)} 
                          disabled={deletingId === content.id}
                        >
                          {deletingId === content.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    ))}
                    {(!contents[mod.id] || contents[mod.id].length === 0) && (
                      <div className="text-center py-10 border-2 border-dashed border-muted/30 rounded-[2rem] bg-muted/5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic opacity-60">Nenhuma aula vinculada a este capítulo</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sidebar de Status e Controle */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] p-8 md:p-10 overflow-hidden relative group">
            <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-accent/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-3xl bg-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/10">
                  {trail?.status === 'active' ? <Globe className="h-9 w-9 text-green-400 animate-pulse" /> : <Settings2 className="h-9 w-9 text-accent" />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Painel de Visibilidade</p>
                  <p className="text-3xl font-black italic uppercase tracking-tighter">{trail?.status === 'active' ? 'Ativa' : 'Em Edição'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase opacity-50">Auditoria Pedagógica</span>
                    <Badge className="bg-green-500/20 text-green-400 border-none text-[8px]">OK</Badge>
                  </div>
                  <p className="text-[11px] font-medium italic opacity-80 leading-relaxed">
                    {trail?.status === 'active' 
                      ? "Esta trilha está visível para toda a rede municipal." 
                      : "O conteúdo está oculto para os alunos até que você publique."}
                  </p>
                </div>

                <Button 
                  onClick={handlePublish} 
                  disabled={isPublishing || !trail} 
                  className={`w-full font-black h-16 rounded-2xl shadow-2xl transition-all border-none text-lg ${
                    trail?.status === 'active' 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                      : 'bg-accent text-accent-foreground hover:scale-105 active:scale-95'
                  }`}
                >
                  {isPublishing ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : trail?.status === 'active' ? <Trash2 className="h-6 w-6 mr-2" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
                  {trail?.status === 'active' ? 'Tirar do Ar' : 'Publicar Agora'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-xl bg-white rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-xs font-black text-primary/40 uppercase tracking-[0.2em]">Dica do Estúdio</h3>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0"><Sparkles className="h-5 w-5" /></div>
              <p className="text-xs font-medium italic text-primary/70 leading-relaxed">Organize seus capítulos por ordem de dificuldade. Comece sempre pelos fundamentos e termine com simulados IA.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialog: Novo Capítulo */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 md:p-12 bg-white border-none shadow-2xl max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl md:text-3xl font-black italic text-primary tracking-tighter">Novo Capítulo</DialogTitle>
          </DialogHeader>
          <div className="py-8 space-y-2">
            <Label className="text-[10px] font-black uppercase opacity-40 mb-2 block tracking-widest">Título da Unidade</Label>
            <Input 
              placeholder="Ex: Fundamentos de Redação" 
              value={moduleForm.title} 
              onChange={(e) => setModuleForm({title: e.target.value})} 
              disabled={isSubmitting} 
              className="h-16 rounded-2xl bg-muted/30 border-none font-bold italic text-xl focus:ring-2 focus:ring-accent" 
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handleAddModule} disabled={isSubmitting || !moduleForm.title} className="w-full h-16 bg-primary text-white font-black text-lg rounded-2xl shadow-xl transition-all">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
              {isSubmitting ? "Gravando..." : "Confirmar Criação"}
            </Button>
            <Button variant="ghost" onClick={() => setIsModuleDialogOpen(false)} disabled={isSubmitting} className="font-bold text-muted-foreground uppercase text-[10px]">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Anexar Material */}
      <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 md:p-12 max-w-lg bg-white border-none shadow-2xl mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl md:text-3xl font-black italic text-primary tracking-tighter">Anexar Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase opacity-40">Tipo de Aula</Label>
              <Select value={contentForm.type} onValueChange={(v) => setContentForm({...contentForm, type: v})} disabled={isSubmitting}>
                <SelectTrigger className="h-14 rounded-xl bg-muted/30 border-none font-bold text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="video" className="py-3 font-bold">🎞️ Videoaula (YouTube)</SelectItem>
                  <SelectItem value="pdf" className="py-3 font-bold">📄 Material PDF</SelectItem>
                  <SelectItem value="quiz" className="py-3 font-bold">🧠 Quiz IA / Avaliação</SelectItem>
                  <SelectItem value="text" className="py-3 font-bold">📝 Resumo de Apoio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase opacity-40">Título da Aula</Label>
              <Input 
                placeholder="Ex: Introdução à Dissertação" 
                value={contentForm.title} 
                onChange={(e) => setContentForm({...contentForm, title: e.target.value})} 
                disabled={isSubmitting} 
                className="h-14 rounded-xl bg-muted/30 border-none font-bold text-primary" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase opacity-40">Link ou Referência</Label>
              <Input 
                placeholder="URL do YouTube ou PDF..." 
                value={contentForm.url} 
                onChange={(e) => setContentForm({...contentForm, url: e.target.value})} 
                disabled={isSubmitting} 
                className="h-14 rounded-xl bg-muted/30 border-none font-medium text-primary" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase opacity-40">Descrição Pedagógica</Label>
              <Textarea 
                placeholder="O que o aluno deve focar nesta aula?" 
                value={contentForm.description} 
                onChange={(e) => setContentForm({...contentForm, description: e.target.value})} 
                disabled={isSubmitting} 
                className="min-h-[120px] rounded-xl bg-muted/30 border-none resize-none p-4 text-sm font-medium" 
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handleAddContent} disabled={isSubmitting || !contentForm.title} className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl transition-all text-lg">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <Plus className="h-6 w-6 mr-2" />}
              {isSubmitting ? "Anexando..." : "Confirmar e Publicar"}
            </Button>
            <Button variant="ghost" onClick={() => setIsContentDialogOpen(false)} disabled={isSubmitting} className="font-bold text-muted-foreground uppercase text-[10px]">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
