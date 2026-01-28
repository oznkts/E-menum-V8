/**
 * Setup User Organization Script
 * 
 * Creates an organization for a user.
 * Usage: npx tsx scripts/setup-user-org.ts <email> <org-name>
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
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function setupUserOrg(email: string, orgName: string): Promise<void> {
  console.log(`\nSetting up organization for: ${email}`)
  console.log(`Organization name: ${orgName}`)

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

  console.log(`Found user: ${user.id}`)

  const slug = generateSlug(orgName)

  // Check if org already exists
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (existingOrg) {
    console.log(`Organization already exists: ${existingOrg.name}`)
    
    // Check if user is already a member
    const { data: membership } = await supabase
      .from('memberships')
      .select('id')
      .eq('organization_id', existingOrg.id)
      .eq('user_id', user.id)
      .single()

    if (membership) {
      console.log('User is already a member of this organization')
    } else {
      // Add user as owner
      const { error: memberError } = await supabase.from('memberships').insert({
        organization_id: existingOrg.id,
        user_id: user.id,
        role: 'owner',
        is_active: true,
        joined_at: new Date().toISOString(),
      })

      if (memberError) {
        console.error('Error adding membership:', memberError.message)
      } else {
        console.log('Added user as owner to existing organization')
      }
    }
    return
  }

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug: slug,
      owner_id: user.id,
      subscription_tier: 'gold',
      subscription_status: 'active',
      primary_color: '#f97316',
      timezone: 'Europe/Istanbul',
      currency: 'TRY',
      language: 'tr',
      is_active: true,
    })
    .select('id')
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError.message)
    process.exit(1)
  }

  console.log(`✅ Created organization: ${orgName} (${org.id})`)

  // Create default categories
  const categories = [
    { name: 'Ana Yemekler', slug: 'ana-yemekler', icon: 'utensils', sortOrder: 1 },
    { name: 'Başlangıçlar', slug: 'baslangiclar', icon: 'salad', sortOrder: 2 },
    { name: 'İçecekler', slug: 'icecekler', icon: 'coffee', sortOrder: 3 },
    { name: 'Tatlılar', slug: 'tatlilar', icon: 'cake', sortOrder: 4 },
  ]

  for (const cat of categories) {
    await supabase.from('categories').insert({
      organization_id: org.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      sort_order: cat.sortOrder,
      is_visible: true,
    })
  }

  console.log('✅ Created default categories')

  // Create default tables
  const tables = [
    { name: 'Masa 1', tableNumber: '1', capacity: 4 },
    { name: 'Masa 2', tableNumber: '2', capacity: 4 },
    { name: 'Masa 3', tableNumber: '3', capacity: 2 },
    { name: 'Masa 4', tableNumber: '4', capacity: 6 },
  ]

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    await supabase.from('restaurant_tables').insert({
      organization_id: org.id,
      name: table.name,
      table_number: table.tableNumber,
      capacity: table.capacity,
      section: 'Ana Salon',
      floor: 1,
      sort_order: i + 1,
      status: 'available',
    })
  }

  console.log('✅ Created default tables')

  console.log('\n========================================')
  console.log('Setup complete!')
  console.log('========================================')
  console.log(`\nLogin credentials:`)
  console.log(`  Email: ${email}`)
  console.log(`  Password: (your registration password)`)
  console.log(`\nOrganization:`)
  console.log(`  Name: ${orgName}`)
  console.log(`  Slug: ${slug}`)
  console.log(`  Public Menu: /r/${slug}`)
  console.log('\n')
}

// Get arguments
const email = process.argv[2]
const orgName = process.argv[3]

if (!email || !orgName) {
  console.error('Usage: npx tsx scripts/setup-user-org.ts <email> <org-name>')
  console.error('Example: npx tsx scripts/setup-user-org.ts karacai@yandex.com "Karaca Restaurant"')
  process.exit(1)
}

setupUserOrg(email, orgName)
