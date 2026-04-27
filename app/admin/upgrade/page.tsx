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

type PlanView = 'free' | 'pro' | 'enterprise'

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
      ? '1px solid rgba(59,130,246,0.45)'
      : '1px solid rgba(255,255,255,0.10)',
    background: featured
      ? 'linear-gradient(180deg, rgba(37,99,235,0.14), rgba(255,255,255,0.04))'
      : 'rgba(255,255,255,0.04)',
    padding: 20,
    boxShadow: featured
      ? '0 16px 40px rgba(37,99,235,0.18)'
      : '0 10px 30px rgba(0,0,0,0.18)',
    minHeight: 420,
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
    background: '#2563eb',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 800,
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
  if (v === 'pro') return 'pro'
  return 'free'
}

function normalizeRequiredPlan(value?: string): PlanView {
  const v = String(value ?? 'pro').trim().toLowerCase()
  if (v === 'enterprise') return 'enterprise'
  if (v === 'free') return 'free'
  return 'pro'
}

function getPlanLimit(plan: PlanView) {
  if (plan === 'enterprise') return null
  if (plan === 'pro') return 20
  return 3
}

function planBadgeStyle(text: PlanView): CSSProperties {
  if (text === 'pro') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      background: 'rgba(59,130,246,0.18)',
      border: '1px solid rgba(59,130,246,0.35)',
      color: '#bfdbfe',
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    }
  }

  if (text === 'enterprise') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      background: 'rgba(168,85,247,0.18)',
      border: '1px solid rgba(168,85,247,0.35)',
      color: '#e9d5ff',
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    }
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e6e6e6',
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
    return 'CSV export özelliği için daha yüksek plan gerekiyor.'
  }
  if (reason === 'premium_feature') {
    return 'Bu özellik mevcut planında kapalı.'
  }
  if (reason === 'analytics') {
    return 'Gelişmiş analitik için daha yüksek plan gerekiyor.'
  }
  return 'Daha fazla ürün doğrulamak ve sahte ürünleri tespit etmek için planını yükselt.'
}

function getProUpgradeHref(reason?: string) {
  const params = new URLSearchParams({
    plan: 'pro',
  })

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
  if (plan === 'enterprise') {
    return 'Büyük markalar ve kurumsal kullanım'
  }
  if (plan === 'pro') {
    return 'Büyüyen markalar için'
  }
  return 'Başlangıç planı'
}

function planPrice(plan: PlanView) {
  if (plan === 'enterprise') return 'Teklif usulü'
  if (plan === 'pro') return '₺299/ay'
  return '₺0'
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
  const proUpgradeHref = getProUpgradeHref(reason)
  const enterpriseMailHref = getEnterpriseMailHref()

  const alreadyEnough =
    currentPlan === 'enterprise' ||
    (currentPlan === 'pro' && requiredPlan !== 'enterprise')

  return (
    <main style={pageStyle()}>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
        }}
      >
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
                ? 'Planın zaten uygun görünüyor'
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
              : 'Sistem bu isteği durdurdu ve seni upgrade sayfasına yönlendirdi. Bu yapı artık DPPForge içinde gerçek SaaS plan kontrolünün aktif olduğunu gösterir.'}
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
              <a href={proUpgradeHref} style={buttonPrimary()}>
                💰 Pro’ya geç
              </a>
            ) : currentPlan === 'pro' ? (
              <Link href="/admin/analytics" style={buttonSuccess()}>
                🚀 Pro aktif
              </Link>
            ) : (
              <a href={enterpriseMailHref} style={buttonSecondary()}>
                🤝 Enterprise iletişim
              </a>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          <div style={cardStyle(currentPlan === 'free')}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24 }}>Free</h2>
              <span style={planBadgeStyle('free')}>
                {currentPlan === 'free' ? 'aktif plan' : 'free'}
              </span>
            </div>

            <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>
              {planPrice('free')}
            </div>
            <div style={{ opacity: 0.7, marginBottom: 14 }}>
              {planCardDescription('free')}
            </div>

            <div style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
              <div style={featureItemStyle()}>• 3 ürün limiti</div>
              <div style={featureItemStyle()}>• Temel doğrulama sayfası</div>
              <div style={featureItemStyle()}>• Sınırlı kullanım</div>
              <div style={featureItemStyle()}>• Gelişmiş fraud araçları kapalı</div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              {currentPlan === 'free' ? (
                <div style={{ opacity: 0.78, fontSize: 13 }}>
                  Şu anda bu planı kullanıyorsun.
                </div>
              ) : (
                <div style={{ opacity: 0.78, fontSize: 13 }}>
                  Başlangıç ve deneme süreci için uygun.
                </div>
              )}
            </div>
          </div>

          <div style={cardStyle(requiredPlan === 'pro' || currentPlan === 'pro')}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24 }}>Pro</h2>
              <span style={planBadgeStyle('pro')}>
                {currentPlan === 'pro'
                  ? 'aktif plan'
                  : requiredPlan === 'pro'
                  ? 'önerilen'
                  : 'pro'}
              </span>
            </div>

            <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>
              {planPrice('pro')}
            </div>
            <div style={{ opacity: 0.7, marginBottom: 14 }}>
              {planCardDescription('pro')}
            </div>

            <div style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
              <div style={featureItemStyle()}>• Sınırsız ürün</div>
              <div style={featureItemStyle()}>• Sınırsız QR okutma</div>
              <div style={featureItemStyle()}>• 🔥 Sahte ürün tespiti (Fraud detection)</div>
              <div style={featureItemStyle()}>• ⚠️ Anlık email alarm sistemi</div>
              <div style={featureItemStyle()}>• 📊 Gelişmiş analiz paneli</div>
             <div style={featureItemStyle()}>• 📁 CSV / PDF export</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            💡 Tek bir sahte ürünü yakalamak bile bu planın maliyetini fazlasıyla karşılar.
            </div>

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              {currentPlan === 'pro' ? (
                <Link href="/admin" style={buttonSuccess()}>
                  ✅ Pro plan aktif
                </Link>
              ) : currentPlan === 'enterprise' ? (
                <Link href="/admin" style={buttonSuccess()}>
                  ✅ Daha yüksek plan aktif
                </Link>
              ) : (
                <a href={proUpgradeHref} style={buttonPrimary()}>
                  🚀 Hemen Pro’ya geç
                </a>
              )}
            </div>
          </div>

          <div
            style={cardStyle(
              requiredPlan === 'enterprise' || currentPlan === 'enterprise'
            )}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24 }}>Enterprise</h2>
              <span style={planBadgeStyle('enterprise')}>
                {currentPlan === 'enterprise'
                  ? 'aktif plan'
                  : requiredPlan === 'enterprise'
                  ? 'gerekli plan'
                  : 'enterprise'}
              </span>
            </div>

            <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>
              {planPrice('enterprise')}
            </div>
            <div style={{ opacity: 0.7, marginBottom: 14 }}>
              {planCardDescription('enterprise')}
            </div>

            <div style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
              <div style={featureItemStyle()}>• Sınırsız ürün</div>
              <div style={featureItemStyle()}>• Export ve raporlama</div>
              <div style={featureItemStyle()}>• Premium fraud modülleri</div>
              <div style={featureItemStyle()}>• API / özel entegrasyon</div>
              <div style={featureItemStyle()}>• Kurumsal onboarding</div>
            </div>

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              {currentPlan === 'enterprise' ? (
                <Link href="/admin" style={buttonSuccess()}>
                  ✅ Enterprise aktif
                </Link>
              ) : (
                <a href={enterpriseMailHref} style={buttonSecondary()}>
                  Enterprise satış ekibiyle konuş
                </a>
              )}
            </div>
          </div>
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
            Pro butonu backend ödeme route’una gider. Bu route iyzico ödeme
            sayfası oluşturur, callback ile sonucu alır ve verify aşamasında
            yalnızca gerçek başarılı ödeme varsa hesabı yükseltir.
          </div>
        </div>
      </div>
    </main>
  )
}