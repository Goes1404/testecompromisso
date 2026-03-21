
"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, ChevronLeft, Loader2, MessageSquare, Bot, ShieldCheck, AlertCircle, Sparkles, Terminal } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  isError?: boolean;
  is_read?: boolean;
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || isAurora || !contactId) return;

    const markAsRead = async () => {
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', contactId)
        .eq('is_read', false);
    };

    markAsRead();
  }, [user, contactId, isAurora, messages.length]);

  useEffect(() => {
    async function loadChatData() {
      if (!user || !contactId) return;
      setLoading(true);

      try {
        if (isAurora) {
          setContact({ name: "Aurora IA", profile_type: "teacher", institution: "Mentoria Geral" });
          setMessages([
            { id: 'initial', sender_id: 'aurora-ai', content: 'Olá! Sou a Aurora. Como posso te ajudar a acelerar seus estudos hoje?', created_at: new Date().toISOString() }
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
            setContact({ name: "Mentor da Rede", institution: "Compromisso 360" });
          }

          const { data: msgs, error: msgsError } = await supabase
            .from('direct_messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
          
          if (!msgsError) {
            setMessages(msgs || []);
          } else {
            toast({ title: "Falha ao carregar mensagens", description: "Verifique sua conexão.", variant: "destructive" });
          }
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
        .channel(`chat_realtime_${contactId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'direct_messages'
        }, (payload) => {
          const isFromCurrentChat = 
            (payload.new.sender_id === user.id && payload.new.receiver_id === contactId) ||
            (payload.new.sender_id === contactId && payload.new.receiver_id === user.id);

          if (isFromCurrentChat) {
            setMessages((prev: ChatMessage[]) => {
              if (!payload.new || typeof payload.new.id !== 'string') return prev;
              const exists = prev.some(m => m.id === payload.new.id);
              return exists ? prev : [...prev, payload.new as ChatMessage];
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, contactId, isAurora, toast]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages, isAiThinking]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const userText = customText || input;
    if (!userText.trim() || !user || !contactId || isSending) return;

    if (!customText) setInput("");

    if (isAurora) {
      const newUserMessage = { id: `u-${Date.now()}`, sender_id: user.id, content: userText, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, newUserMessage]);
      
      setIsAiThinking(true);
      try {
        const history = [...messages, newUserMessage].slice(-6).map(m => ({
          role: (m.sender_id === "aurora-ai" ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content
        }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success && data.result?.response) {
          setMessages(prev => [...prev, {
            id: `ai-${Date.now()}`,
            sender_id: "aurora-ai",
            content: data.result.response,
            created_at: new Date().toISOString(),
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: `ai-error-${Date.now()}`,
            sender_id: "aurora-ai",
            content: `⚠️ [ERRO TÉCNICO]: ${data.error || "Houve um problema ao processar sua dúvida. Verifique a Engine."}`,
            created_at: new Date().toISOString(),
            isError: true
          }]);
        }
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: `ai-crit-${Date.now()}`,
          sender_id: "aurora-ai",
          content: `⚠️ [FALHA DE REDE]: ${err.message || "Oscilação detectada no sinal da IA."}`,
          created_at: new Date().toISOString(),
          isError: true
        }]);
      } finally {
        setIsAiThinking(false);
      }
    } else {
      setIsSending(true);
      try {
        const { data, error } = await supabase.from('direct_messages').insert({
          sender_id: user.id,
          receiver_id: contactId,
          content: userText,
          is_read: false
        }).select().single();

        if (error) throw error;
        
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data as ChatMessage];
        });
      } catch (err: any) {
        toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
      } finally {
        setIsSending(false);
      }
    }
  };
  
  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sintonizando Canal de Mentoria...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in overflow-hidden">
      <div className="flex items-center justify-between p-3 md:p-5 bg-white shadow-sm border-b shrink-0 z-10">
        <div className="flex items-center gap-4 overflow-hidden min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-11 w-11 shrink-0 hover:bg-primary/5">
            <ChevronLeft className="h-6 w-6 text-primary" />
          </Button>
          <div className="flex items-center gap-4 overflow-hidden min-w-0">
            <div className="relative shrink-0">
              <Avatar className={`h-11 w-11 md:h-14 md:w-14 border-2 shadow-sm ${isAurora ? 'bg-accent border-white' : 'border-primary/5'}`}>
                {isAurora ? (
                  <div className="h-full w-full flex items-center justify-center text-accent-foreground"><Bot className="h-7 w-7" /></div>
                ) : (
                  <>
                    <AvatarImage src={`https://picsum.photos/seed/${contactId}/150/150`} />
                    <AvatarFallback className="bg-primary text-white font-black italic text-sm">{contact?.name?.charAt(0) || "?"}</AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-black text-primary italic leading-none truncate">{contact?.name || "Mentor da Rede"}</h1>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-2 truncate">
                {isAurora ? 'Engine de Apoio 24/7' : (contact?.institution || 'Compromisso 360')}
              </p>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 pr-4">
          <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase tracking-widest flex items-center gap-2 h-10 px-4 rounded-xl">
            <ShieldCheck className="h-4 w-4 text-accent" /> SINAL SEGURO
          </Badge>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col relative">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="flex flex-col gap-6 py-10 px-4 md:px-16 max-w-5xl mx-auto w-full">
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              const isError = msg.isError;
              return (
                <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className="flex items-center gap-3 mb-1.5 px-3">
                    {!isMe && <span className="text-[8px] font-black uppercase text-primary/40 tracking-widest">{msg.sender_id === contactId ? contact?.name : 'Aurora'}</span>}
                    <span className="text-[8px] font-bold text-muted-foreground italic opacity-60">{format(new Date(msg.created_at), "HH:mm")}</span>
                  </div>
                  <div className={`px-6 py-4 rounded-[2rem] text-sm leading-relaxed font-medium shadow-sm max-w-[90%] md:max-w-[75%] transition-all border ${
                      isMe 
                        ? 'bg-primary text-white border-transparent rounded-tr-none shadow-primary/10' 
                        : isError 
                          ? 'bg-red-50 text-red-700 border-red-100 rounded-tl-none font-black italic flex items-start gap-3' 
                          : 'bg-white text-primary border-slate-100 rounded-tl-none'
                    }`}>
                     {isError && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                     {msg.content}
                  </div>
                </div>
              );
            })}
            {isAiThinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-[2rem] rounded-tl-none border border-slate-100 shadow-sm animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 italic">Aurora sintonizando resposta...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {isAurora && !isAiThinking && messages.length < 3 && (
          <div className="px-4 md:px-16 max-w-5xl mx-auto w-full mb-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleSend(undefined, "O que é a regra de 1,5 salário mínimo?")}
                className="bg-accent/10 hover:bg-accent/20 text-accent font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-full border border-accent/20 transition-all flex items-center gap-2"
              >
                <Sparkles className="h-3 w-3" /> Testar Resposta Aurora
              </button>
              <button 
                onClick={() => handleSend(undefined, "Quais documentos preciso para o ETEC?")}
                className="bg-primary/5 hover:bg-primary/10 text-primary font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-full border border-primary/10 transition-all flex items-center gap-2"
              >
                <Terminal className="h-3 w-3" /> Testar Signal Pedagógico
              </button>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 bg-white border-t shrink-0">
          <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-4 max-w-4xl mx-auto bg-slate-100 p-2 pl-8 rounded-[2.5rem] border border-slate-200 focus-within:ring-4 focus-within:ring-accent/10 transition-all">
             <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isAiThinking || isSending}
              placeholder={isAurora ? "Tire uma dúvida pedagógica..." : "Digite sua mensagem para o mentor..."}
              className="flex-1 h-12 md:h-14 bg-transparent border-none text-primary font-bold italic focus-visible:ring-0 px-0 text-base"
            />
            <button type="submit" disabled={!input.trim() || isAiThinking || isSending} className="h-12 w-12 md:h-14 md:w-14 bg-primary hover:bg-primary/95 text-white rounded-full shadow-2xl shrink-0 border-none transition-all active:scale-90 flex items-center justify-center">
              {isAiThinking || isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
