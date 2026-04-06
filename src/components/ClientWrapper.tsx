'use client';

import { usePathname } from 'next/navigation';
import { AccessibilityWidget } from './AccessibilityWidget';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthOrHome = ['/', '/login', '/register'].includes(pathname || '');

  return (
    <div className="animate-in fade-in duration-700 w-full min-h-screen">
      {children}
      {!isAuthOrHome && <AccessibilityWidget />}
    </div>
  );
}
