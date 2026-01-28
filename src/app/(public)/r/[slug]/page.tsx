import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { createClient } from '@/lib/supabase/server'
import { MenuView, MenuSkeleton } from '@/components/features/public-menu/menu-view'

// =============================================================================
// TYPES
// =============================================================================

interface PublicMenuPageProps {
  params: Promise<{
    slug: string
  }>
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({
  params,
}: PublicMenuPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: organization } = await supabase
    .from('organizations')
    .select('name, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (!organization) {
    return {
      title: 'Restoran Bulunamadı',
      description: 'Bu restoran mevcut değil veya artık aktif değil.',
    }
  }

  return {
    title: `${organization.name} - Menü`,
    description: organization.description || `${organization.name} dijital menüsü - E-Menum ile görüntüleyin`,
    openGraph: {
      title: `${organization.name} - Dijital Menü`,
      description: organization.description || `${organization.name} menüsünü keşfedin`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${organization.name} - Dijital Menü`,
      description: organization.description || `${organization.name} menüsünü keşfedin`,
    },
  }
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getMenuData(slug: string) {
  const supabase = await createClient()

  // Fetch organization by slug
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (orgError || !organization) {
    return null
  }

  // Fetch visible categories for this organization
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_visible', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (catError) {
    return { organization, categories: [], products: [] }
  }

  // Fetch available products for this organization
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('is_available', true)
    .in('status', ['active'])
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (prodError) {
    return { organization, categories: categories || [], products: [] }
  }

  return {
    organization,
    categories: categories || [],
    products: products || [],
  }
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

/**
 * Public Menu Page
 *
 * Displays the restaurant's public menu for customers scanning QR codes.
 * Features:
 * - Dynamic metadata for SEO and social sharing
 * - Server-side data fetching for fast initial load
 * - Mobile-optimized responsive design
 * - Accessible navigation and content
 *
 * URL Pattern: /r/[slug] (e.g., /r/demo-restaurant)
 *
 * @see MOBILE-FIRST-TALIMATNAME-v3.md for design guidelines
 */
export default async function PublicMenuPage({ params }: PublicMenuPageProps) {
  const { slug } = await params
  const data = await getMenuData(slug)

  if (!data) {
    notFound()
  }

  const { organization, categories, products } = data

  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuView
        organization={organization}
        categories={categories}
        products={products}
      />
    </Suspense>
  )
}

// =============================================================================
// STATIC GENERATION (Optional - for popular restaurants)
// =============================================================================

// Uncomment to enable static generation for specific slugs
// export async function generateStaticParams() {
//   const supabase = await createClient()
//   const { data: organizations } = await supabase
//     .from('organizations')
//     .select('slug')
//     .eq('is_active', true)
//     .limit(100)
//
//   return (organizations || []).map((org) => ({
//     slug: org.slug,
//   }))
// }
