import PrintButton from '@/components/PrintButton'
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

function cardStyle(
  tone: 'default' | 'warn' | 'risk' | 'success' = 'default'
) {
  if (tone === 'risk') {
    return {
      border: '1px solid rgba(239,68,68,0.35)',
      background: 'rgba(239,68,68,0.08)',
      color: '#fecaca',
    }
  }

  if (tone === 'warn') {
    return {
      border: '1px solid rgba(245,158,11,0.35)',
      background: 'rgba(245,158,11,0.08)',
      color: '#fde68a',
    }
  }

  if (tone === 'success') {
    return {
      border: '1px solid rgba(16,185,129,0.35)',
      background: 'rgba(16,185,129,0.08)',
      color: '#a7f3d0',
    }
  }

  return {
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e6e6e6',
  }
}

function pillStyle(
  tone: 'default' | 'warn' | 'risk' | 'success' = 'default'
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
  }
}

function translateReason(r: string) {
  if (r === 'multi-country burst') return 'Farklı ülkeler'
  if (r === 'high scan velocity') return 'Yoğun okutma'
  if (r === 'unique ip spike') return 'IP artışı'
  if (r === 'multi-country scans in short time') return 'Farklı ülkeler'
  return r
}

export default async function DashboardProductDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { data: page, error: pageErr } = await supabase
    .from('public_pages')
    .select('id, slug, product_id, published_at, review_state')
    .eq('id', id)
    .single()

  if (pageErr || !page) {
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
        <h1>Product Detail Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(pageErr ?? { error: 'Page not found' }, null, 2)}
        </pre>
        <div style={{ marginTop: 16 }}>
          <Link href="/dashboard" style={{ color: '#a7c7ff' }}>
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const [{ data: product }, { data: summary }, { data: alarm }] =
    await Promise.all([
      supabase
        .from('products')
        .select('id, name_tr, sku')
        .eq('id', page.product_id)
        .maybeSingle(),
      supabase
        .from('dpp_scan_summary')
        .select(
          'page_id, scans_total, last_scan_at, scans_24h, unique_ips_24h, unique_countries_24h, is_suspicious'
        )
        .eq('page_id', id)
        .maybeSingle(),
      supabase
        .from('dpp_alarms')
        .select(
          'id, page_id, alarm_type, risk_score, risk_level, reasons, created_at, resolved'
        )
        .eq('page_id', id)
        .eq('alarm_type', 'counterfeit')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const status = alarm
    ? 'counterfeit'
    : summary?.is_suspicious
    ? 'suspicious'
    : 'clean'

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ marginBottom: 10 }}>
            <Link href="/dashboard" style={{ color: '#a7c7ff' }}>
              ← Back to dashboard
            </Link>
          </div>

          <h1 style={{ margin: 0 }}>{product?.name_tr ?? 'Product Detail'}</h1>
          <p style={{ opacity: 0.7, marginTop: 8 }}>
            {product?.sku ?? '—'} · /p/{page.slug}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
  href={`/dashboard/p/${id}/report`}
  style={{
    padding: '6px 12px',
    borderRadius: 8,
    background: '#2563eb',
    color: 'white',
    textDecoration: 'none',
    fontSize: 12,
  }}
>
  📄 Open Report
</a>
          {status === 'counterfeit' && (
            <>
              <span style={pillStyle('risk')}>🚨 Counterfeit</span>
              {alarm?.risk_level ? (
                <span style={pillStyle('risk')}>
                  {String(alarm.risk_level).toUpperCase()}
                </span>
              ) : null}
              {typeof alarm?.risk_score === 'number' ? (
                <span style={pillStyle('default')}>
                  Risk {alarm.risk_score}
                </span>
              ) : null}
            </>
          )}

          {status === 'suspicious' && (
            <span style={pillStyle('warn')}>⚠ Suspicious</span>
          )}

          {status === 'clean' && (
            <span style={pillStyle('success')}>✅ Clean</span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
          gap: 12,
          marginTop: 20,
        }}
      >
        <div style={{ padding: 16, borderRadius: 16, ...cardStyle('default') }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Total Scans</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>
            {summary?.scans_total ?? 0}
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 16, ...cardStyle('default') }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>24h Scans</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>
            {summary?.scans_24h ?? 0}
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 16, ...cardStyle('default') }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Unique IPs (24h)</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>
            {summary?.unique_ips_24h ?? 0}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 16,
            ...(status === 'counterfeit'
              ? cardStyle('risk')
              : status === 'suspicious'
              ? cardStyle('warn')
              : cardStyle('success')),
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.8 }}>Product Status</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>
            {status === 'counterfeit'
              ? 'Counterfeit'
              : status === 'suspicious'
              ? 'Suspicious'
              : 'Clean'}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 18,
          ...cardStyle('default'),
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800 }}>Overview</div>

        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gap: 10,
            fontSize: 14,
            opacity: 0.9,
          }}
        >
          <div>Slug: {page.slug}</div>
          <div>Published: {page.published_at ? 'Yes' : 'No'}</div>
          <div>Review State: {page.review_state ?? '—'}</div>
          <div>Unique Countries (24h): {summary?.unique_countries_24h ?? 0}</div>
          <div>Last Scan At: {summary?.last_scan_at ?? '—'}</div>
        </div>
      </div>

      {alarm ? (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 18,
            ...cardStyle('risk'),
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900 }}>
            🚨 Counterfeit Alert Details
          </div>

          <div
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span style={pillStyle('risk')}>
              Level: {String(alarm.risk_level ?? 'critical').toUpperCase()}
            </span>
            <span style={pillStyle('default')}>
              Risk: {alarm.risk_score ?? '-'}
            </span>
            <span style={pillStyle('default')}>
              Detected: {alarm.created_at ?? '—'}
            </span>
          </div>

          <div style={{ marginTop: 14, fontWeight: 800 }}>Reasons</div>

          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {(alarm.reasons ?? []).length > 0 ? (
              (alarm.reasons ?? []).map((r: string) => (
                <span key={r} style={pillStyle('default')}>
                  {translateReason(r)}
                </span>
              ))
            ) : (
              <span style={{ opacity: 0.8 }}>No reasons available</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}