"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Megaphone,
  AlertOctagon,
  Info,
  ChevronRight,
  Sparkles,
  Loader2,
  X,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationBell() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedAnn, setSelectedAnn] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchAnnouncements() {
      setLoading(true);
      try {
        let query = supabase.from('announcements').select('*');

        if (profile) {
          const audience = (profile.exam_target || '').toLowerCase().trim();
          const targets = ['all', profile.profile_type, audience, profile.class_id]
            .filter(Boolean)
            .map(t => `target_group.eq.${String(t).replace(/[(),*]/g, '')}`);
          query = query.or(targets.join(','));
        }

        let { data, error } = await query.order('created_at', { ascending: false }).limit(5);

        if (error && (error.code === '42703' || error.message.includes('target_group'))) {
          console.warn("Coluna target_group ausente no Mural. Sincronizando todos os avisos.");
          const fallback = await supabase.from('announcements')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;
        setAnnouncements(data || []);

        const lastRead = localStorage.getItem('last_announcement_read');
        if (data && data.length > 0) {
          const latestId = data[0].id;
          if (lastRead !== latestId) {
            setUnreadCount(1);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar notificações:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();

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
    setDropdownOpen(open);
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

  const getPriorityLabel = (priority: string) => {
    if (priority === 'high') return 'Urgente';
    if (priority === 'medium') return 'Importante';
    return 'Informativo';
  };

  const getPriorityColors = (priority: string) => {
    if (priority === 'high') return { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700 border-red-200' };
    if (priority === 'medium') return { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  const historyHref =
    profile?.profile_type === 'teacher'
      ? '/dashboard/teacher/communication'
      : profile?.role === 'admin' || profile?.role === 'secretary'
        ? '/dashboard/secretary/communication'
        : '/dashboard/home';

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={`relative h-10 w-10 rounded-full hover:bg-primary/5 transition-[transform,box-shadow] ${unreadCount > 0 ? 'glow-orange' : ''}`}>
            <Bell className="h-5 w-5 text-primary/60 group-hover:text-primary" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center bg-accent text-accent-foreground border-2 border-white text-[8px] font-black animate-bounce">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="gradient-border w-[min(320px,calc(100vw-1rem))] md:w-[380px] rounded-[2rem] border-none shadow-2xl p-4 bg-white animate-in zoom-in-95 duration-200">
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
              announcements.map((ann) => {
                const colors = getPriorityColors(ann.priority);
                return (
                  <button
                    key={ann.id}
                    onClick={() => {
                      setDropdownOpen(false);
                      setSelectedAnn(ann);
                    }}
                    className="w-full text-left flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/30 active:bg-muted/50 transition-all group border border-transparent hover:border-muted cursor-pointer mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${colors.bg}`}>
                      {getPriorityIcon(ann.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${colors.text}`}>
                          {getPriorityLabel(ann.priority)}
                        </span>
                        <span className="text-[8px] font-bold text-muted-foreground italic">
                          {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs font-black text-primary truncate leading-tight italic">{ann.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1 font-medium italic">{ann.message}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 self-center group-hover:text-accent transition-colors" />
                  </button>
                );
              })
            )}
          </div>

          <DropdownMenuSeparator className="bg-muted/50 mx-2" />
          <div className="p-2">
            <Button asChild variant="ghost" className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-accent hover:bg-accent/5 transition-all">
              <Link href={historyHref}>
                Ver todo o histórico <ChevronRight className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal com conteúdo completo do aviso */}
      <Dialog open={!!selectedAnn} onOpenChange={(open) => { if (!open) setSelectedAnn(null); }}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl max-w-lg w-[calc(100vw-2rem)] p-0 overflow-hidden">
          {selectedAnn && (() => {
            const colors = getPriorityColors(selectedAnn.priority);
            return (
              <>
                <div className={`${colors.bg} px-8 pt-8 pb-6`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-2xl ${colors.bg} border-2 border-white shadow flex items-center justify-center shrink-0`}>
                        {getPriorityIcon(selectedAnn.priority)}
                      </div>
                      <Badge className={`${colors.badge} font-black text-[9px] uppercase tracking-widest border`}>
                        {getPriorityLabel(selectedAnn.priority)}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-black/10 shrink-0" onClick={() => setSelectedAnn(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <DialogHeader className="mt-4 space-y-1 text-left">
                    <DialogTitle className={`text-lg font-black italic leading-snug ${colors.text}`}>
                      {selectedAnn.title}
                    </DialogTitle>
                    <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(selectedAnn.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </DialogHeader>
                </div>
                <div className="px-8 py-6">
                  <p className="text-sm text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedAnn.message}
                  </p>
                </div>
                <div className="px-8 pb-6">
                  <Button asChild className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest" variant="outline">
                    <Link href={historyHref} onClick={() => setSelectedAnn(null)}>
                      Ver todos os comunicados <ChevronRight className="h-3.5 w-3.5 ml-2" />
                    </Link>
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
