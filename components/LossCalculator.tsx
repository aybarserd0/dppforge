'use client'

import { useMemo, useState } from 'react'

function formatTRY(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function LossCalculator() {
  const [price, setPrice] = useState(300)
  const [sales, setSales] = useState(1000)
  const [fakeRate, setFakeRate] = useState(10)

  const directLoss = useMemo(() => {
    return Math.max(0, price) * Math.max(0, sales) * (Math.max(0, fakeRate) / 100)
  }, [price, sales, fakeRate])

  const brandImpact = directLoss * 2
  const yearlyImpact = brandImpact * 12

  return (
    <section id="loss-calculator" className="border-t border-white/8 py-16">
      <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="text-sm font-semibold text-cyan-300">
            Zarar Hesaplayıcı
          </div>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Sahte ürünler markanıza ne kadar kaybettiriyor?
          </h2>

          <p className="mt-4 text-base leading-8 text-white/62">
            Ürün fiyatınızı, aylık satışınızı ve tahmini sahte ürün oranınızı
            girin. DPPForge’un önlemeye çalıştığı kaybı anında görün.
          </p>

          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm leading-7 text-cyan-50">
            Tek bir sahte ürün bile müşteri güvenini düşürebilir. Asıl zarar
            çoğu zaman satış kaybından değil, marka itibarının zedelenmesinden
            gelir.
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-white/50">
                Ürün fiyatı
              </span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#08111f] px-4 text-sm text-white outline-none transition focus:border-cyan-400/60"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-white/50">
                Aylık satış
              </span>
              <input
                type="number"
                min="0"
                value={sales}
                onChange={(e) => setSales(Number(e.target.value))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#08111f] px-4 text-sm text-white outline-none transition focus:border-cyan-400/60"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-white/50">
                Sahte oranı %
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={fakeRate}
                onChange={(e) => setFakeRate(Number(e.target.value))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#08111f] px-4 text-sm text-white outline-none transition focus:border-cyan-400/60"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
              <div className="text-xs text-red-100/70">
                Tahmini aylık direkt kayıp
              </div>
              <div className="mt-3 text-2xl font-semibold text-red-100">
                {formatTRY(directLoss)}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <div className="text-xs text-cyan-100/70">
                Marka etkisiyle aylık kayıp
              </div>
              <div className="mt-3 text-2xl font-semibold text-cyan-100">
                {formatTRY(brandImpact)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="text-xs text-white/50">
                Tahmini yıllık etki
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {formatTRY(yearlyImpact)}
              </div>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-white/55">
            Bu hesap yaklaşık bir satış simülasyonudur. Gerçek kayıp; sektör,
            ürün fiyatı, müşteri güveni, yorumlar, iade oranları ve dağıtım
            kanalına göre değişebilir.
          </p>
        </div>
      </div>
    </section>
  )
}