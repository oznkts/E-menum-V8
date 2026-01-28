'use client'

/**
 * Billing Settings Page
 *
 * Subscription management, plan details, usage tracking, and invoice history.
 *
 * Features:
 * - Current plan overview
 * - Usage statistics
 * - Plan comparison and upgrade
 * - Invoice history
 * - Payment method management
 * - Turkish UI
 *
 * @see SETTINGS-PAGES-TALIMATNAME.md
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/lib/hooks/use-organization'
import { useToast } from '@/lib/hooks/use-toast'
import { requestPlanChange } from '@/lib/actions/settings'
import type { BillingSettings } from '@/lib/types/settings'

// =============================================================================
// ICONS
// =============================================================================

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// =============================================================================
// TYPES
// =============================================================================

interface Plan {
  id: string
  name: string
  price: number
  features: string[]
  highlighted?: boolean
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
}

// =============================================================================
// MOCK DATA
// =============================================================================

const plans: Plan[] = [
  {
    id: 'lite',
    name: 'Lite',
    price: 299,
    features: ['50 ürün', '2 kullanıcı', 'Temel analitik', 'Email destek'],
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 599,
    features: ['200 ürün', '5 kullanıcı', 'Gelişmiş analitik', 'Öncelikli destek', 'QR kod markalama'],
    highlighted: true,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 999,
    features: ['Sınırsız ürün', '15 kullanıcı', 'AI özellikleri', '7/24 destek', 'Özel entegrasyonlar'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    features: ['Sınırsız her şey', 'Sınırsız kullanıcı', 'Özel geliştirme', 'SLA garantisi', 'Dedicated hesap yöneticisi'],
  },
]

const invoices: Invoice[] = [
  { id: 'INV-2024-001', date: '2024-01-15', amount: 599, status: 'paid' },
  { id: 'INV-2023-012', date: '2023-12-15', amount: 599, status: 'paid' },
  { id: 'INV-2023-011', date: '2023-11-15', amount: 599, status: 'paid' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BillingSettingsPage() {
  const { currentOrg, isLoading } = useOrganization()
  const { toast } = useToast()

  const [isUpgrading, setIsUpgrading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const currentPlan = plans.find((p) => p.id === currentOrg?.subscription_tier) || plans[0]
  const pendingPlan = useMemo(() => {
    const settings = (currentOrg?.settings ?? {}) as Record<string, BillingSettings>
    return settings.billing?.pendingPlanId
  }, [currentOrg])

  const handleUpgrade = async (planId: string) => {
    if (!currentOrg) {
      toast({
        title: 'Hata',
        description: 'Organizasyon bilgisi bulunamadı',
        variant: 'destructive',
      })
      return
    }

    setSelectedPlan(planId)
    setIsUpgrading(true)
    try {
      const result = await requestPlanChange({
        organizationId: currentOrg.id,
        planId,
      })

      if (!result.success) {
        throw new Error(result.error || result.message)
      }

      toast({ title: 'Başarılı', description: result.message })
    } catch (error) {
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Plan değiştirilemedi',
        variant: 'destructive',
      })
    } finally {
      setIsUpgrading(false)
      setSelectedPlan(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="sr-only">Geri</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abonelik & Fatura</h1>
          <p className="text-muted-foreground">
            Plan detayları, kullanım ve fatura geçmişinizi yönetin
          </p>
        </div>
      </div>

      {/* Current Plan */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                Mevcut Planınız: {currentPlan.name}
              </CardTitle>
              <CardDescription>
                Sonraki fatura tarihi: 15 Şubat 2024
              </CardDescription>
              {pendingPlan && (
                <p className="mt-2 text-sm text-orange-600">
                  Bekleyen plan değişikliği: {pendingPlan.toUpperCase()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {currentPlan.price > 0 ? (
                  <>₺{currentPlan.price}<span className="text-sm font-normal text-muted-foreground">/ay</span></>
                ) : (
                  'Özel Fiyat'
                )}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {currentPlan.features.map((feature, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm">
                <CheckIcon className="h-3 w-3 text-primary" />
                {feature}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanım İstatistikleri</CardTitle>
          <CardDescription>Bu ay kullanımınız</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
              <p className="text-sm text-muted-foreground">Ürün Sayısı</p>
              <p className="text-2xl font-bold">87 / 200</p>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-2 rounded-full bg-primary" style={{ width: '43.5%' }} />
              </div>
            </div>
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
              <p className="text-sm text-muted-foreground">Kullanıcılar</p>
              <p className="text-2xl font-bold">3 / 5</p>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-2 rounded-full bg-primary" style={{ width: '60%' }} />
              </div>
            </div>
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
              <p className="text-sm text-muted-foreground">API İstekleri</p>
              <p className="text-2xl font-bold">12.4K / 50K</p>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-2 rounded-full bg-primary" style={{ width: '24.8%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Planları Karşılaştır</CardTitle>
          <CardDescription>İhtiyaçlarınıza uygun planı seçin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentOrg?.subscription_tier
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border-2 p-4 ${
                    plan.highlighted
                      ? 'border-primary bg-primary/5'
                      : isCurrent
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-border'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-white">
                      Popüler
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-0.5 text-xs font-medium text-white">
                      Mevcut Plan
                    </span>
                  )}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="mt-2 text-2xl font-bold">
                    {plan.price > 0 ? `₺${plan.price}` : 'İletişime Geçin'}
                    {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/ay</span>}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckIcon className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4 w-full"
                    variant={isCurrent ? 'outline' : plan.highlighted ? 'default' : 'outline'}
                    disabled={isCurrent || isUpgrading}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isUpgrading && selectedPlan === plan.id
                      ? 'İşleniyor...'
                      : isCurrent
                      ? 'Mevcut Plan'
                      : plan.price === 0
                      ? 'İletişime Geç'
                      : 'Yükselt'}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Fatura Geçmişi</CardTitle>
          <CardDescription>Son faturaları görüntüleyin ve indirin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{invoice.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(invoice.date).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : invoice.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {invoice.status === 'paid' ? 'Ödendi' : invoice.status === 'pending' ? 'Beklemede' : 'Gecikmiş'}
                  </span>
                  <p className="font-medium">₺{invoice.amount}</p>
                  <Button variant="ghost" size="sm">
                    <DownloadIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Ödeme Yöntemi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-16 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                <span className="text-sm font-bold">VISA</span>
              </div>
              <div>
                <p className="font-medium">**** **** **** 4242</p>
                <p className="text-sm text-muted-foreground">Son kullanma: 12/2025</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Değiştir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
