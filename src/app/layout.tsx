import { AuthProvider } from '@/lib/AuthProvider';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Inter, Sora } from 'next/font/google';
import { ClientWrapper } from '@/components/ClientWrapper';
import { Suspense } from 'react';
import { LoadingShell } from '@/components/LoadingShell';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Compromisso | Curso Preparatório ENEM e ETEC em Santana de Parnaíba',
  description: 'O cursinho preparatório de elite em Santana de Parnaíba. Metodologia focada, simulados, correção de redação com IA e mentoria para aprovação no ENEM, ETEC, FATEC e USP.',
  keywords: 'curso preparatório, cursinho enem, pre vestibulinho etec, santana de parnaíba, aprovação, redação enem',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: "Compromisso",
    statusBarStyle: "black-translucent"
  }
};

export const viewport = {
  themeColor: '#FF6B00',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${inter.variable} font-sans`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    // Force immediate update check so the fixed SW (no fetch handler)
                    // replaces any broken cached SW as quickly as possible.
                    reg.update().catch(function() {});

                    // When a new SW takes control, reload once to ensure all
                    // in-flight requests go through the updated SW.
                    var reloading = false;
                    navigator.serviceWorker.addEventListener('controllerchange', function() {
                      if (!reloading) { reloading = true; window.location.reload(); }
                    });
                  }).catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-background">
        <AuthProvider>
          <Suspense fallback={<LoadingShell />}>
            <ClientWrapper>
              {children}
            </ClientWrapper>
          </Suspense>
          <Toaster />
          <SpeedInsights />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}