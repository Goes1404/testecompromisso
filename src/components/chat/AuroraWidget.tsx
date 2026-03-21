"use client";

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { Bot, X, MessageSquare, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function AuroraWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat'
  });
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Rolagem automática para o final quando a IA responde
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-16 w-16 md:h-20 md:w-20 rounded-full shadow-[0_10px_40px_rgba(79,70,229,0.5)] bg-gradient-to-br from-blue-600 to-indigo-600 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center p-0 z-50 border-4 border-white group"
      >
        <div className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 border-2 border-white animate-pulse" />
        <Bot className="h-8 w-8 md:h-10 md:w-10 text-white group-hover:animate-bounce" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-[90vw] md:w-[420px] h-[650px] max-h-[85vh] shadow-[0_20px_70px_rgba(0,0,0,0.3)] rounded-[2.5rem] z-50 flex flex-col overflow-hidden border-2 border-white bg-slate-50 animate-in slide-in-from-bottom-5 duration-500">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 flex items-center justify-between text-white shadow-md z-10 shrink-0 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
            <Bot className="h-7 w-7 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-black italic text-2xl leading-none flex items-center gap-2">
              Aurora <Sparkles className="h-4 w-4 text-yellow-300" />
            </h3>
            <div className="flex items-center gap-1.5 opacity-90 mt-1">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Mentora IA Online</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded-full h-10 w-10 relative z-10 transition-colors">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Rolagem de Textos */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-slate-50 to-white relative">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col text-center space-y-4 px-6 animate-in fade-in zoom-in-95 duration-700">
            <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center shadow-inner">
              <MessageSquare className="h-10 w-10 text-indigo-300" />
            </div>
            <p className="text-sm md:text-base font-bold text-slate-500 italic leading-relaxed text-center px-4">
              "Oi Estudante! Eu sou a Aurora, sua parceira de estudos oficial. Preparado para alcançar a nota máxima? Do que você precisa hoje?"
            </p>
          </div>
        ) : (
          messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
              <div className={`max-w-[85%] rounded-[1.5rem] p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                m.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-br-sm font-medium' 
                  : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm shadow-md'
              }`}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white border p-4 rounded-[1.5rem] rounded-bl-sm shadow-md flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Analisando...</span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Caixa de Entrada */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <Input 
            value={input}
            onChange={handleInputChange}
            placeholder="Mande sua dúvida cruel..."
            className="flex-1 rounded-[1.5rem] h-14 bg-slate-50 border border-slate-200 shadow-inner pr-14 focus-visible:ring-indigo-100 placeholder:italic placeholder:text-slate-400 font-medium"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="absolute right-1.5 top-1.5 h-11 w-11 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:scale-105 active:scale-95 transition-all p-0 shadow-lg"
          >
            <Send className="h-4 w-4 text-white ml-0.5" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
