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
type AccountPlan = PlanType
type Severity = 'low' | 'medium' | 'high'

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

function buttonClass(
  variant: 'default' | 'primary' | 'success' | 'danger' = 'default'
) {
  if (variant === 'primary') {
    return 'inline-flex h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-extrabold text-[#08111f] transition hover:bg-cyan-300'
  }

  if (variant === 'success') {
    return 'inline-flex h-11 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/15 px-5 text-sm font-extrabold text-emerald-100 transition hover:bg-emerald-400/20'
  }

  if (variant === 'danger') {
    return 'inline-flex h-11 items-center justify-center rounded-full border border-red-400/30 bg-red-400/15 px-5 text-sm font-extrabold text-red-100 transition hover:bg-red-400/20'
  }

  return 'inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm font-extrabold text-white transition hover:bg-white/[0.07]'
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
      borderRadius: 999,
      border: '1px solid rgba(34,211,238,0.35)',
      background: 'rgba(34,211,238,0.16)',
      color: '#cffafe',
      textDecoration: 'none',
      fontWeight: 900 as const,
    }
  }

  if (variant === 'success') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 12px',
      borderRadius: 999,
      border: '1px solid rgba(34,197,94,0.35)',
      background: 'rgba(34,197,94,0.16)',
      color: '#bbf7d0',
      textDecoration: 'none',
      fontWeight: 900 as const,
    }
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e6e6e6',
    textDecoration: 'none',
    fontWeight: 900 as const,
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
      ? pillStyle('rgba(168,85,247,0.16)', 'rgba(168,85,247,0.38)', '#e9d5ff')
      : p === 'pro'
      ? pillStyle('rgba(34,211,238,0.16)', 'rgba(34,211,238,0.40)', '#cffafe')
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
  const classes =
    tone === 'risk'
      ? 'border-red-400/35 bg-gradient-to-br from-red-500/20 to-red-500/5 text-red-100 shadow-[0_0_35px_rgba(239,68,68,0.12)]'
      : tone === 'warn'
      ? 'border-amber-400/35 bg-gradient-to-br from-amber-500/18 to-amber-500/5 text-amber-100'
      : 'border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.025] text-white'

  return (
    <div
      className={`rounded-[22px] border p-5 transition hover:scale-[1.015] ${classes}`}
    >
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-4 text-3xl font-black tracking-tight">{value}</div>
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

  const canStillCreate = canCreateProduct({
    plan: currentPlan,
    currentProductCount: productsCount,
  })

  return (
    <section className="mt-8 rounded-[30px] border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[0.12] via-blue-500/[0.08] to-white/[0.03] p-5 shadow-[0_0_60px_rgba(34,211,238,0.10)] md:p-7">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
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

          <h2 className="mt-5 text-3xl font-black tracking-tight">
            {isEnterprise
              ? 'Kurumsal plan aktif'
              : isPro
              ? 'Pro plan aktif'
              : 'Ücretsiz plan aktif'}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 md:text-base">
            {isEnterprise
              ? 'Sınırsız ürün, gelişmiş operasyon ve kurumsal genişleme için uygun yapı.'
              : isPro
              ? 'Ürün limitin yükseldi. Ödeme doğrulandı ve hesabın Pro seviyesinde çalışıyor.'
              : `Ücretsiz plan ile ${
                  limit ?? 0
                } ürün limitin bulunur. Limit dolduğunda Pro’ya yükselterek devam edebilirsin.`}
          </p>

          <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-7 text-cyan-50">
            Bu panel; okutma verilerini, şüpheli aktiviteleri ve sahtecilik
            alarmlarını tek merkezden takip etmen için tasarlandı.
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[#08111f]/55 p-5">
          <div className="text-sm text-white/65">Ürün kullanımı</div>

          <div className="mt-3 text-sm text-white/60">
            Aylık okutma limiti:{' '}
            <b className="text-white">
              {scanLimit === null ? 'sınırsız' : scanLimit}
            </b>
          </div>

          <div className="mt-3 text-3xl font-black">
            {limit === null
              ? `${productsCount} / sınırsız`
              : `${productsCount} / ${limit}`}
          </div>

          {limit !== null ? (
            <>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={[
                    'h-full rounded-full',
                    usedPercent >= 100
                      ? 'bg-red-400'
                      : usedPercent >= 80
                      ? 'bg-amber-400'
                      : 'bg-cyan-400',
                  ].join(' ')}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>

              <div className="mt-3 text-xs text-white/55">
                Kullanım: %{usedPercent}
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-white/55">
              Kurumsal planda ürün limiti bulunmaz.
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/admin/create" className={buttonClass('default')}>
              ➕ Yeni Ürün
            </Link>

            {isFree ? (
              <Link href="/admin/upgrade" className={buttonClass('primary')}>
                💰 Pro’ya Geç
              </Link>
            ) : isPro ? (
              <Link href="/admin/analytics" className={buttonClass('success')}>
                🚀 Pro Aktif
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
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
      <div className="min-h-screen bg-[#08111f] p-10 text-white">
        <h1 className="text-2xl font-black">Yönetim paneli hatası</h1>
        <pre className="mt-4 whitespace-pre-wrap text-xs text-white/70">
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
        <div className="min-h-screen bg-[#08111f] p-10 text-white">
          <h1 className="text-2xl font-black">Ürün verisi hatası</h1>
          <pre className="mt-4 whitespace-pre-wrap text-xs text-white/70">
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
        <div className="min-h-screen bg-[#08111f] p-10 text-white">
          <h1 className="text-2xl font-black">Okutma özeti hatası</h1>
          <pre className="mt-4 whitespace-pre-wrap text-xs text-white/70">
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
        <div className="min-h-screen bg-[#08111f] p-10 text-white">
          <h1 className="text-2xl font-black">Alarm verisi hatası</h1>
          <pre className="mt-4 whitespace-pre-wrap text-xs text-white/70">
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
        <div className="min-h-screen bg-[#08111f] p-10 text-white">
          <h1 className="text-2xl font-black">Sahtecilik alarmı hatası</h1>
          <pre className="mt-4 whitespace-pre-wrap text-xs text-white/70">
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
    <div className="min-h-screen bg-[#08111f] text-white">
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:px-10 lg:px-12">
        <header className="sticky top-0 z-30 rounded-2xl border border-white/10 bg-[#08111f]/85 px-4 py-3 backdrop-blur md:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm text-white/50">DPPForge</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                Yönetim Merkezi
              </h1>
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1 text-sm">
              <Link
                href="/admin"
                className="shrink-0 rounded-full border border-cyan-400/35 bg-cyan-400/15 px-4 py-2 font-extrabold text-cyan-100"
              >
                🏠 Genel Bakış
              </Link>
              <Link
                href="/admin/alarms"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-extrabold text-white/80 hover:bg-white/[0.07]"
              >
                ⚠️ Alarmlar
              </Link>
              <Link
                href="/admin/payments"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-extrabold text-white/80 hover:bg-white/[0.07]"
              >
                💳 Ödemeler
              </Link>
              <Link
                href="/admin/revenue"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-extrabold text-white/80 hover:bg-white/[0.07]"
              >
                💰 Gelir
              </Link>
              <Link
                href="/admin/analytics"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-extrabold text-white/80 hover:bg-white/[0.07]"
              >
                📊 Analitik
              </Link>
              <Link
                href="/admin/create"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-extrabold text-white/80 hover:bg-white/[0.07]"
              >
                ➕ Yeni Ürün
              </Link>
            </nav>

            <Link href="/logout" className={buttonClass('default')}>
              Çıkış yap
            </Link>
          </div>
        </header>

        <section className="pt-12">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-cyan-300">
              🔐 Yönetici Paneli
            </div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">
              Marka koruma operasyonun tek merkezde.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-white/62">
              Ürünleri, okutma hareketlerini, şüpheli aktiviteleri ve
              sahtecilik alarmlarını landing ile uyumlu premium yönetim
              panelinden takip et.
            </p>
          </div>

          {planSummaryCard({
            currentPlan,
            productsCount: pages.length,
          })}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statCard('Toplam ürün', pages.length)}
            {statCard('Toplam okutma', totalScans)}
            {statCard('Son 24 saat okutma', totalScans24h)}
            {statCard('Şüpheli ürün', suspiciousCount, 'warn')}
            {statCard('Aktif sahtecilik', counterfeitCount, 'risk')}
          </div>
        </section>

        {uniqueCounterfeitAlarms.length > 0 && (
          <section className="mt-5 rounded-[26px] border border-red-400/25 bg-gradient-to-br from-red-500/16 to-red-500/5 p-5 shadow-[0_0_45px_rgba(239,68,68,0.12)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-black text-red-100">
                  🚨 Aktif Sahtecilik Alarmları
                </div>
                <div className="mt-1 text-sm text-white/65">
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

            <div className="mt-4 grid gap-3">
              {uniqueCounterfeitAlarms.slice(0, 5).map((alarm) => {
                const ctx = enrichedByPageId.get(alarm.page_id)
                const slug = ctx?.p.slug ?? alarm.page_id.slice(0, 8)
                const name = ctx?.prod?.name_tr ?? '—'
                const sku = ctx?.prod?.sku ?? ''

                return (
                  <div
                    key={alarm.id}
                    className="flex flex-col gap-4 rounded-[20px] border border-red-400/25 bg-[#08111f]/45 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-black">{name}</div>
                        {sku ? (
                          <div className="text-xs text-white/55">{sku}</div>
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

                      <div className="mt-3 flex flex-wrap gap-2">
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

                      <div className="mt-3 text-xs text-white/50">/p/{slug}</div>
                    </div>

                    <Link
                      href={`/admin/p/${alarm.page_id}`}
                      className={buttonClass('danger')}
                    >
                      Detaylar
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-black">⚠ Açık Alarmlar</div>
              <div className="mt-1 text-sm text-white/60">
                Şüpheli okuma olayları —{' '}
                {sevFilter === 'all' ? 'tümü' : translateSeverity(sevFilter)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                style={pillStyle(
                  'rgba(239,68,68,0.12)',
                  'rgba(239,68,68,0.25)',
                  '#fecaca'
                )}
              >
                {openEvents.length} açık
              </div>

              <Link href="/admin/alarms" className={buttonClass('default')}>
                Tüm alarmlar
              </Link>
            </div>
          </div>

          <form className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-white/70">Ciddiyet:</label>

            <select
              name="sev"
              defaultValue={sevFilter}
              className="h-10 rounded-2xl border border-white/10 bg-[#08111f] px-3 text-sm text-white outline-none"
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
              className="h-10 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-white hover:bg-white/[0.09]"
            >
              Uygula
            </button>

            <a href="/admin" className="text-sm font-semibold text-cyan-200">
              Sıfırla
            </a>
          </form>

          {openEvents.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-50">
              🎉 Harika! Aktif alarm yok. Tüm ürünler normal çalışıyor.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {openEvents.slice(0, 5).map((ev) => {
                const ctx = enrichedByPageId.get(ev.page_id)
                const slug = ctx?.p.slug ?? ev.page_id.slice(0, 8)
                const name = ctx?.prod?.name_tr ?? '—'
                const sku = ctx?.prod?.sku ?? ''
                const isHigh = ev.severity === 'high'

                return (
                  <div
                    key={ev.id}
                    className={[
                      'flex flex-col gap-4 rounded-[20px] border bg-[#08111f]/45 p-4 md:flex-row md:items-center md:justify-between',
                      isHigh
                        ? 'border-red-400/35 shadow-[0_0_35px_rgba(239,68,68,0.10)]'
                        : 'border-white/10',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate font-black">{name}</div>
                        {sku ? (
                          <div className="text-xs text-white/55">{sku}</div>
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

                      <div className="mt-3 flex flex-wrap gap-2">
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

                      <div className="mt-3 text-xs text-white/50">/p/{slug}</div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
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
        </section>

        <section className="mt-5">
          <div className="mb-4 text-xs text-white/55">
            Toplam sayfa: <b className="text-white">{pages.length}</b> —
            Gösterilen: <b className="text-white">{visible.length}</b> — Açık
            rapor: <b className="text-white">{openReportsCount}</b>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
            <form className="flex flex-wrap items-center gap-3">
              <input
                name="q"
                defaultValue={q ?? ''}
                placeholder="Ara: ürün adı / SKU / sayfa yolu"
                className="h-11 w-full rounded-2xl border border-white/10 bg-[#08111f] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/60 sm:w-80"
              />

              <ReviewSelect value={reviewFilter} />

              <select
                name="sort"
                defaultValue={sortMode}
                className="h-11 rounded-2xl border border-white/10 bg-[#08111f] px-4 text-sm text-white outline-none"
              >
                <option value="last_scan_desc">Son okutma: yeni → eski</option>
                <option value="published_desc">Yayın: yeni → eski</option>
                <option value="published_asc">Yayın: eski → yeni</option>
                <option value="scans_desc">Okutma: çok → az</option>
                <option value="scans_asc">Okutma: az → çok</option>
                <option value="slug_asc">Sayfa yolu: A → Z</option>
              </select>

              <label className="flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  name="suspicious"
                  value="1"
                  defaultChecked={onlySuspicious}
                />
                Sadece ⚠ şüpheli
              </label>

              <button type="submit" className={buttonClass('primary')}>
                Uygula
              </button>

              <a href="/admin" className="text-sm font-semibold text-cyan-200">
                Sıfırla
              </a>
            </form>

            {visible.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="font-black">Sonuç bulunamadı</div>
                <div className="mt-2 text-sm text-white/60">
                  Filtreleri değiştirerek tekrar deneyin veya{' '}
                  <a href="/admin" className="text-cyan-200">
                    sıfırlayın
                  </a>
                  .
                </div>
              </div>
            ) : null}

            <div className="mt-5 overflow-x-auto rounded-[22px] border border-white/10">
              <table className="w-full min-w-[920px] border-collapse">
                <thead className="bg-white/[0.035] text-left text-xs uppercase tracking-wide text-white/55">
                  <tr>
                    <th className="px-4 py-4">Sayfa yolu</th>
                    <th className="px-4 py-4">Ürün</th>
                    <th className="px-4 py-4">Toplam okutma</th>
                    <th className="px-4 py-4">Yayın</th>
                    <th className="px-4 py-4">Durum</th>
                    <th className="px-4 py-4 text-right" />
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
          </div>
        </section>
      </main>
    </div>
  )
}