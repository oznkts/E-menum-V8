/**
 * Confirm User Script
 * 
 * Manually confirms a user's email for local development.
 * Usage: npx tsx scripts/confirm-user.ts <email>
 * 
 * Example: npx tsx scripts/confirm-user.ts karacai@yandex.com
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

async function confirmUser(email: string): Promise<void> {
  console.log(`\nConfirming user: ${email}`)

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

  if (user.email_confirmed_at) {
    console.log(`User already confirmed: ${email}`)
    console.log(`Confirmed at: ${user.email_confirmed_at}`)
    return
  }

  // Update user to confirm email
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  if (updateError) {
    console.error('Error confirming user:', updateError.message)
    process.exit(1)
  }

  console.log(`✅ User confirmed successfully: ${email}`)
  console.log(`\nYou can now login with:`)
  console.log(`  Email: ${email}`)
  console.log(`  Password: (the password you set during registration)`)
}

// Get email from command line
const email = process.argv[2]

if (!email) {
  console.error('Usage: npx tsx scripts/confirm-user.ts <email>')
  console.error('Example: npx tsx scripts/confirm-user.ts karacai@yandex.com')
  process.exit(1)
}

confirmUser(email)
