'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Check if current user is a superadmin
 */
export async function checkSuperadmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user) {
      return false
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('system_role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (error || !profile) {
      return false
    }

    return profile.system_role === 'superadmin'
  } catch (error) {
    console.error('Error checking superadmin status:', error)
    return false
  }
}

/**
 * Require superadmin access - redirects if not superadmin
 */
export async function requireSuperadmin() {
  const isSuperadmin = await checkSuperadmin()
  if (!isSuperadmin) {
    redirect('/dashboard')
  }
}

/**
 * Get platform statistics (superadmin only)
 */
export async function getPlatformStats() {
  await requireSuperadmin()

  const adminClient = createAdminClient()

  try {
    // Get all counts
    const [
      { count: orgCount },
      { count: userCount },
      { count: activeOrgCount },
      { count: activeUserCount },
      { count: orderCount },
      { count: todayOrderCount },
    ] = await Promise.all([
      adminClient.from('organizations').select('*', { count: 'exact', head: true }),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }),
      adminClient.from('organizations').select('*', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
      adminClient.from('orders').select('*', { count: 'exact', head: true }),
      adminClient.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ])

    // Get organizations by tier
    const { data: orgsByTier } = await adminClient
      .from('organizations')
      .select('subscription_tier')
      .is('deleted_at', null)

    const tierCounts = {
      lite: 0,
      gold: 0,
      platinum: 0,
      enterprise: 0,
    }

    orgsByTier?.forEach((org) => {
      if (org.subscription_tier && org.subscription_tier in tierCounts) {
        tierCounts[org.subscription_tier as keyof typeof tierCounts]++
      }
    })

    // Get new organizations this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: newThisMonth } = await adminClient
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // Get new users this month
    const { count: newUsersThisMonth } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    return {
      organizations: {
        total: orgCount || 0,
        active: activeOrgCount || 0,
        newThisMonth: newThisMonth || 0,
        byTier: tierCounts,
      },
      users: {
        total: userCount || 0,
        active: activeUserCount || 0,
        newThisMonth: newUsersThisMonth || 0,
      },
      orders: {
        total: orderCount || 0,
        today: todayOrderCount || 0,
      },
    }
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    throw new Error('Platform istatistikleri alınamadı')
  }
}

/**
 * Get all organizations (superadmin only)
 */
export async function getAllOrganizations() {
  await requireSuperadmin()

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Organizasyonlar yüklenemedi: ' + error.message)
  }

  return data
}

/**
 * Get all users (superadmin only)
 */
export async function getAllUsers() {
  await requireSuperadmin()

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    throw new Error('Kullanıcılar yüklenemedi: ' + error.message)
  }

  return data
}

/**
 * Update user system role (superadmin only)
 */
export async function updateUserSystemRole(
  userId: string,
  systemRole: 'user' | 'support' | 'sales' | 'superadmin'
) {
  await requireSuperadmin()

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ system_role: systemRole })
    .eq('id', userId)

  if (error) {
    throw new Error('Kullanıcı rolü güncellenemedi: ' + error.message)
  }
}

/**
 * Update user active status (superadmin only)
 */
export async function updateUserActiveStatus(userId: string, isActive: boolean) {
  await requireSuperadmin()

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) {
    throw new Error('Kullanıcı durumu güncellenemedi: ' + error.message)
  }
}

/**
 * Update organization active status (superadmin only)
 */
export async function updateOrganizationActiveStatus(orgId: string, isActive: boolean) {
  await requireSuperadmin()

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .update({ is_active: isActive })
    .eq('id', orgId)

  if (error) {
    throw new Error('Organizasyon durumu güncellenemedi: ' + error.message)
  }
}

/**
 * Delete organization (soft delete) (superadmin only)
 */
export async function deleteOrganization(orgId: string) {
  await requireSuperadmin()

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', orgId)

  if (error) {
    throw new Error('Organizasyon silinemedi: ' + error.message)
  }
}
