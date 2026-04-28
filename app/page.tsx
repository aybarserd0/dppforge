import LossCalculator from '@/components/LossCalculator'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function Home() {
  const sampleReportHref = '/r/b4313023-e5b1-41a0-948a-e235fe421898'

  let isLoggedIn = false

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    isLoggedIn = !!user
  } catch {
    isLoggedIn = false
  }

  const proHref = isLoggedIn ? '/admin/upgrade' : '/signup?next=/admin/upgrade'
  const freeHref = isLoggedIn ? '/admin' : '/signup'

  const pricingPlans = [
    {
      name: 'Free',
      price: '0₺',
      desc: 'Başlangıç için temel doğrulama.',
      features: ['1 ürün', '50 okutma', 'Temel doğrulama'],
      href: freeHref,
      cta: 'Ücretsiz Başla',
      highlighted: false,
    },
    {
      name: 'Starter',
      price: '1.990₺',
      period: '/ ay',
      desc: 'Küçük markalar için giriş planı.',
      features: ['5 ürün', '1.000 okutma', 'QR doğrulama', 'Temel analiz'],
      href: proHref,
      cta: 'Starter Başla',
      highlighted: false,
    },
    {
      name: 'Pro',
      badge: 'En Popüler',
      price: '4.990₺',
      period: '/ ay',
      desc: 'Sahtecilik tespiti isteyen markalar için.',
      features: [
        '25 ürün',
        '10.000 okutma',
        'Sahtecilik tespiti',
        'Email uyarıları',
        'Gelişmiş analiz',
      ],
      href: proHref,
      cta: 'Pro Başla',
      highlighted: true,
    },
    {
      name: 'Business',
      price: '9.990₺',
      period: '/ ay',
      desc: 'Daha yüksek hacimli operasyonlar için.',
      features: [
        '100 ürün',
        '50.000 okutma',
        'Gelişmiş raporlama',
        'CSV export',
        'Öncelikli destek',
      ],
      href: '/demo',
      cta: 'Demo Talep Et',
      highlighted: false,
    },
    {
      name: 'Enterprise',
      price: 'Özel fiyat',
      desc: 'Kurumsal ihtiyaçlara özel çözüm.',
      features: [
        'API erişimi',
        'Özel entegrasyon',
        'Yüksek hacim',
        'Dedicated destek',
      ],
      href: '/demo',
      cta: 'İletişime Geç',
      highlighted: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#08111f] text-white">
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:px-10 lg:px-12">
        <header className="sticky top-0 z-30 mb-8 rounded-2xl border border-white/10 bg-[#08111f]/85 px-4 py-3 backdrop-blur md:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="DPPForge"
                className="h-9 w-auto object-contain md:h-10"
              />
              <div>
                <div className="text-lg font-semibold tracking-tight md:text-xl">
                  DPPForge
                </div>
                <div className="hidden text-sm text-white/50 sm:block">
                  Marka Koruma Platformu
                </div>
              </div>
            </div>

            <nav className="hidden items-center gap-8 text-sm text-white/65 lg:flex">
              <a href="#features" className="transition hover:text-white">
                Özellikler
              </a>
              <a href="#use-cases" className="transition hover:text-white">
                Kullanım Alanları
              </a>
              <a href="#pricing" className="transition hover:text-white">
                Fiyatlandırma
              </a>
              <a href="#faq" className="transition hover:text-white">
                Sık Sorulan Sorular
              </a>
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <a
                href={sampleReportHref}
                className="hidden h-10 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-medium text-white/90 transition hover:bg-white/5 md:inline-flex"
              >
                Örnek Rapor
              </a>

              {isLoggedIn ? (
                <a
                  href="/admin"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-cyan-400 px-4 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300 md:px-5"
                >
                  Panel
                </a>
              ) : (
                <>
                  <a
                    href="/signup"
                    className="hidden h-10 items-center justify-center rounded-full border border-cyan-400/30 px-4 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/10 md:inline-flex"
                  >
                    Kayıt Ol
                  </a>
                  <a
                    href="/login"
                    className="inline-flex h-10 items-center justify-center rounded-full bg-cyan-400 px-4 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300 md:px-5"
                  >
                    Giriş Yap
                  </a>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="grid items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
              QR Doğrulama + Sahtecilik Tespiti
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Ürünlerinizi QR doğrulama ve gerçek veriye dayalı analiz ile
              koruyun.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">
              DPPForge; ürün doğrulama sayfaları oluşturur, şüpheli okutma
              davranışlarını tespit eder ve markanız için paylaşılabilir koruma
              raporları sunar.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {isLoggedIn ? (
                <a
                  href="/admin"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300"
                >
                  Kontrol Paneline Git
                </a>
              ) : (
                <>
                  <a
                    href="/demo"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300"
                  >
                    Ücretsiz Demo Al
                  </a>
                  <a
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold text-white transition hover:bg-white/5"
                  >
                    Giriş Yap
                  </a>
                </>
              )}

              <a
                href={sampleReportHref}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Örnek Raporu Gör
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                'Gerçek zamanlı okutma takibi',
                'Şüpheli aktivite uyarıları',
                'Paylaşılabilir doğrulama raporları',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/75"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#0d1728] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="DPPForge"
                    className="h-8 w-auto object-contain"
                  />
                  <div>
                    <div className="text-sm font-semibold">DPPForge Raporu</div>
                    <div className="text-xs text-white/45">Canlı önizleme</div>
                  </div>
                </div>

                <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-200">
                  Yüksek Risk
                </span>
              </div>

              <div className="pt-6">
                <div className="text-2xl font-semibold tracking-tight">
                  Ürün A
                </div>
                <div className="mt-1 text-sm text-white/45">SKU: DPP-0001</div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ['Toplam Okutma', '125'],
                  ['Son 24 Saat', '19'],
                  ['Benzersiz IP', '8'],
                  ['Ülke Sayısı', '3'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="text-xs text-white/45">{label}</div>
                    <div className="mt-2 text-3xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                <div className="text-sm font-semibold text-red-200">
                  Şüpheli okutma davranışı tespit edildi
                </div>
                <p className="mt-2 text-sm leading-7 text-white/68">
                  Farklı ülkelerden gelen okutmalar ve anormal okutma yoğunluğu,
                  olası sahtecilik faaliyetlerine işaret ediyor olabilir.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="grid gap-4 border-t border-white/8 py-16 md:grid-cols-3"
        >
          {[
            [
              'Doğrulama',
              'Her ürün için doğrulama sayfası oluşturun',
              'Her ürün için benzersiz bir sayfa oluşturun ve her okutmayı görünür, ölçülebilir doğrulama verisine dönüştürün.',
            ],
            [
              'Tespit',
              'Şüpheli paternleri anında yakalayın',
              'Ani okutma artışlarını, olağandışı IP davranışlarını ve ülke anomalilerini izleyerek sahtecilik riskini erken aşamada görün.',
            ],
            [
              'Raporlama',
              'Temiz ve paylaşılabilir raporlar sunun',
              'Paydaşlara, müşterilere veya ekiplere tek bağlantıyla paylaşılabilen profesyonel raporlar gönderin.',
            ],
          ].map(([tag, title, desc]) => (
            <div
              key={tag}
              className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="mb-3 text-sm font-semibold text-cyan-300">
                {tag}
              </div>
              <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/60">{desc}</p>
            </div>
          ))}
        </section>

        <section id="use-cases" className="border-t border-white/8 py-16">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-cyan-300">
              Kimler için uygun?
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Güven, görünürlük ve kontrol ihtiyacı olan markalar için üretildi.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/62">
              DPPForge özellikle fiziksel ürün satan ve marka güvenini korumak
              isteyen işletmeler için güçlü bir çözüm sunar.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Kozmetik markaları',
              'Takviye gıda üreticileri',
              'E-ticaret satıcıları',
              'Premium tüketici ürünleri',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm font-medium text-white/80"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <LossCalculator />
        <section id="pricing" className="border-t border-white/8 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-semibold text-cyan-300">
              Fiyatlandırma
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Markanızın ölçeğine göre koruma planı seçin.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/65">
              Basit QR doğrulamadan gelişmiş sahtecilik tespiti ve kurumsal
              entegrasyonlara kadar DPPForge markanızla birlikte büyür.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={[
                  'relative flex h-full flex-col rounded-[26px] border p-6 transition',
                  plan.highlighted
                    ? 'border-cyan-400/40 bg-cyan-400/[0.11] shadow-2xl shadow-cyan-950/30 xl:-mt-3'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
                ].join(' ')}
              >
                {plan.badge ? (
                  <div className="absolute right-5 top-5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
                    {plan.badge}
                  </div>
                ) : null}

                <div
                  className={
                    plan.highlighted
                      ? 'text-sm font-semibold text-cyan-200'
                      : 'text-sm font-semibold text-white/55'
                  }
                >
                  {plan.name}
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-x-1">
                  <span className="text-3xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period ? (
                    <span className="pb-1 text-sm text-white/55">
                      {plan.period}
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 min-h-[44px] text-sm leading-6 text-white/58">
                  {plan.desc}
                </p>

                <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-white/78">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="mt-[2px] text-cyan-300">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.href}
                  className={[
                    'mt-7 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition',
                    plan.highlighted
                      ? 'bg-cyan-400 text-[#08111f] hover:bg-cyan-300'
                      : 'border border-white/15 text-white hover:bg-white/5',
                  ].join(' ')}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm leading-7 text-white/62">
            Pro plan, sahtecilik tespiti ve email uyarılarıyla ana satış
            paketidir. Enterprise planlarda özel hacim, API ve entegrasyon
            ihtiyaçları için teklif hazırlanır.
          </div>
        </section>

        <section id="faq" className="border-t border-white/8 py-16">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-cyan-300">
              Sık Sorulan Sorular
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              En çok merak edilenler
            </h2>
          </div>

          <div className="mt-8 grid gap-4">
            {[
              [
                'DPPForge tam olarak ne yapar?',
                'DPPForge; markaların ürünlerini QR tabanlı doğrulama sayfaları ile doğrulamasını, okutma hareketlerini izlemesini, şüpheli davranışları tespit etmesini ve paylaşılabilir raporlar sunmasını sağlar.',
              ],
              [
                'Kimler için daha uygundur?',
                'Özellikle fiziksel ürün satan, sahtecilik riski taşıyan ve marka güvenini korumak isteyen işletmeler için uygundur.',
              ],
              [
                'Raporları herkese açık paylaşabilir miyim?',
                'Evet. Salt okunur genel raporlar tek bir bağlantı ile paylaşılabilir.',
              ],
            ].map(([q, a]) => (
              <div
                key={q}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="text-lg font-semibold">{q}</h3>
                <p className="mt-3 text-sm leading-7 text-white/62">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-20 pt-4">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12 md:px-10 md:py-14">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold text-cyan-300">
                Son Çağrı
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Ürünlerinizi daha görünür ve daha güvenli hale getirin.
              </h2>
              <p className="mt-4 text-base leading-8 text-white/62">
                Varsayımlarla değil, okutma verileri, uyarılar ve paylaşılabilir
                koruma raporları ile hareket edin.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {isLoggedIn ? (
                <a
                  href="/admin"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300"
                >
                  Kontrol Paneline Git
                </a>
              ) : (
                <>
                  <a
                    href="/demo"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300"
                  >
                    Ücretsiz Demo Al
                  </a>
                  <a
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold text-white transition hover:bg-white/5"
                  >
                    Giriş Yap
                  </a>
                </>
              )}

              <a
                href={sampleReportHref}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Örnek Raporu İncele
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}