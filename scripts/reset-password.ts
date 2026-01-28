/**
 * Reset Password Script
 * 
 * Manually resets a user's password for local development.
 * Usage: npx tsx scripts/reset-password.ts <email> <new-password>
 * 
 * Example: npx tsx scripts/reset-password.ts bora.aydeger@turksab.com Turksab2026!
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
const dotenvPath = join(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(dotenvPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
    }
  })
} catch {
  try {
    const envContent = readFileSync(join(process.cwd(), '.env'), 'utf-8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      }
    })
  } catch {
    // Environment variables should be set externally
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function resetPassword(email: string, newPassword: string): Promise<void> {
  console.log(`\nResetting password for: ${email}`)

  // Find user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Error listing users:', listError.message)
    process.exit(1)
  }

  const user = users?.users?.find(u => u.email === email)
  
  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }

  // Update user password
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (updateError) {
    console.error('Error resetting password:', updateError.message)
    process.exit(1)
  }

  console.log(`✅ Password reset successfully for: ${email}`)
  console.log(`\nYou can now login with:`)
  console.log(`  Email: ${email}`)
  console.log(`  Password: ${newPassword}`)
}

// Get email and password from command line
const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>')
  console.error('Example: npx tsx scripts/reset-password.ts bora.aydeger@turksab.com Turksab2026!')
  process.exit(1)
}

resetPassword(email, newPassword)

