import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { OrganizationProvider } from '@/components/providers/organization-provider'
import { createClient } from '@/lib/supabase/server'
import { checkSuperadmin } from '@/lib/actions/admin'

export const metadata: Metadata = {
  title: {
    default: 'Kontrol Paneli',
    template: '%s | E-Menum Dashboard',
  },
  description: 'E-Menum restoran yönetim paneli',
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * Dashboard Layout
 *
 * Main layout for the authenticated restaurant dashboard area.
 * Includes:
 * - Sidebar navigation (desktop - collapsible)
 * - Header with user menu and notifications
 * - Mobile navigation (slide-out drawer)
 * - Responsive main content area
 *
 * Layout structure:
 * - Desktop: Fixed sidebar on left, header + content on right
 * - Mobile: Full-width header with hamburger, slide-out nav drawer
 *
 * @see MOBILE-FIRST-TALIMATNAME-v3.md for responsive design guidelines
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Server-side auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user is superadmin
  const isSuperadmin = await checkSuperadmin()

  // Superadmin doesn't need organization membership
  if (!isSuperadmin) {
    // Server-side organization check (only for non-superadmin users)
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('organization_id, organizations(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    console.log('[DashboardLayout] User:', user.id, user.email)
    console.log('[DashboardLayout] Memberships:', memberships, 'Error:', error)

    // If no organizations, redirect to onboarding
    if (!memberships || memberships.length === 0) {
      redirect('/onboarding/new-restaurant')
    }
  } else {
    console.log('[DashboardLayout] Superadmin user detected, skipping organization check')
  }

  return (
    <OrganizationProvider>
      <div className="relative min-h-dvh bg-background">
        {/* Desktop Sidebar - hidden on mobile, fixed position */}
        <Sidebar />

        {/* Mobile Navigation - hidden on desktop, overlay drawer */}
        <MobileNav />

        {/* Main content wrapper - uses client component for sidebar state */}
        <DashboardShell>
          {/* Sticky header */}
          <Header />

          {/* Main content area */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-border px-4 py-4 md:px-6 lg:px-8">
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} E-Menum. Tüm hakları saklıdır.
            </p>
          </footer>
        </DashboardShell>
      </div>
    </OrganizationProvider>
  )
}
