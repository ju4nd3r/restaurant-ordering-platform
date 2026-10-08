import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Restaurante Mobile Order & Pay',
    short_name: 'RestoApp',
    description: 'Pide desde tu mesa, paga con Wompi y divide la cuenta fácilmente',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#f59e0b',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
