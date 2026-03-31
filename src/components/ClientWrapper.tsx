'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const AccessibilityWidget = dynamic(() => 
  import('@/components/AccessibilityWidget').then(mod => mod.AccessibilityWidget),
  { ssr: false }
);

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = ['/login', '/register', '/'].includes(pathname || '');

  return (
    <div className="animate-in fade-in duration-700 w-full min-h-screen">
      {children}
      {!isAuthPage && (
        <AccessibilityWidget />
      )}
    </div>
  );
}
