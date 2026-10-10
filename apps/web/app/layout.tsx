import type { Metadata, Viewport } from 'next';
import './globals.css';

import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'Restaurante Mobile - Pide y Paga desde tu mesa',
  description: 'Aplicación web progresiva móvil para pedir y pagar en restaurantes colombianos',
  applicationName: 'Restaurante PWA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RestoApp',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f59e0b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="flex min-h-full flex-col font-sans antialiased select-none">
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration error:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
