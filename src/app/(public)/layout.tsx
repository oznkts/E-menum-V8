import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Menü',
    template: '%s | E-Menum',
  },
  description: 'Dijital menü - E-Menum ile sipariş verin',
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

interface PublicLayoutProps {
  children: React.ReactNode
}

/**
 * Public Layout
 *
 * Minimal layout for public-facing pages (customer menu, QR pages).
 * Optimized for mobile performance with:
 * - Minimal chrome for maximum content visibility
 * - Safe area handling for notched devices
 * - Touch-optimized interactions
 *
 * @see MOBILE-FIRST-TALIMATNAME-v3.md for mobile design guidelines
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-dvh bg-background">
      {/* Main content with safe area padding */}
      <main className="relative pb-safe">
        {children}
      </main>
    </div>
  )
}
