/**
 * Create Superadmin User Script
 * 
 * This script creates a superadmin user in Supabase using REST API.
 * Run with: npx tsx scripts/create-superadmin.ts [email] [password] [name]
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Ensure fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  throw new Error('This script requires Node.js 18+ with fetch API support')
}

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envFile = readFileSync(envPath, 'utf-8')
    const envVars: Record<string, string> = {}
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          envVars[key.trim()] = value.trim()
        }
      }
    })
    
    return envVars
  } catch (error) {
    console.warn('⚠️  Could not load .env.local, using process.env')
    return {}
  }
}

const env = loadEnv()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓' : '✗')
  console.error('\nPlease set these in .env.local file.')
  process.exit(1)
}

// Get credentials from command line or use defaults
const email = process.argv[2] || 'admin@e-menum.com'
const password = process.argv[3] || 'Admin123!'
const name = process.argv[4] || 'Super Admin'

async function createSuperadmin() {
  console.log('🚀 Creating superadmin user...\n')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log(`Name: ${name}\n`)

  try {
    // Check if user already exists
    console.log('🔍 Checking if user exists...')
    const checkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
    })

    const checkData = (await checkResponse.json()) as { users?: Array<{ id: string }> }
    let userId: string

    if (checkData.users && checkData.users.length > 0) {
      userId = checkData.users[0].id
      console.log(`⚠️  User already exists: ${userId}`)
      console.log('   Updating password and profile...')

      // Update password and confirm email
      const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: password,
          email_confirm: true,
        }),
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(`Failed to update user: ${JSON.stringify(errorData)}`)
      }

      console.log('✅ Password updated and email confirmed')
    } else {
      // Create new user
      console.log('📝 Creating new user...')
      const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: name,
          },
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(`Failed to create user: ${JSON.stringify(errorData)}`)
      }

      const createData = (await createResponse.json()) as { user?: { id: string } }
      if (!createData.user || !createData.user.id) {
        throw new Error('User creation returned no user data')
      }

      userId = createData.user.id
      console.log(`✅ User created: ${userId}`)
    }

    // Update or create profile
    console.log('🔧 Setting system_role to superadmin...')
    
    // Try to update first
    const updateProfileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        system_role: 'superadmin',
        full_name: name,
        is_active: true,
      }),
    })

    if (updateProfileResponse.ok) {
      const updateData = (await updateProfileResponse.json()) as Array<{ system_role?: string }>
      if (updateData && updateData.length > 0 && updateData[0]?.system_role === 'superadmin') {
        console.log('✅ Profile updated to superadmin')
      } else {
        // Profile doesn't exist or update failed, try to create
        console.log('   Profile not found, creating new profile...')
        const createProfileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceRoleKey,
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            id: userId,
            email: email,
            full_name: name,
            system_role: 'superadmin',
            is_active: true,
          }),
        })

        if (!createProfileResponse.ok) {
          const errorData = await createProfileResponse.json()
          throw new Error(`Failed to create profile: ${JSON.stringify(errorData)}`)
        }

        console.log('✅ Profile created with superadmin role')
      }
    } else {
      // Update failed, try to create
      const errorText = await updateProfileResponse.text()
      console.log('   Update failed, trying to create profile...')
      
      const createProfileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          id: userId,
          email: email,
          full_name: name,
          system_role: 'superadmin',
          is_active: true,
        }),
      })

      if (!createProfileResponse.ok) {
        const errorData = await createProfileResponse.json()
        throw new Error(`Failed to create profile: ${JSON.stringify(errorData)}`)
      }

      console.log('✅ Profile created with superadmin role')
    }

    console.log('\n✅ Superadmin user created successfully!')
    console.log('\n📋 Login Credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`\n🌐 You can now login at: http://localhost:3000/login`)
    console.log(`   Then access admin panel at: http://localhost:3000/admin`)

  } catch (error) {
    console.error('\n❌ Error creating superadmin:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run the script
createSuperadmin()
