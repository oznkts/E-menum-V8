import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gizlilik Politikasi',
  description: 'E-Menum gizlilik politikasi ve veri koruma ilkeleri',
}

/**
 * Privacy Policy Page
 *
 * Static page displaying privacy policy.
 * Turkish language content for KVKK compliance.
 */
export default function PrivacyPage() {
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
            Gizlilik Politikasi
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
            <h2 className="text-xl font-semibold mb-4">1. Veri Sorumlusu</h2>
            <p className="text-muted-foreground mb-4">
              E-Menum olarak kisisel verilerinizin guvenligine onem veriyoruz. Bu politika,
              hangi verileri topladigimizi ve nasil kullandigimizi aciklar.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Toplanan Veriler</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Ad, soyad ve iletisim bilgileri</li>
              <li>E-posta adresi ve telefon numarasi</li>
              <li>Restoran/isletme bilgileri</li>
              <li>Odeme ve fatura bilgileri</li>
              <li>Kullanim verileri ve tercihler</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Verilerin Kullanimi</h2>
            <p className="text-muted-foreground mb-4">
              Toplanan veriler asagidaki amaclarla kullanilmaktadir:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Hizmetlerimizin sunulmasi ve iyilestirilmesi</li>
              <li>Musterilerimizle iletisim kurulmasi</li>
              <li>Yasal yukumluluklerin yerine getirilmesi</li>
              <li>Platform guvenliginin saglanmasi</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Veri Guvenligi</h2>
            <p className="text-muted-foreground mb-4">
              Verileriniz SSL sifreleme ve guclu guvenlik protokolleri ile korunmaktadir.
              Veritabanimiz duzeli olarak yedeklenmekte ve guvenlik testlerinden gecmektedir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Cerezler</h2>
            <p className="text-muted-foreground mb-4">
              Platformumuz, kullanici deneyimini iyilestirmek icin cerezler kullanmaktadir.
              Tarayici ayarlarinizdan cerez tercihlerinizi yonetebilirsiniz.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Ucuncu Taraf Paylasimi</h2>
            <p className="text-muted-foreground mb-4">
              Kisisel verileriniz yasal zorunluluklar disinda ucuncu taraflarla paylasilmaz.
              Hizmet saglayicilarimiz ile sadece gerekli veriler paylasimda bulunulur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Haklariniz</h2>
            <p className="text-muted-foreground mb-4">
              KVKK kapsaminda asagidaki haklara sahipsiniz:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Verilerinize erisim hakkı</li>
              <li>Verilerin duzeltilmesini talep etme hakkı</li>
              <li>Verilerin silinmesini talep etme hakkı</li>
              <li>Veri islemesine itiraz etme hakkı</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Iletisim</h2>
            <p className="text-muted-foreground mb-4">
              Gizlilik ile ilgili sorulariniz icin gizlilik@e-menum.com adresinden bize ulasabilirsiniz.
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
