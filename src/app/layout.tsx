import { AuthProvider } from '@/lib/AuthProvider';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import { ClientWrapper } from '@/components/ClientWrapper';
import { Suspense } from 'react';
import { BookOpen } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Compromisso | Educação Inteligente',
  description: 'Tecnologia a serviço da aprovação em Santana de Parnaíba.',
};

function LoadingShell() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-primary gap-6 overflow-hidden relative">
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
          <BookOpen className="h-8 w-8 text-accent" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Compromisso</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Sintonizando Rede Industrial</p>
        </div>
      </div>
    </div>
  );
}

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