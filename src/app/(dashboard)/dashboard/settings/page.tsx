'use client'

/**
 * Settings Main Page
 *
 * Dashboard settings landing page with navigation to different settings sections.
 * Provides a card-based navigation grid for all restaurant settings.
 *
 * Features:
 * - Card-based navigation to settings sections
 * - Role-based visibility for certain sections
 * - Mobile-responsive grid layout
 * - Turkish language UI
 *
 * @route /dashboard/settings
 */

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/lib/hooks/use-organization'

// =============================================================================
// ICONS
// =============================================================================

function ProfileIcon({ className }: { className?: string }) {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function PaletteIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a7.5 7.5 0 0 0 0 15 2.5 2.5 0 0 0 2.5-2.5c0-.624-.462-1.178-.858-1.611C13.27 12.487 13 12.042 13 11.5a1.5 1.5 0 0 1 1.5-1.5h.5A5.5 5.5 0 0 0 12 2z" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
      <circle cx="17" cy="12" r="1" fill="currentColor" />
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
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
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
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

// =============================================================================
// SETTINGS NAV ITEM COMPONENT
// =============================================================================

interface SettingsNavItem {
  href: string
  title: string
  description: string
  icon: React.ReactNode
  badge?: string
  requiredRole?: 'owner' | 'admin' | 'manager'
}

function SettingsCard({ item }: { item: SettingsNavItem }) {
  return (
    <Link href={item.href} className="block">
      <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{item.title}</h3>
              {item.badge && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          </div>
          <svg
            className="h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-1 group-hover:text-primary"
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
        </CardContent>
      </Card>
    </Link>
  )
}

// =============================================================================
// SETTINGS NAVIGATION CONFIG
// =============================================================================

interface SettingsSection {
  title: string
  items: SettingsNavItem[]
}

const settingsSections: SettingsSection[] = [
  {
    title: 'Genel',
    items: [
      {
        href: '/dashboard/settings/profile',
        title: 'Restoran Profili',
        description: 'Restoran adı, açıklaması, iletişim bilgileri ve adres ayarları',
        icon: <ProfileIcon className="h-6 w-6" />,
      },
      {
        href: '/dashboard/settings/appearance',
        title: 'Görünüm',
        description: 'Logo, kapak görseli ve marka renkleri',
        icon: <PaletteIcon className="h-6 w-6" />,
      },
    ],
  },
  {
    title: 'Menü & Sipariş',
    items: [
      {
        href: '/dashboard/settings/menu',
        title: 'Menü Ayarları',
        description: 'Menü görünümü, dil, para birimi ve etiket ayarları',
        icon: <MenuIcon className="h-6 w-6" />,
        badge: 'Yakında',
      },
      {
        href: '/dashboard/settings/tables',
        title: 'Masa Ayarları',
        description: 'Masa bölgeleri, QR kod stili ve masa yapılandırması',
        icon: <TableIcon className="h-6 w-6" />,
      },
    ],
  },
  {
    title: 'Ekip & Güvenlik',
    items: [
      {
        href: '/dashboard/settings/team',
        title: 'Ekip Yönetimi',
        description: 'Ekip üyelerini davet edin ve rollerini yönetin',
        icon: <UsersIcon className="h-6 w-6" />,
        requiredRole: 'owner',
      },
      {
        href: '/dashboard/settings/notifications',
        title: 'Bildirimler',
        description: 'Bildirim tercihleri ve sessiz saatler',
        icon: <BellIcon className="h-6 w-6" />,
      },
    ],
  },
  {
    title: 'Abonelik',
    items: [
      {
        href: '/dashboard/settings/billing',
        title: 'Abonelik & Fatura',
        description: 'Plan detayları, kullanım ve fatura geçmişi',
        icon: <CreditCardIcon className="h-6 w-6" />,
        badge: 'Yakında',
        requiredRole: 'owner',
      },
      {
        href: '/dashboard/settings/legal',
        title: 'Yasal & KVKK',
        description: 'Veri saklama, onay metinleri ve uyumluluk',
        icon: <ShieldIcon className="h-6 w-6" />,
        badge: 'Yakında',
      },
    ],
  },
]

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function SettingsPage() {
  const { currentOrg, currentRole, isLoading } = useOrganization()

  // Filter settings based on user role
  const filteredSections = settingsSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.requiredRole) return true
      if (!currentRole) return false

      const roleHierarchy = ['viewer', 'kitchen', 'staff', 'manager', 'admin', 'owner']
      const userRoleIndex = roleHierarchy.indexOf(currentRole)
      const requiredRoleIndex = roleHierarchy.indexOf(item.requiredRole)

      return userRoleIndex >= requiredRoleIndex
    }),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Ayarlar</h1>
        <p className="mt-1 text-muted-foreground">
          {currentOrg
            ? `${currentOrg.name} restoran ayarlarını yönetin`
            : 'Restoran ayarlarını yönetin'}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="h-12 w-12 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 rounded bg-muted" />
                  <div className="h-4 w-48 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Organization State */}
      {!isLoading && !currentOrg && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <ProfileIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Organizasyon seçilmedi</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Ayarları görüntülemek için bir organizasyon seçmeniz gerekmektedir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Settings Sections */}
      {!isLoading && currentOrg && (
        <div className="space-y-8">
          {filteredSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.items.map((item) => (
                  <SettingsCard key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Organization Info */}
      {currentOrg && (
        <Card className="border-muted bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Aktif Restoran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {currentOrg.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentOrg.logo_url}
                  alt={currentOrg.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
                  {currentOrg.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium">{currentOrg.name}</p>
                <p className="text-sm text-muted-foreground">
                  {currentOrg.subscription_tier === 'lite'
                    ? 'Lite Plan'
                    : currentOrg.subscription_tier === 'gold'
                      ? 'Gold Plan'
                      : currentOrg.subscription_tier === 'platinum'
                        ? 'Platinum Plan'
                        : 'Enterprise Plan'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
