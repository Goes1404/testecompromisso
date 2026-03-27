'use client';

export const runtime = "edge";

/**
 * @fileOverview Gestão de Conteúdo de Trilha - Visão do Mentor.
 * - handleAddModule: Cria novos capítulos.
 * - handleBatchSaveContent: Publica materiais em massa.
 * - handleEditContent: Permite alterar materiais existentes.
 * - Integração com Apostilas: Vincula recursos da biblioteca às aulas.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  ChevronLeft,
  Trash2,
  FileText,
  Loader2,
  Youtube,
  Sparkles,
  Eye,
  CheckCircle2,
  Globe,
  BrainCircuit,
  Settings2,
  Video,
  ListPlus,
  X,
  Layers,
  PlusCircle,
  FileUp,
  Link2,
  Layout,
  Pencil,
  BookOpen,
  Save
} from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { EDUCATIONAL_CATEGORIES } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TrailManagementPage() {
  const params = useParams();
  const trailId = params?.id as string;
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [trail, setTrail] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [contents, setContents] = useState<Record<string, any[]>>({});
  const [libraryResources, setLibraryResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [isEditTrailDialogOpen, setIsEditTrailDialogOpen] = useState(false);
  
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const activeModuleRef = useRef<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);

  const [editTrailForm, setEditTrailForm] = useState({ title: '', category: '', description: '' });
  const [moduleForm, setModuleForm] = useState({ title: '' });
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [contentForm, setContentForm] = useState({
    title: '',
    type: 'video',
    url: '',
    description: '',
    workbook_id: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());

  const loadData = useCallback(async () => {
    if (!trailId) return;
    setLoading(true);
    try {
      // 1. Trail & Modules
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

      // 2. Learning Contents
      if (sortedModules.length > 0) {
        const moduleIds = sortedModules.map((m) => m.id);
        const { data: contentsData, error: contentsError } = await supabase
          .from('learning_contents')
          .select('*')
          .in('module_id', moduleIds)
          .order('order_index');

        if (contentsError) throw contentsError;

        const contentMap: Record<string, any[]> = {};
        contentsData?.forEach((c) => {
          if (!contentMap[c.module_id]) contentMap[c.module_id] = [];
          contentMap[c.module_id].push(c);
        });
        setContents(contentMap);
      }

      // 3. Library Resources (for workbook linking)
      const { data: resources } = await supabase
        .from('library_resources')
        .select('id, title, category')
        .order('title');
      setLibraryResources(resources || []);

    } catch (e: any) {
      console.error('Erro ao carregar estúdio:', e);
      toast({
        title: 'Erro de Conexão',
        description: e.message,
        variant: 'destructive',
      });
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
        title: newStatus === 'active' ? 'Trilha Publicada!' : 'Trilha em Rascunho',
        description:
          newStatus === 'active'
            ? 'Os alunos já podem iniciar os estudos.'
            : 'A trilha foi ocultada dos alunos.',
      });
    }
    setIsPublishing(false);
  };

  const openEditTrailDialog = () => {
    if (trail) {
      setEditTrailForm({
        title: trail.title || '',
        category: trail.category || 'Multidisciplinar e Geral',
        description: trail.description || ''
      });
      setIsEditTrailDialogOpen(true);
    }
  };

  const handleUpdateTrail = async () => {
    if (!editTrailForm.title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('trails')
        .update({
          title: editTrailForm.title,
          category: editTrailForm.category,
          description: editTrailForm.description
        })
        .eq('id', trailId);

      if (error) throw error;
      
      setTrail((prev: any) => ({ ...prev, ...editTrailForm }));
      toast({ title: 'Detalhes Atualizados!' });
      setIsEditTrailDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrail = async () => {
    if (confirm('ATENÇÃO: Deseja realmente excluir esta trilha inteira? Esta ação apagará todas as aulas e módulos associados irreversivelmente.')) {
      setIsSubmitting(true);
      const { error } = await supabase.from('trails').delete().eq('id', trailId);
      if (error) {
        toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
        setIsSubmitting(false);
      } else {
        toast({ title: 'Trilha Excluída', description: 'Todo o conteúdo foi apagado permanentemente.' });
        router.push('/dashboard/teacher/trails');
      }
    }
  };

  const handleAddModule = async () => {
    if (!moduleForm.title.trim() || isSubmitting || !user) return;
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('modules')
      .insert({
        trail_id: trailId,
        title: moduleForm.title,
        order_index: modules.length,
      })
      .select()
      .single();

    if (!error) {
      setModules((prev) => [...prev, data]);
      setContents((prev) => ({ ...prev, [data.id]: [] }));
      toast({ title: 'Módulo Criado!' });
      
      setTimeout(() => {
        setModuleForm({ title: '' });
        setIsModuleDialogOpen(false);
        setTimeout(() => { document.body.style.pointerEvents = ""; }, 500);
      }, 50);
    }
    setIsSubmitting(false);
  };

  const startEditContent = (content: any) => {
    setActiveModuleId(content.module_id);
    setEditingContentId(content.id);
    setContentForm({
      title: content.title || '',
      type: content.type || 'video',
      url: content.url || '',
      description: content.description || '',
      workbook_id: content.workbook_id || '',
    });
    setPendingItems([]);
    setIsContentDialogOpen(true);
  };

  const addToQueue = async () => {
    if (!contentForm.title.trim()) {
      toast({ title: 'Título Obrigatório', variant: 'destructive' });
      return;
    }

    let fileUrl = contentForm.url;

    if (file) {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('learning-contents')
        .upload(filePath, file);

      if (uploadError) {
        toast({
          title: 'Erro no Upload',
          description: uploadError.message,
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }

      const { publicUrl } = supabase.storage
        .from('learning-contents')
        .getPublicUrl(filePath).data;

      fileUrl = publicUrl;
      setFile(null);
    }

    const finalWorkbookId = contentForm.workbook_id === 'none' || !contentForm.workbook_id ? null : contentForm.workbook_id;

    if (editingContentId) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('learning_contents')
          .update({
            title: contentForm.title,
            type: contentForm.type,
            url: fileUrl,
            description: contentForm.description,
            workbook_id: finalWorkbookId,
          })
          .eq('id', editingContentId);

        if (error) throw error;

        toast({ title: 'Aula Atualizada!' });
        
        setTimeout(() => {
          setIsContentDialogOpen(false);
          setEditingContentId(null);
          setTimeout(() => { document.body.style.pointerEvents = ""; }, 500);
        }, 50);
        
        loadData();
      } catch (e: any) {
        toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setPendingItems([
        ...pendingItems,
        { ...contentForm, url: fileUrl, workbook_id: finalWorkbookId, id: Date.now().toString() },
      ]);
      setContentForm({ title: '', type: 'video', url: '', description: '', workbook_id: '' });
      setUploading(false);
      setFileInputKey(Date.now()); // Força a DOM a limpar o input de arquivos
    }
  };

  const removeFromQueue = (id: string) => {
    setPendingItems(pendingItems.filter((item) => item.id !== id));
  };

  const handleBatchSaveContent = async (moduleId: string | null) => {
    // Use a ref como fallback caso o estado seja limpo antes da execução
    const resolvedModuleId = moduleId || activeModuleRef.current;
    if (!resolvedModuleId || pendingItems.length === 0 || isSubmitting) return;
    moduleId = resolvedModuleId;
    setIsSubmitting(true);

    const currentModuleContents = contents[moduleId] || [];
    const itemsToInsert = pendingItems.map((item, idx) => ({
      module_id: moduleId,
      title: item.title,
      type: item.type,
      url: item.url,
      description: item.description,
      workbook_id: item.workbook_id,
      order_index: currentModuleContents.length + idx,
    }));

    const { data, error } = await supabase
      .from('learning_contents')
      .insert(itemsToInsert)
      .select();

    if (!error && data) {
      setContents((prev) => ({
        ...prev,
        [moduleId]: [...(prev[moduleId] || []), ...data],
      }));
      toast({
        title: 'Materiais Publicados!',
        description: `${data.length} itens foram adicionados ao capítulo.`,
      });
      
      setTimeout(() => {
        setPendingItems([]);
        setIsContentDialogOpen(false);
        setTimeout(() => { document.body.style.pointerEvents = ""; }, 500);
      }, 50);
    } else {
      toast({ title: 'Erro ao salvar', description: error?.message || 'Ocorreu um erro desconhecido', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteModule = async (id: string) => {
    if (deletingId || !confirm('Excluir este capítulo e todo seu conteúdo?'))
      return;
    setDeletingId(id);
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (!error) {
      setModules((prev) => prev.filter((m) => m.id !== id));
      toast({ title: 'Capítulo removido.' });
    }
    setDeletingId(null);
  };

  const handleDeleteContent = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    const { error } = await supabase
      .from('learning_contents')
      .delete()
      .eq('id', id);
    if (!error) {
      setContents((prev) => {
        const newContents = { ...prev };
        for (const modId in newContents) {
          newContents[modId] = newContents[modId].filter((c) => c.id !== id);
        }
        return newContents;
      });
      toast({ title: 'Item removido.' });
    }
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className='flex flex-col h-screen items-center justify-center gap-4 bg-background'>
        <Loader2 className='animate-spin h-14 w-14 text-accent' />
        <p className='text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse'>
          Sintonizando Estúdio...
        </p>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-700 pb-24 px-1'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-xl border border-muted/10'>
        <div className='flex items-center gap-6'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.back()}
            className='rounded-full h-12 w-12 bg-muted/30 hover:bg-primary/5 transition-all'
          >
            <ChevronLeft className='h-6 w-6 text-primary' />
          </Button>
          <div>
            <h1 className='text-xl md:text-3xl font-black text-primary italic leading-none truncate max-w-[250px] md:max-w-md'>
              {trail?.title}
            </h1>
            <div className='flex items-center gap-2 mt-1.5'>
              <Badge
                variant={trail?.status === 'active' ? 'default' : 'outline'}
                className={`text-[8px] font-black uppercase px-2.5 h-5 flex items-center ${
                  trail?.status === 'active'
                    ? 'bg-green-600 border-none text-white'
                    : 'text-orange-500 border-orange-500'
                }`}
              >
                {trail?.status === 'active' ? 'PÚBLICA' : 'RASCUNHO'}
              </Badge>
              <span className='text-[9px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline'>
                Painel de Autor
              </span>
            </div>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleDeleteTrail}
            title='Excluir Trilha Definitivamente'
            className='rounded-xl h-12 w-12 text-red-500 hover:bg-red-50 hover:text-red-700 transition-all hidden sm:flex shrink-0'
          >
            <Trash2 className='h-5 w-5' />
          </Button>
          <Button
            variant='outline'
            onClick={openEditTrailDialog}
            className='rounded-xl h-12 border-primary/20 text-primary font-black px-6 shadow-sm hover:bg-primary/5 transition-all hidden sm:flex'
          >
            <Pencil className='h-5 w-5 mr-2 text-primary/50' /> Detalhes
          </Button>
          <Button
            variant='outline'
            className='rounded-xl h-12 border-primary/20 text-primary font-black px-6 shadow-sm hover:bg-primary/5 transition-all hidden sm:flex'
            asChild
          >
            <Link href={`/dashboard/classroom/${trailId}`}>
              <Eye className='h-5 w-5 mr-2 text-accent' /> Prévia
            </Link>
          </Button>
          <Button
            onClick={() => setIsModuleDialogOpen(true)}
            className='bg-primary text-white font-black rounded-xl shadow-lg h-12 px-8 hover:scale-105 transition-all'
          >
            <Plus className='h-5 w-5 mr-2 text-accent' /> Novo Capítulo
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        <div className='lg:col-span-8 space-y-6'>
          {modules.length === 0 ? (
            <Card className='border-4 border-dashed border-muted/20 bg-muted/5 rounded-[3rem] p-20 text-center flex flex-col items-center gap-4'>
              <ListPlus className='h-16 w-16 text-muted-foreground/30' />
              <h3 className='text-xl font-black text-primary italic'>
                Inicie sua Jornada
              </h3>
              <Button
                onClick={() => setIsModuleDialogOpen(true)}
                className='bg-accent text-accent-foreground font-black px-10 h-14 rounded-2xl shadow-xl'
              >
                Criar Primeiro Capítulo
              </Button>
            </Card>
          ) : (
            modules.map((mod, idx) => (
              <Card
                key={mod.id}
                className='border-none shadow-2xl bg-white overflow-hidden rounded-[2rem] group transition-all hover:shadow-primary/5'
              >
                <CardHeader className='bg-muted/10 p-6 flex flex-row items-center justify-between border-b border-muted/20'>
                  <div className='flex items-center gap-4'>
                    <div className='h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black italic shadow-lg rotate-3 group-hover:rotate-0 transition-transform'>
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </div>
                    <div>
                      <CardTitle className='text-lg font-black text-primary italic leading-none'>
                        {mod.title}
                      </CardTitle>
                      <p className='text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1.5'>
                        {contents[mod.id]?.length || 0} Materiais vinculados
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleDeleteModule(mod.id)}
                      disabled={deletingId === mod.id}
                      className='text-muted-foreground hover:text-red-600 rounded-full h-10 w-10 hover:bg-red-50'
                    >
                      {deletingId === mod.id ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Trash2 className='h-4 w-4' />
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        activeModuleRef.current = mod.id;
                        setActiveModuleId(mod.id);
                        setEditingContentId(null);
                        setPendingItems([]);
                        setContentForm({ title: '', type: 'video', url: '', description: '', workbook_id: '' });
                        setIsContentDialogOpen(true);
                      }}
                      className='bg-accent text-accent-foreground font-black text-[9px] uppercase rounded-xl h-10 px-5 shadow-md hover:scale-105 active:scale-95 transition-all'
                    >
                      <Plus className='h-4 w-4 mr-1.5' /> Adicionar Aula
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='p-6 space-y-3'>
                  {(contents[mod.id] || []).map((content) => (
                    <div
                      key={content.id}
                      className='flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-accent/30 hover:bg-white hover:shadow-xl transition-all group/item'
                    >
                      <div className='flex items-center gap-4 overflow-hidden'>
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                            content.type === 'video'
                              ? 'bg-red-50 text-red-600'
                              : content.type === 'quiz'
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}>
                          {content.type === 'video' ? (
                            <Youtube className='h-5 w-5' />
                          ) : content.type === 'quiz' ? (
                            <BrainCircuit className='h-5 w-5' />
                          ) : (
                            <FileText className='h-5 w-5' />
                          )}
                        </div>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <p className='font-black text-xs md:text-sm text-primary truncate leading-none'>
                              {content.title}
                            </p>
                            {content.workbook_id && (
                              <Badge className='bg-accent/10 text-accent border-none text-[7px] font-black h-4 px-1.5 flex items-center gap-1'>
                                <BookOpen className='h-2 w-2' /> APOSTILA
                              </Badge>
                            )}
                          </div>
                          <p className='text-[8px] font-bold text-muted-foreground uppercase mt-1 opacity-60'>
                            {content.type}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-all'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-9 w-9 rounded-full hover:bg-primary/10 text-primary'
                          onClick={() => startEditContent(content)}
                        >
                          <Pencil className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-9 w-9 rounded-full hover:bg-red-500 hover:text-white'
                          onClick={() => handleDeleteContent(content.id)}
                          disabled={deletingId === content.id}
                        >
                          {deletingId === content.id ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <Trash2 className='h-4 w-4' />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!contents[mod.id] || contents[mod.id].length === 0) && (
                    <div className='text-center py-10 border-2 border-dashed border-muted/30 rounded-2xl bg-muted/5'>
                      <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest italic opacity-40'>
                        Este capítulo ainda está sem materiais didáticos.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className='lg:col-span-4 space-y-6'>
          <Card className='border-none shadow-2xl bg-primary text-white rounded-[2.5rem] p-8 overflow-hidden relative group'>
            <div className='absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000' />
            <div className='relative z-10 space-y-6'>
              <div className='flex items-center gap-4'>
                <div className='h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-xl'>
                  {trail?.status === 'active' ? (
                    <Globe className='h-8 w-8 text-green-400 animate-pulse' />
                  ) : (
                    <Settings2 className='h-8 w-8 text-accent' />
                  )}
                </div>
                <div>
                  <p className='text-[9px] font-black uppercase tracking-widest opacity-60'>
                    Status de Rede
                  </p>
                  <p className='text-2xl font-black italic uppercase'>
                    {trail?.status === 'active' ? 'Publicada' : 'Em Rascunho'}
                  </p>
                </div>
              </div>

              <div className='p-5 rounded-2xl bg-white/5 border border-white/10'>
                <p className='text-xs font-medium italic opacity-80 leading-relaxed'>
                  {trail?.status === 'active'
                    ? 'O material está sintonizado para todos os alunos autenticados.'
                    : 'Apenas você e a coordenação podem ver este capítulo.'}
                </p>
              </div>

              <Button
                onClick={handlePublish}
                disabled={isPublishing || !trail}
                className={`w-full font-black h-16 rounded-2xl shadow-xl transition-all border-none text-sm uppercase ${
                  trail?.status === 'active'
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-accent text-accent-foreground hover:bg-accent/90'
                }`}>
                {isPublishing ? (
                  <Loader2 className='animate-spin h-6 w-6 mr-2' />
                ) : (
                  <CheckCircle2 className='h-6 w-6 mr-2' />
                )}
                {trail?.status === 'active'
                  ? 'Retirar de Exibição'
                  : 'Liberar na Rede'}
              </Button>
            </div>
          </Card>

          <Card className='bg-white border-none shadow-xl rounded-[2rem] p-8 space-y-6'>
            <div className="flex items-center gap-3">
              <Sparkles className='h-5 w-5 text-accent' />
              <h3 className='text-[10px] font-black text-primary uppercase tracking-widest'>
                Mentoria Compromisso
              </h3>
            </div>
            <p className='text-sm font-medium italic text-primary/70 leading-relaxed border-l-4 border-accent/30 pl-4'>
              "Organize suas aulas em blocos de até 15 minutos para maximizar o foco dos estudantes de Santana de Parnaíba."
            </p>
          </Card>
        </div>
      </div>

      {/* DIÁLOGO EDITAR TRILHA */}
      <Dialog open={isEditTrailDialogOpen} onOpenChange={setIsEditTrailDialogOpen}>
        <DialogContent className='rounded-2xl md:rounded-3xl p-6 md:p-8 bg-white w-[95vw] sm:w-full max-w-lg border-none shadow-xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-lg md:text-xl font-black italic text-primary'>Editar Rótulo da Trilha</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:gap-5 py-2 md:py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Título Principal</Label>
              <Input placeholder="Ex: Fundamentos de Redação" className="h-11 rounded-xl bg-muted/30 border-none font-bold" value={editTrailForm.title} onChange={(e) => setEditTrailForm({ ...editTrailForm, title: e.target.value })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Matéria Central</Label>
              <Select value={editTrailForm.category} onValueChange={(v) => setEditTrailForm({ ...editTrailForm, category: v })} disabled={isSubmitting}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-none font-bold">
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl max-h-60">
                    {EDUCATIONAL_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Breve Descrição</Label>
              <Textarea placeholder="Qual o propósito deste conjunto de módulos?" className="min-h-[80px] md:min-h-[100px] rounded-xl bg-muted/30 border-none font-medium resize-none" value={editTrailForm.description} onChange={(e) => setEditTrailForm({ ...editTrailForm, description: e.target.value })} disabled={isSubmitting} />
            </div>
          </div>
          <DialogFooter className="mt-2 md:mt-0">
            <Button onClick={handleUpdateTrail} disabled={isSubmitting || !editTrailForm.title} className="w-full h-12 md:h-12 bg-primary text-white font-black text-sm md:text-base rounded-xl shadow-lg">
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO MÓDULO */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className='rounded-2xl md:rounded-3xl p-6 md:p-8 bg-white border-none shadow-xl w-[95vw] sm:w-full max-w-sm mx-auto'>
          <DialogHeader>
            <DialogTitle className='text-lg md:text-xl font-black italic text-primary'>
              Novo Capítulo
            </DialogTitle>
          </DialogHeader>
          <div className='py-4 space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest opacity-40 ml-2'>
              Título da Unidade Didática
            </Label>
            <Input
              placeholder='Ex: Introdução à Matéria'
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ title: e.target.value || '' })}
              disabled={isSubmitting}
              className='h-11 rounded-xl bg-muted/30 border-none font-bold italic text-base focus:ring-accent'
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddModule}
              disabled={isSubmitting || !moduleForm.title}
              className='w-full h-12 bg-primary text-white font-black rounded-xl shadow-lg'
            >
              {isSubmitting ? (
                <Loader2 className='h-5 w-5 animate-spin mr-2' />
              ) : (
                'Criar Unidade'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO CONTEÚDO (CRIAÇÃO/EDIÇÃO) */}
      <Dialog open={isContentDialogOpen} onOpenChange={(open) => {
        // Só reseta o estado quando fechar (não ao abrir)
        if (!open) {
          // Preserva o activeModuleRef para não perder o contexto
          setIsContentDialogOpen(false);
        } else {
          setIsContentDialogOpen(true);
        }
      }}>
        <DialogContent className='rounded-2xl max-h-[95vh] md:rounded-3xl p-0 w-[95vw] sm:w-full max-w-4xl bg-white border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden mx-auto flex flex-col'>
          <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="p-6 md:p-8 bg-primary text-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 md:h-10 md:w-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shadow-lg shrink-0">
                  {editingContentId ? <Pencil className="h-5 w-5 md:h-5 md:w-5" /> : <PlusCircle className="h-5 w-5 md:h-5 md:w-5" />}
                </div>
                <div>
                  <DialogTitle className='text-lg md:text-2xl font-black italic tracking-tighter uppercase leading-none'>
                    {editingContentId ? 'Ajustar Material' : 'Anexar Materiais'}
                  </DialogTitle>
                  <p className='text-white/60 text-xs md:text-sm font-medium italic mt-1.5'>
                    {editingContentId ? 'Altere as propriedades do material pedagógico.' : 'Construa a sequência didática para este capítulo antes de publicar.'}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-auto">
              <div className={`grid grid-cols-1 ${editingContentId ? '' : 'lg:grid-cols-2'} gap-0 h-full`}>
                {/* FORMULÁRIO DE ENTRADA */}
                <div className={`p-6 md:p-8 space-y-5 ${editingContentId ? '' : 'border-r border-dashed border-muted/20'} bg-slate-50/50`}>
                  <div className='space-y-4'>
                    <div className='space-y-1.5'>
                      <Label className='text-[10px] font-black uppercase tracking-widest text-primary/40 px-2'>
                        Categoria do Item
                      </Label>
                      <Select
                        value={contentForm.type}
                        onValueChange={(v) =>
                          setContentForm((prev) => ({ ...prev, type: v }))
                        }
                        disabled={isSubmitting || uploading}
                      >
                        <SelectTrigger className='h-11 rounded-xl bg-white border-none shadow-sm font-bold italic text-primary'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className='rounded-xl border-none shadow-xl p-2'>
                          <SelectItem value='video' className='py-2 font-bold'>🎞️ Videoaula Youtube</SelectItem>
                          <SelectItem value='quiz' className='py-2 font-bold'>🧠 Quiz Interativo</SelectItem>
                          <SelectItem value='pdf' className='py-2 font-bold'>📄 Documento PDF</SelectItem>
                          <SelectItem value='text' className='py-2 font-bold'>📝 Conteúdo em Texto</SelectItem>
                          <SelectItem value='file' className='py-2 font-bold'>📎 Anexo Geral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-[10px] font-black uppercase tracking-widest text-primary/40 px-2'>
                        Título do Conteúdo
                      </Label>
                      <Input
                        placeholder='Ex: Aula 01 - Conceitos Base'
                        value={contentForm.title}
                        onChange={(e) =>
                          setContentForm((prev) => ({ ...prev, title: e.target.value || '' }))
                        }
                        disabled={isSubmitting || uploading}
                        className='h-11 rounded-xl bg-white border-none shadow-sm font-bold italic text-primary'
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-[10px] font-black uppercase tracking-widest text-primary/40 px-2 flex items-center gap-2'>
                        <BookOpen className='h-3 w-3 text-accent' /> Vincular Apostila Interativa
                      </Label>
                      <Select
                        value={contentForm.workbook_id}
                        onValueChange={(v) =>
                          setContentForm((prev) => ({ ...prev, workbook_id: v }))
                        }
                        disabled={isSubmitting || uploading}
                      >
                        <SelectTrigger className='h-11 rounded-xl bg-white border-none shadow-sm font-bold italic text-primary'>
                          <SelectValue placeholder="Nenhuma apostila selecionada" />
                        </SelectTrigger>
                        <SelectContent className='rounded-xl border-none shadow-xl p-2'>
                          <SelectItem value="none" className='py-2 font-bold'>Sem Apostila</SelectItem>
                          {libraryResources.map(res => (
                            <SelectItem key={res.id} value={res.id} className='py-2 font-bold'>📚 {res.category}: {res.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {contentForm.type === 'file' || contentForm.type === 'pdf' ? (
                      <div className='space-y-1.5'>
                        <Label className='text-[10px] font-black uppercase tracking-widest text-primary/40 px-2'>
                          Upload de Arquivo {editingContentId && '(Deixe vazio p/ não alterar)'}
                        </Label>
                        <div className="relative group">
                          <Input
                            key={fileInputKey}
                            type='file'
                            accept={contentForm.type === 'pdf' ? '.pdf' : '*'}
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            disabled={isSubmitting || uploading}
                            className='h-11 rounded-xl bg-white border-2 border-dashed border-muted/30 p-1.5 cursor-pointer transition-all hover:border-accent file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-white text-xs'
                          />
                          <FileUp className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className='space-y-1.5'>
                        <Label className='text-[10px] font-black uppercase tracking-widest text-primary/40 px-2'>
                          Link Externo (URL)
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder='https://...'
                            value={contentForm.url}
                            onChange={(e) =>
                              setContentForm((prev) => ({ ...prev, url: e.target.value || '' }))
                            }
                            disabled={isSubmitting || uploading}
                            className='h-11 rounded-xl bg-white border-none shadow-sm font-medium italic text-primary pl-10'
                          />
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent opacity-40" />
                        </div>
                      </div>
                    )}

                    <div className='space-y-1.5'>
                      <Label className='text-[10px] font-black uppercase tracking-widest text-primary/40 px-2'>
                        Notas do Mentor (Opcional)
                      </Label>
                      <Textarea
                        placeholder='Oriente o aluno sobre como usar este material...'
                        value={contentForm.description}
                        onChange={(e) =>
                          setContentForm((prev) => ({
                            ...prev,
                            description: e.target.value || '',
                          }))
                        }
                        disabled={isSubmitting || uploading}
                        className='h-20 rounded-xl bg-white border-none shadow-sm font-medium italic resize-none text-xs p-3'
                      />
                    </div>

                    {!editingContentId && (
                      <Button
                        onClick={addToQueue}
                        disabled={isSubmitting || uploading || !contentForm.title || ((contentForm.type === 'file' || contentForm.type === 'pdf') && !file)}
                        className='w-full h-12 rounded-xl bg-accent text-accent-foreground font-black uppercase text-[10px] tracking-widest gap-2 shadow-md hover:scale-105 active:scale-95 transition-all'
                      >
                        {uploading ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <PlusCircle className='h-4 w-4' />
                        )}
                        {uploading ? 'Enviando...' : 'Adicionar à Fila'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* FILA DE REVISÃO (Só aparece se não estiver editando) */}
                {!editingContentId && (
                  <div className='p-6 md:p-8 space-y-6 bg-white'>
                    <div className="flex items-center justify-between">
                      <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 flex items-center gap-2'>
                        <Layers className='h-4 w-4 text-accent' /> 
                        Fila de Publicação
                      </h3>
                      <Badge className="bg-primary/5 text-primary border-none font-bold text-[10px] px-2">
                        {pendingItems.length} ITENS
                      </Badge>
                    </div>

                    <div className='space-y-3 min-h-[200px]'>
                      {pendingItems.length === 0 ? (
                        <div className='h-full min-h-[200px] flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed rounded-3xl bg-muted/5 gap-3'>
                          <Layout className='h-12 w-12 text-primary' />
                          <div className="space-y-1">
                            <p className='text-[10px] font-black uppercase tracking-widest'>Estúdio Vazio</p>
                            <p className="text-[9px] font-medium italic">Adicione materiais para ver a fila.</p>
                          </div>
                        </div>
                      ) : (
                        pendingItems.map((item) => (
                          <div
                            key={item.id}
                            className='flex items-center justify-between p-3 rounded-xl bg-slate-50 shadow-sm border border-slate-100 animate-in slide-in-from-right-4 duration-500 hover:shadow-md transition-all group'
                          >
                            <div className='flex items-center gap-3 overflow-hidden'>
                              <div
                                className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${
                                  item.type === 'video'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-primary/5 text-primary'
                                }`}>
                                {item.type === 'video' ? (
                                  <Video className='h-4 w-4' />
                                ) : (
                                  <FileText className='h-4 w-4' />
                                )}
                              </div>
                              <div className="min-w-0 pr-2">
                                <p className='font-bold text-xs text-primary truncate max-w-[180px] italic'>
                                  {item.title}
                                </p>
                                <Badge variant="outline" className="text-[7px] font-bold h-4 border-muted/30 uppercase mt-0.5 opacity-60">
                                  {item.type}
                                </Badge>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFromQueue(item.id)}
                              className='h-8 w-8 rounded-full bg-white text-muted-foreground hover:text-red-600 hover:bg-red-50 shadow-sm transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shrink-0'
                            >
                              <X className='h-3 w-3' />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className='p-6 bg-slate-50 border-t shrink-0 flex flex-col md:flex-row md:justify-between items-center gap-4'> 
              {/* Alerta de Item Não Salvo */}
              <div className="flex-1 w-full text-left">
                {!editingContentId && contentForm.title.trim() && (
                  <p className="text-[10px] font-bold text-orange-500 animate-pulse bg-orange-50 p-2 rounded-lg border border-orange-100">
                    ⚠️ Você começou a preencher um item, mas não clicou em "Adicionar à Fila".
                  </p>
                )}
              </div>

              <Button
                onClick={() => {
                  if (!editingContentId && contentForm.title.trim()) {
                     toast({ title: 'Adicione o item à fila primeiro!', variant: 'destructive', description: 'Clique no botão Adicionar à Fila antes de publicar.' });
                     return;
                  }
                  editingContentId ? addToQueue() : handleBatchSaveContent(activeModuleId);
                }}
                disabled={isSubmitting || (!editingContentId && pendingItems.length === 0)}
                className='w-full md:w-auto h-12 bg-primary text-white font-black text-xs rounded-xl shadow-[0_10px_30px_-10px_rgba(26,44,75,0.4)] transition-all hover:scale-[1.02] active:scale-95 border-none px-8 uppercase tracking-widest'
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className='animate-spin h-4 w-4' /> 
                    <span>Sincronizando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className='h-4 w-4 text-accent' /> 
                    <span>{editingContentId ? 'Salvar Edição' : 'Publicar Capítulo'}</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
