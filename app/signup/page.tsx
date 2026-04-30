'use client'

import { Suspense, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function safeNext(value: string | null) {
  if (!value) return '/admin'
  if (!value.startsWith('/')) return '/admin'
  if (value.startsWith('//')) return '/admin'
  return value
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const next = useMemo(
    () => safeNext(searchParams.get('next')),
    [searchParams]
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const cleanEmail = email.trim().toLowerCase()

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}${next}`
            : undefined,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.replace(next)
      router.refresh()
      return
    }

    setMessage(
      'Hesap oluşturuldu. Email doğrulama açıksa gelen kutunu kontrol etmen gerekebilir.'
    )
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#08111f] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col justify-center">
            <a href="/" className="mb-8 inline-flex items-center gap-3">
              <img
                src="/logo.png"
                alt="DPPForge"
                className="h-10 w-auto object-contain"
              />
              <div>
                <div className="text-xl font-semibold tracking-tight">
                  DPPForge
                </div>
                <div className="text-sm text-white/50">
                  Marka Koruma Platformu
                </div>
              </div>
            </a>

            <div className="mb-5 inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
              QR doğrulama + sahtecilik tespiti
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Sahte ürünleri 24 saat içinde tespit edin ve markanızı koruyun.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-white/62">
              QR kod ile ürünlerinizi doğrulayın, sahtecilik girişimlerini anında tespit edin ve müşterilerinizin ürünlerinizi nereden okuttuğunu görün.
              oluşturun ve okutma hareketlerini tek panelden takip edin.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">

  {/* FREE */}
  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm text-white/80">
    <div className="mb-2 font-semibold text-cyan-300">Free</div>
    <ul className="space-y-1">
      <li>• 1 ürün</li>
      <li>• 50 okutma</li>
      <li>• QR doğrulama sayfası</li>
    </ul>
    <div className="mt-3 text-xs text-white/50">
      Kredi kartı gerekmez
    </div>
  </div>

  {/* PRO */}
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/80">
    <div className="mb-2 font-semibold text-white">Pro</div>
    <ul className="space-y-1">
      <li>• 25 ürün</li>
      <li>• 10.000 okutma</li>
      <li>• Email alert</li>
      <li>• Analitik panel</li>
    </ul>
    <div className="mt-3 font-semibold text-cyan-300">
      ₺999 / ay
    </div>
  </div>

  {/* BUSINESS */}
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/80">
    <div className="mb-2 font-semibold text-white">Business</div>
    <ul className="space-y-1">
      <li>• 100 ürün</li>
      <li>• 50.000 okutma</li>
      <li>• CSV export</li>
      <li>• Gelişmiş rapor</li>
    </ul>
    <div className="mt-3 font-semibold text-cyan-300">
      ₺2999 / ay
    </div>
  </div>

</div>

          <form
            onSubmit={handleSignup}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.35)]"
          >
            <div className="mb-6">
              <div className="text-sm font-semibold text-cyan-300">
                Yeni hesap
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Kayıt Ol
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Hesap oluşturduktan sonra otomatik olarak devam edeceğin sayfa:
                <span className="ml-1 text-white/80">{next}</span>
              </p>
            </div>

            <label className="mb-2 block text-sm font-medium text-white/75">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60"
              required
            />

            <label className="mb-2 block text-sm font-medium text-white/75">
              Şifre
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60"
              required
            />

            <label className="mb-2 block text-sm font-medium text-white/75">
              Şifre tekrar
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Şifreni tekrar yaz"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60"
              required
            />

            {error ? (
              <div className="mb-4 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="mb-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-semibold text-[#08111f] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Hesap oluşturuluyor...' : '🚀 Hesap Oluştur'}
            </button>

            <div className="mt-5 text-center text-sm text-white/60">
              Zaten hesabın var mı?{' '}
              <a
                href={`/login?next=${encodeURIComponent(next)}`}
                className="font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Giriş yap
              </a>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-white/50">
              Kayıt olarak DPPForge içinde ürün doğrulama sayfaları oluşturabilir,
              okutma verilerini takip edebilir ve planını ihtiyaçlarına göre
              yükseltebilirsin.
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#08111f] text-white">
          Yükleniyor...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  )
}