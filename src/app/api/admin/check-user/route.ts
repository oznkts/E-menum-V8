/**
 * Check User API Route
 * 
 * GET /api/admin/check-user?email=admin@e-menum.com
 * 
 * Checks if a user exists and returns their status.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get user by email
    const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserByEmail(email)

    if (getUserError || !userData?.user) {
      return NextResponse.json({
        exists: false,
        message: 'User not found',
      })
    }

    const userId = userData.user.id

    // Get profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      exists: true,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        email_confirmed: userData.user.email_confirmed_at !== null,
        created_at: userData.user.created_at,
      },
      profile: profile || null,
      profileError: profileError?.message || null,
    })
  } catch (error) {
    console.error('Error checking user:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check user',
      },
      { status: 500 }
    )
  }
}

