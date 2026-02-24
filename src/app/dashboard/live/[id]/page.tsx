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
  ChevronLeft, 
  Send,
  Loader2,
  Signal,
  Sparkles,
  ExternalLink,
  Users,
  Bot,
  MonitorPlay,
  CalendarClock
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";

/**
 * Portal de Acesso à Mentoria - Visão do Aluno
 */
export default function StudentLivePage() {
  const params = useParams();
  const liveId = params?.id as string;
  const { user, profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [live, setLive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadLiveData() {
      if (!liveId) return;
      
      const { data, error } = await supabase
        .from('lives')
        .select(`*`)
        .eq('id', liveId)
        .single();

      if (error) {
        console.error("Erro ao carregar live:", error);
        toast({ title: "Aula não encontrada", variant: "destructive" });
        router.push('/dashboard/live');
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

    loadLiveData();

    // Inscrição Real-time para mensagens e status da live
    const channel = supabase
      .channel(`live_channel_${liveId}`)
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
  }, [liveId, router, toast]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const msgContent = input;
    setInput("");

    const { error } = await supabase
      .from('live_messages')
      .insert({
        live_id: liveId,
        user_id: user.id,
        user_name: profile?.name || user.email?.split('@')[0],
        content: msgContent,
        is_question: msgContent.includes('?')
      });

    if (error) {
      toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="animate-spin h-12 w-12 text-accent" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse text-primary">Sintonizando Satélite...</p>
    </div>
  );

  const isLive = live?.status === 'live';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4 animate-in fade-in duration-700 overflow-hidden">
      {/* Header Industrial */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-white/20 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 shrink-0 hover:bg-primary/5 transition-colors">
            <ChevronLeft className="h-6 w-6 text-primary" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-black text-primary italic leading-none truncate">{live?.title}</h1>
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">
              Sala de Mentoria • {live?.teacher_name || 'Mentor da Rede'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge className={`${isLive ? 'bg-red-600 animate-pulse' : 'bg-slate-400'} text-white border-none px-3 h-8 font-black text-[10px] flex items-center gap-2`}>
            {isLive ? (
              <><Signal className="h-3.5 w-3.5" /> ACONTECENDO AGORA</>
            ) : (
              <><CalendarClock className="h-3.5 w-3.5" /> SALA AGENDADA</>
            )}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Lado Esquerdo: Portal de Transmissão */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-h-0 overflow-hidden">
          <Card className="flex-1 bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl border-none relative flex items-center justify-center group">
            <div className="w-full h-full relative flex flex-col items-center justify-center p-8 text-center gap-8 bg-gradient-to-br from-slate-900 via-black to-slate-900">
               {/* Sinais de Status */}
               <div className="absolute top-6 left-6 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-red-600 animate-ping' : 'bg-slate-600'}`} />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {isLive ? 'Transmissão em Curso' : 'Aguardando o Mentor'}
                  </span>
               </div>

               {/* Central Visual */}
               <div className={`h-32 w-32 md:h-56 md:w-56 rounded-full bg-accent/5 border-4 ${isLive ? 'border-accent/40 shadow-[0_0_80px_rgba(245,158,11,0.2)]' : 'border-white/5'} flex items-center justify-center relative transition-all duration-700`}>
                  <MonitorPlay className={`h-16 w-16 md:h-28 md:w-28 ${isLive ? 'text-accent' : 'text-white/10'} transition-colors`} />
                  {isLive && (
                    <div className="absolute -bottom-2 right-6 h-10 w-10 bg-green-500 rounded-full border-4 border-slate-950 flex items-center justify-center shadow-xl">
                       <Signal className="h-5 w-5 text-white animate-pulse" />
                    </div>
                  )}
               </div>
               
               {/* Call to Action Central */}
               <div className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <h3 className="text-xl md:text-4xl font-black text-white italic leading-none uppercase tracking-tighter">
                      Portal de Mentoria
                    </h3>
                    <p className="text-xs md:text-sm text-slate-400 font-medium italic">
                      {isLive 
                        ? "O mentor iniciou a aula! Clique abaixo para ingressar no ambiente seguro do Google Meet."
                        : "Esta aula está agendada. O link de acesso será habilitado assim que o mentor entrar na sala."}
                    </p>
                  </div>
                  
                  {live?.meeting_url ? (
                    <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-500">
                      <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 font-black h-16 md:h-20 px-12 rounded-2xl shadow-[0_20px_50px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 group relative overflow-hidden border-none">
                        <a href={live.meeting_url} target="_blank" rel="noopener noreferrer">
                          <span className="relative z-10 flex items-center gap-4 text-sm md:text-xl">
                            ACESSAR SALA DO GOOGLE MEET
                            <ExternalLink className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </a>
                      </Button>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Conexão Externa Criptografada</p>
                    </div>
                  ) : (
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                      <p className="text-xs font-bold text-slate-500 italic">
                        O mentor ainda não disponibilizou o link da sala. Fique atento ao chat!
                      </p>
                    </div>
                  )}
               </div>
            </div>
          </Card>
          
          {/* Pauta da Aula (Desktop) */}
          <Card className="bg-white rounded-[2.5rem] shadow-xl p-8 border-none hidden md:block shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Sparkles className="h-20 w-20 text-primary" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-primary/5 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em]">Pauta da Mentoria</h2>
            </div>
            <p className="text-sm font-medium italic text-primary/80 leading-relaxed max-w-2xl">
              {live?.description || "Esta sessão de apoio pedagógico é focada na resolução de dúvidas e aprofundamento técnico. Use o chat lateral para interagir."}
            </p>
          </Card>
        </div>

        {/* Lado Direito: Chat de Interatividade */}
        <Card className="lg:col-span-4 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col min-h-0">
          <div className="p-6 border-b bg-muted/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-accent" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Chat da Aula</span>
            </div>
            <Badge className="bg-primary/5 text-primary text-[8px] font-black border-none px-2 py-1">REAL-TIME</Badge>
          </div>

          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="flex flex-col gap-4 pb-10">
              {messages.length === 0 ? (
                <div className="py-20 text-center opacity-20 flex flex-col items-center gap-3">
                  <Bot className="h-8 w-8 text-primary" />
                  <p className="font-black italic text-[10px] uppercase">Seja o primeiro a perguntar!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user_id === user?.id;
                  const isMentor = msg.user_name?.includes("PROFESSOR") || msg.user_name?.includes("MENTOR");
                  
                  return (
                    <div key={msg.id} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className="flex items-center gap-2 px-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isMentor ? 'text-accent' : 'text-primary/40'}`}>
                          {msg.user_name}
                        </span>
                        {msg.is_answered && <Badge className="bg-green-100 text-green-700 text-[6px] h-3 px-1 border-none font-black">LIDO</Badge>}
                      </div>
                      <div className={`px-4 py-3 rounded-[1.5rem] text-xs font-medium shadow-sm border transition-all ${
                        isMe 
                          ? 'bg-primary text-white rounded-tr-none border-primary/5' 
                          : isMentor
                            ? 'bg-accent/10 text-primary border-accent/20 rounded-tl-none'
                            : msg.is_question 
                              ? 'bg-blue-50 text-blue-900 border-blue-100 rounded-tl-none' 
                              : 'bg-muted/30 text-primary rounded-tl-none border-muted/10'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-muted/5 border-t">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white p-2 pl-5 rounded-full shadow-2xl border border-muted/20 focus-within:ring-2 focus-within:ring-accent/30 transition-all">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tirar dúvida com o mentor..."
                className="flex-1 h-10 bg-transparent border-none text-primary font-medium italic focus-visible:ring-0 px-0 text-xs"
              />
              <Button type="submit" disabled={!input.trim()} className="h-10 w-10 bg-primary hover:bg-primary/95 text-white rounded-full shrink-0 shadow-lg flex items-center justify-center border-none">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}