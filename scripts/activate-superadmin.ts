/**
 * Activate Superadmin User Script
 * 
 * This script activates an existing user and sets them as superadmin.
 * Run with: npx tsx scripts/activate-superadmin.ts [email]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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

// Create admin client with service role
// Note: Service role key allows admin operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Get email from command line argument or use default
const email = process.argv[2] || 'admin@e-menum.com'

async function activateSuperadmin() {
  console.log('🔍 Looking for user:', email)
  console.log('')

  try {
    // 1. Get user by email
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserByEmail(email)

    if (getUserError || !userData?.user) {
      console.error('❌ User not found:', email)
      console.error('   Please create the user first in Supabase Dashboard > Authentication > Users')
      process.exit(1)
    }

    const userId = userData.user.id
    console.log('✅ User found:', userId)
    console.log('   Email:', userData.user.email)
    console.log('   Email confirmed:', userData.user.email_confirmed_at ? 'Yes' : 'No')
    console.log('')

    // 2. Activate user and confirm email
    console.log('🔧 Activating user and confirming email...')
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true, // Confirm email
        ban_duration: 'none', // Ensure user is not banned
      }
    )

    if (updateError) {
      throw new Error(`Failed to activate user: ${updateError.message}`)
    }

    console.log('✅ User activated and email confirmed')
    console.log('')

    // 3. Update or create profile with superadmin role
    console.log('🔧 Setting system_role to superadmin...')
    
    // First, check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      // Update existing profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          system_role: 'superadmin',
          full_name: existingProfile.full_name || 'Super Admin',
          is_active: true,
        })
        .eq('id', userId)

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`)
      }
      console.log('✅ Profile updated to superadmin')
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: 'Super Admin',
          system_role: 'superadmin',
          is_active: true,
        })

      if (insertError) {
        throw new Error(`Failed to create profile: ${insertError.message}`)
      }
      console.log('✅ Profile created with superadmin role')
    }

    console.log('')
    console.log('✅ Superadmin user activated successfully!')
    console.log('')
    console.log('📋 Login Credentials:')
    console.log(`   Email: ${email}`)
    console.log('   Password: (the password you set when creating the user)')
    console.log('')
    console.log('🌐 You can now login at: http://localhost:3000/login')
    console.log('   Then access admin panel at: http://localhost:3000/admin')

  } catch (error) {
    console.error('\n❌ Error activating superadmin:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run the script
activateSuperadmin()

