
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Calendar, Clock, Loader2, Trash2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ManageLivePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lives, setLives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
  });

  async function fetchLives() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lives')
        .select('*')
        .order('start_time', { ascending: false });

      if (!error && data) {
        setLives(data);
      }
    } catch (err) {
      console.error("Erro ao buscar lives:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLives();
  }, [user]);

  const handleCreateLive = async () => {
    if (!formData.title || !formData.date || !formData.time || !user || isSubmitting) {
      if(!isSubmitting) toast({ title: "Dados Incompletos", description: "Título, data e horário são obrigatórios.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const start_time = new Date(`${formData.date}T${formData.time}`).toISOString();

      const { error } = await supabase
        .from('lives')
        .insert({
          title: formData.title,
          description: formData.description,
          start_time,
          teacher_id: user.id,
          teacher_name: user.user_metadata?.full_name || "Mentor da Rede",
          status: "scheduled"
        });

      if (error) throw error;

      toast({ title: "Sala Criada!", description: "A sala online já está na agenda." });
      setIsCreateOpen(false);
      setFormData({ title: "", description: "", date: "", time: "" });
      fetchLives();
    } catch (error: any) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    const { error } = await supabase.from('lives').delete().eq('id', id);
    if (!error) {
      setLives(prev => prev.filter(live => live.id !== id));
      toast({ title: "Sala removida" });
    }
    setDeletingId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20 px-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="space-y-1 px-1">
          <h1 className="text-2xl md:text-3xl font-black text-primary italic leading-none uppercase tracking-tighter">Studio Virtual</h1>
          <p className="text-muted-foreground text-xs md:text-base font-medium italic">Gerencie suas salas de mentoria.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-accent text-accent-foreground font-black px-6 md:px-8 shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 border-none">
              <PlusCircle className="h-5 w-5 md:h-6 md:w-6" /> Abrir Sala
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 bg-white max-w-lg border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-black italic text-primary">Nova Sala Online</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:gap-6 py-4 md:py-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase opacity-40">Título da Aula</Label>
                <input placeholder="Ex: Mentoria - Carreira" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} disabled={isSubmitting} className="flex h-11 w-full rounded-xl bg-muted/30 border-none px-3 text-sm font-bold focus:ring-2 focus:ring-accent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase opacity-40">Data</Label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} disabled={isSubmitting} className="flex h-11 w-full rounded-xl bg-muted/30 border-none px-3 text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase opacity-40">Horário</Label>
                  <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} disabled={isSubmitting} className="flex h-11 w-full rounded-xl bg-muted/30 border-none px-3 text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase opacity-40">Objetivo</Label>
                <textarea placeholder="Pauta..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} disabled={isSubmitting} className="flex min-h-[80px] w-full rounded-xl bg-muted/30 border-none px-3 py-2 text-sm font-medium resize-none" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateLive} disabled={isSubmitting || !formData.title} className="w-full h-12 md:h-16 bg-primary text-white font-black text-base md:text-lg rounded-xl md:rounded-2xl shadow-xl">
                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "Agendar Agora"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>
        ) : lives.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed rounded-[2rem] bg-white/50 opacity-40">
            <Calendar className="h-10 w-10 mx-auto mb-4 text-primary" />
            <p className="font-black italic text-sm">Nenhuma sala agendada.</p>
          </div>
        ) : (
          lives.map((live) => (
            <Card key={live.id} className="border-none shadow-xl bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all">
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                <div className="flex items-center gap-4 md:gap-8 flex-1 w-full">
                  <div className={`h-16 w-16 md:h-24 md:w-24 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center shadow-lg shrink-0 ${live.status === 'live' ? 'bg-red-600 text-white animate-pulse' : 'bg-primary text-white'}`}>
                    <span className="text-[7px] md:text-[10px] font-black uppercase opacity-60">{format(new Date(live.start_time), 'MMM', { locale: ptBR })}</span>
                    <span className="text-xl md:text-3xl font-black italic">{format(new Date(live.start_time), 'dd')}</span>
                  </div>
                  <div className="space-y-1 md:space-y-2 overflow-hidden flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] md:text-xs font-bold text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(live.start_time), 'HH:mm')}</span>
                      <Badge variant="secondary" className="text-[7px] md:text-[8px] font-black uppercase px-2 bg-muted/50 border-none">{live.status}</Badge>
                    </div>
                    <CardTitle className="text-base md:text-2xl font-black text-primary italic leading-none truncate">{live.title}</CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(live.id)} disabled={deletingId === live.id} className="h-10 w-10 md:h-12 md:w-12 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600">
                    {deletingId === live.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 md:h-5 md:w-5" />}
                  </Button>
                  <Button className="flex-1 md:flex-none h-11 md:h-14 px-6 md:px-8 bg-primary text-white font-black rounded-xl md:rounded-2xl shadow-xl gap-2 text-xs md:text-base" asChild>
                    <Link href={`/dashboard/teacher/live/${live.id}`}>
                      Studio <Radio className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
