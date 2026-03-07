
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Bot, User, BookOpen, AlertCircle, AtSign, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { Badge } from "@/components/ui/badge";

export default function ChatListPage() {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user || !profile) return;
      setLoading(true);
      setErrorMsg(null);
      
      try {
        const userType = profile.profile_type || 'student';
        const userInstitution = profile.institution || '';
        
        // Query base para buscar mentores
        let query = supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .eq('profile_type', 'teacher'); // Busca especificamente mentores

        // Lógica de Segmentação Industrial por Polo/Categoria
        // Se o aluno é de um polo específico (CPOP, ETEC), filtramos mentores que atendem esse polo
        if (userType !== 'admin') {
          if (userInstitution) {
            // Filtra mentores que tenham a mesma instituição ou que sejam "Gerais"
            query = query.or(`institution.ilike.%${userInstitution}%,institution.eq.Geral,institution.is.null`);
          }
        }

        const { data, error } = await query.order('name', { ascending: true });
        
        if (error) throw error;
        setContacts(data || []);
      } catch (err: any) {
        console.error("Erro ao carregar rede de mentores:", err);
        setErrorMsg("Falha ao sintonizar rede de mentores específica do seu polo.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, profile]);

  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.institution?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 max-w-full mx-auto px-1">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-primary italic leading-none">Mentoria Especializada</h1>
          <p className="text-muted-foreground font-medium text-sm md:text-base italic">
            Conectado aos especialistas do seu polo: <span className="text-accent font-bold uppercase">{profile?.institution || 'Rede Geral'}</span>
          </p>
        </div>
      </div>

      <div className="relative max-w-xl group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
        <Input 
          placeholder="Buscar mentor ou disciplina..." 
          className="pl-12 h-12 md:h-14 bg-white border-none shadow-xl rounded-2xl text-sm md:text-lg font-medium italic focus-visible:ring-accent transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_10px_40px_-15px_hsl(var(--accent)/0.3)] rounded-[2.5rem] bg-primary text-white overflow-hidden group transition-all duration-500">
        <CardContent className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="h-16 w-16 md:h-24 md:w-24 rounded-[2rem] bg-accent text-accent-foreground flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
              <Bot className="h-10 w-10 md:h-14 md:w-14" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-3xl font-black italic">Aurora IA</CardTitle>
              <p className="text-white/60 font-medium text-xs md:text-base italic">Mentora Pedagógica 24/7. Suporte imediato em qualquer polo.</p>
            </div>
          </div>
          <Button className="bg-white text-primary hover:bg-white/90 font-black h-12 md:h-14 px-8 md:px-10 rounded-2xl shadow-xl transition-all border-none w-full md:w-auto" asChild>
            <Link href="/dashboard/chat/aurora-ai">Conversar com a Aurora</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sintonizando Mentores do Polo...</p>
          </div>
        ) : errorMsg ? (
          <div className="col-span-full py-10 px-6 bg-red-50 border-2 border-dashed border-red-200 rounded-[2rem] text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-800 font-black italic">{errorMsg}</p>
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-primary/5 shadow-2xl">
                      <AvatarImage src={contact.avatar_url || `https://picsum.photos/seed/${contact.id}/200/200`} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white font-black text-2xl italic">{contact.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-1 right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg md:text-xl font-black text-primary italic truncate max-w-[220px]">{contact.name}</CardTitle>
                    <div className="flex items-center justify-center gap-1.5 text-accent font-bold text-[9px] uppercase tracking-wider">
                      <MapPin className="h-2.5 w-2.5" />
                      <span>{contact.institution || "Mentor Geral"}</span>
                    </div>
                  </div>
                  <div className="pt-2 w-full border-t border-muted/10">
                    <Button className="w-full bg-primary text-white hover:bg-primary/95 font-black h-12 rounded-2xl shadow-xl border-none" asChild>
                      <Link href={`/dashboard/chat/${contact.id}`}>Abrir Chat</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-4 border-dashed rounded-[3rem] opacity-30">
            <User className="h-16 w-16 mx-auto mb-4 text-primary/20" />
            <p className="font-black italic text-xl text-primary">Nenhum mentor do polo {profile?.institution} online.</p>
            <p className="text-sm font-medium italic mt-2">Tente conversar com a Aurora IA para suporte imediato.</p>
          </div>
        )}
      </div>
    </div>
  );
}
