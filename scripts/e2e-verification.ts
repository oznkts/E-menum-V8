#!/usr/bin/env tsx
/**
 * E2E Verification Script for E-Menum Platform
 *
 * This script performs end-to-end verification of the complete flow:
 * 1. Register new restaurant owner
 * 2. Create menu categories and products
 * 3. Generate QR code for table
 * 4. Scan QR and view public menu
 * 5. Add items to cart and submit order
 * 6. Verify order appears in dashboard
 * 7. Update order status
 * 8. Verify customer can call waiter
 *
 * Usage:
 *   npx tsx scripts/e2e-verification.ts
 *   npx tsx scripts/e2e-verification.ts --step 3  # Run specific step
 *   npx tsx scripts/e2e-verification.ts --check   # Only verify structure
 *
 * Prerequisites:
 *   - Supabase running (local or cloud)
 *   - Environment variables configured (.env.local)
 *   - npm install completed
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message: string) {
  log(`✓ ${message}`, 'green')
}

function error(message: string) {
  log(`✗ ${message}`, 'red')
}

function info(message: string) {
  log(`ℹ ${message}`, 'blue')
}

function step(num: number, message: string) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(`STEP ${num}: ${message}`, 'cyan')
  log('='.repeat(60), 'cyan')
}

// Verification results
interface VerificationResult {
  step: number
  name: string
  passed: boolean
  message: string
  details?: Record<string, unknown>
}

const results: VerificationResult[] = []

// Test data
const testData = {
  owner: {
    email: `e2e-test-${Date.now()}@test.com`,
    password: 'TestPassword123!',
    firstName: 'E2E',
    lastName: 'Tester',
  },
  organization: {
    name: 'E2E Test Restaurant',
    slug: `e2e-test-${Date.now()}`,
  },
  category: {
    name: 'Ana Yemekler',
    description: 'E2E test kategorisi',
    is_visible: true,
  },
  product: {
    name: 'Test Ürün',
    description: 'E2E test ürünü açıklaması',
    price: 125.00,
    is_available: true,
  },
  table: {
    name: 'Masa 1',
    capacity: 4,
    section: 'İç Mekan',
  },
}

async function verifyEnvironment(): Promise<boolean> {
  info('Checking environment variables...')

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    error(`Missing environment variables: ${missing.join(', ')}`)
    error('Please configure .env.local with Supabase credentials')
    return false
  }

  success('All environment variables configured')
  return true
}

async function step1_RegisterOwner(): Promise<VerificationResult> {
  step(1, 'Register new restaurant owner')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create user via admin API
    info(`Creating user: ${testData.owner.email}`)
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: testData.owner.email,
      password: testData.owner.password,
      email_confirm: true,
      user_metadata: {
        first_name: testData.owner.firstName,
        last_name: testData.owner.lastName,
      },
    })

    if (createError) throw createError

    success(`User created: ${user.user?.id}`)

    // Create organization
    info(`Creating organization: ${testData.organization.name}`)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: testData.organization.name,
        slug: testData.organization.slug,
        owner_id: user.user?.id,
        is_active: true,
      })
      .select()
      .single()

    if (orgError) throw orgError

    success(`Organization created: ${org.id}`)

    // Store for later steps
    testData.owner = { ...testData.owner, id: user.user?.id } as typeof testData.owner & { id: string }
    testData.organization = { ...testData.organization, id: org.id } as typeof testData.organization & { id: string }

    return {
      step: 1,
      name: 'Register restaurant owner',
      passed: true,
      message: 'Owner and organization created successfully',
      details: { userId: user.user?.id, orgId: org.id },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Registration failed: ${message}`)
    return {
      step: 1,
      name: 'Register restaurant owner',
      passed: false,
      message: `Failed: ${message}`,
    }
  }
}

async function step2_CreateMenuItems(): Promise<VerificationResult> {
  step(2, 'Create menu categories and products')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const orgId = (testData.organization as { id: string }).id

    // Create category
    info(`Creating category: ${testData.category.name}`)
    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert({
        organization_id: orgId,
        name: testData.category.name,
        description: testData.category.description,
        is_visible: testData.category.is_visible,
        sort_order: 0,
      })
      .select()
      .single()

    if (catError) throw catError

    success(`Category created: ${category.id}`)

    // Create product
    info(`Creating product: ${testData.product.name}`)
    const { data: product, error: prodError } = await supabase
      .from('products')
      .insert({
        organization_id: orgId,
        category_id: category.id,
        name: testData.product.name,
        description: testData.product.description,
        price: testData.product.price,
        is_available: testData.product.is_available,
        status: 'active',
        sort_order: 0,
      })
      .select()
      .single()

    if (prodError) throw prodError

    success(`Product created: ${product.id}`)

    // Verify price ledger entry was created
    info('Verifying price ledger entry...')
    const { data: priceEntry, error: priceError } = await supabase
      .from('price_ledger')
      .select('*')
      .eq('product_id', product.id)
      .single()

    if (priceError) throw priceError

    success(`Price ledger entry created: ${priceEntry.id} (${priceEntry.price} TRY)`)

    testData.category = { ...testData.category, id: category.id } as typeof testData.category & { id: string }
    testData.product = { ...testData.product, id: product.id } as typeof testData.product & { id: string }

    return {
      step: 2,
      name: 'Create menu items',
      passed: true,
      message: 'Category, product, and price ledger entry created',
      details: {
        categoryId: category.id,
        productId: product.id,
        priceLedgerId: priceEntry.id,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Menu creation failed: ${message}`)
    return {
      step: 2,
      name: 'Create menu items',
      passed: false,
      message: `Failed: ${message}`,
    }
  }
}

async function step3_GenerateQRCode(): Promise<VerificationResult> {
  step(3, 'Generate QR code for table')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const orgId = (testData.organization as { id: string }).id

    // Create table with QR UUID
    info(`Creating table: ${testData.table.name}`)
    const { data: table, error: tableError } = await supabase
      .from('restaurant_tables')
      .insert({
        organization_id: orgId,
        name: testData.table.name,
        table_number: 1,
        capacity: testData.table.capacity,
        section: testData.table.section,
        status: 'available',
        is_active: true,
        // qr_uuid is auto-generated
      })
      .select()
      .single()

    if (tableError) throw tableError

    success(`Table created: ${table.id}`)
    success(`QR UUID generated: ${table.qr_uuid}`)

    // Construct QR URL
    const qrUrl = `${SUPABASE_URL.replace('.supabase.co', '')}/r/${testData.organization.slug}/${table.qr_uuid}`
    info(`QR Code URL: ${qrUrl}`)

    testData.table = { ...testData.table, id: table.id, qr_uuid: table.qr_uuid } as typeof testData.table & { id: string; qr_uuid: string }

    return {
      step: 3,
      name: 'Generate QR code',
      passed: true,
      message: 'Table created with QR UUID',
      details: {
        tableId: table.id,
        qrUuid: table.qr_uuid,
        qrUrl,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`QR generation failed: ${message}`)
    return {
      step: 3,
      name: 'Generate QR code',
      passed: false,
      message: `Failed: ${message}`,
    }
  }
}

async function step4_ViewPublicMenu(): Promise<VerificationResult> {
  step(4, 'Verify public menu is accessible')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const orgSlug = testData.organization.slug

    // Fetch organization (public read)
    info(`Fetching organization by slug: ${orgSlug}`)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, is_active')
      .eq('slug', orgSlug)
      .eq('is_active', true)
      .single()

    if (orgError) throw orgError

    success(`Organization found: ${org.name}`)

    // Fetch categories (public read)
    info('Fetching public categories...')
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, description')
      .eq('organization_id', org.id)
      .eq('is_visible', true)
      .is('deleted_at', null)

    if (catError) throw catError

    success(`Found ${categories.length} visible categories`)

    // Fetch products (public read)
    info('Fetching public products...')
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, price, is_available')
      .eq('organization_id', org.id)
      .eq('status', 'active')
      .eq('is_available', true)
      .is('deleted_at', null)

    if (prodError) throw prodError

    success(`Found ${products.length} available products`)

    return {
      step: 4,
      name: 'View public menu',
      passed: true,
      message: 'Public menu accessible with categories and products',
      details: {
        organization: org.name,
        categoriesCount: categories.length,
        productsCount: products.length,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Public menu fetch failed: ${message}`)
    return {
      step: 4,
      name: 'View public menu',
      passed: false,
      message: `Failed: ${message}`,
    }
  }
}

async function step5_SubmitOrder(): Promise<VerificationResult> {
  step(5, 'Add items to cart and submit order')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const orgId = (testData.organization as { id: string }).id
    const tableId = (testData.table as { id: string; qr_uuid: string }).id
    const productId = (testData.product as { id: string }).id

    // Get current price from ledger
    info('Fetching current price from ledger...')
    const { data: priceData, error: priceError } = await supabase
      .from('price_ledger')
      .select('id, price')
      .eq('product_id', productId)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    if (priceError) throw priceError

    success(`Current price: ${priceData.price} TRY`)

    // Create order
    info('Creating order...')
    const orderData = {
      organization_id: orgId,
      table_id: tableId,
      order_type: 'dine_in',
      status: 'pending',
      customer_name: 'E2E Test Customer',
      customer_notes: 'Test order from E2E verification',
      subtotal: priceData.price,
      total_amount: priceData.price,
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) throw orderError

    success(`Order created: ${order.id} (${order.order_number})`)

    // Create order item
    info('Adding item to order...')
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: productId,
        product_name: testData.product.name,
        quantity: 1,
        unit_price: priceData.price,
        total_price: priceData.price,
        price_ledger_id: priceData.id,
        status: 'pending',
      })
      .select()
      .single()

    if (itemError) throw itemError

    success(`Order item added: ${orderItem.id}`)

    testData.order = { id: order.id, order_number: order.order_number } as { id: string; order_number: string }

    return {
      step: 5,
      name: 'Submit order',
      passed: true,
      message: 'Order submitted successfully',
      details: {
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Order submission failed: ${message}`)
    return {
      step: 5,
      name: 'Submit order',
      passed: false,
      message: `Failed: ${message}`,
    }
  }
}

async function step6_VerifyOrderInDashboard(): Promise<VerificationResult> {
  step(6, 'Verify order appears in dashboard')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const orderId = ((testData as { order?: { id: string } }).order as { id: string }).id

    // Fetch order with items
    info(`Fetching order: ${orderId}`)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        restaurant_tables (name)
      `)
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError

    success(`Order found: ${order.order_number}`)
    success(`Status: ${order.status}`)
    success(`Items: ${order.order_items?.length || 0}`)
    success(`Table: ${order.restaurant_tables?.name}`)

    return {
      step: 6,
      name: 'Verify order in dashboard',
      passed: true,
      message: 'Order visible in dashboard with all details',
      details: {
        orderNumber: order.order_number,
        status: order.status,
        itemCount: order.order_items?.length || 0,
        tableName: order.restaurant_tables?.name,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Dashboard verification failed: ${message}`)
    return {
      step: 6,
      name: 'Verify order in dashboard',
      passed: false,
      message: `Failed: ${message}`,
    }
  }
}

async function step7_UpdateOrderStatus(): Promise<VerificationResult> {
  step(7, 'Update order status')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const orderId = ((testData as { order?: { id: string } }).order as { id: string }).id

    // Update to confirmed
    info('Updating order status: pending -> confirmed')
    const { error: confirmError } = await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId)

    if (confirmError) throw confirmError
    success('Order confirmed')

    // Update to preparing
    info('Updating order status: confirmed -> preparing')
    const { error: prepareError } = await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderId)

    if (prepareError) throw prepareError
    success('Order preparing')

    // Update to ready
    info('Updating order status: preparing -> ready')
    const { data: updatedOrder, error: readyError } = await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId)
      .select()
      .single()

    if (readyError) throw readyError
    success(`Order ready: ${updatedOrder.status}`)

    return {
      step: 7,
      name: 'Update order status',
      passed: true,
      message: 'Order status updated through full lifecycle',
      details: {
        finalStatus: updatedOrder.status,
        statusHistory: ['pending', 'confirmed', 'preparing', 'ready'],
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Status update failed: ${message}`)
    return {
      step: 7,
      name: 'Update order status',
      passed: false,
      message: `Failed: ${message}`,
    }
  }
}

async function step8_VerifyWaiterCall(): Promise<VerificationResult> {
  step(8, 'Verify customer can call waiter')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const orgId = (testData.organization as { id: string }).id
    const tableId = (testData.table as { id: string }).id

    // Create service request (waiter call)
    info('Creating waiter call service request...')
    const { data: request, error: reqError } = await supabase
      .from('service_requests')
      .insert({
        organization_id: orgId,
        table_id: tableId,
        request_type: 'call_waiter',
        status: 'pending',
        notes: 'E2E test waiter call',
      })
      .select()
      .single()

    if (reqError) throw reqError

    success(`Service request created: ${request.id}`)
    success(`Type: ${request.request_type}`)
    success(`Status: ${request.status}`)

    // Verify staff can see and respond
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    info('Staff responding to service request...')
    const { data: updatedReq, error: updateError } = await adminSupabase
      .from('service_requests')
      .update({
        status: 'acknowledged',
        responded_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .select()
      .single()

    if (updateError) throw updateError

    success(`Request acknowledged: ${updatedReq.status}`)

    return {
      step: 8,
      name: 'Verify waiter call',
      passed: true,
      message: 'Waiter call created and acknowledged by staff',
      details: {
        requestId: request.id,
        requestType: request.request_type,
        finalStatus: updatedReq.status,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error(`Waiter call failed: ${message}`)
    return {
      step: 8,
      name: 'Verify waiter call',
      passed: false,
      message: `Failed: ${message}`,
    }
  }
}

async function cleanup(): Promise<void> {
  info('\nCleaning up test data...')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const userId = (testData.owner as { id?: string }).id
    const orgId = (testData.organization as { id?: string }).id

    if (orgId) {
      // Delete in correct order due to FK constraints
      await supabase.from('service_requests').delete().eq('organization_id', orgId)
      await supabase.from('order_items').delete().match({ order_id: ((testData as { order?: { id: string } }).order as { id: string })?.id })
      await supabase.from('orders').delete().eq('organization_id', orgId)
      await supabase.from('restaurant_tables').delete().eq('organization_id', orgId)
      await supabase.from('price_ledger').delete().eq('organization_id', orgId)
      await supabase.from('products').delete().eq('organization_id', orgId)
      await supabase.from('categories').delete().eq('organization_id', orgId)
      await supabase.from('memberships').delete().eq('organization_id', orgId)
      await supabase.from('organizations').delete().eq('id', orgId)
    }

    if (userId) {
      await supabase.from('profiles').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
    }

    success('Test data cleaned up')
  } catch (err) {
    error(`Cleanup failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function printSummary(): Promise<void> {
  log('\n' + '='.repeat(60), 'cyan')
  log('E2E VERIFICATION SUMMARY', 'cyan')
  log('='.repeat(60), 'cyan')

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗'
    const color = result.passed ? 'green' : 'red'
    log(`${icon} Step ${result.step}: ${result.name} - ${result.message}`, color)
  }

  log('\n' + '-'.repeat(60))
  log(`Total: ${passed} passed, ${failed} failed out of ${results.length} steps`)

  if (failed === 0) {
    log('\n🎉 ALL E2E VERIFICATION STEPS PASSED! 🎉', 'green')
  } else {
    log('\n⚠️ SOME VERIFICATION STEPS FAILED', 'red')
  }
}

async function main(): Promise<void> {
  log('\n🔍 E-Menum E2E Verification Script', 'cyan')
  log('=' + '='.repeat(59), 'cyan')

  const args = process.argv.slice(2)
  const checkOnly = args.includes('--check')
  const stepArg = args.find((a) => a.startsWith('--step'))
  const specificStep = stepArg ? parseInt(stepArg.split('=')[1] || args[args.indexOf('--step') + 1]) : null

  // Check environment
  const envOk = await verifyEnvironment()

  if (checkOnly) {
    info('Structure check mode - verifying files exist...')
    // Just verify file structure
    const fs = await import('fs')
    const requiredFiles = [
      'src/app/(auth)/login/page.tsx',
      'src/app/(auth)/register/page.tsx',
      'src/app/(dashboard)/dashboard/categories/page.tsx',
      'src/app/(dashboard)/dashboard/products/page.tsx',
      'src/app/(dashboard)/dashboard/orders/page.tsx',
      'src/app/(dashboard)/dashboard/qr-codes/page.tsx',
      'src/app/(public)/r/[slug]/page.tsx',
      'src/app/(public)/r/[slug]/[tableId]/page.tsx',
      'src/components/features/public-menu/cart-drawer.tsx',
      'src/components/features/public-menu/checkout-form.tsx',
      'src/components/features/public-menu/waiter-call-button.tsx',
      'src/lib/actions/auth.ts',
      'src/lib/actions/menu.ts',
      'src/lib/actions/orders.ts',
      'src/lib/actions/service-requests.ts',
      'src/lib/dal/categories.ts',
      'src/lib/dal/products.ts',
      'src/lib/dal/orders.ts',
      'supabase/migrations/001_core_tables.sql',
      'supabase/migrations/004_order_tables.sql',
    ]

    let allExist = true
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        success(`Found: ${file}`)
      } else {
        error(`Missing: ${file}`)
        allExist = false
      }
    }

    if (allExist) {
      log('\n✅ All required files exist!', 'green')
    } else {
      log('\n❌ Some files are missing!', 'red')
      process.exit(1)
    }
    return
  }

  if (!envOk) {
    error('Environment check failed. Cannot proceed with E2E tests.')
    process.exit(1)
  }

  // Run all steps or specific step
  const steps = [
    step1_RegisterOwner,
    step2_CreateMenuItems,
    step3_GenerateQRCode,
    step4_ViewPublicMenu,
    step5_SubmitOrder,
    step6_VerifyOrderInDashboard,
    step7_UpdateOrderStatus,
    step8_VerifyWaiterCall,
  ]

  try {
    if (specificStep) {
      info(`Running only step ${specificStep}...`)
      if (specificStep < 1 || specificStep > steps.length) {
        error(`Invalid step: ${specificStep}. Must be 1-${steps.length}`)
        process.exit(1)
      }
      const result = await steps[specificStep - 1]()
      results.push(result)
    } else {
      for (const stepFn of steps) {
        const result = await stepFn()
        results.push(result)

        // Stop on first failure
        if (!result.passed) {
          error('Stopping due to failure')
          break
        }
      }
    }
  } finally {
    // Always cleanup
    if (!checkOnly) {
      await cleanup()
    }
  }

  await printSummary()

  // Exit with error if any step failed
  if (results.some((r) => !r.passed)) {
    process.exit(1)
  }
}

main().catch((err) => {
  error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
