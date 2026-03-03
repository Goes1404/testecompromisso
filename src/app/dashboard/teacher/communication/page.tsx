
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { 
  Bell, 
  PlusCircle, 
  Megaphone, 
  AlertOctagon, 
  Info, 
  Loader2, 
  Trash2, 
  Users, 
  Target, 
  Zap, 
  FileCheck, 
  MonitorPlay,
  Clock,
  Search,
  Filter,
  Sparkles,
  Layers
} from 'lucide-react';
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
  target_group?: string;
  created_at: string;
  author_name?: string;
}

const priorityStyles: Record<'low' | 'medium' | 'high', { variant: "secondary" | "destructive" | "default" | "outline"; icon: any; label: string; color: string; bg: string }> = {
  low: { variant: 'secondary', icon: Info, label: 'Informativo', color: 'text-blue-600', bg: 'bg-blue-50' },
  medium: { variant: 'default', icon: Megaphone, label: 'Importante', color: 'text-amber-600', bg: 'bg-amber-50' },
  high: { variant: 'destructive', icon: AlertOctagon, label: 'Urgente', color: 'text-red-600', bg: 'bg-red-50' },
};

const QUICK_TEMPLATES = [
  { title: "Sinal de Live Ativo", message: "Atenção: Nossa mentoria ao vivo está começando agora! Acesse o menu de Lives.", icon: MonitorPlay, priority: 'medium' },
  { title: "Alerta de Documentação", message: "Prazo Crítico: O envio de documentos para o SiSU encerra em 24h. Verifique seu checklist.", icon: FileCheck, priority: 'high' },
  { title: "Material Novo no Acervo", message: "Acabamos de liberar novos simulados e PDFs na Biblioteca Digital. Bons estudos!", icon: Zap, priority: 'low' },
];

export default function CommunicationPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'low' as 'low' | 'medium' | 'high',
    target_group: 'all'
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Buscar Avisos
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (annData) setAnnouncements(annData);

      // Buscar Turmas (Para o Filtro de Público Alvo)
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');
      
      if (classData) setCohorts(classData);

      setLoading(false);
    }
    fetchData();
  }, []);

  const handleCreateAnnouncement = async (overrideData?: any) => {
    const dataToSubmit = overrideData || formData;
    if (!dataToSubmit.title.trim() || !dataToSubmit.message.trim() || !user) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          title: dataToSubmit.title,
          message: dataToSubmit.message,
          priority: dataToSubmit.priority,
          target_group: dataToSubmit.target_group,
          author_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_name: profile?.name || 'Mentor',
        action: `Publicou aviso: ${dataToSubmit.title}`,
        entity_type: 'announcement',
        entity_id: data.id
      });

      setAnnouncements([data, ...announcements]);
      setFormData({ title: '', message: '', priority: 'low', target_group: 'all' });
      toast({ title: "Comunicado Fixado!", description: "A rede foi notificada com sucesso." });
    } catch (e: any) {
      toast({ title: "Falha na Publicação", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setFormData({
      title: template.title,
      message: template.message,
      priority: template.priority as any,
      target_group: 'all'
    });
    toast({ title: "Template Aplicado", description: "Revise e publique quando estiver pronto." });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) {
      setAnnouncements(announcements.filter(a => a.id !== id));
      toast({ title: "Aviso arquivado." });
    }
  };

  const filtered = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         a.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const targetName = cohorts.find(c => c.id === a.target_group)?.name || '';
    const matchesTarget = targetName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch || matchesTarget;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-primary italic leading-none">Mural de Avisos</h1>
            <Megaphone className="h-6 w-6 text-accent" />
          </div>
          <p className="text-muted-foreground font-medium italic">Gestão de comunicados oficiais e alertas de rede.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border shadow-sm">
          <div className="text-center px-4">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Ativos</p>
            <p className="text-xl font-black text-primary">{announcements.length}</p>
          </div>
          <div className="w-px h-8 bg-muted/20" />
          <div className="text-center px-4">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Urgentes</p>
            <p className="text-xl font-black text-red-600">{announcements.filter(a => a.priority === 'high').length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA: CRIAÇÃO */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="bg-primary/5 p-8 border-b border-dashed">
              <CardTitle className="flex items-center gap-3 italic">
                <PlusCircle className="h-6 w-6 text-accent" />
                <span className="text-xl font-black text-primary uppercase tracking-tight">Nova Mensagem</span>
              </CardTitle>
              <CardDescription className="italic font-medium">Configure o alerta para a rede.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-2">Assunto Principal</label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  placeholder="Título do aviso..." 
                  className="h-12 bg-muted/30 border-none rounded-xl font-bold italic" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-2">Corpo do Alerta</label>
                <Textarea 
                  value={formData.message} 
                  onChange={(e) => setFormData({...formData, message: e.target.value})} 
                  placeholder="Escreva os detalhes aqui..." 
                  className="rounded-2xl min-h-[120px] bg-muted/30 border-none font-medium text-sm italic" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-2">Prioridade</label>
                  <Select value={formData.priority} onValueChange={(v: any) => setFormData({...formData, priority: v})}>
                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-xl font-bold italic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="low" className="font-bold">Informativo</SelectItem>
                      <SelectItem value="medium" className="font-bold text-amber-600">Importante</SelectItem>
                      <SelectItem value="high" className="font-bold text-red-600">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-2">Público Alvo</label>
                  <Select value={formData.target_group} onValueChange={(v) => setFormData({...formData, target_group: v})}>
                    <SelectTrigger className="h-12 bg-muted/30 border-none rounded-xl font-bold italic">
                      <SelectValue placeholder="Selecione o alvo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl max-h-80">
                      <SelectGroup>
                        <SelectLabel className="text-[9px] font-black uppercase opacity-40 px-2 pt-2">Geral</SelectLabel>
                        <SelectItem value="all" className="font-bold italic">Toda a Rede</SelectItem>
                        <SelectItem value="etec" className="font-bold italic">Alunos ETEC</SelectItem>
                        <SelectItem value="enem" className="font-bold italic">Alunos ENEM</SelectItem>
                        <SelectItem value="teacher" className="font-bold italic">Apenas Staff</SelectItem>
                      </SelectGroup>
                      
                      {cohorts.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-[9px] font-black uppercase opacity-40 px-2 pt-4 border-t border-dashed mt-2">Turmas (Cohorts)</SelectLabel>
                          {cohorts.map(cohort => (
                            <SelectItem key={cohort.id} value={cohort.id} className="font-bold italic">
                              🎓 {cohort.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={() => handleCreateAnnouncement()} disabled={isCreating || !formData.title.trim()} className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-lg mt-4">
                {isCreating ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Sparkles className="mr-2 h-6 w-6 text-accent" />} 
                {isCreating ? "Publicando..." : "Fixar Comunicado"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-4">Atalhos Operacionais</p>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button 
                key={i} 
                onClick={() => applyTemplate(tpl)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-transparent hover:border-accent/20 hover:shadow-lg transition-all group text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                  <tpl.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-primary italic leading-none">{tpl.title}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Carregar Texto Padrão</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: HISTÓRICO */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input 
              placeholder="Pesquisar por termo ou turma no histórico..." 
              className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic font-medium focus-visible:ring-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center gap-4">
                <Sparkles className="h-12 w-12 text-accent animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizando Mural...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-32 text-center border-4 border-dashed rounded-[3rem] opacity-20 bg-muted/5">
                <Bell className="h-16 w-16 mx-auto mb-4" />
                <p className="font-black italic text-xl uppercase">Nenhum aviso localizado</p>
              </div>
            ) : (
              filtered.map((ann) => {
                const styles = priorityStyles[ann.priority] || priorityStyles.low;
                const Icon = styles.icon;
                const targetCohort = cohorts.find(c => c.id === ann.target_group);
                
                return (
                  <Card key={ann.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className={`md:w-3 border-l-8 ${ann.priority === 'high' ? 'border-red-500' : ann.priority === 'medium' ? 'border-amber-500' : 'border-blue-500'}`} />
                        <div className="flex-1 p-8">
                          <div className="flex justify-between items-start gap-6">
                            <div className="flex items-start gap-5">
                              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${styles.bg} ${styles.color}`}>
                                <Icon className="h-7 w-7" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="font-black text-primary italic text-xl leading-tight group-hover:text-accent transition-colors">{ann.title}</h3>
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(ann.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                  </div>
                                  <Badge className={`${styles.bg} ${styles.color} border-none font-black text-[8px] uppercase px-3 h-5`}>
                                    {styles.label}
                                  </Badge>
                                  {ann.target_group && (
                                    <Badge variant="outline" className="border-primary/10 text-primary/40 font-black text-[8px] uppercase px-3 h-5 flex items-center gap-1">
                                      {targetCohort ? (
                                        <><Layers className="h-2.5 w-2.5" /> TURMA: {targetCohort.name}</>
                                      ) : (
                                        <><Target className="h-2.5 w-2.5" /> {ann.target_group === 'all' ? 'TODA A REDE' : ann.target_group.toUpperCase()}</>
                                      )}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(ann.id)} className="h-10 w-10 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-6 p-6 rounded-3xl bg-slate-50 border border-slate-100 shadow-inner">
                            <p className="text-sm md:text-base text-primary/80 leading-relaxed font-medium italic">"{ann.message}"</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
