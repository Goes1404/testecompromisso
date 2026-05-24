
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  FolderOpen, PlusCircle, Trash2, Loader2, FileText, Video,
  Link2, Image, File, Users, BookOpen, Calendar, Eye,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EDUCATIONAL_CATEGORIES } from '@/lib/constants';

type ClassMaterial = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  file_url: string;
  file_type: string;
  target_group: string;
  teacher_id: string;
  teacher_name: string | null;
  session_id: string | null;
  is_published: boolean;
  created_at: string;
  material_views: { count: number }[];
};

type ClassSession = {
  id: string;
  title: string;
  session_date: string;
};

const FILE_TYPES = [
  { value: 'pdf',    label: 'PDF',    icon: FileText },
  { value: 'video',  label: 'Vídeo',  icon: Video },
  { value: 'link',   label: 'Link',   icon: Link2 },
  { value: 'imagem', label: 'Imagem', icon: Image },
  { value: 'outro',  label: 'Outro',  icon: File },
];

const TARGET_GROUPS = [
  { value: 'all',  label: 'Todos' },
  { value: 'enem', label: 'ENEM' },
  { value: 'etec', label: 'ETEC/FATEC' },
];

const blank = { title: '', description: '', subject: 'none', file_type: 'pdf', target_group: 'all', session_id: 'none' };

function getTypeIcon(type: string) {
  return FILE_TYPES.find(t => t.value === type)?.icon ?? File;
}

function getTypeBadgeColor(type: string) {
  const map: Record<string, string> = {
    pdf:    'bg-red-100 text-red-700',
    video:  'bg-blue-100 text-blue-700',
    link:   'bg-purple-100 text-purple-700',
    imagem: 'bg-green-100 text-green-700',
    outro:  'bg-slate-100 text-slate-600',
  };
  return map[type] ?? map.outro;
}

export default function TeacherMaterialsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [useUpload, setUseUpload] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchData() {
    if (!user) return;
    setLoading(true);
    const [matRes, sesRes] = await Promise.all([
      supabase
        .from('class_materials')
        .select('*, material_views(count)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('class_sessions')
        .select('id, title, session_date')
        .eq('teacher_id', user.id)
        .order('session_date', { ascending: false }),
    ]);
    setMaterials(matRes.data ?? []);
    setSessions(sesRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [user]);

  async function handleSubmit() {
    if (!form.title || (!file && !urlInput) || !user) return;
    setSaving(true);
    try {
      let finalUrl = urlInput;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `materials/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('learning-contents')
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from('learning-contents')
          .getPublicUrl(path);
        finalUrl = urlData.publicUrl;
      }

      const payload = {
        title: form.title,
        description: form.description || null,
        subject: form.subject === 'none' ? null : form.subject,
        file_url: finalUrl,
        file_type: form.file_type,
        target_group: form.target_group,
        session_id: form.session_id === 'none' ? null : form.session_id,
        teacher_id: user.id,
        teacher_name: profile?.full_name ?? null,
        is_published: true,
      };

      const { data: matData, error } = await supabase.from('class_materials').insert(payload).select('id').single();
      if (error) throw error;

      fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "material", materialId: matData.id }),
      }).catch(() => {});

      toast({ title: 'Material publicado!' });
      setForm(blank);
      setFile(null);
      setUrlInput('');
      setShowForm(false);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Erro ao publicar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este material?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('class_materials').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Material removido.' });
      setMaterials(prev => prev.filter(m => m.id !== id));
    }
    setDeletingId(null);
  }

  const subjects = Array.from(new Set(materials.map(m => m.subject).filter(Boolean))) as string[];

  const filtered = materials.filter(m => {
    if (filterType !== 'all' && m.file_type !== filterType) return false;
    if (filterSubject !== 'all' && m.subject !== filterSubject) return false;
    return true;
  });

  const totalViews = materials.reduce((acc, m) => acc + (m.material_views?.[0]?.count ?? 0), 0);
  const thisMonth = materials.filter(m =>
    m.created_at.startsWith(new Date().toISOString().slice(0, 7))
  ).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-3">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-primary italic leading-none">Materiais de Aula</h1>
            <p className="text-muted-foreground font-medium italic">Publique PDFs, vídeos e links para seus alunos.</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(s => !s)}
          className="h-12 px-6 rounded-2xl bg-primary text-white font-black shadow-xl"
        >
          <PlusCircle className="h-5 w-5 mr-2" /> Novo Material
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Materiais', value: materials.length, icon: FolderOpen },
          { label: 'Visualizações Totais', value: totalViews, icon: Eye },
          { label: 'Publicados Este Mês', value: thisMonth, icon: Calendar },
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

      {/* Formulário inline */}
      {showForm && (
        <Card className="border-none shadow-2xl rounded-[2.5rem] animate-in slide-in-from-top-4 duration-300">
          <CardContent className="p-8 space-y-5">
            <h2 className="text-xl font-black text-primary italic">Publicar Novo Material</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Título *</Label>
                <Input
                  placeholder="Ex: Slides — Funções do 2º Grau"
                  className="h-11 rounded-2xl bg-muted/30 border-none font-bold"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Matéria</Label>
                <Select value={form.subject} onValueChange={val => setForm(f => ({ ...f, subject: val }))}>
                  <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-bold">
                    <SelectValue placeholder="Selecione a matéria" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl max-h-60">
                    <SelectItem value="none" className="font-bold">Nenhuma</SelectItem>
                    {EDUCATIONAL_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Tipo</Label>
                <Select value={form.file_type} onValueChange={val => setForm(f => ({ ...f, file_type: val }))}>
                  <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {FILE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="font-bold">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Público Alvo</Label>
                <Select value={form.target_group} onValueChange={val => setForm(f => ({ ...f, target_group: val }))}>
                  <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {TARGET_GROUPS.map(t => (
                      <SelectItem key={t.value} value={t.value} className="font-bold">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Aula Vinculada (opcional)</Label>
                <Select value={form.session_id} onValueChange={val => setForm(f => ({ ...f, session_id: val }))}>
                  <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-bold">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="none" className="font-bold">Nenhuma</SelectItem>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id} className="font-bold">
                        {format(new Date(s.session_date + 'T00:00:00'), 'dd/MM', { locale: ptBR })} — {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload ou URL */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseUpload(true)}
                    className={`text-[9px] font-black uppercase px-3 py-1 rounded-full transition-all ${useUpload ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                  >
                    Fazer Upload
                  </button>
                  <button
                    onClick={() => setUseUpload(false)}
                    className={`text-[9px] font-black uppercase px-3 py-1 rounded-full transition-all ${!useUpload ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                  >
                    Colar URL / Link
                  </button>
                </div>
                {useUpload ? (
                  <Input
                    key="file-input"
                    type="file"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className="h-11 rounded-2xl bg-muted/30 border-2 border-dashed border-primary/20 cursor-pointer hover:border-primary/40 p-2 file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-primary file:text-white"
                  />
                ) : (
                  <Input
                    key="url-input"
                    placeholder="https://..."
                    className="h-11 rounded-2xl bg-muted/30 border-none font-medium"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Descrição (opcional)</Label>
                <Textarea
                  placeholder="Detalhes sobre este material..."
                  className="rounded-2xl bg-muted/30 border-none font-medium"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={saving || !form.title || (!file && !urlInput)}
                className="flex-1 h-12 rounded-2xl bg-primary text-white font-black shadow-xl"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                Publicar Material
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowForm(false); setForm(blank); setFile(null); setUrlInput(''); }}
                className="h-12 px-6 rounded-2xl font-black"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      {!loading && materials.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-44 rounded-2xl bg-white shadow-sm border-none font-bold text-xs">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              <SelectItem value="all" className="font-bold">Todos os tipos</SelectItem>
              {FILE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="font-bold">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subjects.length > 0 && (
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-9 w-44 rounded-2xl bg-white shadow-sm border-none font-bold text-xs">
                <SelectValue placeholder="Todas as matérias" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all" className="font-bold">Todas as matérias</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          <p className="font-black text-primary italic text-xl">Nenhum material publicado ainda</p>
          <p className="text-muted-foreground text-sm mt-1">Clique em "Novo Material" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const Icon = getTypeIcon(m.file_type);
            const viewCount = m.material_views?.[0]?.count ?? 0;
            return (
              <div
                key={m.id}
                className="flex items-center gap-4 bg-white rounded-2xl shadow-md p-4 group hover:shadow-lg transition-all"
              >
                <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-primary text-sm truncate">{m.title}</p>
                    {m.subject && (
                      <Badge className="text-[8px] font-black border-none bg-primary/10 text-primary shrink-0">
                        {m.subject}
                      </Badge>
                    )}
                    <Badge className={`text-[8px] font-black border-none shrink-0 ${getTypeBadgeColor(m.file_type)}`}>
                      {FILE_TYPES.find(t => t.value === m.file_type)?.label ?? m.file_type}
                    </Badge>
                    <Badge className="text-[8px] font-black border-none bg-slate-100 text-slate-600 shrink-0">
                      {TARGET_GROUPS.find(t => t.value === m.target_group)?.label ?? 'Todos'}
                    </Badge>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">{m.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(m.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                    {' · '}
                    <span className="font-bold">{viewCount} {viewCount === 1 ? 'aluno visualizou' : 'alunos visualizaram'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-blue-50 text-blue-500 transition-all"
                    title="Abrir material"
                  >
                    <BookOpen className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingId === m.id}
                    className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-red-50 text-red-400 transition-all disabled:opacity-50"
                    title="Remover"
                  >
                    {deletingId === m.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
