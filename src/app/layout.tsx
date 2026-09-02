import { AuthProvider } from '@/lib/AuthProvider';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Sora } from 'next/font/google';
import { ClientWrapper } from '@/components/ClientWrapper';
import { Suspense } from 'react';
import { LoadingShell } from '@/components/LoadingShell';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

// Sora é a única fonte de fato renderizada (sempre 1ª no stack `sans`). Inter
// era carregada mas nunca pintava — removida (4 woff2 a menos). Pesos alinhados
// ao uso: 300 (light) tinha 0 usos e saiu. 800 é o mais pesado que o Sora
// oferece (não existe 900), então `font-black` sintetiza a partir dele.
const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Compromisso | Curso Preparatório ENEM e ETEC em Santana de Parnaíba',
  description: 'O cursinho preparatório de elite em Santana de Parnaíba. Metodologia focada, simulados, correção de redação com IA e mentoria para aprovação no ENEM, ETEC, FATEC e USP.',
  keywords: 'curso preparatório, cursinho enem, pre vestibulinho etec, santana de parnaíba, aprovação, redação enem',
  // manifest gerado por src/app/manifest.ts (/manifest.webmanifest). Não
  // declarar aqui também — evita <link rel="manifest"> duplicado.
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    // O iPhone tira o ícone da tela de início DAQUI, não do manifesto. Sem
    // esta linha ele usa uma miniatura da página — o aluno instala e fica com
    // um retângulo borrado no lugar do logo, o que faz parecer que deu errado.
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: "Compromisso",
    // Era "black-translucent": no iPhone isso faz o conteúdo subir para trás
    // da barra de status, e o topo da tela fica ilegível sobre o fundo claro.
    statusBarStyle: "default"
  }
};

export const viewport = {
  // O laranja fluorescente pintava a barra do navegador e a faixa que aparece
  // ao puxar a pagina para baixo — no celular era um bloco de cor gritante
  // acima do conteudo. O grafite e o mesmo fundo das telas escuras do produto,
  // entao a barra passa a continuar a pagina em vez de brigar com ela.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
    { media: '(prefers-color-scheme: light)', color: '#0a0a0c' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sora.variable} font-sans`}>
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
              // O sw.js so trata push e notificationclick — nao tem handler de
              // fetch, entao nenhuma requisicao da pagina passa por ele. O
              // recarregamento que existia aqui, disparado por
              // 'controllerchange', nao tinha o que corrigir e criava um laco:
              // install faz skipWaiting, activate faz clients.claim, o claim
              // dispara controllerchange na pagina que ainda nao tinha
              // controlador, e o listener recarregava. Medido: 4 navegacoes na
              // primeira visita e 1 recarga extra em toda carga seguinte — era
              // o "fica carregando infinito, so volta com F5".
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
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