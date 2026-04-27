'use client'

import { FormEvent, useState } from 'react'

export default function DemoPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)

    const data = {
      name: String(form.get('name') || '').trim(),
      email: String(form.get('email') || '').trim(),
      company: String(form.get('company') || '').trim(),
      product_count: String(form.get('product_count') || '').trim(),
      website: String(form.get('website') || '').trim(),
    }

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error || 'Bir hata oluştu.')
        setLoading(false)
        return
      }

      setSuccess(true)
      e.currentTarget.reset()
    } catch {
      setError('İstek gönderilemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#08111f] px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
          <div className="inline-flex rounded-full border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm font-medium text-green-300">
            Talebiniz alındı
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
            Demo başvurunuz başarıyla gönderildi
          </h1>

          <p className="mt-4 text-base leading-8 text-white/65">
            Ekibimiz başvurunuzu aldı. Uygunluk ve ihtiyaçlarınıza göre en kısa
            sürede sizinle iletişime geçeceğiz.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300"
            >
              Ana Sayfaya Dön
            </a>

            <a
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Giriş Yap
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#08111f] px-6 py-16 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="max-w-2xl">
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
            Ücretsiz Demo
          </div>

          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            DPPForge demo talebinizi bırakın, sizin için uygun akışı gösterelim.
          </h1>

          <p className="mt-6 text-lg leading-8 text-white/65">
            Ürün doğrulama, okutma analitiği ve sahtecilik tespiti süreçlerini
            markanıza nasıl uygulayabileceğimizi birlikte inceleyelim.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/75">
              QR doğrulama kurgusu
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/75">
              Şüpheli okutma analizi
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/75">
              Marka koruma raporları
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0d1728] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Demo Talep Formu
          </h2>

          <p className="mt-3 text-sm leading-7 text-white/60">
            Zorunlu alanları doldurun. Ekibimiz en kısa sürede size dönüş yapsın.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm text-white/75">
                Ad Soyad
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={120}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
                placeholder="Adınız Soyadınız"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-white/75">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={320}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
                placeholder="ornek@sirket.com"
              />
            </div>

            <div>
              <label htmlFor="company" className="mb-2 block text-sm text-white/75">
                Şirket
              </label>
              <input
                id="company"
                name="company"
                required
                maxLength={160}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
                placeholder="Şirket adınız"
              />
            </div>

            <div>
              <label htmlFor="product_count" className="mb-2 block text-sm text-white/75">
                Aylık / toplam ürün hacmi
              </label>
              <input
                id="product_count"
                name="product_count"
                type="number"
                min="0"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/40"
                placeholder="Örn: 5000"
              />
            </div>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
            />

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Gönderiliyor...' : 'Ücretsiz Demo Talep Et'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}