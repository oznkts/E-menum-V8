"use client"

import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { useThemeContext } from '@/components/providers/theme-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChefHat,
  Globe2,
  HandPlatter,
  Mail,
  MapPin,
  Moon,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react'

const trustBadges = [
  { label: 'KVKK Uyumlu', icon: ShieldCheck },
  { label: '2 Dakikada Kurulum', icon: Timer },
  { label: 'Bulut Tabanlı', icon: Sparkles },
]

const problemItems = [
  'Şubeler arası fiyat ve menü tutarsızlığı',
  'Sipariş akışında gecikmeler ve hata oranı',
  'Merkezi raporlama ve performans kıyasının zorluğu',
]

const solutionItems = [
  'Tüm şubeleri tek panelden yönetin',
  'Gerçek zamanlı sipariş ve mutfak takibi',
  'Karşılaştırmalı analitik ve ROI metrikleri',
]

const previewTabs = [
  { id: 'dashboard', label: 'Dashboard', summary: 'Şube performansı ve gelir görünümü.' },
  { id: 'branches', label: 'Şube Kıyas', summary: 'Şubeler arası KPI karşılaştırması.' },
  { id: 'orders', label: 'Sipariş Akışı', summary: 'Canlı sipariş ve mutfak ilerleme takibi.' },
]

const coreFeatures = [
  {
    title: 'QR Menü',
    description: 'Misafirleriniz masadan saniyeler içinde menüye erişsin.',
    icon: QrCode,
  },
  {
    title: 'Fiyat Defteri',
    description: 'Mevzuata uygun fiyat geçmişi ve versiyon kontrolü.',
    icon: BarChart3,
  },
  {
    title: 'Sipariş Sistemi',
    description: 'Masadan sipariş, anlık durum ve servis akışı yönetimi.',
    icon: HandPlatter,
  },
  {
    title: 'Mutfak Ekranı',
    description: 'Mutfakta canlı sıra, öncelik ve hazırlık süresi takibi.',
    icon: ChefHat,
  },
  {
    title: 'Analitik',
    description: 'Gelir, ürün popülerliği ve operasyon hızını ölçün.',
    icon: TrendingUp,
  },
  {
    title: 'Çoklu Dil',
    description: 'Turist dostu, otomatik çevirili menü deneyimi.',
    icon: Globe2,
  },
]

const steps = [
  {
    title: 'Menüyü içe aktarın',
    description: 'Excel veya mevcut POS verinizi hızlıca içe alın.',
  },
  {
    title: 'QR kodları dağıtın',
    description: 'Masalara QR kodları yerleştirip yayına çıkın.',
  },
  {
    title: 'Siparişleri yönetin',
    description: 'Anlık takip, raporlar ve şube bazlı analizler.',
  },
]

const roiStats = [
  {
    title: '%30 daha hızlı servis',
    description: 'Sipariş geçiş süresini düşürün.',
  },
  {
    title: '%20 daha az hata',
    description: 'Manuel sipariş kaynaklı hataları azaltın.',
  },
  {
    title: '%15 gelir artışı',
    description: 'Popüler ürünleri görün ve kampanya planlayın.',
  },
]

const testimonials = [
  {
    name: 'Marmara Lezzet Grubu',
    role: '10+ şube',
    quote: 'Merkezi fiyat yönetimi sayesinde haftalık operasyon yükümüz %40 azaldı.',
  },
  {
    name: 'GastroLine Zincir',
    role: '6 şube',
    quote: 'Sipariş akışı ve mutfak ekranı, servis süremizi belirgin şekilde kısalttı.',
  },
  {
    name: 'UrbanBite',
    role: '12 şube',
    quote: 'Analitik panellerle şube performansını net görebiliyoruz.',
  },
]

const complianceItems = [
  {
    title: 'KVKK & GDPR',
    description: 'Veri güvenliği ve uyumluluk süreçleri hazır.',
  },
  {
    title: 'SLA Destekli Altyapı',
    description: 'Kurumsal ölçek için kesintisiz servis garantisi.',
  },
  {
    title: 'Rol & Yetki Yönetimi',
    description: 'Şube bazlı erişim ve operasyon kontrolü.',
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Ücretsiz',
    description: 'Yeni başlayan işletmeler için hızlı kurulum.',
    features: ['1 Restoran', '20 Ürün', 'QR Menü', 'Temel analitik'],
    cta: 'Ücretsiz Başla',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '299₺/ay',
    description: 'Büyüyen işletmeler için tam kontrol.',
    features: [
      '3 Restoran',
      'Sınırsız Ürün',
      'Sipariş Sistemi',
      'Mutfak Ekranı',
      'Gelişmiş Analitik',
      'Öncelikli Destek',
    ],
    cta: '14 Gün Ücretsiz Dene',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Özel Fiyat',
    description: 'Kurumsal ekipler için ölçeklenebilir çözüm.',
    features: [
      'Sınırsız Restoran',
      'API Erişimi',
      'Özel Entegrasyonlar',
      'Dedicated Destek',
      'SLA Garantisi',
    ],
    cta: 'Demo İste',
    href: '/yardim',
    highlighted: false,
  },
]

const faqs = [
  {
    question: 'Kurulum ne kadar sürer?',
    answer: 'Ortalama 1-2 iş günü içinde menü aktarımı ve QR yayınlama tamamlanır.',
  },
  {
    question: 'KVKK uyumu var mı?',
    answer: 'Evet, veri işleme süreçleri KVKK ve GDPR uyumlu şekilde yönetilir.',
  },
  {
    question: 'Çoklu şube desteği nasıl?',
    answer: 'Her şube ayrı rol ve yetki ile yönetilir, merkezi raporlar tek ekranda toplanır.',
  },
]

const footerLinks = [
  {
    title: 'Ürün',
    links: [
      { label: 'Özellikler', href: '#features' },
      { label: 'Fiyatlandırma', href: '#pricing' },
      { label: 'Demo Menü', href: '/r/anadolu-sofrasi' },
    ],
  },
  {
    title: 'Şirket',
    links: [
      { label: 'Hakkımızda', href: '#' },
      { label: 'İletişim', href: '#contact' },
      { label: 'Kariyer', href: '#' },
    ],
  },
  {
    title: 'Destek',
    links: [
      { label: 'Yardım Merkezi', href: '/yardim' },
      { label: 'Giriş', href: '/login' },
      { label: 'Kayıt Ol', href: '/register' },
    ],
  },
  {
    title: 'Yasal',
    links: [
      { label: 'Gizlilik', href: '/gizlilik-politikasi' },
      { label: 'Kullanım', href: '/kullanim-kosullari' },
      { label: 'KVKK', href: '/gizlilik-politikasi' },
    ],
  },
]

export default function HomePage() {
  const { toggleTheme, isDark } = useThemeContext()
  const [activePreview, setActivePreview] = useState(previewTabs[0]?.id ?? 'dashboard')
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only showing theme toggle after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const activePreviewData = useMemo(
    () => previewTabs.find((tab) => tab.id === activePreview) ?? previewTabs[0],
    [activePreview]
  )

  return (
    <main className="min-h-dvh scroll-smooth bg-background text-foreground" suppressHydrationWarning>
      <section className="relative overflow-hidden border-b border-border" suppressHydrationWarning>
        <div className="absolute inset-0 -z-10" suppressHydrationWarning>
          <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-primary-500/15 blur-[120px]" />
          <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-primary-400/10 blur-[140px]" />
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-20">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary-600" />
              Zincir restoranlar için kurumsal QR Menü SaaS
            </div>
            {mounted && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Tema değiştir"
                className="h-10 w-10"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            {!mounted && (
              <div className="h-10 w-10" />
            )}
          </div>

          <div className="grid gap-12 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div className="space-y-8">
              <div className="space-y-5">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Zincir Restoranlar için QR Menü ve Sipariş Yönetimi
                </h1>
                <p className="text-lg text-muted-foreground sm:text-xl">
                  Şube bazlı kontrol, fiyat tutarlılığı ve gerçek zamanlı analiz tek panelde.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/yardim"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-12 px-6 text-sm'
                  )}
                >
                  Demo İste
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-12 px-6 text-sm'
                  )}
                >
                  Ücretsiz Dene
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                {trustBadges.map((badge) => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    <badge.icon className="h-4 w-4 text-primary-600" />
                    {badge.label}
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-border bg-card/80">
              <CardHeader className="space-y-2">
                <CardTitle className="text-lg">Merkezi Yönetim Paneli</CardTitle>
                <CardDescription>
                  Tüm şubeleri tek ekranda izleyin, aksiyon alın.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Şube Sayısı', value: '12', icon: Building2 },
                    { label: 'Aktif Sipariş', value: '86', icon: HandPlatter },
                    { label: 'Ortalama Hız', value: '11 dk', icon: Timer },
                    { label: 'Memnuniyet', value: '4.8/5', icon: Users },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <item.icon className="h-4 w-4 text-primary-600" />
                      </div>
                      <p className="mt-2 text-lg font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="problem" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">Problem</p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Şubeler arası tutarsızlık operasyonu yavaşlatır.
            </h2>
            <p className="text-muted-foreground">
              Fiyat ve menü farklılıkları, manuel süreçler ve geç raporlar zincirlerin büyümesini
              zorlaştırır.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {problemItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl">Çözüm</CardTitle>
              <CardDescription>Merkezi kontrol ile standartları koruyun.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {solutionItems.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary-600" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="preview" className="border-y border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
                Ürün Önizleme
              </p>
              <h2 className="text-3xl font-semibold sm:text-4xl">
                Tüm şube performansını tek ekranda kıyaslayın.
              </h2>
              <p className="text-muted-foreground">
                Yönetim paneli ile satış trendleri, sipariş hızı ve müşteri memnuniyetini tek
                bakışta izleyin.
              </p>
              <div className="flex flex-wrap gap-2">
                {previewTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivePreview(tab.id)}
                    className={`rounded-full border px-4 py-2 text-xs transition-colors ${
                      activePreview === tab.id
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-border bg-background text-muted-foreground hover:border-primary-600/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{activePreviewData?.summary}</p>
            </div>

            <Card className="border-border bg-background">
              <CardContent className="space-y-4 p-6">
                <div className="aspect-[16/10] w-full rounded-xl border border-border bg-gradient-to-br from-primary-600/15 via-transparent to-primary-600/10" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Toplam Ciro', value: '₺428K' },
                    { label: 'Sipariş Hızı', value: '11 dk' },
                    { label: 'Memnuniyet', value: '4.8/5' },
                    { label: 'İade Oranı', value: '%2.1' },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
            Özellikler
          </p>
          <h2 className="text-3xl font-semibold sm:text-4xl">Operasyonunuzu tek panelde yönetin</h2>
          <p className="max-w-2xl text-muted-foreground">
            QR menüden analitiğe kadar tüm ihtiyaçlarınızı karşılayan modüler bir altyapı.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coreFeatures.map((feature) => (
            <Card key={feature.title} className="border-border bg-card">
              <CardHeader className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
              Nasıl Çalışır
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Menüyü içe aktar → QR dağıt → sipariş ve analiz
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Üç adımda yayına çıkın ve tüm şubeleri tek panelden yönetin.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card key={step.title} className="border-border">
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                    0{index + 1}
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="roi" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">Faydalar</p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Verimlilik ve gelir artışı net ölçülebilir.
            </h2>
            <p className="text-muted-foreground">
              Şube başına ROI metriklerini izleyin ve operasyon kararlarını veriye dayandırın.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {roiStats.map((stat) => (
                <Card key={stat.title} className="border-border">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-lg">{stat.title}</CardTitle>
                    <CardDescription>{stat.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl">ROI Paneli</CardTitle>
              <CardDescription>Şube bazlı metrikleri kıyaslayın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Servis süresi', value: '11 dk', progress: '72%' },
                { label: 'Hata oranı', value: '%2.1', progress: '18%' },
                { label: 'Gelir artışı', value: '%15', progress: '62%' },
              ].map((metric) => (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{metric.label}</span>
                    <span className="font-medium">{metric.value}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary-600" style={{ width: metric.progress }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="testimonials" className="border-y border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
              Referanslar
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              100+ işletme E-Menum ile dijitale geçti.
            </h2>
            <p className="text-muted-foreground">Zincir restoranlardan gelen gerçek geri bildirimler.</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name} className="border-border">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600/10 text-primary-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <CardDescription>{item.role}</CardDescription>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">“{item.quote}”</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
              Güven ve Uyumluluk
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              KVKK uyumlu, güvenlik odaklı altyapı.
            </h2>
            <p className="text-muted-foreground">
              Bulut tabanlı, SLA destekli ve rol bazlı kontrol mekanizmalarıyla güvenli çalışın.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {complianceItems.map((item) => (
              <Card key={item.title} className="border-border">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
              Fiyatlandırma
            </p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Büyüdükçe ölçeklenen paketler
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Zincirler için özel planlar ve kurumsal destek seçenekleri.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`border-border ${
                  plan.highlighted
                    ? 'relative border-primary-600/60 bg-background shadow-lg'
                    : 'bg-background'
                }`}
              >
                <CardHeader className="space-y-3">
                  {plan.highlighted ? (
                    <span className="w-fit rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
                      En Popüler
                    </span>
                  ) : null}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-3xl font-semibold">{plan.price}</p>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-primary-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
                  >
                    {plan.cta}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">SSS</p>
          <h2 className="text-3xl font-semibold sm:text-4xl">Sık sorulan sorular</h2>
          <p className="max-w-2xl text-muted-foreground">
            Karar sürecinizi hızlandıracak kısa ve net cevaplar.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-xl border border-border bg-card px-6 py-4"
            >
              <summary className="cursor-pointer text-base font-semibold">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="contact" className="border-y border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
                İletişim
              </p>
              <h2 className="text-3xl font-semibold sm:text-4xl">
                Demo isteyin, şubelerinize özel plan oluşturalım.
              </h2>
              <p className="text-muted-foreground">
                İşletmenize uygun paketi belirlemek için uzmanlarımızla hızlıca görüşün.
              </p>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary-600" />
                  +90 212 000 00 00
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary-600" />
                  destek@e-menum.com
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  İstanbul, Türkiye
                </div>
              </div>
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">Demo Talep Formu</CardTitle>
                <CardDescription>En geç 24 saat içinde dönüş yapıyoruz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Ad Soyad" />
                <Input placeholder="Kurumsal E-posta" type="email" />
                <Input placeholder="Şube Sayısı" type="number" />
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Kısa notunuz"
                />
                <Button className="w-full">Demo İste</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,2fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-lg font-semibold text-white">
                  E
                </div>
                <div>
                  <p className="text-lg font-semibold">E-Menum</p>
                  <p className="text-sm text-muted-foreground">Dijital QR Menü SaaS</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Restoran operasyonlarını hızlandıran, modern ve güvenli dijital menü platformu.
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Link href="https://www.instagram.com" className="hover:text-foreground">
                  Instagram
                </Link>
                <Link href="https://www.linkedin.com" className="hover:text-foreground">
                  LinkedIn
                </Link>
                <Link href="https://x.com" className="hover:text-foreground">
                  X
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {footerLinks.map((column) => (
                <div key={column.title} className="space-y-3">
                  <p className="text-sm font-semibold">{column.title}</p>
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {column.links.map((link) => (
                      <Link key={link.label} href={link.href} className="hover:text-foreground">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>&copy; {new Date().getFullYear()} E-Menum. Tüm hakları saklıdır.</p>
            <p>Türkiye merkezli, güvenli ve ölçeklenebilir QR menü altyapısı.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
