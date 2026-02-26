
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Bot, User, BookOpen, GraduationCap, AlertCircle, AtSign } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";

export default function ChatListPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      setErrorMsg(null);
      
      try {
        // Busca perfis que NÃO são o usuário atual
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .order('created_at', { ascending: false }); // Novos usuários primeiro
        
        if (error) {
          console.error("Erro Supabase:", error);
          setErrorMsg(error.message || "Falha ao carregar mentores. Verifique as políticas de RLS no Supabase.");
        } else {
          setContacts(data || []);
        }
      } catch (err: any) {
        console.error("Erro inesperado:", err);
        setErrorMsg("Erro de conexão com o servidor de rede.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.institution?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-full mx-auto px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-primary italic leading-none">Mentoria</h1>
          <p className="text-muted-foreground font-medium text-sm italic">Conecte-se com especialistas e colegas da rede.</p>
        </div>
      </div>

      <div className="relative max-w-xl group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
        <Input 
          placeholder="Pesquisar por nome ou @usuario..." 
          className="pl-12 h-12 md:h-14 bg-white border-none shadow-xl rounded-2xl text-sm md:text-lg font-medium italic focus-visible:ring-accent transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Card da Aurora (Fixo) */}
      <Card className="border-none shadow-[0_10px_40px_-15px_hsl(var(--accent)/0.3)] rounded-[2.5rem] bg-primary text-white overflow-hidden group transition-all duration-500">
        <CardContent className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 md:h-24 md:w-24 rounded-[2rem] bg-accent text-accent-foreground flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
              <Bot className="h-10 w-10 md:h-14 md:w-14" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-3xl font-black italic">Aurora IA</CardTitle>
              <p className="text-white/60 font-medium text-xs md:text-base italic">Mentora Pedagógica 24/7. Tire suas dúvidas agora.</p>
            </div>
          </div>
          <Button className="bg-white text-primary hover:bg-white/90 font-black h-12 md:h-14 px-8 md:px-10 rounded-2xl shadow-xl transition-all border-none" asChild>
            <Link href="/dashboard/chat/aurora-ai">Conversar com a Aurora</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Contatos Reais do Banco */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sintonizando Rede...</p>
          </div>
        ) : errorMsg ? (
          <div className="col-span-full py-10 px-6 bg-red-50 border-2 border-dashed border-red-200 rounded-[2rem] text-center animate-in zoom-in-95">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-800 font-black italic">Acesso à Rede Pendente</p>
            <p className="text-red-600 text-xs mt-2 font-medium">Não conseguimos carregar os perfis dos mentores.</p>
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-primary/5 shadow-2xl">
                      <AvatarImage src={contact.avatar_url || `https://picsum.photos/seed/${contact.id}/200/200`} />
                      <AvatarFallback className="bg-primary text-white font-black text-2xl italic">{contact.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-1 right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg md:text-xl font-black text-primary italic truncate max-w-[220px]">{contact.name}</CardTitle>
                    {contact.username && (
                      <div className="flex items-center justify-center gap-1 text-accent font-bold text-[10px] uppercase mt-1">
                        <AtSign className="h-2.5 w-2.5" />
                        <span>{contact.username}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {contact.profile_type === 'teacher' ? <BookOpen className="h-3 w-3 text-accent" /> : <GraduationCap className="h-3 w-3 text-primary" />}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{contact.institution || (contact.profile_type === 'teacher' ? 'Mentor' : 'Estudante')}</p>
                    </div>
                  </div>
                  <Button className="w-full bg-primary text-white hover:bg-primary/95 font-black h-12 rounded-2xl shadow-xl border-none" asChild>
                    <Link href={`/dashboard/chat/${contact.id}`}>Iniciar Mentoria</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center opacity-30">
            <User className="h-12 w-12 mx-auto mb-4" />
            <p className="font-black italic">Nenhum mentor ou colega encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
