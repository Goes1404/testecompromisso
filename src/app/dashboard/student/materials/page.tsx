
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  FolderOpen, FileText, Video, Link2, Image, File,
  CheckCircle2, Circle, BookOpen, Loader2, Calendar,
  Search, LayoutGrid, List,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ClassMaterial = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  file_url: string;
  file_type: string;
  target_group: string;
  teacher_name: string | null;
  created_at: string;
};

const FILE_TYPES: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  badge: string; 
  accentBg: string; 
  accentText: string; 
  btnGradient: string;
  btnShadow: string;
}> = {
  pdf: { 
    label: 'PDF', 
    icon: FileText, 
    badge: 'bg-red-50 text-red-600 border-red-100/50', 
    accentBg: 'bg-red-500/5', 
    accentText: 'text-red-500',
    btnGradient: 'from-rose-500 to-red-600',
    btnShadow: 'shadow-red-500/20'
  },
  video: { 
    label: 'Vídeo', 
    icon: Video, 
    badge: 'bg-blue-50 text-blue-600 border-blue-100/50', 
    accentBg: 'bg-blue-500/5', 
    accentText: 'text-blue-500',
    btnGradient: 'from-blue-500 to-indigo-600',
    btnShadow: 'shadow-blue-500/20'
  },
  link: { 
    label: 'Link', 
    icon: Link2, 
    badge: 'bg-purple-50 text-purple-600 border-purple-100/50', 
    accentBg: 'bg-purple-500/5', 
    accentText: 'text-purple-500',
    btnGradient: 'from-purple-500 to-fuchsia-600',
    btnShadow: 'shadow-purple-500/20'
  },
  imagem: { 
    label: 'Imagem', 
    icon: Image, 
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-100/50', 
    accentBg: 'bg-emerald-500/5', 
    accentText: 'text-emerald-500',
    btnGradient: 'from-emerald-500 to-teal-600',
    btnShadow: 'shadow-emerald-500/20'
  },
  outro: { 
    label: 'Outro', 
    icon: File, 
    badge: 'bg-slate-50 text-slate-600 border-slate-100', 
    accentBg: 'bg-slate-500/5', 
    accentText: 'text-slate-500',
    btnGradient: 'from-slate-500 to-slate-700',
    btnShadow: 'shadow-slate-500/20'
  },
};

export default function StudentMaterialsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'viewed'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [matRes, viewRes] = await Promise.all([
      supabase
        .from('class_materials')
        .select('id, title, description, subject, file_url, file_type, target_group, teacher_name, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('material_views')
        .select('material_id')
        .eq('student_id', user.id),
    ]);
    setMaterials(matRes.data ?? []);
    setViewedIds(new Set((viewRes.data ?? []).map(v => v.material_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleOpen(material: ClassMaterial) {
    window.open(material.file_url, '_blank', 'noopener,noreferrer');
    if (!viewedIds.has(material.id)) {
      await markViewed(material.id);
    }
  }

  async function markViewed(materialId: string) {
    if (!user) return;
    setToggling(materialId);
    const { error } = await supabase
      .from('material_views')
      .upsert({ material_id: materialId, student_id: user.id }, { onConflict: 'material_id,student_id' });
    if (!error) {
      setViewedIds(prev => new Set([...prev, materialId]));
    }
    setToggling(null);
  }

  async function unmarkViewed(materialId: string) {
    if (!user) return;
    setToggling(materialId);
    const { error } = await supabase
      .from('material_views')
      .delete()
      .eq('material_id', materialId)
      .eq('student_id', user.id);
    if (!error) {
      setViewedIds(prev => { const s = new Set(prev); s.delete(materialId); return s; });
    } else {
      toast({ title: 'Erro ao desmarcar', description: error.message, variant: 'destructive' });
    }
    setToggling(null);
  }

  const subjects = Array.from(new Set(materials.map(m => m.subject).filter(Boolean))) as string[];

  const filtered = materials.filter(m => {
    // 1. Subject filter
    if (filterSubject !== 'all' && m.subject !== filterSubject) return false;
    
    // 2. Status filter
    const isViewed = viewedIds.has(m.id);
    if (statusFilter === 'pending' && isViewed) return false;
    if (statusFilter === 'viewed' && !isViewed) return false;
    
    // 3. Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = m.title.toLowerCase().includes(query);
      const descMatch = m.description?.toLowerCase().includes(query) ?? false;
      const subjectMatch = m.subject?.toLowerCase().includes(query) ?? false;
      const teacherMatch = m.teacher_name?.toLowerCase().includes(query) ?? false;
      if (!titleMatch && !descMatch && !subjectMatch && !teacherMatch) return false;
    }
    
    return true;
  });

  const totalStudied = materials.filter(m => viewedIds.has(m.id)).length;
  const progressPercent = materials.length > 0 ? Math.round((totalStudied / materials.length) * 100) : 0;
  const pending = materials.length - totalStudied;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-3">
          <FolderOpen className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-primary italic leading-none">Materiais de Aula</h1>
          <p className="text-muted-foreground font-medium italic">Acompanhe e estude os conteúdos compartilhados pelos professores.</p>
        </div>
      </header>

      {!loading && materials.length > 0 && (
        <>
          {/* Barra de progresso */}
          <Card className="border-none shadow-xl rounded-[2.5rem]">
            <CardContent className="pt-5 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-primary italic">Seu progresso</p>
                <span className={`text-lg font-black ${progressPercent >= 75 ? 'text-green-600' : 'text-orange-500'}`}>
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-3 rounded-full" />
              <p className="text-xs text-muted-foreground font-medium">
                {totalStudied} de {materials.length} materiais estudados
              </p>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total de Materiais', value: materials.length, icon: FolderOpen },
              { label: 'Estudados',          value: totalStudied,     icon: CheckCircle2 },
              { label: 'Pendentes',          value: pending,          icon: Calendar },
            ].map(s => (
              <Card key={s.label} className="border-none shadow-xl rounded-[2.5rem]">
                <CardContent className="pt-5 pb-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Barra de Controles (Pesquisa, Filtros e Visualização) */}
      {!loading && materials.length > 0 && (
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white/40 backdrop-blur-md p-3 rounded-[2rem] border border-slate-100 shadow-sm">
          {/* Input de Pesquisa */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar materiais..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-slate-100 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Filtros de Status (Tabs) */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl w-full md:w-auto overflow-x-auto shrink-0">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'viewed', label: 'Estudados' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-black rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end items-center">
            {/* Select de Matéria */}
            {subjects.length > 0 && (
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="h-10 w-40 rounded-xl bg-white shadow-sm border border-slate-100 font-bold text-[11px]">
                  <SelectValue placeholder="Todas as matérias" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="font-bold text-xs">Todas as matérias</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s} className="font-bold text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Botão de Toggle de Visualização (Grid vs List) */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grade"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Lista Compacta"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border-4 border-dashed border-muted/20 rounded-[3rem] bg-muted/5">
          <FolderOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-black text-primary italic text-xl">Nenhum material encontrado</p>
          <p className="text-muted-foreground text-sm mt-1">
            {searchQuery || filterSubject !== 'all' || statusFilter !== 'all'
              ? 'Tente ajustar os termos da pesquisa ou alterar os filtros.'
              : 'Nenhum material disponível ainda.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filtered.map(m => {
            const typeMeta = FILE_TYPES[m.file_type] ?? FILE_TYPES.outro;
            const Icon = typeMeta.icon;
            const isViewed = viewedIds.has(m.id);
            const isToggling = toggling === m.id;

            return (
              <Card
                key={m.id}
                className={`relative border border-slate-100 shadow-md hover:shadow-xl rounded-[2.2rem] transition-all duration-300 hover:-translate-y-1 overflow-hidden bg-white ${
                  isViewed ? 'ring-2 ring-emerald-500/20 border-emerald-200' : ''
                }`}
              >
                {/* Floating studied badge & check on top-right */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={() => isViewed ? unmarkViewed(m.id) : markViewed(m.id)}
                    disabled={isToggling}
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border ${
                      isViewed
                        ? 'bg-emerald-500 text-white border-transparent hover:bg-rose-500 hover:text-white'
                        : 'bg-white text-slate-400 border-slate-100 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100'
                    }`}
                    title={isViewed ? 'Desmarcar como estudado' : 'Marcar como estudado'}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isViewed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* Subject and Icon Header */}
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-2xl ${typeMeta.accentBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${typeMeta.accentText}`} />
                    </div>
                    <div className="flex flex-col min-w-0 pr-8">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                        {typeMeta.label}
                      </span>
                      {m.subject ? (
                        <span className="text-xs font-bold text-slate-700 truncate">{m.subject}</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Geral</span>
                      )}
                    </div>
                  </div>

                  {/* Title and Description */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-800 text-base leading-snug tracking-tight line-clamp-1 group-hover:text-primary transition-colors duration-200">
                        {m.title}
                      </h3>
                      {!isViewed && (
                        <Badge className="text-[8px] font-black border-none bg-amber-100 text-amber-700 shrink-0">
                          Novo
                        </Badge>
                      )}
                      {isViewed && (
                        <Badge className="text-[8px] font-black border-none bg-green-100 text-green-700 shrink-0">
                          Estudado
                        </Badge>
                      )}
                    </div>
                    {m.description ? (
                      <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {m.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 italic font-medium">Sem descrição disponível.</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-100/65 w-full" />

                  {/* Metadata and Open Button */}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-slate-500 font-bold truncate">
                        {m.teacher_name || 'Professor não identificado'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {format(new Date(m.created_at), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    </div>

                    <Button
                      onClick={() => handleOpen(m)}
                      className={`h-10 px-5 rounded-2xl bg-gradient-to-r ${typeMeta.btnGradient} text-white font-extrabold text-xs shadow-md ${typeMeta.btnShadow} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
                    >
                      <BookOpen className="h-4 w-4 mr-1.5" />
                      Abrir Material
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const typeMeta = FILE_TYPES[m.file_type] ?? FILE_TYPES.outro;
            const Icon = typeMeta.icon;
            const isViewed = viewedIds.has(m.id);
            const isToggling = toggling === m.id;

            return (
              <div
                key={m.id}
                className={`flex items-center gap-4 bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-200 ${
                  isViewed ? 'border-emerald-100 bg-emerald-50/10' : ''
                }`}
              >
                {/* Icon */}
                <div className={`h-10 w-10 rounded-xl ${typeMeta.accentBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${typeMeta.accentText}`} />
                </div>

                {/* Title & Metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{m.title}</h4>
                    {m.subject && (
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                        {m.subject}
                      </span>
                    )}
                    <span className={`text-[9px] font-bold ${typeMeta.badge} px-2 py-0.5 rounded-full border shrink-0`}>
                      {typeMeta.label}
                    </span>
                    {isViewed && (
                      <span className="text-[9px] font-black text-emerald-600 shrink-0">Estudado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                    <span>{m.teacher_name || 'Professor não identificado'}</span>
                    <span>•</span>
                    <span>{format(new Date(m.created_at), "dd 'de' MMM", { locale: ptBR })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Checkmark mark studied */}
                  <button
                    onClick={() => isViewed ? unmarkViewed(m.id) : markViewed(m.id)}
                    disabled={isToggling}
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 border ${
                      isViewed
                        ? 'bg-emerald-500 text-white border-transparent hover:bg-rose-500 hover:text-white'
                        : 'bg-white text-slate-400 border-slate-100 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isViewed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>

                  {/* Open */}
                  <Button
                    onClick={() => handleOpen(m)}
                    className={`h-8 px-3 rounded-xl bg-gradient-to-r ${typeMeta.btnGradient} text-white font-bold text-[10px] shadow-sm transition-all duration-200`}
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    Abrir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
