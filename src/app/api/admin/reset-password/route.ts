/**
 * Reset Password API Route
 * 
 * POST /api/admin/reset-password
 * 
 * Resets a user's password (admin only).
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, newPassword } = body

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and newPassword are required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get user by email
    const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserByEmail(email)

    if (getUserError || !userData?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userData.user.id,
      { password: newPassword }
    )

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      email,
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to reset password',
      },
      { status: 500 }
    )
  }
}

