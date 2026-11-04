import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../index.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'VeggieChef – Smarte vegetarische Küche',
  description:
    'Moderne vegetarische & vegane Koch-App mit Gericht des Tages, KI-Zutatentausch, Kühlschrank-Resteverwerter, Wochenplaner, Nährwert-Tracker und interaktivem Kochmodus.',
  openGraph: {
    title: 'VeggieChef – Smarte vegetarische Küche',
    description:
      'Moderne vegetarische & vegane Koch-App mit Gericht des Tages, KI-Zutatentausch, Kühlschrank-Resteverwerter, Wochenplaner, Nährwert-Tracker und interaktivem Kochmodus.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VeggieChef',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F3DDBC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Playfair+Display:ital,wght@0,600..900;1,600..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-[#4A7856]/20 selection:text-[#2D3E40]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
