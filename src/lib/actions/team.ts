'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} from '@/lib/dal/team'
import type { OrganizationRole } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

export interface TeamActionState {
  error?: string
  success?: string
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Get all team members for the current organization
 */
export async function getTeamMembersAction(organizationId: string) {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  return getTeamMembers(organizationId)
}

/**
 * Invite a new team member by email
 */
export async function inviteTeamMemberAction(
  organizationId: string,
  email: string,
  role: OrganizationRole = 'staff'
): Promise<TeamActionState> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'Geçerli bir e-posta adresi giriniz' }
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check if user exists in profiles (case-insensitive)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  let userId: string

  if (!profile) {
    // User doesn't exist in profiles
    return { error: 'Bu e-posta adresine sahip bir kullanıcı bulunamadı. Lütfen "Manuel Ekle" butonunu kullanarak kullanıcıyı ekleyin.' }
  }

  userId = profile.id

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from('memberships')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (existingMembership) {
    return { error: 'Bu kullanıcı zaten ekli' }
  }

  // Invite the member
  const { data, error } = await inviteTeamMember({
    organization_id: organizationId,
    user_id: userId,
    role,
    invited_by: authData.user.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings/team')
  return { success: 'Üye başarıyla davet edildi' }
}

/**
 * Add a team member manually (create user if needed)
 */
export async function addTeamMemberManuallyAction(
  organizationId: string,
  email: string,
  fullName: string,
  phone: string | null,
  role: OrganizationRole = 'staff'
): Promise<TeamActionState> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'Geçerli bir e-posta adresi giriniz' }
  }

  if (!fullName || fullName.trim().length < 2) {
    return { error: 'Ad soyad en az 2 karakter olmalıdır' }
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check if user exists in profiles
  let { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  let userId: string

  if (profile) {
    // User exists, use existing profile
    userId = profile.id
  } else {
    // User doesn't exist, create auth user and profile using admin client
    try {
      const adminClient = createAdminClient()
      
      // Create auth user with temporary password (user will need to reset)
      const tempPassword = `Temp${Math.random().toString(36).slice(-12)}!`
      
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName.trim(),
          phone: phone?.trim() || null,
        },
      })

      if (authError || !authUser.user) {
        return { 
          error: 'Kullanıcı oluşturulamadı: ' + (authError?.message || 'Bilinmeyen hata')
        }
      }

      userId = authUser.user.id

      // Profile should be created automatically by trigger, but let's verify
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (!newProfile) {
        // If trigger didn't create profile, create it manually
        const { error: profileError } = await adminClient
          .from('profiles')
          .insert({
            id: userId,
            email: normalizedEmail,
            full_name: fullName.trim(),
            phone: phone?.trim() || null,
            is_active: true,
          })

        if (profileError) {
          return { 
            error: 'Profil oluşturulamadı: ' + profileError.message
          }
        }
      } else {
        // Update profile with additional info if needed
        await adminClient
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            phone: phone?.trim() || null,
          })
          .eq('id', userId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      return { 
        error: 'Kullanıcı oluşturulurken hata oluştu: ' + message
      }
    }
  }

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from('memberships')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (existingMembership) {
    return { error: 'Bu kullanıcı zaten ekli' }
  }

  // Add the member directly (no invitation needed for manual addition)
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role,
      invited_by: authData.user.id,
      joined_at: new Date().toISOString(), // Auto-join for manual additions
      is_active: true,
    })
    .select()
    .single()

  if (membershipError) {
    return { error: membershipError.message }
  }

  revalidatePath('/dashboard/settings/team')
  return { success: 'Üye başarıyla eklendi. Kullanıcıya şifre sıfırlama e-postası gönderilmiştir.' }
}

/**
 * Update a team member's role
 */
export async function updateTeamMemberRoleAction(
  membershipId: string,
  role: OrganizationRole
): Promise<TeamActionState> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  const { data, error } = await updateTeamMemberRole(membershipId, role)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/team')
  return { success: 'Üye rolü başarıyla güncellendi' }
}

/**
 * Remove a team member
 */
export async function removeTeamMemberAction(
  membershipId: string
): Promise<TeamActionState> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  const { data, error } = await removeTeamMember(membershipId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/team')
  return { success: 'Üye başarıyla kaldırıldı' }
}

