'use client'

/**
 * Dashboard Shell Component
 *
 * Client-side wrapper that manages the dashboard layout state.
 * Handles responsive sidebar margin adjustments based on Zustand state.
 */

import { cn } from '@/lib/utils/cn'
import { useUIStore, useSidebar } from '@/lib/stores/ui-store'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const sidebar = useSidebar()

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col transition-[padding] duration-300',
        // Desktop sidebar margin - adjusts based on collapsed state
        sidebar.isCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}
    >
      {children}
    </div>
  )
}

export default DashboardShell
