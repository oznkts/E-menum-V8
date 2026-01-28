'use client'

import { useActionState } from 'react'
import { createOrganization } from '@/lib/actions/organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const initialState = { error: undefined as string | undefined }

export default function NewRestaurantPage() {
  const [state, formAction] = useActionState(createOrganization, initialState)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Yeni Restoran Oluştur</CardTitle>
          <CardDescription>
            Yönetim paneli için yeni bir organizasyon ekleyin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restoran Adı</Label>
              <Input id="name" name="name" placeholder="Örn: Anadolu Sofrası" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (opsiyonel)</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="anadolu-sofrasi"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <p className="text-xs text-muted-foreground">
                Boş bırakırsanız restoran adına göre otomatik oluşturulur.
              </p>
            </div>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" className="w-full">
              Organizasyon Oluştur
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
