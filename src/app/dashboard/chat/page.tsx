"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Bot, User, MapPin, ShieldCheck, GraduationCap } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { Badge } from "@/components/ui/badge";

export default function ChatListPage() {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const categories = [
    "Todos",
    ...(profile?.profile_type === 'teacher' ? ["ETEC", "ENEM", "1º Ano", "2º Ano", "3º Ano", "Apoio"] : ["Redação", "Matemática", "Linguagens", "Ciências da Natureza", "Ciências Humanas", "Apoio Pedagógico"])
  ];

  useEffect(() => {
    async function fetchData() {
      if (!user || !profile) return;
      setLoading(true);
      
      try {
        const userType = (profile.profile_type || 'student').toLowerCase();
        const userInstitution = (profile.institution || '').toLowerCase().trim();
        
        // Query para buscar contatos
        let query = supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id);

        if (userType === 'teacher') {
          // Professor vê alunos
          const studentKeywords = ['etec', 'uni', 'enem', 'student'];
          query = query.or(studentKeywords.map(k => `profile_type.ilike.%${k}%`).join(','));
        } else {
          // Aluno vê mentores
          query = query.eq('profile_type', 'teacher');
        }

        const { data, error } = await query.order('name', { ascending: true });
        
        if (error) throw error;

        // LÓGICA DE SEGMENTAÇÃO POR POLO (INDUSTRIAL)
        // Alunos veem apenas mentores do seu polo ou mentores "Gerais"
        const filteredByPolo = data?.filter(mentor => {
          // Admin e Professor veem todo mundo na listagem final de segmentação de polo
          if (userType === 'admin' || userType === 'teacher') return true;
          
          const mentorInstitution = (mentor.institution || '').toLowerCase();
          
          // Se o aluno não tem polo definido, vê mentores "Geral" ou sem polo
          if (!userInstitution) {
            return !mentorInstitution || mentorInstitution.includes('geral');
          }

          // Se o aluno tem polo (ex: CPOP Santana), vê mentores do mesmo polo ou "Geral"
          return mentorInstitution.includes(userInstitution) || mentorInstitution.includes('geral') || !mentorInstitution;
        }) || [];

        setContacts(filteredByPolo);
      } catch (err: any) {
        console.error("Erro ao carregar rede de mentoria:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, profile]);

  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(term) || 
      (c.username || '').toLowerCase().includes(term) ||
      (c.institution || '').toLowerCase().includes(term) ||
      (c.course || '').toLowerCase().includes(term);
      
    if (activeCategory === "Todos") return matchesSearch;

    if (profile?.profile_type === 'teacher') {
      // Filtros do professor: se for ETEC ou ENEM (procura no curso, polo, exam_target etc)
      return matchesSearch && JSON.stringify(c).toLowerCase().includes(activeCategory.toLowerCase());
    }

    const mentorCourse = c.course || "Apoio Pedagógico";
    const matchesCategory = mentorCourse.includes(activeCategory);
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-20 px-1 md:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-primary italic leading-none">
              {profile?.profile_type === 'teacher' ? "Gestão de Conversas" : "Mentoria Especializada"}
            </h1>
            <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-accent" /> CANAL SEGURO
            </Badge>
          </div>
          <p className="text-muted-foreground font-medium text-sm md:text-xl italic">
            {profile?.profile_type === 'teacher' 
              ? "Atendimento direto aos estudantes da rede." 
              : <>Conectado aos especialistas: <span className="text-accent font-black uppercase">{profile?.institution || 'Rede Geral'}</span></>
            }
          </p>
        </div>
      </div>

      <div className="relative max-w-xl group w-full pt-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
        <Input 
          placeholder="Buscar aluno por nome, polo, escola ou curso..." 
          className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl text-lg font-medium italic focus-visible:ring-accent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* CATEGORIAS (FILTROS) */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant="ghost"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-6 h-10 font-black text-[10px] uppercase tracking-widest whitespace-nowrap shadow-sm border-2 snap-center transition-all flex-shrink-0 ${
              activeCategory === cat 
                ? 'bg-accent border-accent text-accent-foreground shadow-accent/20' 
                : 'bg-white border-muted/20 text-muted-foreground hover:border-accent hover:text-accent'
            }`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* CANAIS DE CONTATO */}
      {profile?.profile_type !== 'teacher' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Docente", desc: "Fale diretamente com seu professor de referência.", icon: GraduationCap, color: "bg-blue-50 border-blue-100 text-blue-700" },
            { title: "Bolsas", desc: "Tire dúvidas sobre processos e requisitos de bolsas.", icon: ShieldCheck, color: "bg-amber-50 border-amber-100 text-amber-700" },
            { title: "Apoio Psicopedagógico", desc: "Suporte emocional e pedagógico especializado.", icon: User, color: "bg-green-50 border-green-100 text-green-700" },
          ].map((canal) => (
            <div key={canal.title} className={`flex items-start gap-4 p-5 rounded-2xl border ${canal.color} shadow-sm`}>
              <div className="h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0 shadow-sm">
                <canal.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tight">{canal.title}</p>
                <p className="text-xs font-medium opacity-70 mt-0.5 leading-relaxed">{canal.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 pt-4">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Sintonizando Rede de Mentores...</p>
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="border-none shadow-xl rounded-[3rem] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative border-b-8 border-primary/5">
              <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 md:h-28 md:w-28 border-[6px] border-primary/5 shadow-2xl">
                    <AvatarImage src={`https://picsum.photos/seed/${contact.id}/200/200`} className="object-cover" />
                    <AvatarFallback className="bg-primary text-white font-black text-3xl italic">{contact.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-1 right-1 h-6 w-6 bg-emerald-500 rounded-full border-4 border-white shadow-xl ring-1 ring-black/5 animate-pulse" />
                </div>
                <div className="space-y-2 w-full">
                  <CardTitle className="text-xl md:text-2xl font-black text-primary italic truncate px-2">{contact.name}</CardTitle>
                  <div className="flex flex-col gap-2 items-center">
                    <Badge variant="outline" className="bg-slate-50 border-none text-muted-foreground font-black text-[8px] px-3 h-6 uppercase tracking-tighter">
                      <GraduationCap className="h-3 w-3 mr-1.5 text-accent" />
                      {contact.course || 'Mentor Acadêmico'}
                    </Badge>
                    <div className="flex items-center justify-center gap-2 text-accent font-black text-[9px] uppercase tracking-widest mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{contact.institution || "Rede Geral"}</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-primary text-white hover:bg-primary/95 font-black h-14 rounded-2xl shadow-xl transition-all active:scale-95 border-none" asChild>
                  <Link href={`/dashboard/chat/${contact.id}`}>
                    {profile?.profile_type === 'teacher' ? "Enviar Mensagem" : "Abrir Mentoria"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-4 border-dashed rounded-[3.5rem] bg-white/50 opacity-30 animate-in zoom-in-95">
            <User className="h-20 w-20 mx-auto mb-6 text-primary/20" />
            <p className="font-black italic text-2xl text-primary uppercase">Nenhum mentor deste polo online</p>
            <p className="text-sm font-medium italic mt-2">Você pode falar com a Aurora IA para suporte imediato.</p>
          </div>
        )}
      </div>
    </div>
  );
}