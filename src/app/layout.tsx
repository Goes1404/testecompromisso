import { AuthProvider } from '@/lib/AuthProvider';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import { ClientWrapper } from '@/components/ClientWrapper';
import { Suspense } from 'react';
import { LoadingShell } from '@/components/LoadingShell';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Compromisso | Curso Preparatório ENEM e ETEC em Santana de Parnaíba',
  description: 'O cursinho preparatório de elite em Santana de Parnaíba. Metodologia focada, simulados, correção de redação com IA e mentoria para aprovação no ENEM, ETEC, FATEC e USP.',
  keywords: 'curso preparatório, cursinho enem, pre vestibulinho etec, santana de parnaíba, aprovação, redação enem',
  appleWebApp: {
    capable: true,
    title: "Compromisso",
    statusBarStyle: "black-translucent"
  }
};

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} font-sans`}>
      <body className="antialiased min-h-screen bg-background">
        <AuthProvider>
          <Suspense fallback={<LoadingShell />}>
            <ClientWrapper>
              {children}
            </ClientWrapper>
          </Suspense>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}