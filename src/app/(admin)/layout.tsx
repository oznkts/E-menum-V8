import { redirect } from 'next/navigation'
import { checkSuperadmin } from '@/lib/actions/admin'

/**
 * Admin Layout
 *
 * Protects all admin routes - requires superadmin role.
 * Redirects to dashboard if user is not a superadmin.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isSuperadmin = await checkSuperadmin()
  if (!isSuperadmin) {
    redirect('/dashboard')
  }

  return <>{children}</>
}

