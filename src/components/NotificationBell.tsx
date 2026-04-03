"use client";

import { useEffect, useState } from "react";
import { 
  Bell, 
  Megaphone, 
  AlertOctagon, 
  Info, 
  ChevronRight,
  Sparkles,
  Loader2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationBell() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    async function fetchAnnouncements() {
      setLoading(true);
      try {
        // Buscar avisos relevantes (Gerais ou específicos do Polo)
        const userInstitution = profile?.institution?.toLowerCase() || 'geral';
        
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .or(`target_polo.ilike.%${userInstitution}%,target_polo.eq.Todos,target_polo.is.null`)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setAnnouncements(data || []);
        
        // Simulação de "Não Lidos" baseada no localStorage para este ambiente demo
        // Em um sistema real, teríamos uma tabela de 'notifications_read'
        const lastRead = localStorage.getItem('last_announcement_read');
        if (data && data.length > 0) {
          const latestId = data[0].id;
          if (lastRead !== latestId) {
            setUnreadCount(1); // Simplificado: 1 se houver algo novo desde a última visualização
          }
        }
      } catch (err) {
        console.error("Erro ao carregar notificações:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();

    // Realtime para novos avisos
    const channel = supabase
      .channel('global_announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const handleOpenChange = (open: boolean) => {
    if (open && announcements.length > 0) {
      localStorage.setItem('last_announcement_read', announcements[0].id);
      setUnreadCount(0);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertOctagon className="h-4 w-4 text-red-500" />;
      case 'medium': return <Megaphone className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-primary/5 transition-all">
          <Bell className="h-5 w-5 text-primary/60 group-hover:text-primary" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center bg-accent text-accent-foreground border-2 border-white text-[8px] font-black animate-bounce">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] md:w-[380px] rounded-[2rem] border-none shadow-2xl p-4 bg-white animate-in zoom-in-95 duration-200">
        <DropdownMenuLabel className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-black text-primary italic uppercase tracking-tighter">Central de Avisos</span>
            </div>
            {unreadCount > 0 && <Badge variant="secondary" className="text-[8px] font-black bg-accent/10 text-accent uppercase border-none">Novidade</Badge>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-muted/50 mx-2" />
        
        <div className="max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-accent/40" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Sincronizando...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-10 text-center opacity-40">
              <p className="text-xs font-medium italic">Nenhum comunicado recente.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <DropdownMenuItem key={ann.id} asChild className="focus:bg-transparent p-0 mb-2">
                <Link 
                  href={profile?.profile_type === 'teacher' ? "/dashboard/teacher/communication" : "/dashboard/home"} 
                  className="flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/30 transition-all group border border-transparent hover:border-muted cursor-pointer"
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
                    ann.priority === 'high' ? 'bg-red-50' : ann.priority === 'medium' ? 'bg-amber-50' : 'bg-blue-50'
                  }`}>
                    {getPriorityIcon(ann.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[8px] font-black uppercase tracking-widest ${
                        ann.priority === 'high' ? 'text-red-600' : ann.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                        {ann.priority === 'high' ? 'Urgente' : ann.priority === 'medium' ? 'Importante' : 'Informativo'}
                      </span>
                      <span className="text-[8px] font-bold text-muted-foreground italic">
                        {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs font-black text-primary truncate leading-tight italic">{ann.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1 font-medium italic">{ann.message}</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator className="bg-muted/50 mx-2" />
        <div className="p-2">
          <Button asChild variant="ghost" className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-accent hover:bg-accent/5 transition-all">
            <Link href={profile?.profile_type === 'teacher' ? "/dashboard/teacher/communication" : "/dashboard/home"}>
              Ver todo o histórico <ChevronRight className="h-3 w-3 ml-2" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
