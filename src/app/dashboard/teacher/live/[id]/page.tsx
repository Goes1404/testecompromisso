
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
  Zap, 
  Send,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Mic,
  Video,
  Camera,
  MonitorUp,
  Power,
  User,
  Settings
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

export default function TeacherLiveStudioPage() {
  const params = useParams();
  const liveId = params.id as string;
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
    async function loadStudioData() {
      const { data, error } = await supabase
        .from('lives')
        .select('*')
        .eq('id', liveId)
        .single();

      if (error) {
        toast({ title: "Erro ao acessar estúdio", variant: "destructive" });
        router.back();
        return;
      }

      setLive(data);

      const { data: msgs } = await supabase
        .from('live_messages')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
      setLoading(false);
    }

    loadStudioData();

    const channel = supabase
      .channel(`live_studio:${liveId}`)
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
        table: 'live_messages',
        filter: `live_id=eq.${liveId}`
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId, router, toast]);

  const toggleLiveStatus = async () => {
    setIsUpdating(true);
    const newStatus = live.status === 'live' ? 'finished' : 'live';
    
    const { error } = await supabase
      .from('lives')
      .update({ status: newStatus })
      .eq('id', liveId);

    if (!error) {
      setLive({ ...live, status: newStatus });
      toast({ title: `Status atualizado: ${newStatus.toUpperCase()}` });
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
        user_name: "PROFESSOR (MENTOR)",
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
      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Conectando ao Studio Master...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-6 animate-in fade-in duration-700 overflow-hidden pb-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-slate-950 p-6 rounded-3xl text-white shadow-2xl border-b-4 border-red-600 gap-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10 rounded-full h-12 w-12">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{live?.title}</h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em] mt-1 uppercase">Control Room - Mentor Mode</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 lg:gap-8">
          <Button 
            onClick={toggleLiveStatus} 
            disabled={isUpdating}
            className={`${live.status === 'live' ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-green-600 hover:bg-green-700 shadow-[0_0_20px_rgba(22,163,74,0.4)]'} text-white font-black h-12 px-6 rounded-2xl gap-2 transition-all active:scale-95`}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            {live.status === 'live' ? 'ENCERRAR AULA' : (live.status === 'finished' ? 'REATIVAR SALA' : 'ABRIR SALA AGORA')}
          </Button>

          <div className="flex items-center gap-6 border-l border-white/10 pl-6">
            <Badge className={`${live.status === 'live' ? 'bg-red-600 animate-pulse' : 'bg-slate-700'} text-white font-black border-none px-6 h-12 rounded-2xl flex items-center gap-3`}>
              <Signal className="h-4 w-4" /> {live.status === 'live' ? 'SALA ATIVA' : 'SALA OFFLINE'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col space-y-6 overflow-hidden">
          <Card className="flex-1 bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800 relative flex items-center justify-center shrink-0">
             <div className="w-full h-full relative flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-900 to-black">
                <div className="h-48 w-48 rounded-3xl bg-accent/5 border-2 border-accent/20 flex items-center justify-center relative shadow-inner">
                   <User className="h-24 w-24 text-accent/20" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-[10px] font-black uppercase text-accent/40 italic tracking-widest">Preview de Sinal</p>
                   </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <h3 className="text-xl font-black text-white/60 italic uppercase tracking-widest">Sinal Pronto para Transmissão</h3>
                   <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                      <span className="text-[10px] font-bold text-green-500 uppercase">Latência Industrial</span>
                   </div>
                </div>

                <div className="absolute bottom-10 flex items-center gap-4 bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10">
                   <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white"><Mic className="h-6 w-6" /></Button>
                   <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white"><Video className="h-6 w-6" /></Button>
                   <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-accent text-accent-foreground"><MonitorUp className="h-6 w-6" /></Button>
                   <div className="w-px h-10 bg-white/10 mx-2" />
                   <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white"><Settings className="h-6 w-6" /></Button>
                </div>
             </div>
          </Card>

          <div className="grid grid-cols-3 gap-6 shrink-0">
            <Card className="bg-white p-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center text-center group border-none">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-sm">
                <Zap className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Stream</p>
              <p className="text-lg font-black text-slate-900 italic mt-1">1080p</p>
            </Card>
            <Card className={`bg-white p-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center text-center border-2 transition-all ${questionCount > 0 ? 'border-amber-300 bg-amber-50 shadow-amber-100' : 'border-transparent'}`}>
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-2 shadow-sm ${questionCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Lightbulb className={`h-5 w-5 ${questionCount > 0 ? 'animate-pulse' : ''}`} />
              </div>
              <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${questionCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Dúvidas</p>
              <p className={`text-xl font-black tabular-nums mt-1 ${questionCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{questionCount}</p>
            </Card>
            <Card className="bg-white p-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center text-center group border-none">
              <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mb-2 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Status</p>
              <p className="text-lg font-black text-slate-900 italic mt-1">Protegido</p>
            </Card>
          </div>
        </div>

        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col h-full">
          <div className="p-6 bg-slate-50 border-b flex flex-col gap-4">
            <div className="flex bg-white p-1.5 rounded-2xl shadow-inner border border-slate-200 w-full">
              <button 
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                Chat Geral
              </button>
              <button 
                onClick={() => setActiveTab('questions')}
                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'questions' ? 'bg-amber-500 text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                Dúvidas
                {questionCount > 0 && <Badge className="bg-white/20 text-white border-none h-4 min-w-4 text-[8px] flex items-center justify-center p-0">{questionCount}</Badge>}
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="flex flex-col gap-4 pb-10">
              {filteredMessages.length === 0 ? (
                <div className="py-20 text-center opacity-20">
                  <p className="font-black italic text-xs uppercase">Sem mensagens ainda.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col gap-2 p-5 rounded-[1.5rem] transition-all animate-in slide-in-from-right-2 duration-300 ${
                      msg.is_question 
                        ? (msg.is_answered ? 'bg-slate-50 opacity-40 border-l-4 border-slate-200' : 'bg-amber-50 border-l-4 border-amber-500 shadow-md scale-[1.02]') 
                        : 'bg-slate-50/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-900 uppercase">{msg.user_name}</span>
                      {msg.is_question && !msg.is_answered && (
                        <Button 
                          onClick={() => markAsAnswered(msg.id)}
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-full text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${msg.is_question && !msg.is_answered ? 'text-amber-900 font-bold italic' : 'text-slate-700 font-medium'}`}>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-slate-50 border-t">
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-white p-2 pl-6 rounded-full shadow-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-slate-900 transition-all">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
                placeholder={isSending ? "Processando..." : "Mensagem oficial..."} 
                className="border-none shadow-none text-xs font-bold italic h-10 bg-transparent focus-visible:ring-0 px-0" 
              />
              <Button type="submit" disabled={isSending || !input.trim()} size="icon" className="h-10 w-10 bg-slate-900 hover:bg-slate-800 text-white rounded-full shrink-0 shadow-lg transition-transform active:scale-90">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
