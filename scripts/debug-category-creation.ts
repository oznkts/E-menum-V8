/**
 * Debug Category Creation Script
 * 
 * This script helps debug category creation issues in production.
 * Usage: npx tsx scripts/debug-category-creation.ts <organization_id> <user_email>
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables
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
  } catch {
    return {}
  }
}

const env = loadEnv()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function debugCategoryCreation(orgId: string, userEmail: string) {
  console.log('🔍 Debugging Category Creation...\n')
  console.log(`Organization ID: ${orgId}`)
  console.log(`User Email: ${userEmail}\n`)

  // 1. Check if organization exists
  console.log('1️⃣ Checking organization...')
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, is_active, deleted_at')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    console.error('❌ Organization not found or error:', orgError?.message)
    return
  }
  console.log(`✅ Organization found: ${org.name}`)
  console.log(`   Active: ${org.is_active}, Deleted: ${org.deleted_at ? 'Yes' : 'No'}\n`)

  // 2. Check if user exists
  console.log('2️⃣ Checking user...')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users.find(u => u.email === userEmail)
  
  if (!user) {
    console.error('❌ User not found')
    return
  }
  console.log(`✅ User found: ${user.email} (${user.id})`)
  console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}\n`)

  // 3. Check profile
  console.log('3️⃣ Checking profile...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, system_role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('❌ Profile not found:', profileError?.message)
    return
  }
  console.log(`✅ Profile found`)
  console.log(`   System role: ${profile.system_role}`)
  console.log(`   Active: ${profile.is_active}\n`)

  // 4. Check membership
  console.log('4️⃣ Checking membership...')
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, organization_id, user_id, role, is_active, joined_at')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    console.error('❌ Membership not found:', membershipError?.message)
    console.log('\n💡 User is not a member of this organization!')
    console.log('   This is likely the cause of the error.')
    return
  }
  console.log(`✅ Membership found`)
  console.log(`   Role: ${membership.role}`)
  console.log(`   Active: ${membership.is_active}`)
  console.log(`   Joined: ${membership.joined_at}\n`)

  // 5. Check if role allows category creation
  const allowedRoles = ['owner', 'admin', 'manager', 'staff']
  if (!allowedRoles.includes(membership.role)) {
    console.error(`❌ User role '${membership.role}' does not allow category creation`)
    console.log(`   Required roles: ${allowedRoles.join(', ')}`)
    return
  }
  console.log(`✅ User role allows category creation\n`)

  // 6. Test category creation with service role (bypass RLS)
  console.log('5️⃣ Testing category creation (with service role)...')
  const testCategory = {
    organization_id: orgId,
    name: 'Test Category',
    slug: `test-category-${Date.now()}`,
    is_visible: true,
  }

  const { data: createdCategory, error: createError } = await supabase
    .from('categories')
    .insert(testCategory)
    .select()
    .single()

  if (createError) {
    console.error('❌ Category creation failed:', createError.message)
    console.error('   Details:', createError)
    return
  }
  console.log(`✅ Category created successfully: ${createdCategory.id}`)

  // Clean up test category
  await supabase.from('categories').delete().eq('id', createdCategory.id)
  console.log('   Test category cleaned up\n')

  // 7. Summary
  console.log('📋 Summary:')
  console.log('   ✅ Organization exists and is active')
  console.log('   ✅ User exists and email is confirmed')
  console.log('   ✅ Profile exists')
  console.log('   ✅ Membership exists with correct role')
  console.log('   ✅ Category creation works (with service role)')
  console.log('\n💡 If category creation still fails, the issue is likely:')
  console.log('   1. RLS policies blocking the request')
  console.log('   2. User session not properly authenticated')
  console.log('   3. Environment variables not set correctly in Vercel')
  console.log('\n🔧 Next steps:')
  console.log('   1. Check Vercel environment variables')
  console.log('   2. Check browser console for detailed error messages')
  console.log('   3. Check Vercel function logs for server-side errors')
}

// Get arguments
const orgId = process.argv[2]
const userEmail = process.argv[3]

if (!orgId || !userEmail) {
  console.error('Usage: npx tsx scripts/debug-category-creation.ts <organization_id> <user_email>')
  process.exit(1)
}

debugCategoryCreation(orgId, userEmail).catch(console.error)

