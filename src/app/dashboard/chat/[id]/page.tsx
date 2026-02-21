
"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, ChevronLeft, Loader2, MessageSquare, Bot } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

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

  // Carregar dados iniciais e histórico
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
          // Carregar Perfil do Contato
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', contactId)
            .single();
          
          if (!profileError) {
            setContact(profileData);
          } else {
            console.error("Erro ao carregar contato:", profileError);
            setContact({ name: "Usuário Externo", institution: "Rede Compromisso" });
          }

          // Carregar Mensagens Reais (Histórico entre eu e o contato)
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

    // Inscrição Real-time para chats entre humanos
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

  // Scroll automático para a última mensagem
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

        const data = await response.json();
        if (data.success && data.result.response) {
          setMessages(prev => [...prev, {
            id: Date.now().toString() + '-ai',
            sender_id: "aurora-ai",
            content: data.result.response,
            created_at: new Date().toISOString(),
          }]);
        }
      } catch (err) {
        toast({ title: "Aurora processando...", description: "Houve uma oscilação na rede.", variant: "destructive" });
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
        console.error("Erro ao enviar:", error);
        toast({ title: "Erro ao enviar", description: "Verifique a conexão.", variant: "destructive" });
      }
      setIsSending(false);
    }
  };
  
  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Abrindo Canal Seguro...</p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-in fade-in duration-500 overflow-hidden space-y-2 md:space-y-4 w-full h-full">
      {/* Header do Chat */}
      <div className="flex items-center justify-between px-2 py-2 shrink-0 bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border border-white/20">
        <div className="flex items-center gap-2 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-9 w-9 md:h-10 md:w-10 shrink-0 hover:bg-primary/5 transition-all">
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </Button>
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
            <div className="relative shrink-0">
              <Avatar className={`h-9 w-9 md:h-12 md:w-12 border-2 shadow-lg ${isAurora ? 'bg-accent border-white' : 'border-primary/10'}`}>
                {isAurora ? (
                  <div className="h-full w-full flex items-center justify-center text-accent-foreground"><Bot className="h-5 w-5 md:h-6 md:w-6" /></div>
                ) : (
                  <>
                    <AvatarImage src={`https://picsum.photos/seed/${contactId}/100/100`} />
                    <AvatarFallback className="bg-primary text-white font-black italic text-xs md:text-sm">{contact?.name?.charAt(0) || "?"}</AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-black text-primary italic leading-none truncate">{contact?.name || "Usuário"}</h1>
              <p className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1 truncate">
                {isAurora ? 'Engenharia Pedagógica Ativa' : (contact?.institution || 'Estudante da Rede')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pr-2">
          <Badge className="bg-green-100 text-green-700 border-none px-2 font-black text-[7px] md:text-[8px] uppercase tracking-tighter">Conectado</Badge>
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col shadow-2xl border-none overflow-hidden rounded-[1.5rem] md:rounded-[3rem] bg-white relative">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="flex flex-col gap-4 md:gap-6 py-6 px-4 md:px-12">
            {messages.length === 0 ? (
              <div className="text-center py-20 opacity-30 flex flex-col items-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
                <p className="text-xs font-black italic mt-4">Inicie a conversa agora!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                const isFromAurora = msg.sender_id === "aurora-ai";
                return (
                  <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`px-4 py-2.5 md:px-6 md:py-4 rounded-[1.25rem] md:rounded-[2rem] text-xs md:text-sm leading-relaxed font-medium shadow-sm border transition-all max-w-[90%] md:max-w-[75%] ${
                        isMe 
                          ? 'bg-primary text-white rounded-tr-none border-primary/5' 
                          : isFromAurora 
                            ? 'bg-accent/10 text-primary rounded-tl-none border-accent/20'
                            : 'bg-muted/30 text-primary rounded-tl-none border-muted/20'
                      }`}>
                       {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            {(isAiThinking || isSending) && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 bg-accent/5 px-4 py-2 rounded-[1.25rem] rounded-tl-none border border-accent/10">
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-accent italic">Sincronizando...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 md:p-6 bg-muted/5 border-t shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto bg-white p-1.5 pl-4 rounded-full shadow-lg border border-muted/20 focus-within:ring-2 focus-within:ring-accent/30 transition-all">
             <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isAiThinking || isSending}
              placeholder={isAurora ? "Tire uma dúvida técnica ou pedagógica..." : "Escreva sua mensagem..."}
              className="flex-1 h-9 md:h-10 bg-transparent border-none text-primary font-medium italic focus-visible:ring-0 px-0 text-xs md:text-sm"
            />
            <Button type="submit" disabled={!input.trim() || isAiThinking || isSending} className="h-9 w-9 md:h-12 md:w-12 bg-primary hover:bg-primary/95 rounded-full shadow-xl shrink-0 border-none">
              {isAiThinking || isSending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
