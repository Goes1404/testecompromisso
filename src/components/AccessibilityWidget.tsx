
"use client";

import { useState } from "react";
import { MessageCircle, HandMetal, Send, Bot, Eraser, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Virtuoso } from 'react-virtuoso';
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client"; // Cliente Supabase para Frontend

interface Message {
  role: "assistant" | "user";
  content: string;
  isError?: boolean;
}

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Olá! Sou a Aurora IA. Como posso ajudar na sua gestão ou aprendizado hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const pathname = usePathname();
  const supabase = createClient(); // Instancia o cliente

  const isInputHeavyPage = 
    pathname.includes('/chat/') || 
    pathname.includes('/support') || 
    pathname.includes('/live/') || 
    pathname.includes('/forum/');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);

    // 1. Verificação de Autenticação no Frontend
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Esta funcionalidade é exclusiva para membros. Por favor, faça login ou registre-se para interagir com a Aurora IA.",
        isError: true
      }]);
      setLoading(false);
      return;
    }

    // 2. Continua com o envio da mensagem se o usuário estiver logado
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput("");

    try {
      const history = messages.map(m => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        content: m.content
      }));

      const response = await fetch('/api/genkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId: 'conceptExplanationAssistant',
          input: { query: currentInput, history }
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.result.response) {
        setMessages(prev => [...prev, { role: "assistant", content: data.result.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.error || "Houve um erro inesperado ao conectar com a Aurora.",
          isError: true 
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `⚠️ [ERRO REDE]: ${err.message || "Tente novamente mais tarde."}`,
        isError: true 
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  const renderMessage = (index: number, msg: Message) => (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 px-6 pb-4`}>
      <div className={`max-w-[85%] p-4 rounded-2xl text-xs md:text-sm font-medium leading-relaxed shadow-sm ${
        msg.role === 'user' 
          ? 'bg-primary text-white rounded-tr-none' 
          : msg.isError
            ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none italic font-black'
            : 'bg-white text-primary rounded-tl-none border border-primary/5'
      }`}>
        {msg.content}
      </div>
    </div>
  );
  
  return (
    <div 
      className={`fixed ${isInputHeavyPage ? 'bottom-28 md:bottom-10' : 'bottom-6'} right-6 z-40 flex flex-col gap-3 items-end transition-all duration-500`}
    >
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
           <button 
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl transition-all hover:scale-110 active:scale-95 border-4 border-white group relative animate-in zoom-in duration-700 ${
              isOpen ? 'rotate-[360deg] shadow-primary/40' : ''
            }`}
            title="Abrir Aurora IA"
          >
            <MessageCircle className="h-7 w-7 transition-transform group-hover:rotate-12 text-accent" />
            {!isOpen && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-50 rounded-full border-2 border-white animate-bounce" />}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[90vw] sm:max-w-[400px] p-0 border-none rounded-l-[2rem] overflow-hidden bg-white flex flex-col shadow-2xl z-50">
          <SheetHeader className="p-6 bg-primary text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground shadow-lg">
                  <Bot className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <SheetTitle className="text-white font-black italic leading-none">Aurora IA</SheetTitle>
                  <p className="text-[8px] font-black uppercase tracking-widest text-accent mt-1">Gabinete de Apoio 360</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMessages([{role: "assistant", content: "Sintonizando dados..."}])} className="text-white/40 hover:text-white rounded-full"><Eraser className="h-4 w-4" /></Button>
            </div>
          </SheetHeader>

          <Virtuoso
            className="flex-1 bg-slate-50/50 pt-6"
            style={{ height: '100%' }}
            data={messages}
            itemContent={renderMessage}
            followOutput="auto"
          />

          <div className="p-4 bg-white border-t shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-slate-100 p-1.5 pl-4 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-accent/30 transition-all">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre gestão ou conteúdo..."
                disabled={loading}
                className="border-none shadow-none focus-visible:ring-0 text-xs font-bold italic h-10 bg-transparent"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || loading} className="rounded-full bg-primary hover:bg-primary/95 shadow-xl h-10 w-10 shrink-0 transition-all">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <button 
        className={`flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-2xl transition-all hover:scale-110 active:scale-95 border-4 border-white group animate-in zoom-in duration-1000 ${
          isOpen ? 'rotate-[-360deg] opacity-80' : ''
        }`} 
        title="Acessibilidade VLibras"
      >
        <HandMetal className="h-6 w-6 transition-transform group-hover:rotate-12" />
      </button>
    </div>
  );
}
