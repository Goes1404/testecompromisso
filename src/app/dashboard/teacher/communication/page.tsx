
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, PlusCircle, Megaphone, AlertOctagon, Info, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

type BadgeVariant = "secondary" | "destructive" | "default" | "outline";

const priorityStyles: Record<'low' | 'medium' | 'high', { variant: BadgeVariant; icon: any; label: string }> = {
  low: { variant: 'secondary', icon: Info, label: 'Normal' },
  medium: { variant: 'default', icon: Megaphone, label: 'Importante' },
  high: { variant: 'destructive', icon: AlertOctagon, label: 'Urgente' },
};

export default function CommunicationPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    async function fetchAnnouncements() {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) setAnnouncements(data || []);
      setLoading(false);
    }
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async () => {
    if (!newTitle.trim() || !newMessage.trim() || !user) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          title: newTitle,
          message: newMessage,
          priority: newPriority,
          author_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Registrar Log de Atividade
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_name: profile?.name || user.email,
        action: `Publicou um comunicado: ${newTitle}`,
        entity_type: 'announcement',
        entity_id: data.id
      });

      setAnnouncements([data, ...announcements]);
      setNewTitle('');
      setNewMessage('');
      setNewPriority('low');
      toast({ title: "Comunicado Publicado!", description: "O aviso já está visível para todos os alunos." });
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) {
      setAnnouncements(announcements.filter(a => a.id !== id));
      toast({ title: "Comunicado removido." });
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 p-8 border-b border-dashed">
            <CardTitle className="flex items-center gap-3 italic">
              <PlusCircle className="h-6 w-6 text-accent" />
              <span className="text-xl font-black text-primary">Novo Comunicado</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1 block px-2">Título do Aviso</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Aula extra de Redação" className="h-12 bg-muted/30 border-none rounded-xl font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1 block px-2">Mensagem</label>
              <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Descreva os detalhes..." className="rounded-2xl min-h-[150px] bg-muted/30 border-none font-medium text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1 block px-2">Prioridade</label>
              <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                <SelectTrigger className="h-12 bg-muted/30 border-none rounded-xl font-bold">
                  <SelectValue placeholder="Defina a urgência" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="low" className="font-bold">Normal</SelectItem>
                  <SelectItem value="medium" className="font-bold">Importante</SelectItem>
                  <SelectItem value="high" className="font-bold">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateAnnouncement} disabled={isCreating || !newTitle.trim()} className="w-full h-14 bg-primary text-white font-black rounded-xl shadow-lg mt-4">
              {isCreating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Bell className="mr-2 h-5 w-5" />} Publicar na Rede
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-xl font-black text-primary italic flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-accent" /> Histórico de Avisos
        </h2>
        
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>
        ) : announcements.length === 0 ? (
          <div className="py-20 text-center border-4 border-dashed rounded-[3rem] opacity-30">
            <Bell className="h-12 w-12 mx-auto mb-4" />
            <p className="font-black italic">Nenhum comunicado ativo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => {
              const styles = priorityStyles[ann.priority];
              const Icon = styles.icon;
              return (
                <Card key={ann.id} className="border-none shadow-lg rounded-3xl bg-white overflow-hidden group hover:shadow-xl transition-all">
                  <CardContent className="p-6 flex items-start gap-6">
                    <div className={`mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${ann.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h3 className="font-black text-primary italic text-lg leading-none">{ann.title}</h3>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">
                            Publicado em {format(new Date(ann.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={styles.variant} className="font-black text-[8px] uppercase tracking-widest px-3">{styles.label}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ann.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-primary/70 mt-4 leading-relaxed font-medium italic">"{ann.message}"</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
