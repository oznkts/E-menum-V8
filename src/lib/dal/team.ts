/**
 * Team Management Data Access Layer (DAL)
 *
 * This module provides type-safe database operations for team/membership management.
 * All operations respect Row Level Security (RLS) policies.
 *
 * Features:
 * - List organization members with profile information
 * - Invite new members
 * - Update member roles
 * - Remove members
 * - Check permissions
 *
 * @module lib/dal/team
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Membership,
  MembershipInsert,
  MembershipUpdate,
  Profile,
  OrganizationRole,
} from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Team member with profile information
 */
export interface TeamMember {
  membership: Membership
  profile: Profile
}

/**
 * Standard DAL response
 */
export interface DALResponse<T> {
  data: T | null
  error: DALError | null
}

/**
 * DAL error type
 */
export interface DALError {
  code: DALErrorCode
  message: string
  details?: string
}

/**
 * DAL error codes
 */
export type DALErrorCode =
  | 'not_found'
  | 'already_exists'
  | 'validation_error'
  | 'permission_denied'
  | 'database_error'
  | 'unknown_error'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a standardized error response
 */
function createErrorResponse<T>(
  code: DALErrorCode,
  message: string,
  details?: string
): DALResponse<T> {
  return {
    data: null,
    error: { code, message, details },
  }
}

/**
 * Create a standardized success response
 */
function createSuccessResponse<T>(data: T): DALResponse<T> {
  return {
    data,
    error: null,
  }
}

/**
 * Map Supabase error to DAL error
 */
function mapSupabaseError(error: { code?: string; message: string }): DALError {
  if (error.code === '23505') {
    return {
      code: 'already_exists',
      message: 'Bu kullanıcı zaten ekli',
      details: error.message,
    }
  }

  if (error.code === '42501' || error.message.includes('permission')) {
    return {
      code: 'permission_denied',
      message: 'Bu işlem için yetkiniz yok',
      details: error.message,
    }
  }

  if (error.code === 'PGRST116') {
    return {
      code: 'not_found',
      message: 'Üye bulunamadı',
      details: error.message,
    }
  }

  return {
    code: 'database_error',
    message: 'Veritabanı hatası oluştu',
    details: error.message,
  }
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get all team members for an organization
 *
 * @param organizationId - The organization UUID
 * @returns Array of team members with profile information
 */
export async function getTeamMembers(
  organizationId: string
): Promise<DALResponse<TeamMember[]>> {
  try {
    const supabase = await createClient()

    // First get memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (membershipsError) {
      return createErrorResponse('database_error', 'Ekip üyeleri yüklenemedi', membershipsError.message)
    }

    if (!memberships || memberships.length === 0) {
      return createSuccessResponse([])
    }

    // Then get profiles for all user_ids
    const userIds = memberships.map((m) => m.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    if (profilesError) {
      return createErrorResponse('database_error', 'Kullanıcı profilleri yüklenemedi', profilesError.message)
    }

    // Combine memberships with profiles
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))
    const teamMembers: TeamMember[] = memberships
      .map((membership) => {
        const profile = profileMap.get(membership.user_id)
        if (!profile) return null
        return {
          membership: membership as Membership,
          profile: profile as Profile,
        }
      })
      .filter((member): member is TeamMember => member !== null)

    if (error) {
      return createErrorResponse('database_error', 'Ekip üyeleri yüklenemedi', error.message)
    }

    return createSuccessResponse(teamMembers)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Get a single team member by membership ID
 *
 * @param membershipId - The membership UUID
 * @returns Team member with profile information
 */
export async function getTeamMemberById(
  membershipId: string
): Promise<DALResponse<TeamMember>> {
  try {
    const supabase = await createClient()

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .eq('id', membershipId)
      .eq('is_active', true)
      .single()

    if (membershipError) {
      if (membershipError.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Üye bulunamadı')
      }
      return createErrorResponse('database_error', 'Üye yüklenemedi', membershipError.message)
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', membership.user_id)
      .single()

    if (profileError || !profile) {
      return createErrorResponse('not_found', 'Kullanıcı profili bulunamadı')
    }

    return createSuccessResponse({
      membership: membership as Membership,
      profile: profile as Profile,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

/**
 * Check if a user is a member of an organization
 *
 * @param organizationId - The organization UUID
 * @param userId - The user UUID
 * @returns True if user is a member
 */
export async function isTeamMember(
  organizationId: string,
  userId: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createSuccessResponse(false)
      }
      return createErrorResponse('database_error', 'Üyelik kontrolü yapılamadı', error.message)
    }

    return createSuccessResponse(data !== null)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Beklenmeyen bir hata oluştu', message)
  }
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Invite a new team member
 *
 * @param data - The membership data to insert
 * @returns The created membership
 */
export async function inviteTeamMember(
  data: MembershipInsert
): Promise<DALResponse<Membership>> {
  try {
    const supabase = await createClient()

    // Generate invitation token if not provided
    const invitationToken = data.invitation_token || crypto.randomUUID()
    const invitationExpiresAt =
      data.invitation_expires_at ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now

    const { data: membership, error } = await supabase
      .from('memberships')
      .insert({
        ...data,
        invitation_token: invitationToken,
        invitation_expires_at: invitationExpiresAt,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(membership)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Üye davet edilemedi', message)
  }
}

/**
 * Update a team member's role
 *
 * @param membershipId - The membership UUID
 * @param role - The new role
 * @returns The updated membership
 */
export async function updateTeamMemberRole(
  membershipId: string,
  role: OrganizationRole
): Promise<DALResponse<Membership>> {
  try {
    const supabase = await createClient()

    const { data: membership, error } = await supabase
      .from('memberships')
      .update({ role })
      .eq('id', membershipId)
      .eq('is_active', true)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse('not_found', 'Üye bulunamadı')
      }
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(membership)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Üye rolü güncellenemedi', message)
  }
}

/**
 * Remove a team member (soft delete - sets is_active to false)
 *
 * @param membershipId - The membership UUID
 * @returns Success indicator
 */
export async function removeTeamMember(
  membershipId: string
): Promise<DALResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('memberships')
      .update({ is_active: false })
      .eq('id', membershipId)
      .eq('is_active', true)

    if (error) {
      return { data: null, error: mapSupabaseError(error) }
    }

    return createSuccessResponse(true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Üye kaldırılamadı', message)
  }
}

/**
 * Accept an invitation (sets joined_at timestamp)
 *
 * @param invitationToken - The invitation token
 * @returns The updated membership
 */
export async function acceptInvitation(
  invitationToken: string
): Promise<DALResponse<Membership>> {
  try {
    const supabase = await createClient()

    // First, verify the invitation is valid
    const { data: membership, error: fetchError } = await supabase
      .from('memberships')
      .select('*')
      .eq('invitation_token', invitationToken)
      .eq('is_active', true)
      .single()

    if (fetchError || !membership) {
      return createErrorResponse('not_found', 'Davet bulunamadı veya geçersiz')
    }

    // Check if invitation has expired
    if (
      membership.invitation_expires_at &&
      new Date(membership.invitation_expires_at) < new Date()
    ) {
      return createErrorResponse('validation_error', 'Davet süresi dolmuş')
    }

    // Check if already accepted
    if (membership.joined_at) {
      return createErrorResponse('validation_error', 'Bu davet zaten kabul edilmiş')
    }

    // Accept the invitation
    const { data: updatedMembership, error: updateError } = await supabase
      .from('memberships')
      .update({
        joined_at: new Date().toISOString(),
        invitation_token: null,
        invitation_expires_at: null,
      })
      .eq('id', membership.id)
      .select()
      .single()

    if (updateError) {
      return { data: null, error: mapSupabaseError(updateError) }
    }

    return createSuccessResponse(updatedMembership)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse('unknown_error', 'Davet kabul edilemedi', message)
  }
}

