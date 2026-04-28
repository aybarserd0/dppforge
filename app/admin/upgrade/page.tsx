// app/admin/upgrade/page.tsx
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { CSSProperties } from 'react'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{
  required?: string
  reason?: string
}>

type PlanView = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_env')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function pageStyle(): CSSProperties {
  return {
    minHeight: '100vh',
    background: '#0b0f17',
    color: '#e6e6e6',
    fontFamily: 'system-ui',
    padding: 40,
  }
}

function cardStyle(featured = false): CSSProperties {
  return {
    borderRadius: 18,
    border: featured
      ? '1px solid rgba(34,211,238,0.45)'
      : '1px solid rgba(255,255,255,0.10)',
    background: featured
      ? 'linear-gradient(180deg, rgba(34,211,238,0.14), rgba(255,255,255,0.04))'
      : 'rgba(255,255,255,0.04)',
    padding: 20,
    boxShadow: featured
      ? '0 16px 40px rgba(34,211,238,0.16)'
      : '0 10px 30px rgba(0,0,0,0.18)',
    minHeight: 460,
    display: 'flex',
    flexDirection: 'column',
  }
}

function buttonPrimary(): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 14px',
    borderRadius: 12,
    background: '#22d3ee',
    color: '#08111f',
    textDecoration: 'none',
    fontWeight: 900,
    border: '1px solid rgba(255,255,255,0.10)',
    cursor: 'pointer',
  }
}

function buttonSecondary(): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    color: '#e6e6e6',
    textDecoration: 'none',
    fontWeight: 800,
    border: '1px solid rgba(255,255,255,0.12)',
    cursor: 'pointer',
  }
}

function buttonSuccess(): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(34,197,94,0.16)',
    color: '#bbf7d0',
    textDecoration: 'none',
    fontWeight: 800,
    border: '1px solid rgba(34,197,94,0.35)',
    cursor: 'pointer',
  }
}

function featureItemStyle(): CSSProperties {
  return {
    opacity: 0.9,
    fontSize: 14,
    lineHeight: 1.7,
  }
}

function normalizePlan(value?: string | null): PlanView {
  const v = String(value ?? 'free').trim().toLowerCase()
  if (v === 'enterprise') return 'enterprise'
  if (v === 'business') return 'business'
  if (v === 'pro') return 'pro'
  if (v === 'starter') return 'starter'
  return 'free'
}

function normalizeRequiredPlan(value?: string): PlanView {
  const v = String(value ?? 'pro').trim().toLowerCase()
  if (v === 'enterprise') return 'enterprise'
  if (v === 'business') return 'business'
  if (v === 'starter') return 'starter'
  if (v === 'free') return 'free'
  return 'pro'
}

function planRank(plan: PlanView) {
  const ranks: Record<PlanView, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    business: 3,
    enterprise: 4,
  }

  return ranks[plan]
}

function getPlanLimit(plan: PlanView) {
  if (plan === 'enterprise') return null
  if (plan === 'business') return 100
  if (plan === 'pro') return 25
  if (plan === 'starter') return 5
  return 1
}

function planBadgeStyle(text: PlanView): CSSProperties {
  const colors: Record<PlanView, { bg: string; border: string; color: string }> = {
    free: {
      bg: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.12)',
      color: '#e6e6e6',
    },
    starter: {
      bg: 'rgba(59,130,246,0.14)',
      border: 'rgba(59,130,246,0.35)',
      color: '#bfdbfe',
    },
    pro: {
      bg: 'rgba(34,211,238,0.14)',
      border: 'rgba(34,211,238,0.35)',
      color: '#cffafe',
    },
    business: {
      bg: 'rgba(245,158,11,0.14)',
      border: 'rgba(245,158,11,0.35)',
      color: '#fde68a',
    },
    enterprise: {
      bg: 'rgba(168,85,247,0.18)',
      border: 'rgba(168,85,247,0.35)',
      color: '#e9d5ff',
    },
  }

  const c = colors[text]

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.color,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  }
}

function reasonText(reason?: string) {
  if (reason === 'product_limit') {
    return 'Mevcut planının ürün limiti dolduğu için yükseltme gerekiyor.'
  }
  if (reason === 'export') {
    return 'CSV export özelliği için Business veya Enterprise plan gerekir.'
  }
  if (reason === 'premium_feature') {
    return 'Bu özellik mevcut planında kapalı.'
  }
  if (reason === 'analytics') {
    return 'Gelişmiş analitik için daha yüksek plan gerekiyor.'
  }
  return 'Daha fazla ürün doğrulamak, sahte ürünleri tespit etmek ve operasyonunu büyütmek için planını yükselt.'
}

function getUpgradeHref(plan: Exclude<PlanView, 'free' | 'enterprise'>, reason?: string) {
  const params = new URLSearchParams({ plan })

  if (reason) {
    params.set('reason', reason)
  }

  return `/api/payment/create-link?${params.toString()}`
}

function getEnterpriseMailHref() {
  const salesEmail =
    process.env.NEXT_PUBLIC_SALES_EMAIL?.trim() || 'sales@dppforge.local'

  const subject = encodeURIComponent('DPPForge Enterprise Upgrade')
  const body = encodeURIComponent(
    [
      'Merhaba,',
      '',
      'DPPForge Enterprise planı hakkında bilgi almak istiyorum.',
      '',
      'İhtiyaçlarım:',
      '- API / özel entegrasyon',
      '- Export ve raporlama',
      '- Kurumsal onboarding',
      '',
      'Teşekkürler.',
    ].join('\n')
  )

  return `mailto:${salesEmail}?subject=${subject}&body=${body}`
}

async function getCurrentPlan(): Promise<PlanView> {
  const cookieStore = await cookies()

  const accessToken =
    cookieStore.get('sb-access-token')?.value ??
    cookieStore.get('supabase-access-token')?.value ??
    null

  if (!accessToken) {
    return 'free'
  }

  const supabase = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(accessToken)

  if (userErr || !user) {
    return 'free'
  }

  const { data: membership, error: membershipErr } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipErr || !membership?.account_id) {
    return 'free'
  }

  const { data: accountRow, error: accountErr } = await supabase
    .from('accounts')
    .select('plan_type, plan_expires_at, subscription_status')
    .eq('id', membership.account_id)
    .maybeSingle()

  if (accountErr) {
    return 'free'
  }

  const rawPlan = normalizePlan(accountRow?.plan_type)

  if (rawPlan === 'free') {
    return 'free'
  }

  const expiresAt = accountRow?.plan_expires_at
    ? new Date(accountRow.plan_expires_at)
    : null

  const isExpired =
    !expiresAt ||
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() < Date.now()

  if (isExpired) {
    return 'free'
  }

  return rawPlan
}

function planCardDescription(plan: PlanView) {
  if (plan === 'enterprise') return 'Kurumsal markalar için özel çözüm'
  if (plan === 'business') return 'Yüksek hacimli operasyonlar için'
  if (plan === 'pro') return 'Sahtecilik tespiti isteyen markalar için'
  if (plan === 'starter') return 'Küçük markalar için giriş planı'
  return 'Başlangıç ve deneme planı'
}

function planPrice(plan: PlanView) {
  if (plan === 'enterprise') return 'Özel fiyat'
  if (plan === 'business') return '₺9.990/ay'
  if (plan === 'pro') return '₺4.990/ay'
  if (plan === 'starter') return '₺1.990/ay'
  return '₺0'
}

function PlanCard({
  plan,
  currentPlan,
  requiredPlan,
  title,
  features,
  cta,
  href,
  featured,
}: {
  plan: PlanView
  currentPlan: PlanView
  requiredPlan: PlanView
  title: string
  features: string[]
  cta?: string
  href?: string
  featured?: boolean
}) {
  const isCurrent = currentPlan === plan
  const isHigherActive = planRank(currentPlan) > planRank(plan)
  const isRequired = requiredPlan === plan

  return (
    <div style={cardStyle(featured || isCurrent || isRequired)}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 24 }}>{title}</h2>
        <span style={planBadgeStyle(plan)}>
          {isCurrent ? 'aktif plan' : isRequired ? 'gerekli plan' : plan}
        </span>
      </div>

      <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>
        {planPrice(plan)}
      </div>

      <div style={{ opacity: 0.7, marginBottom: 14 }}>
        {planCardDescription(plan)}
      </div>

      <div style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
        {features.map((feature) => (
          <div key={feature} style={featureItemStyle()}>
            • {feature}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {isCurrent ? (
          <Link href="/admin" style={buttonSuccess()}>
            ✅ Bu plan aktif
          </Link>
        ) : isHigherActive ? (
          <Link href="/admin" style={buttonSuccess()}>
            ✅ Daha yüksek plan aktif
          </Link>
        ) : href ? (
          <a href={href} style={plan === 'enterprise' ? buttonSecondary() : buttonPrimary()}>
            {cta}
          </a>
        ) : (
          <div style={{ opacity: 0.78, fontSize: 13 }}>
            Başlangıç ve deneme süreci için uygun.
          </div>
        )}
      </div>
    </div>
  )
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { required, reason } = await searchParams

  const requiredPlan = normalizeRequiredPlan(required)
  const currentPlan = await getCurrentPlan()
  const currentLimit = getPlanLimit(currentPlan)
  const enterpriseMailHref = getEnterpriseMailHref()

  const alreadyEnough = planRank(currentPlan) >= planRank(requiredPlan)

  return (
    <main style={pageStyle()}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 22,
          }}
        >
          <div>
            <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 8 }}>
              💳 DPPForge • Upgrade
            </div>

            <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0 }}>
              {alreadyEnough
                ? 'Planın bu özellik için uygun'
                : '🚀 Hesabını büyütmeye hazır mısın?'}
            </h1>

            <p
              style={{
                marginTop: 10,
                opacity: 0.8,
                maxWidth: 760,
                lineHeight: 1.6,
              }}
            >
              {reasonText(reason)} Gerekli plan:{' '}
              <b style={{ color: '#fff' }}>{requiredPlan}</b> — Mevcut planın:{' '}
              <b style={{ color: '#fff' }}>{currentPlan}</b>
            </p>
          </div>

          <Link href="/admin" style={buttonSecondary()}>
            ← Admin’e geri dön
          </Link>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: 16,
            borderRadius: 16,
            border: alreadyEnough
              ? '1px solid rgba(34,197,94,0.30)'
              : '1px solid rgba(245,158,11,0.30)',
            background: alreadyEnough
              ? 'rgba(34,197,94,0.10)'
              : 'rgba(245,158,11,0.10)',
            color: alreadyEnough ? '#bbf7d0' : '#fde68a',
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            {alreadyEnough ? 'Uygun plan tespit edildi' : 'Plan engeli algılandı'}
          </div>

          <div style={{ fontSize: 14, opacity: 0.95, lineHeight: 1.6 }}>
            {alreadyEnough
              ? 'Hesabın bu aksiyon için yeterli planda görünüyor. Admin paneline dönüp akışa devam edebilirsin.'
              : 'Sistem bu isteği durdurdu ve seni upgrade sayfasına yönlendirdi. Bu yapı DPPForge içinde gerçek SaaS plan kontrolünün aktif olduğunu gösterir.'}
          </div>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: 16,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.72 }}>Mevcut plan</div>
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={planBadgeStyle(currentPlan)}>{currentPlan}</span>
              <span style={{ fontWeight: 800 }}>
                {currentLimit === null
                  ? 'Sınırsız ürün'
                  : `${currentLimit} ürün limiti`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/admin/create" style={buttonSecondary()}>
              ➕ Yeni ürün dene
            </Link>

            {currentPlan === 'free' ? (
              <a href={getUpgradeHref('starter', reason)} style={buttonPrimary()}>
                💰 Starter’a geç
              </a>
            ) : currentPlan === 'starter' ? (
              <a href={getUpgradeHref('pro', reason)} style={buttonPrimary()}>
                🚀 Pro’ya geç
              </a>
            ) : currentPlan === 'pro' ? (
              <a href={getUpgradeHref('business', reason)} style={buttonPrimary()}>
                📊 Business’a geç
              </a>
            ) : currentPlan === 'business' ? (
              <a href={enterpriseMailHref} style={buttonSecondary()}>
                🤝 Enterprise iletişim
              </a>
            ) : (
              <Link href="/admin" style={buttonSuccess()}>
                ✅ Enterprise aktif
              </Link>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
          }}
        >
          <PlanCard
            plan="free"
            currentPlan={currentPlan}
            requiredPlan={requiredPlan}
            title="Free"
            features={[
              '1 ürün',
              '50 okutma',
              'Temel doğrulama',
              'Deneme kullanımı',
            ]}
          />

          <PlanCard
            plan="starter"
            currentPlan={currentPlan}
            requiredPlan={requiredPlan}
            title="Starter"
            features={[
              '5 ürün',
              '1.000 okutma / ay',
              'QR doğrulama',
              'Temel analiz',
            ]}
            cta="Starter’a geç"
            href={getUpgradeHref('starter', reason)}
          />

          <PlanCard
            plan="pro"
            currentPlan={currentPlan}
            requiredPlan={requiredPlan}
            title="Pro"
            featured
            features={[
              '25 ürün',
              '10.000 okutma / ay',
              'Sahtecilik tespiti',
              'Email uyarıları',
              'Gelişmiş analiz',
            ]}
            cta="Hemen Pro’ya geç"
            href={getUpgradeHref('pro', reason)}
          />

          <PlanCard
            plan="business"
            currentPlan={currentPlan}
            requiredPlan={requiredPlan}
            title="Business"
            features={[
              '100 ürün',
              '50.000 okutma / ay',
              'CSV export',
              'Gelişmiş raporlama',
              'Öncelikli destek',
            ]}
            cta="Business’a geç"
            href={getUpgradeHref('business', reason)}
          />

          <PlanCard
            plan="enterprise"
            currentPlan={currentPlan}
            requiredPlan={requiredPlan}
            title="Enterprise"
            features={[
              'API erişimi',
              'Özel entegrasyon',
              'Yüksek hacim',
              'Dedicated destek',
              'Kurumsal onboarding',
            ]}
            cta="Enterprise satış ekibiyle konuş"
            href={enterpriseMailHref}
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Not</div>
          <div style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
            Ödeme butonları backend ödeme route’una gider. Route seçilen plana
            göre ödeme linki oluşturur, callback ile sonucu alır ve verify
            aşamasında yalnızca gerçek başarılı ödeme varsa hesabı yükseltir.
            CSV export sadece Business ve Enterprise planlarda aktiftir.
          </div>
        </div>
      </div>
    </main>
  )
}