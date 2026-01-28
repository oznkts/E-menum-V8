'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateOrganizationState {
  error?: string
}

const organizationSchema = z.object({
  name: z.string().min(2, 'Restoran adı en az 2 karakter olmalıdır.').max(80),
  slug: z
    .string()
    .max(63)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug sadece küçük harf, sayı ve tire içerebilir.')
    .optional(),
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

export async function createOrganization(
  _prevState: CreateOrganizationState,
  formData: FormData
): Promise<CreateOrganizationState> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login')
  }

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
  }

  const parsed = organizationSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Geçersiz giriş.' }
  }

  const slug = parsed.data.slug || generateSlug(parsed.data.name)

  // Create organization
  // Note: A database trigger automatically creates owner membership
  const { error: orgError } = await supabase.from('organizations').insert({
    name: parsed.data.name,
    slug,
    owner_id: authData.user.id,
    is_active: true,
  })

  if (orgError) {
    if (orgError.code === '23505') {
      return { error: 'Bu slug zaten kullanılıyor. Lütfen farklı bir slug seçin.' }
    }
    return { error: orgError.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
