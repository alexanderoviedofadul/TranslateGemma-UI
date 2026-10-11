import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://translate.cedula360.tech'),
  title: 'TranslateGemma — Traducción en este servidor, de una orilla a otra',
  description:
    'Traduzca texto e imágenes entre 53 idiomas con el modelo abierto TranslateGemma, ejecutado con Ollama en este servidor: el texto no se envía a ningún proveedor de IA. En alianza con Cédula 360.',
  keywords: ['traducción', 'TranslateGemma', 'Ollama', 'modelo abierto', 'privacidad', 'Cédula 360'],
  authors: [{ name: 'Alexander Oviedo Fadul' }],
  icons: {
    icon: [
      { url: '/marca/logos/tg-simbolo.svg', type: 'image/svg+xml' },
      { url: '/marca/logos/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/marca/logos/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'TranslateGemma · De una orilla a otra',
    description: 'Traducción entre 53 idiomas con un modelo abierto que corre en este servidor. En alianza con Cédula 360.',
    type: 'website',
    url: 'https://translate.cedula360.tech',
    locale: 'es_CO',
    images: [{ url: '/marca/og-v1.png', width: 1200, height: 630, alt: 'TranslateGemma: de una orilla a otra' }],
  },
  twitter: { card: 'summary_large_image', images: ['/marca/og-v1.png'] },
};

export const viewport: Viewport = {
  themeColor: '#0F766E',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
