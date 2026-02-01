import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { InstallPrompt } from '@/components/InstallPrompt';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'ClearRoute - CNY Road Conditions',
  description: 'Know before you go. Real-time road conditions and plow status for Central New York.',
  keywords: ['road conditions', 'snow', 'plow', 'Syracuse', 'CNY', 'winter driving'],
  authors: [{ name: 'ClearRoute' }],
  openGraph: {
    title: 'ClearRoute - CNY Road Conditions',
    description: 'Real-time road conditions for Central New York',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ClearRoute',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e40af',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased">
        <Providers>
          {children}
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}