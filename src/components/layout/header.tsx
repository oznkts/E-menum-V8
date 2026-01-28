'use client'

/**
 * Header Component
 *
 * Responsive header for the restaurant dashboard.
 * Features:
 * - Mobile hamburger menu toggle
 * - User menu with profile and logout
 * - Theme toggle (dark/light mode)
 * - Notification bell (placeholder)
 * - Search (placeholder)
 *
 * @see MOBILE-FIRST-TALIMATNAME-v3.md for design guidelines
 */

import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/lib/stores/ui-store'
import { useTheme } from '@/components/providers/theme-provider'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { OrganizationSwitcher } from '@/components/providers/organization-provider'

// =============================================================================
// ICONS
// =============================================================================

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
    </svg>
  )
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// =============================================================================
// THEME TOGGLE COMPONENT
// =============================================================================

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only show theme toggle after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const cycleTheme = useCallback(() => {
    // Cycle through: system -> light -> dark -> system
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }, [theme, setTheme])

  // Use a fixed label during SSR to prevent hydration mismatch
  const label = mounted ? 'Tema değiştir' : 'Tema değiştir'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="h-10 w-10"
      aria-label={label}
    >
      {/* Show sun icon in dark mode, moon icon in light mode */}
      <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Tema değiştir</span>
    </Button>
  )
}

// =============================================================================
// USER MENU COMPONENT
// =============================================================================

function UserMenu() {
  const { user, profile, signOut, isLoading } = useAuth()
  const { openModal } = useUIStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    await signOut()
    // Redirect will be handled by middleware
    window.location.href = '/login'
  }, [signOut])

  if (isLoading) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
    )
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="outline" size="sm">
          Giriş Yap
        </Button>
      </Link>
    )
  }

  // Get user initials for avatar
  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center gap-2 p-1.5 pr-3"
        onClick={() => {
          openModal('user-menu')
          setIsMenuOpen((prev) => !prev)
        }}
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
        aria-label="Kullanıcı menüsü"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
          {initials}
        </div>

        {/* Name/email - hidden on small screens */}
        <span className="hidden max-w-32 truncate text-sm font-medium md:block">
          {profile?.full_name ?? user.email?.split('@')[0]}
        </span>

        <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
      </Button>

      {isMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Kullanıcı menüsü kapat"
          />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-border bg-popover p-3 text-sm shadow-lg">
            <div className="space-y-1">
              <p className="font-medium">
                {profile?.full_name ?? user.email?.split('@')[0] ?? 'Kullanıcı'}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="my-3 h-px bg-border" />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={handleSignOut}
            >
              <LogOutIcon className="h-4 w-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// MAIN HEADER COMPONENT
// =============================================================================

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const { isMobileMenuOpen, setMobileMenuOpen, sidebar } = useUIStore()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-16 items-center border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80',
        className
      )}
    >
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        {/* Left side: Mobile menu button + Logo (mobile only) */}
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle - visible only on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 lg:hidden"
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          >
            {isMobileMenuOpen ? (
              <XIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </Button>

          {/* Logo - visible only on mobile */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-primary-600 lg:hidden"
          >
            <svg
              className="h-7 w-7"
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
            <span className="text-lg">E-Menum</span>
          </Link>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Organization switcher */}
          <div className="sm:hidden">
            <OrganizationSwitcher compact showLogo={false} className="w-10" />
          </div>
          <div className="hidden sm:block">
            <OrganizationSwitcher className="min-w-[200px]" showLogo />
          </div>

          {/* Separator */}
          <div className="mx-1 h-6 w-px bg-border sm:mx-2" />

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10"
            aria-label="Bildirimler"
          >
            <BellIcon className="h-5 w-5" />
            {/* Notification badge - show when there are notifications */}
            {/* <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" /> */}
          </Button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default Header
