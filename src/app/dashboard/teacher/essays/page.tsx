
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FilePenLine, 
  Search, 
  ClipboardCheck, 
  Loader2, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight,
  User,
  Sparkles,
  AlertCircle,
  FileText
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AssessmentsGraderPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEssay, setSelectedEssay] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mentorFeedback, setMentorFeedback] = useState("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch essays without generic RLS/Foreign Key Joins
      const { data: essays, error: essayError } = await supabase
        .from('essay_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (essayError) throw essayError;
      
      const loadedSubmissions = essays || [];

      // 2. Resolve Profile relationships manually to guarantee display integrity
      if (loadedSubmissions.length > 0) {
        const userIds = [...new Set(loadedSubmissions.map(s => s.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, profile_type')
            .in('id', userIds);
            
          loadedSubmissions.forEach(sub => {
             const matchedProfile = profilesData?.find(p => p.id === sub.user_id);
             sub.profiles = matchedProfile || { name: 'Aluno Oculto' };
          });
        }
      }

      setSubmissions(loadedSubmissions);
    } catch (e: any) {
      console.error("Erro explícito no Supabase:", e.message || JSON.stringify(e));
      toast({ title: "Erro no Banco", description: e.message || "Falha ao conectar com auth.users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleSelectEssay = (essay: any) => {
    setSelectedEssay(essay);
    setMentorFeedback(essay.mentor_notes || "");
  };

  const handleSaveFeedback = async () => {
    if (!selectedEssay || isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('essay_submissions')
        .update({ 
          mentor_notes: mentorFeedback,
          status: 'reviewed' 
        })
        .eq('id', selectedEssay.id);

      if (error) throw error;

      toast({ title: "Avaliação Registrada!", description: "O aluno foi notificado da sua revisão." });
      
      setSubmissions(prev => prev.map(s => 
        s.id === selectedEssay.id ? { ...s, mentor_notes: mentorFeedback, status: 'reviewed' } : s
      ));
    } catch (e: any) {
      toast({ title: "Falha ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => 
    s.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.theme?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-6 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic flex items-center gap-3">
            Central de Auditoria
            <Badge className="bg-primary text-white border-none font-black text-[10px] uppercase">Staff</Badge>
          </h1>
          <p className="text-muted-foreground font-medium italic">Auditoria técnica de redações e submissões da rede.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Buscar estudante ou tema..." 
            className="pl-11 h-12 rounded-xl bg-white border-none shadow-xl italic font-medium focus-visible:ring-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden min-h-0">
        {/* LISTA DE SUBMISSÕES */}
        <Card className="w-full lg:w-96 shrink-0 border border-white/20 shadow-2xl flex flex-col overflow-hidden bg-white/95 backdrop-blur-3xl rounded-[2.5rem]">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent p-6 border-b border-primary/10">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-accent" /> Fila de Avaliação
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="p-10 text-center opacity-20 italic">Sem envios recentes.</div>
            ) : (
              <div className="flex flex-col">
                {filteredSubmissions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectEssay(item)}
                    className={`p-6 text-left border-b border-white/50 last:border-0 hover:bg-slate-50 transition-all group relative overflow-hidden ${
                      selectedEssay?.id === item.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    {selectedEssay?.id === item.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-r-full" />}
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-black text-primary text-sm italic leading-none truncate max-w-[150px]">{item.profiles?.name}</p>
                      <Badge className={`${item.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} border-none font-black text-[7px] uppercase px-2`}>
                        {item.status === 'reviewed' ? 'REVISADO' : 'PENDENTE'}
                      </Badge>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground truncate italic opacity-80 mb-2">"{item.theme}"</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[8px] font-black text-accent uppercase tracking-widest">{item.score} PTS</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">
                        {format(new Date(item.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* ÁREA DE VISUALIZAÇÃO E FEEDBACK */}
        <Card className="flex-1 border border-white/20 shadow-2xl bg-white/95 backdrop-blur-3xl flex flex-col overflow-hidden rounded-[3rem] relative group">
          <div className="absolute right-[-10%] top-[-10%] w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
          {selectedEssay ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-8 md:p-12">
                <div className="max-w-4xl mx-auto space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black italic shadow-lg">{selectedEssay.profiles?.name?.charAt(0)}</div>
                      <div>
                        <h2 className="text-xl font-black text-primary italic leading-none">{selectedEssay.profiles?.name}</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">SUBMISSÃO ACADÊMICA</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                      <p className="text-[10px] font-black text-primary/40 uppercase mb-2">Tema da Redação</p>
                      <h3 className="text-lg md:text-2xl font-black text-primary italic leading-tight uppercase tracking-tighter">
                        {selectedEssay.theme}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[2.5rem] border-2 border-dashed border-muted/20 relative shadow-sm">
                    <p className="text-[10px] font-black uppercase text-primary/20 absolute -top-3 left-8 bg-white px-4">Transcrição do Estudante</p>
                    <div className="font-medium text-lg md:text-xl leading-relaxed italic text-primary/80 whitespace-pre-wrap">
                      {selectedEssay.content}
                    </div>
                  </div>

                  {/* RESULTADO DA IA (AURORA) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <Card className="border-none shadow-xl bg-primary text-white p-8 rounded-[2rem] overflow-hidden relative group">
                      <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                      <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-center">
                          <Badge className="bg-accent text-accent-foreground font-black text-[8px] px-3">LAUDO IA</Badge>
                          <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                        </div>
                        <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Nota Aurora</p>
                          <p className="text-7xl font-black italic drop-shadow-xl">{selectedEssay.score}</p>
                        </div>
                        <p className="text-xs font-medium italic opacity-90 leading-relaxed bg-black/10 p-4 rounded-xl border border-white/10">"{selectedEssay.feedback}"</p>
                      </div>
                    </Card>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 px-2 flex items-center gap-2">
                        <MessageSquare className="h-3 w-3 text-accent" /> Parecer do Maestro
                      </Label>
                      <Textarea 
                        value={mentorFeedback}
                        onChange={(e) => setMentorFeedback(e.target.value)}
                        placeholder="Adicione suas notas pedagógicas ou orientações personalizadas para o aluno..."
                        className="min-h-[180px] rounded-[2rem] bg-white border border-slate-100 p-6 font-medium italic text-sm shadow-inner resize-none focus-visible:ring-accent transition-all"
                      />
                      <Button 
                        onClick={handleSaveFeedback}
                        disabled={isSaving}
                        className="w-full h-14 bg-gradient-to-r from-accent to-orange-500 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest border-none"
                      >
                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                        Validar Revisão Maestro
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30 animate-in zoom-in-95">
              <div className="h-24 w-24 rounded-[2.5rem] bg-muted flex items-center justify-center mb-6">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-primary italic uppercase tracking-tighter">Selecione uma Submissão</h3>
              <p className="text-sm font-medium italic mt-2 max-w-xs">Clique em um aluno na fila industrial para iniciar a auditoria técnica.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
