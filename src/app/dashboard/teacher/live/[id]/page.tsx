
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  MessageCircle, 
  Lightbulb, 
  Signal, 
  ChevronLeft, 
  Send,
  CheckCircle2,
  Loader2,
  Power,
  User,
  Users,
  ExternalLink,
  Mic,
  Video,
  MonitorUp,
  Settings
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

/**
 * Studio Master - Visão do Mentor/Professor (Educori 360)
 */
export default function TeacherLiveStudioPage() {
  const params = useParams();
  const liveId = params?.id as string;
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [live, setLive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "questions">("all");
  const [input, setInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!liveId || !user) return;
    
    async function loadStudioData() {
      try {
        const { data, error } = await supabase
          .from('lives')
          .select('*')
          .eq('id', liveId)
          .single();

        if (error) throw error;
        setLive(data);

        const { data: msgs } = await supabase
          .from('live_messages')
          .select('*')
          .eq('live_id', liveId)
          .order('created_at', { ascending: true });

        setMessages(msgs || []);
      } catch (e) {
        toast({ title: "Erro ao acessar estúdio", variant: "destructive" });
        router.back();
      } finally {
        setLoading(false);
      }
    }

    loadStudioData();

    const channel = supabase
      .channel(`live_studio_${liveId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'live_messages', 
        filter: `live_id=eq.${liveId}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lives',
        filter: `id=eq.${liveId}`
      }, (payload) => {
        setLive(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId, user, router, toast]);

  const toggleLiveStatus = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const newStatus = live.status === 'live' ? 'scheduled' : 'live';
    
    const { error } = await supabase
      .from('lives')
      .update({ status: newStatus })
      .eq('id', liveId);

    if (!error) {
      toast({ title: `Sinal: ${newStatus.toUpperCase()}` });
    } else {
      toast({ title: "Erro ao mudar status", variant: "destructive" });
    }
    setIsUpdating(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isSending) return;

    setIsSending(true);
    const { error } = await supabase
      .from('live_messages')
      .insert({
        live_id: liveId,
        user_id: user.id,
        user_name: "MENTOR (OFFICIAL)",
        content: input,
        is_question: false
      });

    if (!error) setInput("");
    setIsSending(false);
  };

  const markAsAnswered = async (msgId: string) => {
    await supabase.from('live_messages').update({ is_answered: true }).eq('id', msgId);
  };

  const filteredMessages = activeTab === 'all' 
    ? messages 
    : messages.filter(m => m.is_question);

  const questionCount = messages.filter(m => m.is_question && !m.is_answered).length;

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
    }
  }, [filteredMessages]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
      <Loader2 className="animate-spin h-12 w-12 text-red-600" />
      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Sincronizando Studio Master...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-6 animate-in fade-in duration-700 overflow-hidden pb-4">
      {/* Barra de Comando Industrial */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-slate-950 p-6 rounded-3xl text-white shadow-2xl border-b-4 border-red-600 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10 rounded-full h-12 w-12">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase leading-none">{live?.title}</h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em] mt-1 uppercase">CONSOLE DE TRANSMISSÃO</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {live?.meeting_url && (
            <Button asChild variant="outline" className="h-12 rounded-2xl border-white/20 hover:bg-white/10 text-white font-black px-6 gap-2">
              <a href={live.meeting_url} target="_blank" rel="noopener noreferrer">
                ABRIR MEU GOOGLE MEET <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}

          <Button 
            onClick={toggleLiveStatus} 
            disabled={isUpdating}
            className={`${live?.status === 'live' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white font-black h-12 px-8 rounded-2xl gap-2 transition-all shadow-xl`}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            {live?.status === 'live' ? 'FECHAR SALA' : 'ABRIR PARA ALUNOS'}
          </Button>

          <Badge className={`${live?.status === 'live' ? 'bg-red-600 animate-pulse' : 'bg-slate-700'} text-white font-black border-none px-6 h-12 rounded-2xl flex items-center gap-3`}>
            <Signal className="h-4 w-4" /> {live?.status === 'live' ? 'AO VIVO' : 'OFFLINE'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden">
        {/* Painel Central */}
        <div className="lg:col-span-2 flex flex-col space-y-6 overflow-hidden">
          <Card className="flex-1 bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-slate-800 relative flex items-center justify-center">
             <div className="w-full h-full relative flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-900 via-black to-slate-900">
                <div className="absolute top-8 left-8 flex items-center gap-3">
                   <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Sinal Monitorado</span>
                </div>

                <div className="h-48 w-48 rounded-[2.5rem] bg-accent/5 border-2 border-accent/20 flex items-center justify-center relative shadow-inner">
                   <User className="h-24 w-24 text-accent/20" />
                </div>

                <div className="space-y-2 text-center px-6">
                   <h3 className="text-xl font-black text-white/60 italic uppercase tracking-widest">Console de Gerenciamento</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                     As mensagens dos alunos estão sendo processadas via rede de baixa latência.
                   </p>
                </div>

                <div className="absolute bottom-10 flex items-center gap-4 bg-white/5 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/10">
                   <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl text-white"><Mic className="h-6 w-6" /></Button>
                   <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl text-white"><Video className="h-6 w-6" /></Button>
                   <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-accent text-accent-foreground"><MonitorUp className="h-6 w-6" /></Button>
                   <div className="w-px h-10 bg-white/10 mx-2" />
                   <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl text-white"><Settings className="h-6 w-6" /></Button>
                </div>
             </div>
          </Card>

          <div className="grid grid-cols-2 gap-6 shrink-0 pb-2">
            <Card className={`bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center border-2 transition-all ${questionCount > 0 ? 'border-amber-300 bg-amber-50' : 'border-transparent'}`}>
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-2 shadow-sm ${questionCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Lightbulb className={`h-5 w-5 ${questionCount > 0 ? 'animate-pulse' : ''}`} />
              </div>
              <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${questionCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Dúvidas Pendentes</p>
              <p className={`text-xl font-black tabular-nums mt-1 ${questionCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{questionCount}</p>
            </Card>
            <Card className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status da Rede</p>
              <p className="text-lg font-black text-slate-900 italic">Sincronizada</p>
            </Card>
          </div>
        </div>

        {/* Chat Lateral de Moderação */}
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col h-full">
          <div className="p-6 bg-slate-50 border-b flex flex-col gap-4">
            <div className="flex bg-white p-1.5 rounded-2xl shadow-inner border border-slate-200">
              <button onClick={() => setActiveTab('all')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Chat Geral</button>
              <button onClick={() => setActiveTab('questions')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'questions' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}>Perguntas {questionCount > 0 && <Badge className="bg-white/20 text-white border-none h-4 min-w-4 text-[8px] flex items-center justify-center p-0">{questionCount}</Badge>}</button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="flex flex-col gap-4 pb-10">
              {filteredMessages.length === 0 ? (
                <div className="py-20 text-center opacity-20">
                  <p className="font-black italic text-xs uppercase">Aguardando interações...</p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col gap-2 p-5 rounded-[1.5rem] transition-all ${msg.is_question ? (msg.is_answered ? 'bg-slate-50 opacity-40' : 'bg-amber-50 border-l-4 border-amber-500 shadow-md') : 'bg-slate-50/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-900 uppercase">{msg.user_name}</span>
                      {msg.is_question && !msg.is_answered && (
                        <Button onClick={() => markAsAnswered(msg.id)} size="icon" variant="ghost" className="h-8 w-8 rounded-full text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${msg.is_question && !msg.is_answered ? 'text-amber-900 font-bold' : 'text-slate-700 font-medium'}`}>{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-slate-50 border-t">
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-white p-2 pl-6 rounded-full shadow-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-slate-900 transition-all">
              <Input value={input} onChange={(e) => setInput(e.target.value)} disabled={isSending} placeholder="Orientação do Mentor..." className="border-none shadow-none text-xs font-bold italic h-10 bg-transparent focus-visible:ring-0 px-0" />
              <Button type="submit" disabled={isSending || !input.trim()} size="icon" className="h-10 w-10 bg-slate-900 text-white rounded-full shrink-0 shadow-lg flex items-center justify-center">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
