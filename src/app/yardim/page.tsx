import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Yardim Merkezi',
  description: 'E-Menum yardim merkezi ve sikca sorulan sorular',
}

/**
 * Help Center Page
 *
 * Provides help resources, FAQs, and contact information.
 * Turkish language content.
 */
export default function HelpPage() {
  const faqs = [
    {
      question: 'E-Menum nedir?',
      answer: 'E-Menum, restoran ve kafeler icin dijital QR menu, siparis yonetimi ve fiyat takip hizmetleri sunan bir SaaS platformudur.',
    },
    {
      question: 'Nasil kayit olabilirim?',
      answer: 'Ana sayfadaki "Kayit Ol" butonuna tiklayarak veya /register sayfasindan ucretsiz hesap olusturabilirsiniz.',
    },
    {
      question: 'QR kod nasil olusturabilirim?',
      answer: 'Kontrol panelinizden "QR Kodlar" bolumune giderek masalariniz icin ozel QR kodlar olusturabilirsiniz.',
    },
    {
      question: 'Menu fiyatlarini nasil guncellerim?',
      answer: 'Kontrol panelinden "Urunler" bolumune gidip ilgili urunu secerek fiyat guncellemesi yapabilirsiniz.',
    },
    {
      question: 'Siparis sistemi nasil calisir?',
      answer: 'Musteriler QR kodu okutarak menuyu goruntulayebilir ve siparis verebilir. Siparisler anlik olarak kontrol panelinize duser.',
    },
    {
      question: 'Destek ile nasil iletisime gecebilirim?',
      answer: 'destek@e-menum.com adresinden veya bu sayfadaki iletisim formundan bize ulasabilirsiniz.',
    },
  ]

  return (
    <main className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Ana Sayfaya Don
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Yardim Merkezi
          </h1>
          <p className="mt-2 text-muted-foreground">
            Size nasil yardimci olabiliriz?
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Hizli Erisim</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                </div>
                <CardTitle className="text-base">Kullanim Kilavuzu</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Platformun tum ozelliklerini ogrenin
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <CardTitle className="text-base">Canli Destek</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Uzmanlarimizla anlik gorusun
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <CardTitle className="text-base">E-posta Destek</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  destek@e-menum.com
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Sikca Sorulan Sorular</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Info */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Iletisim Bilgileri</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-medium mb-2">E-posta</h3>
                  <p className="text-muted-foreground">destek@e-menum.com</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Calisma Saatleri</h3>
                  <p className="text-muted-foreground">Pazartesi - Cuma: 09:00 - 18:00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} E-Menum. Tum haklari saklidir.
          </p>
        </div>
      </footer>
    </main>
  )
}
