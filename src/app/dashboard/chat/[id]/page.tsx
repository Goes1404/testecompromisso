
"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, ChevronLeft, Loader2, MessageSquare, Bot, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";

export default function DirectChatPage() {
  const params = useParams();
  const contactId = params.id as string;
  const isAurora = contactId === "aurora-ai";
  const { user, profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [input, setInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadChatData() {
      if (!user || !contactId) return;
      setLoading(true);

      try {
        if (isAurora) {
          setContact({ name: "Aurora IA", profile_type: "teacher", institution: "Mentoria Geral" });
          setMessages([
            { id: 'initial', sender_id: 'aurora-ai', content: 'Olá! Como posso te ajudar a acelerar seus estudos hoje?', created_at: new Date().toISOString() }
          ]);
        } else {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', contactId)
            .single();
          
          if (!profileError) {
            setContact(profileData);
          } else {
            setContact({ name: "Usuário Externo", institution: "Rede Compromisso" });
          }

          const { data: msgs, error: msgsError } = await supabase
            .from('direct_messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
          
          if (!msgsError) setMessages(msgs || []);
        }
      } catch (err) {
        console.error("Erro fatal ao carregar chat:", err);
      } finally {
        setLoading(false);
      }
    }

    loadChatData();

    if (!isAurora && user) {
      const channel = supabase
        .channel(`chat:${contactId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`
        }, (payload) => {
          if (payload.new.sender_id === contactId) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === payload.new.id);
              return exists ? prev : [...prev, payload.new];
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, contactId, isAurora]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages, isAiThinking]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !contactId || isSending) return;

    const userText = input;
    setInput("");

    if (isAurora) {
      const newUserMessage = { id: Date.now().toString(), sender_id: user.id, content: userText, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, newUserMessage]);
      
      setIsAiThinking(true);
      try {
        const history = [...messages, newUserMessage].slice(-6).map(m => ({
          role: (m.sender_id === "aurora-ai" ? 'model' : 'user') as 'user' | 'model',
          content: m.content
        }));

        const response = await fetch('/api/genkit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flowId: 'conceptExplanationAssistant',
            input: { query: userText, history: history },
          }),
        });

        if (!response.ok) throw new Error('Falha na IA');

        const data = await response.json();
        if (data.success && data.result?.response) {
          setMessages(prev => [...prev, {
            id: Date.now().toString() + '-ai',
            sender_id: "aurora-ai",
            content: data.result.response,
            created_at: new Date().toISOString(),
          }]);
        }
      } catch (err) {
        toast({ title: "Aurora processando...", description: "Oscilação na rede.", variant: "destructive" });
      } finally {
        setIsAiThinking(false);
      }
    } else {
      setIsSending(true);
      const { data, error } = await supabase.from('direct_messages').insert({
        sender_id: user.id,
        receiver_id: contactId,
        content: userText
      }).select().single();

      if (!error) {
        setMessages(prev => [...prev, data]);
      } else {
        toast({ title: "Erro ao enviar", variant: "destructive" });
      }
      setIsSending(false);
    }
  };
  
  if (loading) return (
    <div className="flex h-full items-center justify-center flex-col gap-4 py-20">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sintonizando Canal...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 overflow-hidden space-y-3">
      <div className="flex items-center justify-between p-2 md:p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border shrink-0">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 shrink-0 hover:bg-primary/5">
            <ChevronLeft className="h-6 md:h-7 md:w-7 text-primary" />
          </Button>
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="relative shrink-0">
              <Avatar className={`h-10 w-10 md:h-12 md:w-12 border-2 shadow-sm ${isAurora ? 'bg-accent border-white' : 'border-primary/5'}`}>
                {isAurora ? (
                  <div className="h-full w-full flex items-center justify-center text-accent-foreground"><Bot className="h-6 w-6" /></div>
                ) : (
                  <>
                    <AvatarImage src={`https://picsum.photos/seed/${contactId}/100/100`} />
                    <AvatarFallback className="bg-primary text-white font-black italic text-sm">{contact?.name?.charAt(0) || "?"}</AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-black text-primary italic leading-none truncate">{contact?.name || "Usuário"}</h1>
              <p className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1.5 truncate">
                {isAurora ? 'Suporte Inteligente' : (contact?.institution || 'Estudante')}
              </p>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 pr-2">
          <Badge className="bg-primary/5 text-primary border-none font-black text-[8px] uppercase tracking-tighter flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-accent" /> Canal Seguro
          </Badge>
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col shadow-2xl shadow-primary/5 border-none overflow-hidden rounded-[2rem] md:rounded-[3rem] bg-white relative">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="flex flex-col gap-5 py-8 px-4 md:px-12">
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              const isFromAurora = msg.sender_id === "aurora-ai";
              return (
                <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className="flex items-center gap-2 mb-1 px-2">
                    <span className="text-[7px] font-bold text-muted-foreground italic">{format(new Date(msg.created_at), "HH:mm")}</span>
                  </div>
                  <div className={`px-5 py-3 rounded-[1.5rem] md:rounded-[2rem] text-sm leading-relaxed font-medium shadow-sm max-w-[90%] md:max-w-[75%] transition-all ${
                      isMe 
                        ? 'bg-primary text-white rounded-tr-none shadow-primary/10' 
                        : isFromAurora 
                          ? 'bg-accent/5 text-primary rounded-tl-none border border-accent/10'
                          : 'bg-muted/30 text-primary rounded-tl-none border border-muted/20'
                    }`}>
                     {msg.content}
                  </div>
                </div>
              );
            })}
            {(isAiThinking || isSending) && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-[1.5rem] rounded-tl-none border border-slate-100 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/40 italic">Sincronizando...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 md:p-6 bg-slate-50/50 border-t shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-3 max-w-4xl mx-auto bg-white p-2 pl-6 rounded-full shadow-xl border border-muted/20 focus-within:ring-2 focus-within:ring-accent/30 transition-all">
             <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isAiThinking || isSending}
              placeholder={isAurora ? "Tire uma dúvida..." : "Escreva sua mensagem..."}
              className="flex-1 h-10 md:h-12 bg-transparent border-none text-primary font-medium italic focus-visible:ring-0 px-0 text-sm md:text-base"
            />
            <Button type="submit" disabled={!input.trim() || isAiThinking || isSending} className="h-10 w-10 md:h-12 md:w-12 bg-primary hover:bg-primary/95 rounded-full shadow-xl shrink-0 border-none transition-transform active:scale-90">
              {isAiThinking || isSending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
