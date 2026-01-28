/**
 * Create Superadmin API Route
 * 
 * POST /api/admin/create-superadmin
 * 
 * Creates a superadmin user in Supabase.
 * This is a one-time setup endpoint.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Check if user already exists
    const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(email)
    
    let userId: string

    if (existingUser?.user) {
      userId = existingUser.user.id
      
      // Update password for existing user
      const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(
        userId,
        { 
          password: password,
          email_confirm: true, // Ensure email is confirmed
        }
      )

      if (updatePasswordError) {
        console.error('Failed to update password:', updatePasswordError)
        // Continue anyway, password might be the same
      }
      
      // Update profile
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          system_role: 'superadmin',
          full_name: name || 'Super Admin',
          is_active: true,
        })
        .eq('id', userId)

      if (profileError) {
        // If profile doesn't exist, create it
        const { error: insertError } = await adminClient
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            full_name: name || 'Super Admin',
            system_role: 'superadmin',
            is_active: true,
          })

        if (insertError) {
          throw new Error(`Failed to create profile: ${insertError.message}`)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'User already exists, password updated and set to superadmin',
        userId,
        email,
      })
    }

    // Create new user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email so user can login immediately
      user_metadata: {
        full_name: name || 'Super Admin',
      },
    })

    if (createError) {
      // If user exists, try to update password
      if (createError.message.includes('already registered') || createError.message.includes('already exists')) {
        // User exists, update password
        const { data: existingUserData } = await adminClient.auth.admin.getUserByEmail(email)
        if (existingUserData?.user) {
          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            existingUserData.user.id,
            { password: password }
          )
          if (updateError) {
            throw new Error(`Failed to update password: ${updateError.message}`)
          }
          userId = existingUserData.user.id
        } else {
          throw new Error(`Failed to create user: ${createError.message}`)
        }
      } else {
        throw new Error(`Failed to create user: ${createError.message}`)
      }
    } else {
      if (!newUser.user) {
        throw new Error('User creation returned no user data')
      }
      userId = newUser.user.id
    }

    // Update or create profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        system_role: 'superadmin',
        full_name: name || 'Super Admin',
        is_active: true,
      })
      .eq('id', userId)

    if (profileError) {
      // If profile doesn't exist, create it
      const { error: insertError } = await adminClient
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: name || 'Super Admin',
          system_role: 'superadmin',
          is_active: true,
        })

      if (insertError) {
        throw new Error(`Failed to create profile: ${insertError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Superadmin user created successfully',
      userId,
      email,
    })
  } catch (error) {
    console.error('Error creating superadmin:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create superadmin',
      },
      { status: 500 }
    )
  }
}

