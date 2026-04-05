
"use client";

import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarTrigger, SidebarInset, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Home, Compass, BookOpen, Video, Library, LogOut, Bell, LayoutDashboard, ClipboardList, BarChart3, MessageSquare, MessagesSquare, MonitorPlay, Calculator, FileText, Database, Sparkles, ShieldCheck, Users, Settings, Eye, FileCheck, FilePenLine, ShieldAlert, Gavel, AlertCircle, HelpCircle, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo, memo, useRef, Suspense } from "react";
import { useAuth } from "@/lib/AuthProvider"; 
import { supabase } from "@/app/lib/supabase";
import Image from "next/image";
import { OnboardingTour } from "@/components/OnboardingTour";
import { LoadingShell } from "@/components/LoadingShell";
import { NotificationBell } from "@/components/NotificationBell";
import { UrgentNotice } from "@/components/UrgentNotice";
import { useTimeTracker } from "@/hooks/useTimeTracker";

const studentItems = [
  { icon: Home, label: "Meu Painel", href: "/dashboard/home", id: "nav-home" },
  { icon: Compass, label: "Assistir Aulas", href: "/dashboard/trails", id: "nav-trails" },
  { icon: BookOpen, label: "Biblioteca", href: "/dashboard/library", id: "nav-library" },
  { icon: FilePenLine, label: "Treinar Redação", href: "/dashboard/student/essays", id: "nav-essays" },
  { icon: FileText, label: "Fazer Simulados", href: "/dashboard/student/simulados", id: "nav-simulados" },
  { icon: Video, label: "Aulas ao Vivo", href: "/dashboard/live", id: "nav-live" },
  { icon: MessagesSquare, label: "Comunidade", href: "/dashboard/forum", id: "nav-forum" },
  { icon: MessageSquare, label: "Tirar Dúvidas", href: "/dashboard/chat", badge: true, id: "nav-chat" },
  { icon: FileCheck, label: "Meus Documentos", href: "/dashboard/student/documents", id: "nav-documents" },
  { icon: Settings, label: "Meu Perfil", href: "/dashboard/settings", id: "nav-settings" },
];

const teacherItems = [
  { icon: LayoutDashboard, label: "Painel de Gestão", href: "/dashboard/teacher/home", id: "nav-teacher-home" },
  { icon: BookOpen, label: "Gestão de Apostilas", href: "/dashboard/teacher/library", id: "nav-teacher-library" },
  { icon: ClipboardList, label: "Minhas Trilhas", href: "/dashboard/teacher/trails", id: "nav-teacher-trails" },
  { icon: Database, label: "Banco de Questões", href: "/dashboard/teacher/questions", id: "nav-teacher-questions" },
  { icon: FilePenLine, label: "Correção de Redações", href: "/dashboard/teacher/essays", id: "nav-teacher-essays" },
  { icon: BarChart3, label: "BI & Analytics", href: "/dashboard/teacher/analytics", id: "nav-teacher-analytics" },
  { icon: MonitorPlay, label: "Gerenciar Lives", href: "/dashboard/teacher/live", id: "nav-teacher-live" },
  { icon: MessagesSquare, label: "Fórum Pedagógico", href: "/dashboard/forum", id: "nav-teacher-forum" },
  { icon: MessageSquare, label: "Chats com Alunos", href: "/dashboard/chat", badge: true, id: "nav-teacher-chat" },
  { icon: Bell, label: "Mural de Avisos", href: "/dashboard/teacher/communication", id: "nav-teacher-communication" },
  { icon: HelpCircle, label: "Central de Ajuda", href: "/dashboard/teacher/help", id: "nav-teacher-help" },
  { icon: Settings, label: "Configurações", href: "/dashboard/settings", id: "nav-teacher-settings" },
];

const adminItems = [
  { icon: ShieldCheck, label: "Gestão 360", href: "/dashboard/admin/home" },
  { icon: Users, label: "Diretório de Usuários", href: "/dashboard/admin/users" },
  { icon: BarChart3, label: "BI & Analytics", href: "/dashboard/teacher/analytics" },
  { icon: Gavel, label: "Moderação de Fórum", href: "/dashboard/admin/forums" },
  { icon: FileCheck, label: "Status de Documentos", href: "/dashboard/admin/checklists" },
  { icon: Eye, label: "Auditoria de Chats", href: "/dashboard/admin/chats" },
  { icon: Database, label: "Gestão de Turmas", href: "/dashboard/admin/students" },
  { icon: AlertCircle, label: "Alunos em Risco/Gestão", href: "/dashboard/teacher/students" },
  { icon: ClipboardList, label: "Aprovação de Trilhas", href: "/dashboard/admin/trails" },
  { icon: Bell, label: "Comunicados Globais", href: "/dashboard/teacher/communication" },
  { icon: Settings, label: "Configurações", href: "/dashboard/settings" },
];


const NavMenu = memo(({ items, pathname, unreadCount }: { items: any[], pathname: string, unreadCount: number }) => {
  const { setOpenMobile, isMobile } = useSidebar();

  const isItemActive = (itemHref: string) => {
    if (pathname === itemHref) return true;
    if (pathname.startsWith(itemHref + '/')) return true;
    
    if (itemHref === '/dashboard/trails' && pathname.startsWith('/dashboard/classroom/')) return true;
    if (itemHref === '/dashboard/library' && pathname.startsWith('/dashboard/library/book/')) return true;
    
    return false;
  };

  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton asChild isActive={isItemActive(item.href)} tooltip={item.label} className="h-11 rounded-lg data-[active=true]:bg-accent data-[active=true]:text-accent-foreground transition-all duration-200">
            <Link id={item.id} href={item.href} onClick={() => isMobile && setOpenMobile(false)} className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span className="font-bold text-sm">{item.label}</span>
              {unreadCount > 0 && item.badge && (
                <Badge className="ml-auto bg-accent text-accent-foreground text-[10px] font-black h-5 min-w-5 rounded-full animate-in zoom-in">{unreadCount}</Badge>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
});
NavMenu.displayName = "NavMenu";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, userRole, loading: isUserLoading, signOut } = useAuth();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const logoUrl = "/images/logocompromisso.png";
  const cityLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";

  useTimeTracker(user?.id);

  useEffect(() => { setHasHydrated(true); }, []);

  // Monitoramento de mensagens não lidas
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      
      if (!error) setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('unread_sidebar')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navItems = useMemo(() => {
    if (userRole === 'admin') return adminItems;
    if (userRole === 'teacher') return teacherItems;
    return studentItems;
  }, [userRole]);

  useEffect(() => {
    if (hasHydrated && !isUserLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.user_metadata?.must_change_password && pathname !== "/dashboard/first-access") {
        // Força primeiro acesso se a flag estiver ativa
        window.location.assign("/dashboard/first-access");
      }
    }
  }, [user, isUserLoading, router, hasHydrated, pathname]);

  const isFullBleedPage = useMemo(() => {
    return pathname.includes('/chat/') || pathname.includes('/forum/') || pathname.includes('/classroom/') || pathname.includes('/live/') || pathname.includes('/library/book/');
  }, [pathname]);

  if (!hasHydrated || isUserLoading) return <LoadingShell />;

  if (!user) return null;

  const userAvatar = profile?.avatar_url || `https://picsum.photos/seed/${user.id}/100/100`;

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="bg-sidebar border-none">
        <SidebarHeader className="p-6">
           <div id="sidebar-logo" className="flex items-center gap-4">
            <div className="relative h-10 w-40 overflow-hidden rounded-full">
                <Image 
                  src="/images/logocompromisso.png" 
                  alt="Logo Compromisso" 
                  fill 
                  className="object-contain" 
                  unoptimized 
                />
              </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-lg font-black text-white italic leading-none">Compromisso</span>
              <span className="text-[8px] text-white/40 uppercase tracking-widest font-black">Ensino de Elite</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <SidebarGroup>
            <NavMenu items={navItems} pathname={pathname || ''} unreadCount={unreadCount} />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-white/5 space-y-4">
           <div className="flex flex-col gap-3 px-2 py-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <div className="relative h-6 w-6 shrink-0 bg-white rounded-md p-0.5">
                  <Image src={cityLogoUrl} alt="Logo Prefeitura" fill className="object-contain" unoptimized />
                </div>
                <span className="text-[7px] font-black text-white/60 uppercase tracking-widest leading-tight">Plataforma Patrocinada pela Prefeitura</span>
              </div>
           </div>
           
           <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => signOut()} className="text-red-400 hover:bg-red-500/10 h-11 rounded-lg">
                <LogOut className="h-4 w-4" />
                <span className="font-bold text-xs">Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background flex flex-col h-screen overflow-hidden relative">
        {/* Animated Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-4 md:px-6 shrink-0 print:hidden">
          <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-muted text-primary">
            <Menu className="h-6 w-6" />
          </SidebarTrigger>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link id="header-profile" href="/dashboard/settings" className="flex items-center gap-3 md:gap-4 group hover:opacity-80 transition-all ml-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-black text-primary italic leading-none group-hover:text-accent transition-colors">
                  {profile?.name 
                    ? (profile.name.trim().split(' ').length > 1 
                        ? `${profile.name.trim().split(' ')[0]} ${profile.name.trim().split(' ').pop()}` 
                        : profile.name)
                    : "Usuário"}
                </span>
                <span className="text-[8px] font-black text-accent uppercase tracking-widest">{userRole.toUpperCase()}</span>
              </div>
              <Avatar className="h-9 w-9 md:h-10 md:w-10 border-2 border-primary/5 shadow-xl group-hover:border-accent transition-all">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-primary text-white text-xs">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>
        <main className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${isFullBleedPage ? 'p-0' : 'p-4 md:p-8'}`}>
          <div className={isFullBleedPage ? 'flex-1 flex flex-col min-h-0' : 'max-w-7xl mx-auto w-full'}>
            <Suspense fallback={<div className="p-8 opacity-20 animate-pulse"><Sparkles className="h-10 w-10 text-accent" /></div>}>
              {children}
            </Suspense>
          </div>
        </main>
        <OnboardingTour />
        <UrgentNotice />
      </SidebarInset>
    </SidebarProvider>
  );
}
