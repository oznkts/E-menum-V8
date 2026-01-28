import type { Metadata, Viewport } from 'next'

import '@/styles/globals.css'

import { QueryProvider } from '@/components/providers/query-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { PwaProvider } from '@/components/providers/pwa-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: {
    default: 'E-Menum | Dijital QR Menü ve Fiyat Defteri',
    template: '%s | E-Menum',
  },
  description:
    'E-Menum - Restoranlar ve kafeler için dijital QR menü, sipariş sistemi ve fiyat takip platformu. Türkiye\'nin lider QR menü çözümü.',
  keywords: [
    'QR menü',
    'dijital menü',
    'restoran menü',
    'kafe menü',
    'fiyat defteri',
    'sipariş sistemi',
    'garson çağırma',
    'menü yönetimi',
  ],
  authors: [{ name: 'E-Menum' }],
  creator: 'E-Menum',
  publisher: 'E-Menum',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'E-Menum',
    title: 'E-Menum | Dijital QR Menü ve Fiyat Defteri',
    description:
      'Restoranlar ve kafeler için dijital QR menü, sipariş sistemi ve fiyat takip platformu.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'E-Menum | Dijital QR Menü ve Fiyat Defteri',
    description:
      'Restoranlar ve kafeler için dijital QR menü, sipariş sistemi ve fiyat takip platformu.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

/**
 * Inline script to prevent FOUC (Flash of Unstyled Content)
 * Applies theme and accessibility settings before first paint
 * Settings are stored in localStorage under 'accessibility-settings'
 */
function AccessibilityScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('accessibility-settings');
        if (stored) {
          var parsed = JSON.parse(stored);
          var settings = parsed.state ? parsed.state.settings : parsed;
          var root = document.documentElement;

          // Apply theme (light/dark/system)
          if (settings.theme) {
            if (settings.theme === 'system') {
              var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              root.dataset.theme = isDark ? 'dark' : 'light';
              root.classList.toggle('dark', isDark);
            } else {
              root.dataset.theme = settings.theme;
              root.classList.toggle('dark', settings.theme === 'dark');
            }
          }

          // Apply font size
          if (settings.fontSize) {
            root.dataset.fontSize = settings.fontSize;
          }

          // Apply contrast
          if (settings.contrast) {
            root.dataset.contrast = settings.contrast;
          }

          // Apply color blind mode
          if (settings.colorBlindMode && settings.colorBlindMode !== 'none') {
            root.dataset.colorBlind = settings.colorBlindMode;
          }

          // Apply reduced motion
          if (settings.reduceMotion) {
            root.dataset.reduceMotion = 'true';
          }
        } else {
          // Default: Respect system preference
          var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', isDark);
          document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        }
      } catch (e) {
        // Fallback to system preference on error
        var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
      }
    })();
  `

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <AccessibilityScript />
        {/* PWA Apple-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="E-Menum" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="min-h-screen min-h-dvh bg-background font-sans antialiased">
        <ThemeProvider defaultTheme="system" enableSystem>
          <QueryProvider>
            <PwaProvider />
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
