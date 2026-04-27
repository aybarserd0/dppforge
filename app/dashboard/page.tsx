import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

type PageRow = {
  id: string
  slug: string
  product_id: string
}

type ProductRow = {
  id: string
  name_tr: string | null
  sku: string | null
}

type SummaryRow = {
  page_id: string
  scans_total: number
  scans_24h: number
  unique_ips_24h: number
  unique_countries_24h: number
  is_suspicious: boolean
}

type AlarmRow = {
  id: string
  page_id: string
  alarm_type: string | null
  risk_score: number | null
  risk_level: string | null
  reasons?: string[] | null
  created_at?: string | null
  resolved: boolean | null
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
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  )
}

function badgeStyle(
  tone: 'default' | 'success' | 'warn' | 'risk' = 'default'
) {
  if (tone === 'risk') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      border: '1px solid rgba(239,68,68,0.35)',
      background: 'rgba(239,68,68,0.12)',
      color: '#fecaca',
      fontSize: 12,
      fontWeight: 800 as const,
      lineHeight: '16px',
      whiteSpace: 'nowrap' as const,
    }
  }

  if (tone === 'warn') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      border: '1px solid rgba(245,158,11,0.35)',
      background: 'rgba(245,158,11,0.12)',
      color: '#fde68a',
      fontSize: 12,
      fontWeight: 800 as const,
      lineHeight: '16px',
      whiteSpace: 'nowrap' as const,
    }
  }

  if (tone === 'success') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      border: '1px solid rgba(16,185,129,0.35)',
      background: 'rgba(16,185,129,0.12)',
      color: '#a7f3d0',
      fontSize: 12,
      fontWeight: 800 as const,
      lineHeight: '16px',
      whiteSpace: 'nowrap' as const,
    }
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e6e6e6',
    fontSize: 12,
    fontWeight: 800 as const,
    lineHeight: '16px',
    whiteSpace: 'nowrap' as const,
  }
}

function translateReason(r: string) {
  if (r === 'multi-country burst') return 'Farklı ülkeler'
  if (r === 'high scan velocity') return 'Yoğun okutma'
  if (r === 'unique ip spike') return 'IP artışı'
  if (r === 'multi-country scans in short time') return 'Farklı ülkeler'
  return r
}

export default async function DashboardPage() {
  const supabase = getSupabaseAdmin()

  const { data: pagesRaw, error: pagesErr } = await supabase
    .from('public_pages')
    .select('id, slug, product_id')

  if (pagesErr) {
    return (
      <div
        style={{
          padding: 40,
          color: 'white',
          background: '#0b0f17',
          minHeight: '100vh',
          fontFamily: 'system-ui',
        }}
      >
        <h1>Dashboard Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
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

  const { data: productsRaw, error: productsErr } = await supabase
    .from('products')
    .select('id, name_tr, sku')
    .in('id', productIds)

  if (productsErr) {
    return (
      <div
        style={{
          padding: 40,
          color: 'white',
          background: '#0b0f17',
          minHeight: '100vh',
          fontFamily: 'system-ui',
        }}
      >
        <h1>Products Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(productsErr, null, 2)}
        </pre>
      </div>
    )
  }

  const { data: summaryRaw, error: summaryErr } = await supabase
    .from('dpp_scan_summary')
    .select(
      'page_id, scans_total, scans_24h, unique_ips_24h, unique_countries_24h, is_suspicious'
    )
    .in('page_id', pageIds)

  if (summaryErr) {
    return (
      <div
        style={{
          padding: 40,
          color: 'white',
          background: '#0b0f17',
          minHeight: '100vh',
          fontFamily: 'system-ui',
        }}
      >
        <h1>Summary Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(summaryErr, null, 2)}
        </pre>
      </div>
    )
  }

  const { data: alarmsRaw, error: alarmsErr } = await supabase
    .from('dpp_alarms')
    .select(
      'id, page_id, alarm_type, risk_score, risk_level, reasons, created_at, resolved'
    )
    .eq('alarm_type', 'counterfeit')
    .eq('resolved', false)
    .in('page_id', pageIds)

  if (alarmsErr) {
    return (
      <div
        style={{
          padding: 40,
          color: 'white',
          background: '#0b0f17',
          minHeight: '100vh',
          fontFamily: 'system-ui',
        }}
      >
        <h1>Alarms Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(alarmsErr, null, 2)}
        </pre>
      </div>
    )
  }

  const products = (productsRaw ?? []) as ProductRow[]
  const summaries = (summaryRaw ?? []) as SummaryRow[]
  const alarms = (alarmsRaw ?? []) as AlarmRow[]

  const productById = new Map(products.map((p) => [p.id, p]))
  const summaryByPageId = new Map(summaries.map((s) => [s.page_id, s]))
  const alarmByPageId = new Map<string, AlarmRow>()

  for (const alarm of alarms) {
    if (!alarmByPageId.has(alarm.page_id)) {
      alarmByPageId.set(alarm.page_id, alarm)
    }
  }

  const totalScans = summaries.reduce(
    (acc, row) => acc + (row.scans_total ?? 0),
    0
  )
  const suspiciousProducts = summaries.filter(
    (row) => row.is_suspicious
  ).length

  const rows = pages.map((page) => {
    const product = productById.get(page.product_id) ?? null
    const summary = summaryByPageId.get(page.id) ?? null
    const alarm = alarmByPageId.get(page.id) ?? null

    const status = alarm
      ? 'counterfeit'
      : summary?.is_suspicious
      ? 'suspicious'
      : 'clean'

    return {
      page,
      product,
      summary,
      alarm,
      status,
      scansTotal: summary?.scans_total ?? 0,
    }
  })

  rows.sort((a, b) => {
    const weight = (status: string) =>
      status === 'counterfeit' ? 0 : status === 'suspicious' ? 1 : 2

    const diff = weight(a.status) - weight(b.status)
    if (diff !== 0) return diff

    return b.scansTotal - a.scansTotal
  })

  return (
    <div
      style={{
        padding: 40,
        color: 'white',
        background: '#0b0f17',
        minHeight: '100vh',
        fontFamily: 'system-ui',
      }}
    >
      <h1 style={{ margin: 0 }}>My Products Dashboard</h1>
      <p style={{ opacity: 0.7, marginTop: 8 }}>
        Product health, scans and counterfeit overview
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
          gap: 12,
          marginTop: 20,
        }}
      >
        {statCard('Total Products', products.length)}
        {statCard('Total Scans', totalScans)}
        {statCard('Suspicious Products', suspiciousProducts, 'warn')}
        {statCard('Active Counterfeit Alerts', alarms.length, 'risk')}
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800 }}>Quick Overview</div>

        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gap: 10,
            fontSize: 14,
            opacity: 0.9,
          }}
        >
          <div>Total Pages: {pages.length}</div>
          <div>Tracked Summaries: {summaries.length}</div>
          <div>Products with Scan Data: {summaries.length}</div>
          <div>Open Counterfeit Cases: {alarms.length}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800 }}>Products</div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Click a product to view details
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {rows.map(({ page, product, summary, alarm, status, scansTotal }) => (
            <Link
              key={page.id}
              href={`/dashboard/p/${page.id}`}
              style={{
                padding: 12,
                borderRadius: 14,
                border:
                  status === 'counterfeit'
                    ? '1px solid rgba(239,68,68,0.35)'
                    : status === 'suspicious'
                    ? '1px solid rgba(245,158,11,0.35)'
                    : '1px solid rgba(255,255,255,0.12)',
                background:
                  status === 'counterfeit'
                    ? 'rgba(239,68,68,0.08)'
                    : status === 'suspicious'
                    ? 'rgba(245,158,11,0.08)'
                    : 'rgba(0,0,0,0.18)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                textDecoration: 'none',
                color: 'inherit',
              }}
              title={
                status === 'counterfeit' && alarm
                  ? `Counterfeit detected | Risk: ${alarm.risk_score ?? '-'} | Level: ${
                      alarm.risk_level ?? '-'
                    }`
                  : 'Open product detail'
              }
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>
                  {product?.name_tr ?? '—'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  {product?.sku ?? '—'} · /p/{page.slug}
                </div>

                {status === 'counterfeit' && alarm?.reasons?.length ? (
                  <div
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    {alarm.reasons.slice(0, 3).map((r) => (
                      <span key={r} style={badgeStyle('default')}>
                        {translateReason(r)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                }}
              >
                {status === 'counterfeit' && (
                  <>
                    <span style={badgeStyle('risk')}>🚨 Counterfeit</span>
                    {alarm?.risk_level ? (
                      <span style={badgeStyle('risk')}>
                        {String(alarm.risk_level).toUpperCase()}
                      </span>
                    ) : null}
                    {typeof alarm?.risk_score === 'number' ? (
                      <span style={badgeStyle('default')}>
                        Risk {alarm.risk_score}
                      </span>
                    ) : null}
                  </>
                )}

                {status === 'suspicious' && (
                  <span style={badgeStyle('warn')}>⚠ Suspicious</span>
                )}

                {status === 'clean' && (
                  <span style={badgeStyle('success')}>✅ Clean</span>
                )}

                <span style={badgeStyle('default')}>{scansTotal} scans</span>
                <span style={badgeStyle('default')}>
                  24h: {summary?.scans_24h ?? 0}
                </span>
                <span style={badgeStyle('default')}>
                  IP: {summary?.unique_ips_24h ?? 0}
                </span>
                <span style={badgeStyle('default')}>
                  🌍 {summary?.unique_countries_24h ?? 0}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}