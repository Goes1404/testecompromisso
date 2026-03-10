"use client";

import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarTrigger, SidebarInset, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Home, Compass, BookOpen, Video, Library, LogOut, Bell, LayoutDashboard, ClipboardList, BarChart3, MessageSquare, MessagesSquare, MonitorPlay, Calculator, FileText, Database, Sparkles, ShieldCheck, Users, Settings, Eye, FileCheck, FilePenLine, ShieldAlert, Gavel } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo, memo, useRef, Suspense } from "react";
import { useAuth } from "@/lib/AuthProvider"; 
import Image from "next/image";

const studentItems = [
  { icon: Home, label: "Página Inicial", href: "/dashboard/home" },
  { icon: Compass, label: "Trilhas de Estudo", href: "/dashboard/trails" },
  { icon: FilePenLine, label: "Redação Master", href: "/dashboard/student/essays" },
  { icon: FileText, label: "Simulados", href: "/dashboard/student/simulados" },
  { icon: Video, label: "Aulas ao Vivo", href: "/dashboard/live" },
  { icon: Library, label: "Biblioteca Digital", href: "/dashboard/library" },
  { icon: MessagesSquare, label: "Fóruns de Discussão", href: "/dashboard/forum" },
  { icon: MessageSquare, label: "Chat com Mentores", href: "/dashboard/chat", badge: true },
  { icon: FileCheck, label: "Documentação", href: "/dashboard/student/documents" },
  { icon: Calculator, label: "Simulador de Isenção", href: "/dashboard/financial-aid" },
  { icon: Settings, label: "Configurações", href: "/dashboard/settings" },
];

const teacherItems = [
  { icon: LayoutDashboard, label: "Painel de Gestão", href: "/dashboard/teacher/home" },
  { icon: ClipboardList, label: "Minhas Trilhas", href: "/dashboard/teacher/trails" },
  { icon: Database, label: "Banco de Questões", href: "/dashboard/teacher/questions" },
  { icon: BarChart3, label: "BI & Analytics", href: "/dashboard/teacher/analytics" },
  { icon: Library, label: "Gestão de Biblioteca", href: "/dashboard/teacher/library" },
  { icon: MonitorPlay, label: "Gerenciar Lives", href: "/dashboard/teacher/live" },
  { icon: MessagesSquare, label: "Fórum Pedagógico", href: "/dashboard/forum" },
  { icon: MessageSquare, label: "Chats com Alunos", href: "/dashboard/chat", badge: true },
  { icon: Bell, label: "Mural de Avisos", href: "/dashboard/teacher/communication" },
  { icon: Settings, label: "Configurações", href: "/dashboard/settings" },
];

const adminItems = [
  { icon: ShieldCheck, label: "Gestão 360", href: "/dashboard/admin/home" },
  { icon: Users, label: "Diretório de Usuários", href: "/dashboard/admin/users" },
  { icon: BarChart3, label: "BI & Analytics", href: "/dashboard/teacher/analytics" },
  { icon: Gavel, label: "Moderação de Fórum", href: "/dashboard/admin/forums" },
  { icon: FileCheck, label: "Status de Documentos", href: "/dashboard/admin/checklists" },
  { icon: Eye, label: "Auditoria de Chats", href: "/dashboard/admin/chats" },
  { icon: Database, label: "Gestão de Turmas", href: "/dashboard/admin/students" },
  { icon: ClipboardList, label: "Aprovação de Trilhas", href: "/dashboard/admin/trails" },
  { icon: Bell, label: "Comunicados Globais", href: "/dashboard/teacher/communication" },
  { icon: Settings, label: "Configurações", href: "/dashboard/settings" },
];

function SwipeHandler({ children }: { children: React.ReactNode }) {
  const { setOpenMobile, isMobile, openMobile } = useSidebar();
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.no-swipe, input, textarea, select, [role="slider"], button, audio, video, #youtube-player, .scrollable-content')) return;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (absX > absY * 1.5 && absX > 50) {
      if (!openMobile && deltaX > 50) setOpenMobile(true);
      else if (openMobile && deltaX < -50) setOpenMobile(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 touch-pan-y overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}

const NavMenu = memo(({ items, pathname, unreadCount }: { items: any[], pathname: string, unreadCount: number }) => {
  const { setOpenMobile, isMobile } = useSidebar();
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} className="h-11 rounded-xl data-[active=true]:bg-accent data-[active=true]:text-accent-foreground transition-all duration-200">
            <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)} className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span className="font-bold text-sm">{item.label}</span>
              {unreadCount > 0 && item.badge && (
                <Badge className="ml-auto bg-white/20 text-white text-[8px] h-5 min-w-5 rounded-full animate-in zoom-in">{unreadCount}</Badge>
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
  
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";

  useEffect(() => { setHasHydrated(true); }, []);

  const navItems = useMemo(() => {
    if (userRole === 'admin') return adminItems;
    if (userRole === 'teacher') return teacherItems;
    return studentItems;
  }, [userRole]);

  useEffect(() => {
    if (hasHydrated && !isUserLoading && !user) {
      router.replace("/login");
    }
  }, [user, isUserLoading, router, hasHydrated]);

  const isFullBleedPage = useMemo(() => {
    return pathname.includes('/chat/') || pathname.includes('/forum/') || pathname.includes('/classroom/') || pathname.includes('/live/');
  }, [pathname]);

  if (!hasHydrated || isUserLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-primary gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-[2rem] bg-white/5 flex items-center justify-center shadow-2xl animate-pulse">
          <BookOpen className="h-8 w-8 text-accent" />
        </div>
        <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-accent animate-pulse" />
      </div>
      <h2 className="text-sm font-black text-white italic tracking-tighter uppercase opacity-40">Sincronizando Rede...</h2>
    </div>
  );

  if (!user) return null;

  const userAvatar = profile?.avatar_url || `https://picsum.photos/seed/${user.id}/100/100`;

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="bg-sidebar border-none">
        <SidebarHeader className="p-6">
           <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white p-1.5 shadow-lg">
              <Image 
                src={logoUrl} 
                alt="Logo Santana de Parnaíba" 
                fill 
                unoptimized
                className="object-contain"
                data-ai-hint="city logo"
              />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-lg font-black text-white italic leading-none">Compromisso</span>
              <span className="text-[8px] text-white/40 uppercase tracking-widest font-black">Prefeitura de Santana</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <SidebarGroup>
            <NavMenu items={navItems} pathname={pathname} unreadCount={0} />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-white/5">
           <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => signOut()} className="text-red-400 hover:bg-red-500/10 h-11 rounded-xl">
                <LogOut className="h-4 w-4" />
                <span className="font-bold text-xs">Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background flex flex-col h-screen overflow-hidden bg-tech-blueprint">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-4 md:px-6 shrink-0">
          <SidebarTrigger className="h-9 w-9 rounded-full hover:bg-muted" />
          <div className="flex-1" />
          <Link href="/dashboard/settings" className="flex items-center gap-3 md:gap-4 group hover:opacity-80 transition-all">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-black text-primary italic leading-none group-hover:text-accent transition-colors">{profile?.name || "Usuário"}</span>
              <span className="text-[8px] font-black text-accent uppercase tracking-widest">{userRole.toUpperCase()}</span>
            </div>
            <Avatar className="h-9 w-9 md:h-10 md:w-10 border-2 border-primary/5 shadow-xl group-hover:border-accent transition-all">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-primary text-white text-xs">{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
        </header>
        <SwipeHandler>
          <main className={`flex-1 flex flex-col min-h-0 overflow-y-auto ${isFullBleedPage ? 'p-0' : 'p-4 md:p-8'} bg-edu-pattern`}>
            <div className={isFullBleedPage ? 'flex-1 flex flex-col min-h-0' : 'max-w-7xl mx-auto w-full'}>
              <Suspense fallback={<div className="p-8 opacity-20 animate-pulse"><Sparkles className="h-10 w-10 text-accent" /></div>}>
                {children}
              </Suspense>
            </div>
          </main>
        </SwipeHandler>
      </SidebarInset>
    </SidebarProvider>
  );
}
