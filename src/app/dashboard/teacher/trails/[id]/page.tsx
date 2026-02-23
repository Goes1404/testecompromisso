
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
  FileCode,
  FileSearch,
  ListPlus,
  X,
  Layers
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
  
  // Lista temporária para múltiplos itens no formulário
  const [pendingItems, setPendingItems] = useState<any[]>([]);
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
      const { data: trailData, error: trailError } = await supabase
        .from('trails')
        .select('*')
        .eq('id', trailId)
        .single();
      
      if (trailError) throw trailError;
      setTrail(trailData);

      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('trail_id', trailId)
        .order('order_index');
      
      if (modulesError) throw modulesError;
      const sortedModules = modulesData || [];
      setModules(sortedModules);

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
      toast({ title: "Módulo Criado!" });
      setModuleForm({ title: "" });
      setIsModuleDialogOpen(false);
    }
    setIsSubmitting(false);
  };

  // Adiciona item à fila local antes de salvar no banco
  const addToQueue = () => {
    if (!contentForm.title.trim()) {
      toast({ title: "Título Obrigatório", variant: "destructive" });
      return;
    }
    setPendingItems([...pendingItems, { ...contentForm, id: Date.now().toString() }]);
    setContentForm({ title: "", type: "video", url: "", description: "" });
  };

  const removeFromQueue = (id: string) => {
    setPendingItems(pendingItems.filter(item => item.id !== id));
  };

  const handleBatchSaveContent = async () => {
    if (!activeModuleId || pendingItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    
    const currentModuleContents = contents[activeModuleId] || [];
    const itemsToInsert = pendingItems.map((item, idx) => ({
      module_id: activeModuleId,
      title: item.title,
      type: item.type,
      url: item.url,
      description: item.description,
      order_index: currentModuleContents.length + idx
    }));

    const { data, error } = await supabase.from('learning_contents').insert(itemsToInsert).select();

    if (!error) {
      setContents(prev => ({
        ...prev,
        [activeModuleId]: [...(prev[activeModuleId] || []), ...data]
      }));
      toast({ title: "Materiais Publicados!", description: `${data?.length || 0} itens foram adicionados ao capítulo.` });
      setPendingItems([]);
      setIsContentDialogOpen(false);
    } else {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteModule = async (id: string) => {
    if (deletingId || !confirm("Excluir este capítulo e todo seu conteúdo?")) return;
    setDeletingId(id);
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (!error) {
      setModules(prev => prev.filter(m => m.id !== id));
      toast({ title: "Capítulo removido." });
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
      toast({ title: "Item removido." });
    }
    setDeletingId(null);
  };

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4 bg-background">
      <Loader2 className="animate-spin h-14 w-14 text-accent" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sintonizando Estúdio...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-xl border border-muted/10">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-12 w-12 bg-muted/30">
            <ChevronLeft className="h-6 w-6 text-primary" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-primary italic leading-none">{trail?.title}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={trail?.status === 'active' ? 'default' : 'outline'} className={`text-[8px] font-black uppercase ${trail?.status === 'active' ? 'bg-green-600 border-none' : 'text-orange-500 border-orange-500'}`}>
                {trail?.status === 'active' ? 'PÚBLICA' : 'RASCUNHO'}
              </Badge>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Modo Gestor de Conteúdo</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-12 border-primary/20 text-primary font-black" asChild>
            <Link href={`/dashboard/classroom/${trailId}`}><Eye className="h-5 w-5 mr-2" /> Prévia do Aluno</Link>
          </Button>
          <Button onClick={() => setIsModuleDialogOpen(true)} className="bg-primary text-white font-black rounded-xl shadow-lg h-12 px-8">
            <Plus className="h-5 w-5 mr-2" /> Novo Capítulo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {modules.length === 0 ? (
            <Card className="border-4 border-dashed border-muted/20 bg-muted/5 rounded-[3rem] p-20 text-center flex flex-col items-center gap-4">
              <ListPlus className="h-16 w-16 text-muted-foreground/30" />
              <h3 className="text-xl font-black text-primary italic">Inicie sua Jornada</h3>
              <Button onClick={() => setIsModuleDialogOpen(true)} className="bg-accent text-accent-foreground font-black px-10 h-14 rounded-2xl shadow-xl">
                Criar Primeiro Capítulo
              </Button>
            </Card>
          ) : (
            modules.map((mod, idx) => (
              <Card key={mod.id} className="border-none shadow-2xl bg-white overflow-hidden rounded-[2rem] group transition-all hover:shadow-primary/5">
                <CardHeader className="bg-muted/10 p-6 flex flex-row items-center justify-between border-b border-muted/20">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black italic shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black text-primary italic leading-none">{mod.title}</CardTitle>
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1.5">{contents[mod.id]?.length || 0} Itens Vinculados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteModule(mod.id)} 
                      disabled={deletingId === mod.id} 
                      className="text-muted-foreground hover:text-red-600 rounded-full"
                    >
                      {deletingId === mod.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                    <Button 
                      onClick={() => { setActiveModuleId(mod.id); setPendingItems([]); setIsContentDialogOpen(true); }} 
                      className="bg-accent text-accent-foreground font-black text-[9px] uppercase rounded-xl h-9 px-4"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Aula
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                    {contents[mod.id]?.map((content) => (
                      <div key={content.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border-2 border-transparent hover:border-accent/30 hover:bg-white hover:shadow-xl transition-all group/item">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                            content.type === 'video' ? 'bg-red-50 text-red-600' : 
                            content.type === 'quiz' ? 'bg-orange-50 text-orange-600' : 
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {content.type === 'video' ? <Youtube className="h-5 w-5" /> : 
                             content.type === 'quiz' ? <BrainCircuit className="h-5 w-5" /> : 
                             <FileText className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-xs md:text-sm text-primary truncate leading-none">{content.title}</p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1 opacity-60">{content.type}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-red-500 hover:text-white opacity-0 group-hover/item:opacity-100 transition-all" 
                          onClick={() => handleDeleteContent(content.id)} 
                          disabled={deletingId === content.id}
                        >
                          {deletingId === content.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    ))}
                    {(!contents[mod.id] || contents[mod.id].length === 0) && (
                      <div className="text-center py-8 border-2 border-dashed border-muted/30 rounded-2xl bg-muted/5">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest italic opacity-40">Sem conteúdo vinculado</p>
                      </div>
                    )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] p-8 overflow-hidden relative">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-xl">
                  {trail?.status === 'active' ? <Globe className="h-8 w-8 text-green-400" /> : <Settings2 className="h-8 w-8 text-accent" />}
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Visibilidade</p>
                  <p className="text-2xl font-black italic uppercase">{trail?.status === 'active' ? 'Ativa' : 'Em Edição'}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <p className="text-[10px] font-medium italic opacity-80 leading-relaxed">
                  {trail?.status === 'active' 
                    ? "Alunos já podem estudar este material no portal principal." 
                    : "Em modo rascunho. O material só é visível para você."}
                </p>
              </div>

              <Button 
                onClick={handlePublish} 
                disabled={isPublishing || !trail} 
                className={`w-full font-black h-14 rounded-xl shadow-xl transition-all border-none ${
                  trail?.status === 'active' 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'bg-accent text-accent-foreground'
                }`}
              >
                {isPublishing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                {trail?.status === 'active' ? 'Ocultar Trilha' : 'Publicar Agora'}
              </Button>
            </div>
          </Card>

          <Card className="bg-white border-none shadow-xl rounded-[2rem] p-6 space-y-4">
            <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Dica Pedagógica</h3>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0"><Sparkles className="h-4 w-4" /></div>
              <p className="text-[11px] font-medium italic text-primary/70 leading-relaxed">Combine múltiplos itens por capítulo (ex: vídeo + atividade) para aumentar a retenção dos alunos.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialog: Novo Capítulo */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 bg-white border-none shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic text-primary">Novo Capítulo</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-2">
            <Label className="text-[9px] font-black uppercase opacity-40">Título da Unidade</Label>
            <Input 
              placeholder="Ex: Introdução à Matéria" 
              value={moduleForm.title} 
              onChange={(e) => setModuleForm({title: e.target.value})} 
              disabled={isSubmitting} 
              className="h-14 rounded-xl bg-muted/30 border-none font-bold" 
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAddModule} disabled={isSubmitting || !moduleForm.title} className="w-full h-14 bg-primary text-white font-black rounded-xl">
              {isSubmitting ? <Loader2 className="h-5 w-5 mr-2" /> : "Criar Capítulo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Anexar Materiais (Cadastro em Lote) */}
      <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 md:p-10 max-w-2xl bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic text-primary">Anexar Materiais</DialogTitle>
            <p className="text-muted-foreground text-xs italic">Monte sua sequência didática antes de publicar na rede.</p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40">Tipo do Item</Label>
                <Select value={contentForm.type} onValueChange={(v) => setContentForm({...contentForm, type: v})} disabled={isSubmitting}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    <SelectItem value="video" className="py-2.5 font-bold">🎞️ Videoaula</SelectItem>
                    <SelectItem value="quiz" className="py-2.5 font-bold">🧠 Quiz / Avaliação</SelectItem>
                    <SelectItem value="pdf" className="py-2.5 font-bold">📄 Material PDF</SelectItem>
                    <SelectItem value="text" className="py-2.5 font-bold">📝 Texto de Apoio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40">Título do Material</Label>
                <Input 
                  placeholder="Ex: Aula 01 - Conceitos" 
                  value={contentForm.title} 
                  onChange={(e) => setContentForm({...contentForm, title: e.target.value})} 
                  disabled={isSubmitting} 
                  className="h-12 rounded-xl bg-muted/30 border-none font-bold" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40">Link (YouTube/PDF/Quiz)</Label>
                <Input 
                  placeholder="URL do conteúdo..." 
                  value={contentForm.url} 
                  onChange={(e) => setContentForm({...contentForm, url: e.target.value})} 
                  disabled={isSubmitting} 
                  className="h-12 rounded-xl bg-muted/30 border-none font-medium" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40">Orientações Breves</Label>
                <Textarea 
                  placeholder="Instruções para o aluno..." 
                  value={contentForm.description} 
                  onChange={(e) => setContentForm({...contentForm, description: e.target.value})} 
                  disabled={isSubmitting} 
                  className="h-20 rounded-xl bg-muted/30 border-none font-medium resize-none text-xs" 
                />
              </div>

              <Button 
                onClick={addToQueue} 
                variant="outline" 
                disabled={isSubmitting || !contentForm.title}
                className="w-full h-12 rounded-xl border-dashed border-primary/20 text-primary font-black uppercase text-[10px] gap-2 hover:bg-primary/5 transition-all"
              >
                <Plus className="h-4 w-4" /> Adicionar à Fila
              </Button>
            </div>

            <div className="bg-muted/10 rounded-[2rem] p-6 flex flex-col border border-dashed border-muted/30">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-4 flex items-center gap-2">
                <Layers className="h-3 w-3" /> Fila de Publicação ({pendingItems.length})
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-2 scrollbar-hide">
                {pendingItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm border border-primary/5 animate-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'video' ? 'bg-red-50 text-red-600' : 'bg-primary/5 text-primary'
                      }`}>
                        {item.type === 'video' ? <Video className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                      </div>
                      <p className="text-[10px] font-bold text-primary truncate max-w-[120px]">{item.title}</p>
                    </div>
                    <button onClick={() => removeFromQueue(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {pendingItems.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-2 py-10">
                    <Sparkles className="h-8 w-8 text-accent" />
                    <p className="text-[9px] font-black uppercase tracking-widest">Nenhum item na fila</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t mt-4">
            <Button 
              onClick={handleBatchSaveContent} 
              disabled={isSubmitting || pendingItems.length === 0} 
              className="w-full h-14 bg-primary text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-95"
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin h-6 w-6 mr-2" /> Publicando na Rede...</>
              ) : (
                <><CheckCircle2 className="h-6 w-6 mr-2" /> Salvar Tudo e Publicar no Capítulo</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
