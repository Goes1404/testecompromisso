"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Bot, User, MapPin, ShieldCheck, GraduationCap, MessagesSquare, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { Badge } from "@/components/ui/badge";

export default function ChatListPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [contacts, setContacts] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const isStaffUser = ['teacher', 'staff', 'admin'].includes(profile?.profile_type?.toLowerCase() || '');
  
  const categories = [
    "Todos",
    ...(isStaffUser 
      ? ["ETEC", "ENEM", "1º Ano", "2º Ano", "3º Ano", "Apoio"] 
      : ["Redação", "Matemática", "Linguagens", "Ciências da Natureza", "Ciências Humanas", "Apoio Pedagógico"]
    )
  ];

  useEffect(() => {
    async function fetchData() {
      if (authLoading) return;
      if (!user || !profile) {
        setLoading(false);
        return;
      }
      setLoading(true);
      
      try {
        const userType = (profile.profile_type || 'student').toLowerCase();
        const userInstitution = (profile.institution || '').toLowerCase().trim();
        
        // Query para buscar contatos
        let query = supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id);

        if (['teacher', 'staff', 'admin'].includes(userType)) {
          // Equipe de gestão/docente vê todo mundo (alunos, professores, secretaria)
          query = query.or('role.eq.student,profile_type.eq.student,role.eq.teacher,profile_type.eq.teacher,role.eq.staff,profile_type.eq.staff,role.eq.admin,profile_type.eq.admin');
        } else {
          // Aluno vê mentores
          query = query.eq('profile_type', 'teacher');
        }

        const { data, error } = await query.order('name', { ascending: true });
        
        if (error) throw error;

        // LÓGICA DE SEGMENTAÇÃO POR POLO (INDUSTRIAL)
        // Alunos veem apenas mentores do seu polo ou mentores "Gerais"
        const filteredByPolo = data?.filter(mentor => {
          // Admin, Professor e Secretaria veem todo mundo na listagem final de segmentação de polo
          if (['admin', 'teacher', 'staff'].includes(userType)) return true;
          
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

    const fetchUnreadCounts = async () => {
      if (!user) return;
      try {
        const { data: unreadData, error: unreadError } = await supabase
          .from('direct_messages')
          .select('sender_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (unreadError) throw unreadError;

        const unreadCounts: Record<string, number> = {};
        if (unreadData) {
          unreadData.forEach((m: any) => {
            unreadCounts[m.sender_id] = (unreadCounts[m.sender_id] || 0) + 1;
          });
        }
        setUnreadMessages(unreadCounts);
      } catch (e) {
        console.error("Erro ao buscar mensagens não lidas:", e);
      }
    };

    if (!authLoading && user && profile) {
      fetchData();
      fetchUnreadCounts();

      // Canal realtime para novas mensagens não lidas direcionadas a mim
      const channel = supabase
        .channel('chat_list_unread_realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`
        }, () => {
          fetchUnreadCounts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, profile, authLoading]);

  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase();
    const searchString = `${c.name || ''} ${c.username || ''} ${c.institution || ''} ${c.course || ''} ${c.sala || ''} ${c.exam_target || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(term);
      
    if (activeCategory === "Todos") return matchesSearch;

    if (isStaffUser) {
      // Filtros da equipe de gestão/docente: se for ETEC ou ENEM (procura no curso, polo, exam_target etc)
      return matchesSearch && searchString.includes(activeCategory.toLowerCase());
    }

    const mentorCourse = c.course || "Apoio Pedagógico";
    const matchesCategory = mentorCourse.includes(activeCategory);
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-1 md:px-0.5">
      
      {/* ── BANNER CABEÇALHO (21st.dev/Stitch style) ── */}
      <section className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 min-h-[160px] md:min-h-[220px] flex items-end p-6 md:p-8 shadow-2xl">
        {/* Glows de fundo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] bg-primary/25 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-30%] left-[-5%] w-[300px] h-[300px] bg-accent/15 rounded-full blur-[80px]" />
        </div>
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 w-full">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Rede de Diálogo</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter italic">
              {isStaffUser ? "Gestão de Conversas" : "Mentoria Especializada"}
            </h1>
            <p className="text-sm text-white/50 font-medium max-w-lg leading-relaxed">
              {isStaffUser 
                ? "Atendimento direto e suporte aos estudantes cadastrados na plataforma." 
                : "Conecte-se com professores de referência e sane suas dúvidas pedagógicas em tempo real."
              }
            </p>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 min-w-[155px]">
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest leading-none">Contatos Ativos</p>
            <p className="font-black text-white text-2xl leading-none mt-1">{filteredContacts.length}</p>
            {Object.keys(unreadMessages).length > 0 && (
              <span className="text-[9px] bg-red-500 text-white font-black px-2.5 py-0.5 rounded-full animate-pulse mt-2">
                {Object.values(unreadMessages).reduce((a, b) => a + b, 0)} não lidas
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── BARRA DE PESQUISA (Glassmorphism) ── */}
      <div className="relative max-w-xl group w-full pt-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent z-10" />
        <Input 
          placeholder={isStaffUser ? "Buscar aluno por nome, polo, escola ou curso..." : "Buscar mentor por nome ou matéria..."} 
          className="pl-12 h-14 bg-white border-none shadow-md rounded-2xl text-base font-medium italic focus-visible:ring-accent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ── CATEGORIAS (TABS FILTROS) ── */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant="ghost"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-6 h-12 font-black text-[9px] uppercase tracking-widest whitespace-nowrap shadow-sm border snap-center transition-all flex-shrink-0 ${
              activeCategory === cat 
                ? 'bg-accent border-accent text-accent-foreground shadow-accent/20' 
                : 'bg-white border-muted/20 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5'
            }`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* ── CANAIS DE CONTATO RÁPIDO PARA ALUNOS ── */}
      {!isStaffUser && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Docente", desc: "Fale diretamente com seu professor de referência.", icon: GraduationCap, color: "bg-blue-50 border-blue-100 text-blue-700" },
            { title: "Bolsas", desc: "Tire dúvidas sobre processos e requisitos de bolsas.", icon: ShieldCheck, color: "bg-amber-50 border-amber-100 text-amber-700" },
            { title: "Apoio Psicopedagógico", desc: "Suporte emocional e pedagógico especializado.", icon: User, color: "bg-green-50 border-green-100 text-green-700" },
          ].map((canal) => (
            <div key={canal.title} className={`flex items-start gap-4 p-5 rounded-2xl border ${canal.color} shadow-sm transition-all hover:scale-102`}>
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

      {/* ── LISTAGEM DE CONTATOS (GRID DE CARDS STITCH STYLE) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pt-2">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Sintonizando Rede de Mentores...</p>
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => {
            const unreadCount = unreadMessages[contact.id] || 0;
            const hasUnread = unreadCount > 0;
            return (
              <Card 
                key={contact.id} 
                className={`gradient-border relative overflow-hidden flex flex-col shadow-xl rounded-[2.5rem] bg-white transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-transparent ${
                  hasUnread ? 'glow-orange-strong bg-gradient-to-br from-orange-500/5 via-white to-white' : ''
                }`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                <CardContent className="p-8 flex flex-col items-center text-center space-y-5 flex-grow">
                  <div className="relative">
                    <Avatar className={`h-20 w-20 md:h-24 md:w-24 border-[4px] shadow-2xl transition-all ${
                      hasUnread ? 'border-orange-500 animate-pulse-subtle' : 'border-primary/5'
                    }`}>
                      <AvatarImage src={`https://picsum.photos/seed/${contact.id}/200/200`} className="object-cover" />
                      <AvatarFallback className="bg-primary text-white font-black text-2xl italic">{contact.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    {hasUnread ? (
                      <div className="absolute -top-1 -right-1 h-7 w-7 bg-red-500 text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg animate-bounce border-2 border-white">
                        {unreadCount}
                      </div>
                    ) : (
                      <div className="absolute bottom-0 right-0 h-5 w-5 bg-green-500 rounded-full border-4 border-white shadow-xl ring-1 ring-black/5 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="space-y-2 w-full flex-grow">
                    <CardTitle className="text-lg md:text-xl font-black text-primary leading-tight truncate px-2 italic">{contact.name}</CardTitle>
                    <div className="flex flex-col gap-2 items-center">
                      <div className="flex flex-col items-center justify-center gap-1.5 text-accent font-black text-[9px] uppercase tracking-widest mt-1">
                        <div className="flex items-center gap-1 opacity-80">
                          <MapPin className="h-3 w-3" />
                          <span>{contact.institution || "Rede Geral"}</span>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 border-none text-primary/40 font-black text-[8px] px-3 h-5 uppercase tracking-widest leading-none flex items-center justify-center mt-1">
                          <GraduationCap className="h-2.5 w-2.5 mr-1 text-accent" />
                          {contact.profile_type === 'teacher' ? (contact.course || 'DOCENTE') : (contact.exam_target || 'ENEM')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full btn-shimmer bg-primary text-white hover:bg-primary/95 font-black h-12 rounded-xl shadow-xl transition-all active:scale-95 border-none text-xs uppercase tracking-wider" asChild>
                    <Link href={`/dashboard/chat/${contact.id}`}>
                      {isStaffUser ? "Enviar Mensagem" : "Abrir Mentoria"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-24 text-center border-4 border-dashed rounded-[3.5rem] bg-white/50 opacity-30 animate-in zoom-in-95">
            <User className="h-20 w-20 mx-auto mb-6 text-primary/20" />
            <p className="font-black italic text-2xl text-primary uppercase">Ninguém localizado por aqui</p>
            <p className="text-sm font-medium italic mt-2">Use a barra de pesquisa ou mude os filtros acima.</p>
          </div>
        )}
      </div>
    </div>
  );
}