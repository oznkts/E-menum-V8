'use client'

import Link from 'next/link'

/**
 * Restaurant Not Found Page
 *
 * Displayed when a restaurant slug doesn't exist or is inactive.
 * Provides user-friendly messaging and navigation options.
 */
export default function RestaurantNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      {/* Icon */}
      <div className="rounded-full bg-muted p-6">
        <svg
          className="h-16 w-16 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Content */}
      <h1 className="mt-6 text-2xl font-bold text-foreground">
        Restoran Bulunamadı
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        Aradığınız restoran mevcut değil veya artık aktif değil.
        Lütfen QR kodunu tekrar taratın veya restoran yöneticisiyle iletişime geçin.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Ana Sayfaya Git
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Geri Dön
        </button>
      </div>

      {/* E-Menum Link */}
      <p className="mt-12 text-xs text-muted-foreground">
        Kendi dijital menünüzü oluşturmak için{' '}
        <a
          href="https://e-menum.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary-600 hover:underline"
        >
          E-Menum
        </a>
        &apos;u deneyin.
      </p>
    </div>
  )
}
