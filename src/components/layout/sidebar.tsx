'use client'

/**
 * Sidebar Component
 *
 * Responsive sidebar navigation for the restaurant dashboard.
 * Features:
 * - Collapsible on desktop (persisted via Zustand)
 * - Hidden on mobile (mobile-nav handles mobile navigation)
 * - Dark mode support
 * - Active route highlighting
 * - Touch-friendly targets (44px minimum)
 *
 * @see MOBILE-FIRST-TALIMATNAME-v3.md for design guidelines
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/lib/stores/ui-store'
import { Button } from '@/components/ui/button'
import { OrganizationSwitcher } from '@/components/providers/organization-provider'

// Client-only wrapper to prevent hydration mismatch
function ClientOnlyOrgSwitcher({ isCollapsed }: { isCollapsed: boolean }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Always render the same structure on server and client to prevent hydration mismatch
  return (
    <div className={cn('border-b border-border p-3', isCollapsed && 'p-2')} suppressHydrationWarning>
      {mounted ? (
        <OrganizationSwitcher compact={isCollapsed} showLogo={!isCollapsed} />
      ) : (
        <div className="h-10" />
      )}
    </div>
  )
}

// =============================================================================
// TYPES
// =============================================================================

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string | number
}

interface NavSection {
  title: string
  items: NavItem[]
}

// =============================================================================
// ICONS (Inline SVG for better performance - no external dependencies)
// =============================================================================

function DashboardIcon({ className }: { className?: string }) {
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
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  )
}

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

function CategoryIcon({ className }: { className?: string }) {
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
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  )
}

function ProductIcon({ className }: { className?: string }) {
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
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function QRCodeIcon({ className }: { className?: string }) {
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
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h3v3h-3z" />
    </svg>
  )
}

function TableIcon({ className }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 20v-2M17 20v-2" />
    </svg>
  )
}

function OrderIcon({ className }: { className?: string }) {
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
      <path d="M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z" />
      <path d="M15 3v5h6M7 13h10M7 17h6" />
    </svg>
  )
}

function AnalyticsIcon({ className }: { className?: string }) {
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
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
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
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
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
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

// =============================================================================
// NAVIGATION CONFIG
// =============================================================================

const navSections: NavSection[] = [
  {
    title: 'Genel',
    items: [
      {
        href: '/dashboard',
        label: 'Kontrol Paneli',
        icon: <DashboardIcon className="h-5 w-5" />,
      },
      {
        href: '/dashboard/orders',
        label: 'Siparisler',
        icon: <OrderIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Menü Yönetimi',
    items: [
      {
        href: '/dashboard/categories',
        label: 'Kategoriler',
        icon: <CategoryIcon className="h-5 w-5" />,
      },
      {
        href: '/dashboard/products',
        label: 'Ürünler',
        icon: <ProductIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Restoran',
    items: [
      {
        href: '/dashboard/tables',
        label: 'Masalar',
        icon: <TableIcon className="h-5 w-5" />,
      },
      {
        href: '/dashboard/qr-codes',
        label: 'QR Kodlar',
        icon: <QRCodeIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Raporlar',
    items: [
      {
        href: '/dashboard/analytics',
        label: 'Analitik',
        icon: <AnalyticsIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: 'Ayarlar',
    items: [
      {
        href: '/dashboard/settings',
        label: 'Ayarlar',
        icon: <SettingsIcon className="h-5 w-5" />,
      },
    ],
  },
]

// =============================================================================
// SIDEBAR NAV ITEM COMPONENT
// =============================================================================

interface SidebarNavItemProps {
  item: NavItem
  isCollapsed: boolean
  isActive: boolean
}

function SidebarNavItem({ item, isCollapsed, isActive }: SidebarNavItemProps) {
  return (
    <Link
      href={item.href}
      className={cn(
        // Base styles
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        // Touch target
        'min-h-11',
        // States
        isActive
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        // Collapsed mode
        isCollapsed && 'justify-center px-2'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <span
        className={cn(
          'flex-shrink-0 transition-colors',
          isActive
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-muted-foreground group-hover:text-foreground'
        )}
      >
        {item.icon}
      </span>
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-medium text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

// =============================================================================
// SIDEBAR NAV SECTION COMPONENT
// =============================================================================

interface SidebarNavSectionProps {
  section: NavSection
  isCollapsed: boolean
  pathname: string
}

function SidebarNavSection({ section, isCollapsed, pathname }: SidebarNavSectionProps) {
  return (
    <div className="space-y-1">
      {/* Section title - hidden when collapsed */}
      {!isCollapsed && (
        <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title}
        </h2>
      )}

      {/* Nav items */}
      <nav className="space-y-1">
        {section.items.map((item) => {
          // Check if current route matches this nav item
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <SidebarNavItem
              key={item.href}
              item={item}
              isCollapsed={isCollapsed}
              isActive={isActive}
            />
          )
        })}
      </nav>
    </div>
  )
}

// =============================================================================
// MAIN SIDEBAR COMPONENT
// =============================================================================

export function Sidebar() {
  const pathname = usePathname()
  const { sidebar, setSidebarCollapsed } = useUIStore()
  const { isCollapsed } = sidebar

  return (
    <aside
      className={cn(
        // Base styles
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-all duration-300',
        // Width based on collapsed state
        isCollapsed ? 'w-16' : 'w-64',
        // Hide on mobile (mobile-nav handles mobile)
        'hidden lg:flex'
      )}
      aria-label="Ana navigasyon"
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-border px-4',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2 font-bold text-primary-600 transition-colors hover:text-primary-700',
            isCollapsed && 'justify-center'
          )}
        >
          {/* Logo icon */}
          <svg
            className="h-8 w-8 flex-shrink-0"
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

          {/* Logo text - hidden when collapsed */}
          {!isCollapsed && <span className="text-xl">E-Menum</span>}
        </Link>
      </div>

      {/* Organization Switcher - Client Only */}
      <ClientOnlyOrgSwitcher isCollapsed={isCollapsed} />

      {/* Navigation sections */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <div className={cn('space-y-6', isCollapsed ? 'px-2' : 'px-3')}>
          {navSections.map((section) => (
            <SidebarNavSection
              key={section.title}
              section={section}
              isCollapsed={isCollapsed}
              pathname={pathname}
            />
          ))}
        </div>
      </div>

      {/* Collapse toggle button */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!isCollapsed)}
          className={cn(
            'h-10 w-full justify-center',
            !isCollapsed && 'justify-end'
          )}
          aria-label={isCollapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar
