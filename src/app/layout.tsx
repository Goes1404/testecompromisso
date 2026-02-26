import { AuthProvider } from '@/lib/AuthProvider';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import { ClientWrapper } from '@/components/ClientWrapper';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Compromisso | Educação Inteligente',
  description: 'Tecnologia a serviço da aprovação.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <ClientWrapper>
            {children}
          </ClientWrapper>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
