// app/admin/page.tsx
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import AdminRow from './AdminRow'
import ReviewSelect from './ReviewSelect'
import OpenEventRow from './OpenEventRow'
import {
  normalizePlan,
  getPlanLimits,
  canCreateProduct,
  type PlanType,
} from '@/lib/plan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_env')
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

type ReviewState = 'open' | 'in_review' | 'resolved_ok' | 'confirmed_fake'

function normalizeReviewState(value: string | null | undefined): ReviewState {
  if (
    value === 'open' ||
    value === 'in_review' ||
    value === 'resolved_ok' ||
    value === 'confirmed_fake'
  ) {
    return value
  }

  if (value === 'approved') return 'resolved_ok'
  if (value === 'rejected') return 'confirmed_fake'
  if (value === 'reviewing') return 'in_review'

  return 'open'
}

type AccountPlan = PlanType

type PageRow = {
  id: string
  slug: string
  product_id: string
  account_id: string
  published_at: string | null
  review_state: ReviewState
}

type ProductRow = {
  id: string
  name_tr: string | null
  sku: string | null
}

type ScanSummaryRow = {
  page_id: string
  scans_total: number
  last_scan_at: string | null
  scans_24h: number
  unique_ips_24h: number
  unique_countries_24h: number
  is_suspicious: boolean
}

type Severity = 'low' | 'medium' | 'high'

type EventRow = {
  id: string
  page_id: string
  type: 'suspicious_scan' | string
  status: 'open' | 'resolved'
  severity: Severity
  occurrences: number
  first_seen_at: string
  last_seen_at: string
  reasons: string[]
  payload: unknown
}

type CounterfeitAlarmRow = {
  id: string
  page_id: string
  alarm_type: string | null
  risk_score: number | null
  risk_level: string | null
  reasons: string[] | null
  created_at: string | null
  resolved: boolean | null
}

function since(iso?: string | null) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const diff = Date.now() - t

  const min = Math.floor(diff / 60000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min} dk`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} sa`
  return `${Math.floor(hr / 24)} gün`
}

function sinceLabel(iso?: string | null) {
  const value = since(iso)
  if (value === '—' || value === 'şimdi') return 'Son alarm: şimdi'
  return `Son alarm: ${value} önce`
}

function translateReason(r: string) {
  if (r === 'multi-country burst') return 'Kısa sürede farklı ülkelerden okutma'
  if (r === 'high scan velocity') return 'Çok hızlı ve yoğun okutma'
  if (r === 'unique ip spike') return 'Farklı cihaz/IP artışı'
  if (r === 'multi-country scans in short time') {
    return 'Kısa sürede farklı ülkelerden okutma'
  }
  return r
}

function translateRiskLevel(level?: string | null) {
  const value = String(level ?? '').trim().toLowerCase()

  if (value === 'critical') return 'Kritik'
  if (value === 'high') return 'Yüksek'
  if (value === 'medium') return 'Orta'
  if (value === 'low') return 'Düşük'

  return level ?? '—'
}

function translateSeverity(sev: Severity) {
  if (sev === 'high') return 'Yüksek'
  if (sev === 'medium') return 'Orta'
  return 'Düşük'
}

function pillStyle(bg: string, border: string, color: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 800 as const,
    lineHeight: '16px',
    whiteSpace: 'nowrap' as const,
  }
}

function headerButtonStyle(
  variant: 'default' | 'primary' | 'success' = 'default'
) {
  if (variant === 'primary') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 12px',
      borderRadius: 12,
      border: '1px solid rgba(59,130,246,0.35)',
      background: 'rgba(59,130,246,0.18)',
      color: '#dbeafe',
      textDecoration: 'none',
      fontWeight: 800 as const,
    }
  }

  if (variant === 'success') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 12px',
      borderRadius: 12,
      border: '1px solid rgba(34,197,94,0.35)',
      background: 'rgba(34,197,94,0.16)',
      color: '#bbf7d0',
      textDecoration: 'none',
      fontWeight: 800 as const,
    }
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e6e6e6',
    textDecoration: 'none',
    fontWeight: 800 as const,
  }
}

function severityBadge(sev: Severity) {
  const style =
    sev === 'high'
      ? pillStyle('rgba(239,68,68,0.14)', 'rgba(239,68,68,0.35)', '#fecaca')
      : sev === 'medium'
      ? pillStyle('rgba(245,158,11,0.14)', 'rgba(245,158,11,0.35)', '#fde68a')
      : pillStyle(
          'rgba(255,255,255,0.06)',
          'rgba(255,255,255,0.12)',
          'rgba(255,255,255,0.85)'
        )

  return (
    <span
      style={{
        ...style,
        fontWeight: 1000,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}
    >
      {translateSeverity(sev)}
    </span>
  )
}

function planBadge(plan?: string | null) {
  const p = normalizePlan(plan)

  const style =
    p === 'enterprise'
      ? pillStyle('rgba(168,85,247,0.14)', 'rgba(168,85,247,0.35)', '#e9d5ff')
      : p === 'pro'
      ? pillStyle('rgba(59,130,246,0.14)', 'rgba(59,130,246,0.35)', '#bfdbfe')
      : pillStyle(
          'rgba(255,255,255,0.06)',
          'rgba(255,255,255,0.12)',
          'rgba(255,255,255,0.85)'
        )

  return (
    <span
      style={{
        ...style,
        fontWeight: 1000,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}
    >
      Plan: {p}
    </span>
  )
}

function statCard(
  title: string,
  value: number,
  tone: 'default' | 'warn' | 'risk' = 'default'
) {
  const style =
    tone === 'risk'
      ? {
          border: '1px solid rgba(239,68,68,0.35)',
          background: 'rgba(239,68,68,0.08)',
          color: '#fecaca',
        }
      : tone === 'warn'
      ? {
          border: '1px solid rgba(245,158,11,0.35)',
          background: 'rgba(245,158,11,0.08)',
          color: '#fde68a',
        }
      : {
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
          color: '#e6e6e6',
        }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        ...style,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>{value}</div>
    </div>
  )
}

function resolveEffectivePlan(planType: unknown): AccountPlan {
  return normalizePlan(planType)
}

function planSummaryCard(params: {
  currentPlan: AccountPlan
  productsCount: number
}) {
  const { currentPlan, productsCount } = params
  const limits = getPlanLimits(currentPlan)
  const limit = Number.isFinite(limits.maxProducts) ? limits.maxProducts : null
  const scanLimit = Number.isFinite(limits.maxScansPerMonth)
  ? limits.maxScansPerMonth
  : null
  const isFree = currentPlan === 'free'
  const isPro = currentPlan === 'pro'
  const isEnterprise = currentPlan === 'enterprise'
  const usedPercent =
    limit && limit > 0
      ? Math.min(100, Math.round((productsCount / limit) * 100))
      : 0

  const tone = isEnterprise
    ? {
        border: '1px solid rgba(168,85,247,0.35)',
        background:
          'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(59,130,246,0.10))',
      }
    : isPro
    ? {
        border: '1px solid rgba(59,130,246,0.35)',
        background:
          'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.08))',
      }
    : {
        border: '1px solid rgba(245,158,11,0.30)',
        background:
          'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(255,255,255,0.04))',
      }

  const canStillCreate = canCreateProduct({
    plan: currentPlan,
    currentProductCount: productsCount,
  })

  return (
    <div
      style={{
        marginTop: 18,
        marginBottom: 18,
        padding: 18,
        borderRadius: 18,
        ...tone,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 260 }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {planBadge(currentPlan)}
            {isPro ? (
              <span
                style={pillStyle(
                  'rgba(34,197,94,0.14)',
                  'rgba(34,197,94,0.35)',
                  '#bbf7d0'
                )}
              >
                Ödeme aktif
              </span>
            ) : null}
            {isEnterprise ? (
              <span
                style={pillStyle(
                  'rgba(168,85,247,0.14)',
                  'rgba(168,85,247,0.35)',
                  '#e9d5ff'
                )}
              >
                Kurumsal hesap
              </span>
            ) : null}
            {!canStillCreate && !isEnterprise ? (
              <span
                style={pillStyle(
                  'rgba(239,68,68,0.14)',
                  'rgba(239,68,68,0.35)',
                  '#fecaca'
                )}
              >
                Limit doldu
              </span>
            ) : null}
          </div>

          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 900 }}>
             {currentPlan === 'enterprise'
              ? 'Kurumsal plan aktif'
               : currentPlan === 'business'
               ? 'Business plan aktif'
               : currentPlan === 'pro'
                ? 'Pro plan aktif'
                : currentPlan === 'starter'
                 ? 'Starter plan aktif'
                  : 'Ücretsiz plan aktif'}
          </div>

          <div
            style={{
            marginTop: 8,
            opacity: 0.78,
            fontSize: 14,
            lineHeight: 1.6,
         }}
       >
            {currentPlan === 'enterprise'
            ? '🏢 Kurumsal seviyede sınırsız ürün, API erişimi ve özel entegrasyonlarla operasyonlarını ölçekleyebilirsin.'
            : currentPlan === 'business'
            ? '🚀 Business plan ile yüksek hacimli doğrulama, CSV export ve gelişmiş analizlerle markanı profesyonel seviyede koruyorsun.'
            : currentPlan === 'pro'
            ? '🔥 Pro plan ile sahtecilik tespiti, email uyarıları ve gelişmiş analizlerle ürünlerini aktif olarak koruyorsun.'
            : currentPlan === 'starter'
            ? '📦 Starter plan ile doğrulama sistemine giriş yaptın. İşini büyütmek için üst planlara geçebilirsin.'
            : `🆓 Ücretsiz plan ile ${limit ?? 0} ürün limitin bulunur. Daha fazla özellik için planını yükseltebilirsin.`}
        </div>
        </div>

        <div
          style={{
            minWidth: 260,
            display: 'grid',
            gap: 10,
            justifyItems: 'stretch',
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(0,0,0,0.16)',
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.78 }}>Ürün kullanımı</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
  Aylık okutma limiti:{' '}
  <b style={{ opacity: 1 }}>
    {scanLimit === null ? 'sınırsız' : scanLimit}
  </b>
</div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>
              {limit === null
                ? `${productsCount} / sınırsız`
                : `${productsCount} / ${limit}`}
            </div>

            {limit !== null ? (
              <>
                <div
                  style={{
                    marginTop: 10,
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.10)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${usedPercent}%`,
                      height: '100%',
                      borderRadius: 999,
                      background:
                        usedPercent >= 100
                          ? 'rgba(239,68,68,0.85)'
                          : usedPercent >= 80
                          ? 'rgba(245,158,11,0.85)'
                          : 'rgba(59,130,246,0.85)',
                    }}
                  />
                </div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.74 }}>
                  Kullanım: %{usedPercent}
                </div>
              </>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.74 }}>
                Kurumsal planda ürün limiti bulunmaz.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/admin/create" style={headerButtonStyle()}>
              ➕ Yeni Ürün
            </Link>

            {isFree ? (
              <Link href="/admin/upgrade" style={headerButtonStyle('primary')}>
                💰 Pro’ya Geç
              </Link>
            ) : isPro ? (
              <Link href="/admin/analytics" style={headerButtonStyle('success')}>
                🚀 Pro Aktif
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

async function getCurrentAccountId() {
  const supabaseAuth = await createSupabaseServerClient()

  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser()

  if (userErr || !user) {
    console.error('🔥 ADMIN AUTH DEBUG user error', userErr)
    return null
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: membership, error: membershipErr } = await supabaseAdmin
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipErr) {
    console.error('🔥 ADMIN ACCOUNT DEBUG membership error', membershipErr)
    return null
  }

  return membership?.account_id ?? null
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    suspicious?: string
    sort?: string
    review?: ReviewState | 'all'
    sev?: Severity | 'all'
  }>
}) {
  const { q, suspicious, sort, review, sev } = await searchParams

  const query = (q ?? '').trim().toLowerCase()
  const onlySuspicious = suspicious === '1'
  const reviewFilter = (review ?? 'all') as ReviewState | 'all'
  const sevFilter = (sev ?? 'all') as Severity | 'all'

  const sortMode = (sort ?? 'last_scan_desc') as
    | 'last_scan_desc'
    | 'published_desc'
    | 'published_asc'
    | 'scans_desc'
    | 'scans_asc'
    | 'slug_asc'

  const supabase = getSupabaseAdmin()
  const currentAccountId = await getCurrentAccountId()

  let currentPlan: AccountPlan = 'free'

  if (currentAccountId) {
    try {
      const { data: accountRow, error: accountErr } = await supabase
        .from('accounts')
        .select('plan_type, plan_expires_at, subscription_status')
        .eq('id', currentAccountId)
        .maybeSingle()

      if (accountErr) {
        console.error('[accounts plan] failed:', accountErr)
      } else {
        currentPlan = resolveEffectivePlan(accountRow?.plan_type)

        console.log('🔥 ADMIN PLAN DEBUG', {
          currentAccountId,
          rawPlanType: accountRow?.plan_type,
          normalizedPlan: normalizePlan(accountRow?.plan_type),
          subscriptionStatus: accountRow?.subscription_status,
          planExpiresAt: accountRow?.plan_expires_at,
          resolvedPlan: currentPlan,
        })
      }
    } catch (e) {
      console.error('[accounts plan] failed:', e)
    }
  }

  let openReportsCount = 0

  try {
    let reportsQuery = supabase
      .from('dpp_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')

    if (currentAccountId) {
      reportsQuery = reportsQuery.eq('account_id', currentAccountId)
    }

    const { count } = await reportsQuery
    openReportsCount = count ?? 0
  } catch (e) {
    console.error('[dpp_reports count] failed:', e)
  }

  let pagesQuery = supabase
    .from('public_pages')
    .select('id, slug, product_id, account_id, published_at, review_state')
    .order('published_at', { ascending: false })

  if (currentAccountId) {
    pagesQuery = pagesQuery.eq('account_id', currentAccountId)
  }

  const { data: pagesRaw, error: pagesErr } = await pagesQuery

  if (pagesErr) {
    return (
      <div
        style={{
          padding: 40,
          fontFamily: 'system-ui',
          background: '#0b0f17',
          color: '#e6e6e6',
        }}
      >
        <h1>Yönetim paneli hatası</h1>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
          {JSON.stringify(pagesErr, null, 2)}
        </pre>
      </div>
    )
  }

  const pages = (pagesRaw ?? []) as PageRow[]
  const pageIds = pages.map((p) => p.id)
  const productIds = Array.from(
    new Set(pages.map((p) => p.product_id).filter(Boolean))
  )

  let products: ProductRow[] = []

  if (productIds.length > 0) {
    const { data: productsRaw, error: prodErr } = await supabase
      .from('products')
      .select('id, name_tr, sku')
      .in('id', productIds)

    if (prodErr) {
      return (
        <div
          style={{
            padding: 40,
            fontFamily: 'system-ui',
            background: '#0b0f17',
            color: '#e6e6e6',
          }}
        >
          <h1>Ürün verisi hatası</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
            {JSON.stringify(prodErr, null, 2)}
          </pre>
        </div>
      )
    }

    products = (productsRaw ?? []) as ProductRow[]
  }

  const productById = new Map(products.map((p) => [p.id, p]))

  let summary: ScanSummaryRow[] = []

  if (pageIds.length > 0) {
    const { data: summaryRaw, error: summaryErr } = await supabase
      .from('dpp_scan_summary')
      .select(
        'page_id, scans_total, last_scan_at, scans_24h, unique_ips_24h, unique_countries_24h, is_suspicious'
      )
      .in('page_id', pageIds)

    if (summaryErr) {
      return (
        <div
          style={{
            padding: 40,
            fontFamily: 'system-ui',
            background: '#0b0f17',
            color: '#e6e6e6',
          }}
        >
          <h1>Okutma özeti hatası</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
            {JSON.stringify(summaryErr, null, 2)}
          </pre>
        </div>
      )
    }

    summary = (summaryRaw ?? []) as ScanSummaryRow[]
  }

  const summaryByPageId = new Map(summary.map((r) => [r.page_id, r]))

  let openEvents: EventRow[] = []

  if (pageIds.length > 0) {
    let eventsQuery = supabase
      .from('dpp_events')
      .select(
        'id, page_id, type, status, severity, occurrences, first_seen_at, last_seen_at, reasons, payload'
      )
      .eq('status', 'open')
      .eq('type', 'suspicious_scan')
      .in('page_id', pageIds)

    if (sevFilter !== 'all') {
      eventsQuery = eventsQuery.eq('severity', sevFilter)
    }

    const { data: eventsRaw, error: eventsErr } = await eventsQuery
      .order('severity', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .limit(20)

    if (eventsErr) {
      return (
        <div
          style={{
            padding: 40,
            fontFamily: 'system-ui',
            background: '#0b0f17',
            color: '#e6e6e6',
          }}
        >
          <h1>Alarm verisi hatası</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
            {JSON.stringify(eventsErr, null, 2)}
          </pre>
        </div>
      )
    }

    openEvents = (eventsRaw ?? []) as EventRow[]
  }

  let counterfeitAlarms: CounterfeitAlarmRow[] = []

  if (pageIds.length > 0) {
    const { data: counterfeitRaw, error: counterfeitErr } = await supabase
      .from('dpp_alarms')
      .select(
        'id, page_id, alarm_type, risk_score, risk_level, reasons, created_at, resolved'
      )
      .eq('alarm_type', 'counterfeit')
      .eq('resolved', false)
      .in('page_id', pageIds)
      .order('created_at', { ascending: false })

    if (counterfeitErr) {
      return (
        <div
          style={{
            padding: 40,
            fontFamily: 'system-ui',
            background: '#0b0f17',
            color: '#e6e6e6',
          }}
        >
          <h1>Sahtecilik alarmı hatası</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
            {JSON.stringify(counterfeitErr, null, 2)}
          </pre>
        </div>
      )
    }

    counterfeitAlarms = (counterfeitRaw ?? []) as CounterfeitAlarmRow[]
  }

  const counterfeitByPageId = new Map<string, CounterfeitAlarmRow>()

  for (const alarm of counterfeitAlarms) {
    if (!counterfeitByPageId.has(alarm.page_id)) {
      counterfeitByPageId.set(alarm.page_id, alarm)
    }
  }

  const uniqueCounterfeitAlarms = Array.from(counterfeitByPageId.values())

  const enriched = pages.map((p) => {
    const prod = productById.get(p.product_id)
    const sum = summaryByPageId.get(p.id)
    const counterfeit = counterfeitByPageId.get(p.id) ?? null

    const scansTotal = sum?.scans_total ?? 0
    const isSuspicious = sum?.is_suspicious ?? false
    const scans24h = sum?.scans_24h ?? 0
    const uniqueIps24h = sum?.unique_ips_24h ?? 0
    const uniqueCountries24h = sum?.unique_countries_24h ?? 0
    const lastScanAt = sum?.last_scan_at ?? null

    const haystack = [p.slug, prod?.name_tr ?? '', prod?.sku ?? '']
      .join(' ')
      .toLowerCase()

    return {
      p,
      prod,
      scansTotal,
      scans24h,
      uniqueIps24h,
      uniqueCountries24h,
      lastScanAt,
      isSuspicious,
      counterfeit,
      haystack,
    }
  })

  const enrichedByPageId = new Map(enriched.map((x) => [x.p.id, x]))

  let visible = enriched

  if (query) visible = visible.filter((x) => x.haystack.includes(query))
  if (onlySuspicious) visible = visible.filter((x) => x.isSuspicious)
  if (reviewFilter !== 'all') {
    visible = visible.filter((x) => x.p.review_state === reviewFilter)
  }

  visible = visible.slice().sort((a, b) => {
    if (Boolean(a.counterfeit) !== Boolean(b.counterfeit)) {
      return a.counterfeit ? -1 : 1
    }

    if (a.isSuspicious !== b.isSuspicious) return a.isSuspicious ? -1 : 1

    if (a.p.review_state !== b.p.review_state) {
      if (a.p.review_state === 'in_review') return -1
      if (b.p.review_state === 'in_review') return 1
    }

    if (sortMode === 'scans_desc') return b.scansTotal - a.scansTotal
    if (sortMode === 'scans_asc') return a.scansTotal - b.scansTotal

    if (sortMode === 'published_asc') {
      const da = a.p.published_at ? new Date(a.p.published_at).getTime() : 0
      const db = b.p.published_at ? new Date(b.p.published_at).getTime() : 0
      return da - db
    }

    if (sortMode === 'published_desc') {
      const da = a.p.published_at ? new Date(a.p.published_at).getTime() : 0
      const db = b.p.published_at ? new Date(b.p.published_at).getTime() : 0
      return db - da
    }

    if (sortMode === 'slug_asc') return a.p.slug.localeCompare(b.p.slug)

    const la = a.lastScanAt ? new Date(a.lastScanAt).getTime() : 0
    const lb = b.lastScanAt ? new Date(b.lastScanAt).getTime() : 0
    return lb - la
  })

  const suspiciousCount = enriched.filter((x) => x.isSuspicious).length
  const counterfeitCount = uniqueCounterfeitAlarms.length
  const totalScans = enriched.reduce((acc, x) => acc + x.scansTotal, 0)
  const totalScans24h = enriched.reduce((acc, x) => acc + x.scans24h, 0)

  return (
    <div
      style={{
        padding: 40,
        background: '#0b0f17',
        minHeight: '100vh',
        color: '#e6e6e6',
        fontFamily: 'system-ui',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>🔐 Yönetici Paneli</h1>
          <p style={{ opacity: 0.7, marginTop: 8 }}>DPPForge kontrol paneli</p>
          <div style={{ marginTop: 10 }}>{planBadge(currentPlan)}</div>
        </div>
        <div
  style={{
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  }}
>
  {currentPlan === 'business' || currentPlan === 'enterprise' ? (
    <a
      href="/api/export/csv"
      style={{
        padding: '10px 16px',
        borderRadius: 12,
        background: 'rgba(34,211,238,0.15)',
        border: '1px solid rgba(34,211,238,0.4)',
        color: '#cffafe',
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      📥 CSV indir
    </a>
  ) : (
    <Link
      href="/admin/upgrade"
      style={{
        padding: '10px 16px',
        borderRadius: 12,
        background: 'rgba(245,158,11,0.14)',
        border: '1px solid rgba(245,158,11,0.35)',
        color: '#fde68a',
        fontWeight: 800,
        textDecoration: 'none',
      }}
    >
      📊 CSV için Business’a geç
    </Link>
  )}
</div>
      </div>

      {planSummaryCard({
        currentPlan,
        productsCount: pages.length,
      })}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {statCard('Toplam ürün', pages.length)}
        {statCard('Toplam okutma', totalScans)}
        {statCard('Son 24 saat okutma', totalScans24h)}
        {statCard('Şüpheli ürün', suspiciousCount, 'warn')}
        {statCard('Aktif sahtecilik', counterfeitCount, 'risk')}
      </div>

      {uniqueCounterfeitAlarms.length > 0 && (
        <div
          style={{
            marginTop: 10,
            marginBottom: 16,
            padding: 16,
            borderRadius: 18,
            border: '1px solid rgba(239,68,68,0.25)',
            background: 'rgba(239,68,68,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#fecaca' }}>
                🚨 Aktif Sahtecilik Alarmları
              </div>
              <div style={{ opacity: 0.8, fontSize: 13, marginTop: 6 }}>
                Sahtecilik riski tespit edilen ürünler
              </div>
            </div>

            <div
              style={pillStyle(
                'rgba(239,68,68,0.12)',
                'rgba(239,68,68,0.25)',
                '#fecaca'
              )}
            >
              {uniqueCounterfeitAlarms.length} aktif
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {uniqueCounterfeitAlarms.slice(0, 5).map((alarm) => {
              const ctx = enrichedByPageId.get(alarm.page_id)
              const slug = ctx?.p.slug ?? alarm.page_id.slice(0, 8)
              const name = ctx?.prod?.name_tr ?? '—'
              const sku = ctx?.prod?.sku ?? ''

              return (
                <div
                  key={alarm.id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: '1px solid rgba(239,68,68,0.25)',
                    background: 'rgba(0,0,0,0.18)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>{name}</div>
                      {sku ? (
                        <div style={{ opacity: 0.7, fontSize: 12 }}>{sku}</div>
                      ) : null}
                      <span
                        style={pillStyle(
                          'rgba(239,68,68,0.14)',
                          'rgba(239,68,68,0.35)',
                          '#fecaca'
                        )}
                      >
                        {translateRiskLevel(alarm.risk_level)}
                      </span>
                      <span
                        style={pillStyle(
                          'rgba(255,255,255,0.06)',
                          'rgba(255,255,255,0.12)',
                          'rgba(255,255,255,0.85)'
                        )}
                      >
                        Risk skoru: {alarm.risk_score ?? '-'}
                      </span>
                      <span
                        style={pillStyle(
                          'rgba(239,68,68,0.12)',
                          'rgba(239,68,68,0.25)',
                          '#fecaca'
                        )}
                      >
                        ⏱ {sinceLabel(alarm.created_at)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      {(alarm.reasons ?? []).slice(0, 4).map((r) => (
                        <span
                          key={r}
                          style={pillStyle(
                            'rgba(255,255,255,0.06)',
                            'rgba(255,255,255,0.12)',
                            'rgba(255,255,255,0.85)'
                          )}
                        >
                          {translateReason(r)}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
                      /p/{slug}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link
                      href={`/admin/p/${alarm.page_id}`}
                      style={{
                        ...headerButtonStyle(),
                        padding: '8px 10px',
                        fontSize: 13,
                      }}
                    >
                      Detaylar
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          padding: 16,
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>⚠ Açık Alarmlar</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 6 }}>
              Şüpheli okuma olayları (açık) —{' '}
              {sevFilter === 'all' ? 'tümü' : translateSeverity(sevFilter)}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={pillStyle(
                'rgba(239,68,68,0.12)',
                'rgba(239,68,68,0.25)',
                '#fecaca'
              )}
            >
              {openEvents.length} açık
            </div>

            <Link
              href="/admin/alarms"
              style={{
                ...headerButtonStyle(),
                padding: '8px 10px',
                fontSize: 13,
              }}
            >
              Tüm alarmlar
            </Link>
          </div>
        </div>

        <form
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ fontSize: 13, opacity: 0.85 }}>Ciddiyet:</label>

          <select
            name="sev"
            defaultValue={sevFilter}
            style={{
              padding: '8px 10px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
            }}
          >
            <option value="all">Hepsi</option>
            <option value="high">Yüksek</option>
            <option value="medium">Orta</option>
            <option value="low">Düşük</option>
          </select>

          <input type="hidden" name="q" value={q ?? ''} />
          <input type="hidden" name="review" value={reviewFilter} />
          <input type="hidden" name="sort" value={sortMode} />
          {onlySuspicious ? (
            <input type="hidden" name="suspicious" value="1" />
          ) : null}

          <button
            type="submit"
            style={{
              padding: '8px 10px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.08)',
              color: '#e6e6e6',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Uygula
          </button>

          <a
            href="/admin"
            style={{
              color: '#a7c7ff',
              textDecoration: 'none',
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            Sıfırla
          </a>
        </form>

        {openEvents.length === 0 ? (
          <div
            style={{
              marginTop: 12,
              opacity: 0.85,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            🎉 Harika! Aktif alarm yok. Tüm ürünler normal çalışıyor.
          </div>
        ) : (
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {openEvents.slice(0, 5).map((ev) => {
              const ctx = enrichedByPageId.get(ev.page_id)
              const slug = ctx?.p.slug ?? ev.page_id.slice(0, 8)
              const name = ctx?.prod?.name_tr ?? '—'
              const sku = ctx?.prod?.sku ?? ''
              const isHigh = ev.severity === 'high'

              return (
                <div
                  key={ev.id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: isHigh
                      ? '1px solid rgba(239,68,68,0.35)'
                      : '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(0,0,0,0.18)',
                    boxShadow: isHigh
                      ? '0 0 0 1px rgba(239,68,68,0.18), 0 12px 40px rgba(239,68,68,0.06)'
                      : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {name}
                      </div>

                      {sku ? (
                        <div
                          style={{
                            opacity: 0.7,
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {sku}
                        </div>
                      ) : null}

                      {severityBadge(ev.severity)}

                      <div
                        style={pillStyle(
                          'rgba(239,68,68,0.12)',
                          'rgba(239,68,68,0.25)',
                          '#fecaca'
                        )}
                      >
                        ⏱ {since(ev.last_seen_at)}
                      </div>

                      <div
                        style={pillStyle(
                          'rgba(255,255,255,0.06)',
                          'rgba(255,255,255,0.12)',
                          'rgba(255,255,255,0.85)'
                        )}
                      >
                        🔁 {ev.occurrences}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      {(ev.reasons ?? []).slice(0, 4).map((r) => (
                        <span
                          key={r}
                          style={pillStyle(
                            'rgba(255,255,255,0.06)',
                            'rgba(255,255,255,0.12)',
                            'rgba(255,255,255,0.85)'
                          )}
                        >
                          {translateReason(r)}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
                      /p/{slug}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <OpenEventRow
                      eventId={ev.id}
                      pageId={ev.page_id}
                      severity={ev.severity}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, opacity: 0.7, fontSize: 12 }}>
        Toplam sayfa: <b style={{ opacity: 1 }}>{pages.length}</b> — Gösterilen:{' '}
        <b style={{ opacity: 1 }}>{visible.length}</b> — Açık rapor:{' '}
        <b style={{ opacity: 1 }}>{openReportsCount}</b>
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <form
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Ara: ürün adı / SKU / sayfa yolu"
            style={{
              width: 320,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
              outline: 'none',
            }}
          />

          <ReviewSelect value={reviewFilter} />

          <select
            name="sort"
            defaultValue={sortMode}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
            }}
          >
            <option value="last_scan_desc">Son okutma: yeni → eski</option>
            <option value="published_desc">Yayın: yeni → eski</option>
            <option value="published_asc">Yayın: eski → yeni</option>
            <option value="scans_desc">Okutma: çok → az</option>
            <option value="scans_asc">Okutma: az → çok</option>
            <option value="slug_asc">Sayfa yolu: A → Z</option>
          </select>

          <label
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            <input
              type="checkbox"
              name="suspicious"
              value="1"
              defaultChecked={onlySuspicious}
            />
            Sadece ⚠ şüpheli
          </label>

          <button
            type="submit"
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.08)',
              color: '#e6e6e6',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Uygula
          </button>

          <a
            href="/admin"
            style={{
              color: '#a7c7ff',
              textDecoration: 'none',
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            Sıfırla
          </a>
        </form>
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Sonuç bulunamadı</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Filtreleri değiştirerek tekrar deneyin veya{' '}
            <a href="/admin" style={{ color: '#a7c7ff', textDecoration: 'none' }}>
              sıfırlayın
            </a>
            .
          </div>
        </div>
      ) : null}

      <table
        style={{
          width: '100%',
          marginTop: 20,
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr style={{ textAlign: 'left', opacity: 0.7 }}>
            <th style={{ padding: '10px 8px' }}>Sayfa yolu</th>
            <th style={{ padding: '10px 8px' }}>Ürün</th>
            <th style={{ padding: '10px 8px' }}>Toplam okutma</th>
            <th style={{ padding: '10px 8px' }}>Yayın</th>
            <th style={{ padding: '10px 8px' }}>Durum</th>
            <th style={{ padding: '10px 8px', textAlign: 'right' }} />
          </tr>
        </thead>

        <tbody>
          {visible.map(
            ({
              p,
              prod,
              scansTotal,
              isSuspicious,
              scans24h,
              uniqueIps24h,
              uniqueCountries24h,
              lastScanAt,
              counterfeit,
            }) => (
              <AdminRow
                key={p.id}
                page={p}
                product={prod ?? null}
                scansCount={scansTotal}
                isSuspicious={isSuspicious}
                reviewState={normalizeReviewState(p.review_state)}
                scans24h={scans24h}
                uniqueIps24h={uniqueIps24h}
                uniqueCountries24h={uniqueCountries24h}
                lastScanAt={lastScanAt}
                counterfeit={counterfeit}
              />
            )
          )}
        </tbody>
      </table>
    </div>
  )
}