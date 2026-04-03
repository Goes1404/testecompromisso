import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Compromisso 360',
    short_name: 'Compromisso',
    description: 'Plataforma educacional de alta performance para aprovação no ENEM e ETEC.',
    start_url: '/dashboard/home',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#FF6B00',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/images/logocompromisso.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/images/logocompromisso.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  }
}
