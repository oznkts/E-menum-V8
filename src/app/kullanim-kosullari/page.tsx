import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kullanim Kosullari',
  description: 'E-Menum kullanim kosullari ve hizmet sartlari',
}

/**
 * Terms of Service Page
 *
 * Static page displaying terms and conditions.
 * Turkish language content for compliance.
 */
export default function TermsPage() {
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
            Kullanim Kosullari
          </h1>
          <p className="mt-2 text-muted-foreground">
            Son guncelleme: 23 Ocak 2026
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Genel Hukumler</h2>
            <p className="text-muted-foreground mb-4">
              Bu kullanim kosullari, E-Menum platformunu kullanan tum kullanicilar icin gecerlidir.
              Platformu kullanarak bu kosullari kabul etmis sayilirsiniz.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Hizmet Tanimi</h2>
            <p className="text-muted-foreground mb-4">
              E-Menum, restoran ve kafeler icin dijital QR menu, siparis yonetimi ve fiyat takip
              hizmetleri sunan bir SaaS platformudur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Kullanici Sorumluluklari</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Hesap bilgilerinizi guvenli tutmak</li>
              <li>Dogru ve guncel bilgi saglamak</li>
              <li>Platformu yasal amaclarla kullanmak</li>
              <li>Diger kullanicilarin haklarina saygi gostermek</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Gizlilik</h2>
            <p className="text-muted-foreground mb-4">
              Kisisel verilerinizin nasil islendigi hakkinda detayli bilgi icin{' '}
              <Link href="/gizlilik-politikasi" className="text-primary-600 hover:underline">
                Gizlilik Politikasi
              </Link>
              {' '}sayfamizi inceleyiniz.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Fikri Mulkiyet</h2>
            <p className="text-muted-foreground mb-4">
              E-Menum platformundaki tum icerik, tasarim ve yazilimlar telif hakki ile korunmaktadir.
              Izinsiz kopyalama ve dagitim yasaktir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Degisiklikler</h2>
            <p className="text-muted-foreground mb-4">
              Bu kullanim kosullari onceden bildirim yapilmaksizin degistirilebilir.
              Degisiklikler yayinlandigi andan itibaren gecerli olur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Iletisim</h2>
            <p className="text-muted-foreground mb-4">
              Sorulariniz icin destek@e-menum.com adresinden bize ulasabilirsiniz.
            </p>
          </section>
        </div>
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
