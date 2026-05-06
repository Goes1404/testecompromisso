
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
import { CalendarDays, PlusCircle, Trash2, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

type AcademicEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  target_group: string;
  created_by: string | null;
};

const EVENT_TYPES = [
  { value: 'simulado',        label: 'Simulado',          color: 'bg-blue-100 text-blue-700' },
  { value: 'inscricao',       label: 'Inscrição',         color: 'bg-amber-100 text-amber-700' },
  { value: 'aulao',           label: 'Aulão de Revisão',  color: 'bg-purple-100 text-purple-700' },
  { value: 'entrega_redacao', label: 'Entrega Redação',   color: 'bg-pink-100 text-pink-700' },
  { value: 'feriado',         label: 'Feriado',           color: 'bg-green-100 text-green-700' },
  { value: 'outro',           label: 'Outro',             color: 'bg-slate-100 text-slate-600' },
];

const TARGET_GROUPS = [
  { value: 'all',  label: 'Todos' },
  { value: 'enem', label: 'ENEM' },
  { value: 'etec', label: 'ETEC/FATEC' },
];

const blankForm = { title: '', description: '', event_date: '', event_type: 'outro', target_group: 'all' };

export default function TeacherCalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('academic_events')
      .select('*')
      .order('event_date', { ascending: true });
    setEvents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSubmit = async () => {
    if (!form.title || !form.event_date || !user) return;
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase.from('academic_events').update({ ...form }).eq('id', editId);
        if (error) throw error;
        toast({ title: 'Evento atualizado!' });
      } else {
        const { error } = await supabase.from('academic_events').insert({ ...form, created_by: user.id });
        if (error) throw error;
        toast({ title: 'Evento criado!' });
      }
      setForm(blankForm);
      setShowForm(false);
      setEditId(null);
      fetchEvents();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('academic_events').delete().eq('id', id);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Evento excluído.' });
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const startEdit = (ev: AcademicEvent) => {
    setForm({ title: ev.title, description: ev.description ?? '', event_date: ev.event_date, event_type: ev.event_type, target_group: ev.target_group });
    setEditId(ev.id);
    setShowForm(true);
  };

  const getTypeMeta = (type: string) => EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-3">
            <CalendarDays className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-primary italic leading-none">Calendário Acadêmico</h1>
            <p className="text-muted-foreground font-medium italic">Gerencie eventos, prazos e datas importantes.</p>
          </div>
        </div>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm(blankForm); }} className="h-12 px-6 rounded-2xl bg-primary text-white font-black shadow-xl">
          <PlusCircle className="h-5 w-5 mr-2" /> Novo Evento
        </Button>
      </header>

      {showForm && (
        <Card className="border-none shadow-2xl rounded-[2.5rem] animate-in slide-in-from-top-4 duration-300">
          <CardContent className="p-8 space-y-5">
            <h2 className="text-xl font-black text-primary italic">{editId ? 'Editar Evento' : 'Criar Evento'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Título</Label>
                <Input placeholder="Ex: ENEM 2025 — Prazo de inscrição" className="h-11 rounded-2xl bg-muted/30 border-none font-bold" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Data</Label>
                <Input type="date" className="h-11 rounded-2xl bg-muted/30 border-none font-bold" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Tipo</Label>
                <Select value={form.event_type} onValueChange={val => setForm(f => ({ ...f, event_type: val }))}>
                  <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="font-bold">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Público Alvo</Label>
                <Select value={form.target_group} onValueChange={val => setForm(f => ({ ...f, target_group: val }))}>
                  <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {TARGET_GROUPS.map(t => <SelectItem key={t.value} value={t.value} className="font-bold">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Descrição (opcional)</Label>
                <Textarea placeholder="Detalhes adicionais..." className="rounded-2xl bg-muted/30 border-none font-medium" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={saving || !form.title || !form.event_date} className="flex-1 h-12 rounded-2xl bg-primary text-white font-black shadow-xl">
                {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {editId ? 'Salvar Alterações' : 'Criar Evento'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }} className="h-12 px-6 rounded-2xl font-black">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground font-medium">Nenhum evento cadastrado ainda.</div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const meta = getTypeMeta(ev.event_type);
            const isPast = new Date(ev.event_date) < new Date();
            return (
              <div key={ev.id} className={`flex items-center gap-4 bg-white rounded-2xl shadow-md p-4 group transition-all hover:shadow-lg ${isPast ? 'opacity-50' : ''}`}>
                <div className="text-center w-14 shrink-0">
                  <p className="text-xs font-black text-primary">{new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-primary text-sm truncate">{ev.title}</p>
                  {ev.description && <p className="text-xs text-muted-foreground font-medium truncate">{ev.description}</p>}
                </div>
                <Badge className={`text-[9px] font-black border-none shrink-0 ${meta.color}`}>{meta.label}</Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => startEdit(ev)} className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-blue-50 text-blue-500 transition-all">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(ev.id)} className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-red-50 text-red-400 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
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
