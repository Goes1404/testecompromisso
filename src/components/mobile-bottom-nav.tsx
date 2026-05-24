"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Zap, BarChart3, User } from "lucide-react";

const TABS = [
  { label: "Início",    icon: Home,     href: "/dashboard/home" },
  { label: "Conteúdo",  icon: BookOpen,  href: "/dashboard/trails" },
  { label: "Praticar",  icon: Zap,       href: "/dashboard/student/simulados" },
  { label: "Progresso", icon: BarChart3, href: "/dashboard/student/performance" },
  { label: "Eu",        icon: User,      href: "/dashboard/settings" },
];

function isTabActive(href: string, pathname: string) {
  if (href === "/dashboard/home") return pathname === href;
  return pathname.startsWith(href);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch h-16">
        {TABS.map((tab) => {
          const active = isTabActive(tab.href, pathname ?? "");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-150 active:scale-95 ${
                active ? "text-violet-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {/* top indicator bar */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-violet-600 transition-all duration-200 ${
                  active ? "w-8 opacity-100" : "w-0 opacity-0"
                }`}
              />
              <tab.icon
                className={`transition-transform duration-150 ${
                  active ? "h-5 w-5 scale-110" : "h-5 w-5 scale-100"
                }`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-bold leading-none transition-colors duration-150 ${
                  active ? "text-violet-600" : "text-slate-400"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
