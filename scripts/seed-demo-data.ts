/**
 * E-Menum Demo Data Seeder
 *
 * This script seeds the database with realistic Turkish restaurant demo data.
 * It can be run via: npm run seed
 *
 * Prerequisites:
 * - Supabase project configured with migrations applied
 * - Environment variables set in .env.local or .env
 * - SUPABASE_SERVICE_ROLE_KEY required for admin operations
 *
 * Usage:
 *   npm run seed              # Seed default demo data
 *   npm run seed -- --clean   # Clear existing data before seeding
 *
 * Note: This script uses the service role key for admin access.
 * Never expose this key in client-side code.
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
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
  // Try .env if .env.local doesn't exist
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
  console.error('\nPlease set these in .env.local or .env file.')
  process.exit(1)
}

// Create admin Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// =====================================================
// DEMO DATA CONSTANTS
// =====================================================

const DEMO_USER_EMAIL = 'demo@e-menum.com'
const DEMO_USER_PASSWORD = 'Demo123!'
const DEMO_USER_NAME = 'Demo Kullanici'

// Turkish restaurant names
const RESTAURANT_DATA = {
  main: {
    name: 'Anadolu Sofrasi',
    slug: 'anadolu-sofrasi',
    description:
      'Geleneksel Turk mutfaginin en guzel ornekleri. 1985\'ten beri misafirlerimize annelerimizden ogrendigimiz tarifleri sunuyoruz. Taze malzemeler, odun atesi ve bol sevgiyle hazirlanan yemeklerimizle sizleri bekliyoruz.',
    phone: '+90 212 555 0101',
    email: 'info@anadolusofrasi.com',
    website: 'https://anadolusofrasi.com',
    address: 'Istiklal Caddesi No: 123',
    city: 'Istanbul',
    district: 'Beyoglu',
    primaryColor: '#b91c1c',
    subscriptionTier: 'gold' as const,
  },
  secondary: {
    name: 'Kahve Duragi',
    slug: 'kahve-duragi',
    description: 'Modern Turk kahve kulturu. Ucuncu dalga kahve, ev yapimi tatlilar ve rahat ortam.',
    phone: '+90 216 555 0202',
    email: 'info@kahveduragi.com',
    address: 'Bagdat Caddesi No: 456',
    city: 'Istanbul',
    district: 'Kadikoy',
    primaryColor: '#78350f',
    subscriptionTier: 'lite' as const,
  },
}

// Turkish menu categories
const CATEGORIES = [
  { name: 'Kebaplar', slug: 'kebaplar', description: 'Odun atesinde pisirilen geleneksel Turk kebaplari', icon: 'fire', sortOrder: 1 },
  { name: 'Pideler', slug: 'pideler', description: 'Firinda taze pisirilen acik ve kapali pideler', icon: 'pizza', sortOrder: 2 },
  { name: 'Mezeler', slug: 'mezeler', description: 'Taze hazirlanan soguk ve sicak mezeler', icon: 'bowl-food', sortOrder: 3 },
  { name: 'Salatalar', slug: 'salatalar', description: 'Taze sebzelerle hazirlanan mevsim salatalari', icon: 'leaf', sortOrder: 4 },
  { name: 'Corbalar', slug: 'corbalar', description: 'Gunluk taze hazirlanan ev yapimi corbalar', icon: 'soup', sortOrder: 5 },
  { name: 'Tatlilar', slug: 'tatlilar', description: 'Geleneksel Turk tatlilari', icon: 'cake', sortOrder: 6 },
  { name: 'Icecekler', slug: 'icecekler', description: 'Soguk ve sicak icecekler', icon: 'coffee', sortOrder: 7 },
]

// Turkish menu items with realistic prices (TRY)
const PRODUCTS = {
  kebaplar: [
    {
      name: 'Adana Kebap',
      slug: 'adana-kebap',
      description: 'Ozenle secilmis kuzu etinden, el yapimi acili Adana usulu kebap. Yaninda pilav, kozlenmis domates ve biber ile servis edilir.',
      shortDescription: 'Acili kuzu eti kebabi, yaninda pilav',
      price: 195.0,
      isSpicy: true,
      spicyLevel: 3,
      isGlutenFree: true,
      isFeatured: true,
      prepTime: 25,
      tags: ['popular', 'spicy', 'chef-special'],
    },
    {
      name: 'Urfa Kebap',
      slug: 'urfa-kebap',
      description: 'Taze kuzu etinden hazirlanan, acisiz Urfa usulu kebap. Yaninda bulgur pilavi ile servis edilir.',
      shortDescription: 'Acisiz kuzu eti kebabi, yaninda bulgur',
      price: 185.0,
      isSpicy: false,
      isGlutenFree: true,
      prepTime: 20,
      tags: ['popular'],
    },
    {
      name: 'Beyti Kebap',
      slug: 'beyti-kebap',
      description: 'Kuzu etinden hazirlanan kebap, lavash ekmegiyle sarilip yogurt ve domates sosu ile servis edilir.',
      shortDescription: 'Lavasli kebap, yogurt soslu',
      price: 225.0,
      isSpicy: true,
      spicyLevel: 2,
      prepTime: 30,
      tags: ['chef-special', 'signature'],
    },
    {
      name: 'Iskender Kebap',
      slug: 'iskender-kebap',
      description: 'Ince dilimli dana doner, ozel pide ekmegi uzerine dizilir. Tereyagi ve domates sosu ile tatlandirilir.',
      shortDescription: 'Doner, pide, yogurt, tereyagi soslu',
      price: 245.0,
      isFeatured: true,
      prepTime: 20,
      tags: ['popular', 'signature', 'must-try'],
    },
    {
      name: 'Kuzu Pirzola',
      slug: 'kuzu-pirzola',
      description: 'Taze kuzu pirzolalari, kozde pisirilir. Yaninda patates pureleri ve mevsim sebzeleri ile servis edilir.',
      shortDescription: 'Kozde kuzu pirzola, sebze garnisi',
      price: 295.0,
      isGlutenFree: true,
      prepTime: 25,
      tags: ['premium'],
    },
    {
      name: 'Tavuk Sis',
      slug: 'tavuk-sis',
      description: 'Marine edilmis tavuk gogsu parcalari, siste kozlenir. Yaninda pilav ve salata ile servis edilir.',
      shortDescription: 'Marine tavuk, pilav ve salata',
      price: 145.0,
      isGlutenFree: true,
      allergens: ['dairy'],
      prepTime: 20,
      tags: ['light'],
    },
  ],
  pideler: [
    {
      name: 'Kiymali Pide',
      slug: 'kiymali-pide',
      description: 'Taze yogurulmus hamur, ozel baharatli dana kiymasi ile. Karadeniz usulu, odun firininda pisirilir.',
      shortDescription: 'Dana kiymali, odun firininda',
      price: 135.0,
      allergens: ['gluten'],
      prepTime: 20,
      tags: ['popular'],
    },
    {
      name: 'Kasarli Pide',
      slug: 'kasarli-pide',
      description: 'Bol kasarli, acik pide. Istenirse yumurta ile.',
      shortDescription: 'Kasarli acik pide',
      price: 115.0,
      allergens: ['gluten', 'dairy'],
      isVegetarian: true,
      prepTime: 15,
      tags: ['vegetarian'],
    },
    {
      name: 'Lahmacun',
      slug: 'lahmacun',
      description: 'Ince acilmis hamur uzerine baharatli kiyma harci. Maydanoz, limon ve ayran ile mukemmel uyum.',
      shortDescription: 'Ince hamur, baharatli kiyma',
      price: 75.0,
      isSpicy: true,
      spicyLevel: 1,
      allergens: ['gluten'],
      prepTime: 12,
      tags: ['popular', 'quick'],
    },
    {
      name: 'Karisik Pide',
      slug: 'karisik-pide',
      description: 'Sucuk, kasar, sosis ve yumurta ile hazirlanan ozel karisik pide.',
      shortDescription: 'Sucuk, kasar, sosis, yumurta',
      price: 155.0,
      allergens: ['gluten', 'dairy', 'eggs'],
      prepTime: 20,
      tags: ['hearty'],
    },
  ],
  mezeler: [
    {
      name: 'Humus',
      slug: 'humus',
      description: 'Nohut ezilip tahin, limon suyu ve zeytinyagi ile harmanlanir. Uzerine sumak ve zeytinyagi gezdirilir.',
      shortDescription: 'Tahinli nohut ezmesi',
      price: 65.0,
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      allergens: ['sesame'],
      tags: ['vegan', 'healthy'],
    },
    {
      name: 'Cacik',
      slug: 'cacik',
      description: 'Suzme yogurt, rendelenmis salatalik, sarimsak, kuru nane ve zeytinyagi ile.',
      shortDescription: 'Yogurtlu salatalik',
      price: 55.0,
      isVegetarian: true,
      isGlutenFree: true,
      allergens: ['dairy'],
      tags: ['vegetarian', 'refreshing'],
    },
    {
      name: 'Patlican Salatasi',
      slug: 'patlican-salatasi',
      description: 'Kozlenmis patlican, sarimsak, zeytinyagi ve limon ile ezilir. Uzerine nar eksilmis.',
      shortDescription: 'Kozlenmis patlican ezmesi',
      price: 70.0,
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      tags: ['vegan', 'smoky'],
    },
    {
      name: 'Sigara Boregi',
      slug: 'sigara-boregi',
      description: 'Ince yufka, beyaz peynir ve maydanoz ile sarilip kizartilir. 6 adet.',
      shortDescription: 'Peynirli sigara boregi (6 adet)',
      price: 85.0,
      isVegetarian: true,
      allergens: ['gluten', 'dairy', 'eggs'],
      tags: ['vegetarian', 'crispy'],
    },
    {
      name: 'Karisik Meze Tabagi',
      slug: 'karisik-meze-tabagi',
      description: 'Humus, cacik, patlican salatasi, haydari, atom ve acili ezme. 2 kisi icin ideal.',
      shortDescription: '6 cesit meze, 2 kisilik',
      price: 175.0,
      isVegetarian: true,
      isFeatured: true,
      tags: ['sharing', 'best-value'],
    },
  ],
  corbalar: [
    {
      name: 'Mercimek Corbasi',
      slug: 'mercimek-corbasi',
      description: 'Kirmizi mercimek, havuc, sogan ve baharatlar ile hazirlanan geleneksel Turk corbasi.',
      shortDescription: 'Geleneksel mercimek corbasi',
      price: 55.0,
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      prepTime: 10,
      tags: ['vegan', 'comfort-food', 'daily'],
    },
    {
      name: 'Ezogelin Corbasi',
      slug: 'ezogelin-corbasi',
      description: 'Kirmizi mercimek, bulgur ve pirinc ile hazirlanan, hafif acili corba.',
      shortDescription: 'Mercimek, bulgur ve pirinc corbasi',
      price: 60.0,
      isVegetarian: true,
      isSpicy: true,
      spicyLevel: 1,
      allergens: ['gluten'],
      prepTime: 12,
      tags: ['vegetarian', 'traditional'],
    },
    {
      name: 'Iskembe Corbasi',
      slug: 'iskembe-corbasi',
      description: 'Geleneksel ishkembe corbasi. Sarimsak, sirke ve pul biber ile servis edilir.',
      shortDescription: 'Klasik ishkembe, sarimsak soslu',
      price: 75.0,
      isGlutenFree: true,
      prepTime: 15,
      tags: ['traditional', 'hearty'],
    },
  ],
  tatlilar: [
    {
      name: 'Baklava',
      slug: 'baklava',
      description: 'Gaziantep usulu fistikli baklava. Ince ince acilmis yufkalar arasinda bol antep fistigi. Kaymak ile servis edilir.',
      shortDescription: 'Antep fistikli, 4 dilim',
      price: 125.0,
      allergens: ['gluten', 'nuts'],
      isFeatured: true,
      tags: ['signature', 'must-try'],
    },
    {
      name: 'Kunefe',
      slug: 'kunefe',
      description: 'Hatay usulu kunefe. Kadayif, ozel peynir ve serbet ile. Antep fistigi ile suslenir.',
      shortDescription: 'Sicak servis, fistikli',
      price: 135.0,
      allergens: ['gluten', 'dairy', 'nuts'],
      prepTime: 15,
      tags: ['hot-dessert', 'signature'],
    },
    {
      name: 'Firinda Sutlac',
      slug: 'firinda-sutlac',
      description: 'Ev yapimi sutlac, firinda kizartilmis. Tarcin ile servis edilir.',
      shortDescription: 'Firinda, tarcin ile',
      price: 75.0,
      isVegetarian: true,
      isGlutenFree: true,
      allergens: ['dairy'],
      tags: ['vegetarian', 'comfort-food'],
    },
    {
      name: 'Kazandibi',
      slug: 'kazandibi',
      description: 'Karamelize tabanli muhallebi. Tavuk gogsu ile yapilan geleneksel Osmanli tatlisi.',
      shortDescription: 'Karamelize muhallebi',
      price: 70.0,
      isVegetarian: true,
      allergens: ['dairy', 'gluten'],
      tags: ['vegetarian', 'traditional'],
    },
  ],
  icecekler: [
    {
      name: 'Ayran',
      slug: 'ayran',
      description: 'Ev yapimi, kopuklu ayran. Taze yogurttan gunluk yapilir.',
      shortDescription: 'Ev yapimi, taze',
      price: 25.0,
      isVegetarian: true,
      isGlutenFree: true,
      allergens: ['dairy'],
      tags: ['refreshing', 'traditional'],
    },
    {
      name: 'Turk Cayi',
      slug: 'turk-cayi',
      description: 'Demlik cayi, ince belli bardakta. Rize cayi, sekersiz servis edilir.',
      shortDescription: 'Rize cayi, ince belli',
      price: 15.0,
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      tags: ['traditional', 'hot'],
    },
    {
      name: 'Turk Kahvesi',
      slug: 'turk-kahvesi',
      description: 'Geleneksel usulde cezvede pisirilen Turk kahvesi. Yaninda lokum ile servis edilir.',
      shortDescription: 'Cezvede pisirilen, lokumlu',
      price: 45.0,
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      tags: ['traditional', 'hot', 'signature'],
    },
    {
      name: 'Ev Yapimi Limonata',
      slug: 'ev-yapimi-limonata',
      description: 'Taze sikilmis limon, nane ve buz ile. Sekersiz de yapilabilir.',
      shortDescription: 'Taze, naneli',
      price: 35.0,
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      tags: ['refreshing', 'homemade'],
    },
    {
      name: 'Salgam Suyu',
      slug: 'salgam-suyu',
      description: 'Adana usulu acili salgam suyu. Kebap yaninda mukemmel.',
      shortDescription: 'Acili, Adana usulu',
      price: 30.0,
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      isSpicy: true,
      spicyLevel: 2,
      tags: ['traditional', 'spicy'],
    },
    {
      name: 'Gazli Icecekler',
      slug: 'gazli-icecekler',
      description: 'Cola, Fanta, Sprite - 330ml sise.',
      shortDescription: 'Cola, Fanta, Sprite',
      price: 30.0,
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      tags: ['cold'],
    },
  ],
}

// Restaurant tables
const TABLES = [
  { name: 'Masa 1', tableNumber: '1', section: 'Ic Mekan', floor: 1, capacity: 4 },
  { name: 'Masa 2', tableNumber: '2', section: 'Ic Mekan', floor: 1, capacity: 4 },
  { name: 'Masa 3', tableNumber: '3', section: 'Ic Mekan', floor: 1, capacity: 2 },
  { name: 'Masa 4', tableNumber: '4', section: 'Ic Mekan', floor: 1, capacity: 6 },
  { name: 'Masa 5', tableNumber: '5', section: 'Bahce', floor: 1, capacity: 4 },
  { name: 'VIP Salon', tableNumber: 'VIP', section: 'VIP', floor: 2, capacity: 12 },
]

// =====================================================
// SEEDING FUNCTIONS
// =====================================================

async function createDemoUser(): Promise<string | null> {
  console.log('\n1. Creating demo user...')

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === DEMO_USER_EMAIL)

  if (existingUser) {
    console.log(`   Demo user already exists: ${DEMO_USER_EMAIL}`)
    return existingUser.id
  }

  // Create new user
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: DEMO_USER_NAME,
    },
  })

  if (error) {
    console.error('   Error creating demo user:', error.message)
    return null
  }

  console.log(`   Created demo user: ${DEMO_USER_EMAIL}`)
  return newUser.user?.id ?? null
}

async function createOrganization(userId: string, data: typeof RESTAURANT_DATA.main): Promise<string | null> {
  console.log(`\n2. Creating organization: ${data.name}...`)

  // Check if org already exists
  const { data: existingOrg } = await supabase.from('organizations').select('id').eq('slug', data.slug).single()

  if (existingOrg) {
    console.log(`   Organization already exists: ${data.slug}`)
    return existingOrg.id
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description,
      owner_id: userId,
      subscription_tier: data.subscriptionTier,
      subscription_status: 'active',
      primary_color: data.primaryColor,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      city: data.city,
      district: data.district,
      timezone: 'Europe/Istanbul',
      currency: 'TRY',
      language: 'tr',
      business_hours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '00:00' },
        saturday: { open: '10:00', close: '00:00' },
        sunday: { open: '10:00', close: '22:00' },
      },
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`   Error creating organization: ${error.message}`)
    return null
  }

  console.log(`   Created organization: ${data.slug} (${org.id})`)
  return org.id
}

async function createCategories(orgId: string): Promise<Record<string, string>> {
  console.log('\n3. Creating menu categories...')

  const categoryIds: Record<string, string> = {}

  for (const category of CATEGORIES) {
    // Check if exists
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('organization_id', orgId)
      .eq('slug', category.slug)
      .single()

    if (existing) {
      categoryIds[category.slug] = existing.id
      console.log(`   Category exists: ${category.name}`)
      continue
    }

    const { data: cat, error } = await supabase
      .from('categories')
      .insert({
        organization_id: orgId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        sort_order: category.sortOrder,
        is_visible: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`   Error creating category ${category.name}: ${error.message}`)
      continue
    }

    categoryIds[category.slug] = cat.id
    console.log(`   Created category: ${category.name}`)
  }

  return categoryIds
}

async function createProducts(orgId: string, categoryIds: Record<string, string>): Promise<void> {
  console.log('\n4. Creating menu products...')

  let totalProducts = 0

  for (const [categorySlug, products] of Object.entries(PRODUCTS)) {
    const categoryId = categoryIds[categorySlug]
    if (!categoryId) {
      console.log(`   Skipping ${categorySlug} - category not found`)
      continue
    }

    for (let i = 0; i < products.length; i++) {
      const product = products[i]

      // Check if exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', orgId)
        .eq('slug', product.slug)
        .single()

      if (existing) {
        continue
      }

      const { error } = await supabase.from('products').insert({
        organization_id: orgId,
        category_id: categoryId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.shortDescription,
        price: product.price,
        status: 'active',
        is_available: true,
        sort_order: i + 1,
        preparation_time_minutes: product.prepTime,
        is_spicy: product.isSpicy ?? false,
        spicy_level: product.spicyLevel ?? 0,
        is_vegetarian: product.isVegetarian ?? false,
        is_vegan: product.isVegan ?? false,
        is_gluten_free: product.isGlutenFree ?? false,
        is_featured: product.isFeatured ?? false,
        allergens: product.allergens ?? [],
        tags: product.tags ?? [],
      })

      if (error) {
        console.error(`   Error creating product ${product.name}: ${error.message}`)
        continue
      }

      totalProducts++
    }
  }

  console.log(`   Created ${totalProducts} products`)
}

async function createTables(orgId: string): Promise<void> {
  console.log('\n5. Creating restaurant tables...')

  for (let i = 0; i < TABLES.length; i++) {
    const table = TABLES[i]

    // Check if exists
    const { data: existing } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', table.name)
      .single()

    if (existing) {
      console.log(`   Table exists: ${table.name}`)
      continue
    }

    const { error } = await supabase.from('restaurant_tables').insert({
      organization_id: orgId,
      name: table.name,
      table_number: table.tableNumber,
      section: table.section,
      floor: table.floor,
      capacity: table.capacity,
      sort_order: i + 1,
      status: 'available',
      qr_uuid: randomUUID(),
    })

    if (error) {
      console.error(`   Error creating table ${table.name}: ${error.message}`)
      continue
    }

    console.log(`   Created table: ${table.name}`)
  }
}

async function cleanExistingData(): Promise<void> {
  console.log('\nCleaning existing demo data...')

  // Find demo organizations by slug
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .in('slug', [RESTAURANT_DATA.main.slug, RESTAURANT_DATA.secondary.slug])

  if (orgs && orgs.length > 0) {
    const orgIds = orgs.map(o => o.id)

    // Delete in correct order due to foreign keys
    await supabase.from('order_items').delete().in('organization_id', orgIds)
    await supabase.from('orders').delete().in('organization_id', orgIds)
    await supabase.from('service_requests').delete().in('organization_id', orgIds)
    await supabase.from('restaurant_tables').delete().in('organization_id', orgIds)
    await supabase.from('modifier_options').delete().in('organization_id', orgIds)
    await supabase.from('product_modifiers').delete().in('organization_id', orgIds)
    // Note: price_ledger cannot be deleted due to immutability triggers
    await supabase.from('products').delete().in('organization_id', orgIds)
    await supabase.from('categories').delete().in('organization_id', orgIds)
    await supabase.from('memberships').delete().in('organization_id', orgIds)
    await supabase.from('organizations').delete().in('id', orgIds)

    console.log('   Deleted existing demo organizations and related data')
  }

  // Delete demo user
  const { data: users } = await supabase.auth.admin.listUsers()
  const demoUser = users?.users?.find(u => u.email === DEMO_USER_EMAIL)
  if (demoUser) {
    await supabase.auth.admin.deleteUser(demoUser.id)
    console.log('   Deleted demo user')
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main(): Promise<void> {
  console.log('========================================')
  console.log('E-Menum Demo Data Seeder')
  console.log('========================================')

  const shouldClean = process.argv.includes('--clean')

  if (shouldClean) {
    await cleanExistingData()
  }

  try {
    // 1. Create demo user
    const userId = await createDemoUser()
    if (!userId) {
      console.error('\nFailed to create demo user. Exiting.')
      process.exit(1)
    }

    // 2. Create main organization
    const orgId = await createOrganization(userId, RESTAURANT_DATA.main)
    if (!orgId) {
      console.error('\nFailed to create organization. Exiting.')
      process.exit(1)
    }

    // 3. Create categories
    const categoryIds = await createCategories(orgId)

    // 4. Create products
    await createProducts(orgId, categoryIds)

    // 5. Create tables
    await createTables(orgId)

    // 6. Create secondary organization (simple cafe)
    await createOrganization(userId, RESTAURANT_DATA.secondary)

    console.log('\n========================================')
    console.log('Seed data inserted successfully!')
    console.log('========================================')
    console.log('\nDemo Credentials:')
    console.log(`  Email: ${DEMO_USER_EMAIL}`)
    console.log(`  Password: ${DEMO_USER_PASSWORD}`)
    console.log('\nDemo Restaurants:')
    console.log(`  1. ${RESTAURANT_DATA.main.name}`)
    console.log(`     URL: /r/${RESTAURANT_DATA.main.slug}`)
    console.log(`  2. ${RESTAURANT_DATA.secondary.name}`)
    console.log(`     URL: /r/${RESTAURANT_DATA.secondary.slug}`)
    console.log('\n')
  } catch (error) {
    console.error('\nUnexpected error:', error)
    process.exit(1)
  }
}

main()
