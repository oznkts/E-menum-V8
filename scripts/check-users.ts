/**
 * Check Users Script
 * 
 * Lists all users in the database and their confirmation status.
 * Usage: npx tsx scripts/check-users.ts
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

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkUsers() {
  console.log('🔍 Checking users in database...\n')

  try {
    // Get users from auth.users via REST API
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to fetch users: ${JSON.stringify(errorData)}`)
    }

    const data: { users: Array<{
      id: string
      email: string
      email_confirmed_at: string | null
      created_at: string
      last_sign_in_at: string | null
    }> } = await response.json()

    if (!data.users || data.users.length === 0) {
      console.log('📭 No users found in the database.')
      console.log('\n💡 To create a user, you can:')
      console.log('   1. Register via the web interface at http://localhost:3000/register')
      console.log('   2. Use the create-superadmin script: npx tsx scripts/create-superadmin.ts')
      return
    }

    console.log(`📊 Found ${data.users.length} user(s):\n`)
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐')
    console.log('│ Email                                    │ Confirmed │ Created              │')
    console.log('├─────────────────────────────────────────────────────────────────────────────┤')

    data.users.forEach((user) => {
      const email = user.email.padEnd(40)
      const confirmed = user.email_confirmed_at ? '✅ Yes' : '❌ No'
      const created = new Date(user.created_at).toLocaleString('tr-TR')
      console.log(`│ ${email} │ ${confirmed.padEnd(9)} │ ${created.padEnd(19)} │`)
    })

    console.log('└─────────────────────────────────────────────────────────────────────────────┘')

    const unconfirmedUsers = data.users.filter(u => !u.email_confirmed_at)
    if (unconfirmedUsers.length > 0) {
      console.log(`\n⚠️  ${unconfirmedUsers.length} user(s) with unconfirmed email:`)
      unconfirmedUsers.forEach(user => {
        console.log(`   - ${user.email}`)
      })
      console.log('\n💡 To confirm users, run:')
      console.log(`   npx tsx scripts/confirm-user.ts <email>`)
    }

    // Check profiles
    console.log('\n🔍 Checking profiles...')
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, system_role, is_active')
      .order('created_at', { ascending: false })
      .limit(10)

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError.message)
    } else if (profiles && profiles.length > 0) {
      console.log(`\n📊 Found ${profiles.length} profile(s):\n`)
      profiles.forEach((profile: any) => {
        console.log(`   - ${profile.email || 'N/A'} (${profile.full_name || 'No name'})`)
        console.log(`     Role: ${profile.system_role || 'user'}, Active: ${profile.is_active ? 'Yes' : 'No'}`)
      })
    } else {
      console.log('📭 No profiles found.')
    }

  } catch (error) {
    console.error('\n❌ Error checking users:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

checkUsers()

