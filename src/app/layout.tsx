import { AuthProvider } from '@/lib/AuthProvider';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import { ClientWrapper } from '@/components/ClientWrapper';
import { Suspense } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Compromisso | Educação Inteligente',
  description: 'Tecnologia a serviço da aprovação.',
};

function LoadingShell() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-blue-gradient gap-6 overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Centro_Hist%C3%B3rico_de_Santana_de_Parna%C3%ADba_-_SP.jpg/1280px-Centro_Hist%C3%B3rico_de_Santana_de_Parna%C3%ADba_-_SP.jpg')] bg-cover bg-center grayscale" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-[2.5rem] bg-white/10 flex items-center justify-center animate-pulse shadow-2xl border border-white/20">
            <BookOpen className="h-10 w-10 text-accent" />
          </div>
          <Sparkles className="absolute -top-3 -right-3 h-8 w-8 text-accent animate-bounce" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Compromisso</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 animate-pulse">Sintonizando Rede Industrial</p>
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