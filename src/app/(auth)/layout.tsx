import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Giriş Yap',
  description: 'E-Menum hesabınıza giriş yapın',
}

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Authentication Layout
 *
 * Provides a centered, mobile-first layout for authentication pages.
 * Includes:
 * - Full viewport height (dynamic viewport for mobile browsers)
 * - Safe area padding for notch devices
 * - Centered content with responsive max-width
 * - Brand logo header
 * - Footer with terms and privacy links
 *
 * @see MOBILE-FIRST-TALIMATNAME-v3.md for design guidelines
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header with logo */}
      <header className="pt-safe flex justify-center pt-8 md:pt-12">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-primary-600 touch-target"
        >
          <svg
            className="h-8 w-8"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect
              x="2"
              y="2"
              width="28"
              height="28"
              rx="6"
              className="fill-primary-600"
            />
            <path
              d="M8 10h16M8 16h12M8 22h8"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <span>E-Menum</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="pb-safe flex flex-col items-center gap-4 px-4 pb-8 text-center text-sm text-muted-foreground">
        <nav className="flex flex-wrap justify-center gap-4">
          <Link
            href="/kullanim-kosullari"
            className="hover:text-foreground transition-colors touch-target inline-flex items-center"
          >
            Kullanım Koşulları
          </Link>
          <span className="text-muted-foreground/50">•</span>
          <Link
            href="/gizlilik-politikasi"
            className="hover:text-foreground transition-colors touch-target inline-flex items-center"
          >
            Gizlilik Politikası
          </Link>
          <span className="text-muted-foreground/50">•</span>
          <Link
            href="/yardim"
            className="hover:text-foreground transition-colors touch-target inline-flex items-center"
          >
            Yardım
          </Link>
        </nav>
        <p>&copy; {new Date().getFullYear()} E-Menum. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  )
}
