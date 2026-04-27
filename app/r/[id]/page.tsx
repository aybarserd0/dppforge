import CopyLinkButton from '@/components/CopyLinkButton'
import { createClient } from '@supabase/supabase-js'
import Logo from '@/components/Logo'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function pillStyle(
  tone: 'default' | 'success' | 'warn' | 'risk' = 'default'
) {
  if (tone === 'risk') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
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
      padding: '6px 12px',
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
      padding: '6px 12px',
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
    padding: '6px 12px',
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

function cardStyle(
  tone: 'default' | 'success' | 'warn' | 'risk' = 'default'
) {
  if (tone === 'risk') {
    return {
      border: '1px solid rgba(239,68,68,0.28)',
      background: 'rgba(239,68,68,0.10)',
      color: '#fecaca',
    }
  }

  if (tone === 'warn') {
    return {
      border: '1px solid rgba(245,158,11,0.28)',
      background: 'rgba(245,158,11,0.10)',
      color: '#fde68a',
    }
  }

  if (tone === 'success') {
    return {
      border: '1px solid rgba(16,185,129,0.28)',
      background: 'rgba(16,185,129,0.10)',
      color: '#a7f3d0',
    }
  }

  return {
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e6e6e6',
  }
}

function translateReason(r: string) {
  if (r === 'multi-country burst') return 'Farklı ülkeler'
  if (r === 'high scan velocity') return 'Yoğun okutma'
  if (r === 'unique ip spike') return 'IP artışı'
  if (r === 'multi-country scans in short time') return 'Farklı ülkeler'
  return r
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = getSupabaseAdmin()
  const { id } = await params

  // Public route ama sadece yayınlanmış kayıtlar görünür.
  // review_state için istersen sadece 'approved' bırakabilirsin.
  const { data: page } = await supabase
    .from('public_pages')
    .select('*')
    .eq('id', id)
    .not('published_at', 'is', null)
    .in('review_state', ['approved', 'open'])
    .maybeSingle()

  if (!page || !page.slug || !page.published_at) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0b0f17',
          color: '#e6e6e6',
          padding: 40,
          fontFamily: 'system-ui',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            ...cardStyle('default'),
            borderRadius: 20,
            padding: 24,
            maxWidth: 560,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <h1 style={{ marginTop: 0 }}>Report not found</h1>
          <p style={{ opacity: 0.75, marginBottom: 0 }}>
            Geçerli bir public report bulunamadı.
          </p>
        </div>
      </div>
    )
  }

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', page.product_id)
    .maybeSingle()

  const { data: summary } = await supabase
    .from('dpp_scan_summary')
    .select('*')
    .eq('page_id', id)
    .maybeSingle()

  const { data: alarm } = await supabase
    .from('dpp_alarms')
    .select('*')
    .eq('page_id', id)
    .eq('alarm_type', 'counterfeit')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const status = alarm
    ? 'counterfeit'
    : summary?.is_suspicious
    ? 'suspicious'
    : 'clean'

  const statusTitle =
    status === 'counterfeit'
      ? '⚠ HIGH RISK – Counterfeit Detected'
      : status === 'suspicious'
      ? '⚠ Suspicious Activity Detected'
      : '✅ VERIFIED AUTHENTIC PRODUCT'

  const statusText =
    status === 'counterfeit'
      ? 'Bu ürün sayfasında sahtecilik paterniyle uyumlu risk sinyalleri tespit edildi.'
      : status === 'suspicious'
      ? 'Bu ürün sayfasında olağandışı okutma davranışı gözlemlendi.'
      : 'Bu ürün sayfasında şu anda açık sahtecilik alarmı bulunmuyor.'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f17',
        color: '#e6e6e6',
        padding: 40,
        fontFamily: 'system-ui',
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            ...cardStyle('default'),
            borderRadius: 20,
            padding: 24,
            boxShadow: '0 18px 40px rgba(0,0,0,0.24)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
              flexWrap: 'wrap',
              paddingBottom: 18,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <Logo size={44} />

              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 28,
                    lineHeight: 1.1,
                    fontWeight: 900,
                  }}
                >
                  DPPForge
                </h1>
                <div style={{ marginTop: 6, opacity: 0.72, fontSize: 14 }}>
                  Public Brand Protection Report
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    opacity: 0.65,
                    letterSpacing: 0.3,
                  }}
                >
                  Shareable Report
                </span>
                <CopyLinkButton />
              </div>

              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1, minWidth: 280 }}>
              <h2 style={{ margin: 0, fontSize: 28 }}>
                {product?.name_tr ?? 'Unknown Product'}
              </h2>
              <div style={{ marginTop: 10, opacity: 0.8 }}>
                SKU: {product?.sku ?? '-'}
              </div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>
                Slug: {page.slug ?? '-'}
              </div>

              {status === 'counterfeit' && (
                <div
                  style={{
                    marginTop: 18,
                    border: '1px solid rgba(239,68,68,0.28)',
                    background: 'rgba(239,68,68,0.10)',
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: '#fecaca',
                    }}
                  >
                    ⚠️ Suspicious Behavior Identified
                  </div>
                  <p
                    style={{
                      marginTop: 8,
                      marginBottom: 0,
                      fontSize: 14,
                      lineHeight: '22px',
                      color: 'rgba(255,255,255,0.75)',
                    }}
                  >
                    This product shows behavioral patterns consistent with
                    counterfeit distribution.
                  </p>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                maxWidth: 320,
              }}
            >
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
              marginTop: 22,
              padding: 18,
              borderRadius: 14,
              ...(status === 'counterfeit'
                ? {
                    border: '1px solid rgba(239,68,68,0.40)',
                    background: 'rgba(239,68,68,0.15)',
                    color: '#fecaca',
                  }
                : status === 'suspicious'
                ? cardStyle('warn')
                : cardStyle('success')),
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900 }}>{statusTitle}</div>

            <div
              style={{
                marginTop: 8,
                opacity: 0.92,
                fontSize: 14,
                lineHeight: '22px',
              }}
            >
              {statusText}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
              Scan Metrics
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
                gap: 12,
              }}
            >
              <Metric label="Total Scans" value={summary?.scans_total ?? 0} />
              <Metric label="24h Scans" value={summary?.scans_24h ?? 0} />
              <Metric label="Unique IPs" value={summary?.unique_ips_24h ?? 0} />
              <Metric
                label="Countries"
                value={summary?.unique_countries_24h ?? 0}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
              gap: 12,
            }}
          >
            <div
              style={{
                ...cardStyle('default'),
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>Overview</div>

              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gap: 10,
                  fontSize: 14,
                  opacity: 0.9,
                }}
              >
                <div>Published: {page.published_at ? 'Yes' : 'No'}</div>
                <div>Review State: {page.review_state ?? '-'}</div>
                <div>Last Scan At: {summary?.last_scan_at ?? '-'}</div>
                <div>
                  Suspicious Flag: {summary?.is_suspicious ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            <div
              style={{
                ...(status === 'counterfeit'
                  ? cardStyle('risk')
                  : status === 'suspicious'
                  ? cardStyle('warn')
                  : cardStyle('success')),
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>Assessment</div>

              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gap: 10,
                  fontSize: 14,
                  opacity: 0.95,
                }}
              >
                <div>
                  Current Status:{' '}
                  {status === 'counterfeit'
                    ? 'Counterfeit Risk'
                    : status === 'suspicious'
                    ? 'Suspicious'
                    : 'Clean'}
                </div>

                <div>
                  Risk Score:{' '}
                  {typeof alarm?.risk_score === 'number'
                    ? alarm.risk_score
                    : '-'}
                </div>

                <div>Risk Level: {alarm?.risk_level ?? '-'}</div>
                <div>Open Alarm: {alarm ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>

          {alarm ? (
            <div
              style={{
                marginTop: 24,
                ...cardStyle('risk'),
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                Counterfeit Reasons
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {(alarm.reasons ?? []).length > 0 ? (
                  (alarm.reasons ?? []).map((r: string) => (
                    <span
                      key={r}
                      style={{
                        ...pillStyle('default'),
                        fontSize: 11,
                        letterSpacing: 0.4,
                      }}
                    >
                      {translateReason(r)}
                    </span>
                  ))
                ) : (
                  <span style={{ opacity: 0.8 }}>No reasons available</span>
                )}
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 24,
              ...cardStyle('default'),
              borderRadius: 16,
              padding: 20,
              textAlign: 'center',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              Want to protect your own products?
            </h3>

            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                fontSize: 14,
                lineHeight: '22px',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              Start tracking and detecting counterfeit risks with DPPForge.
            </p>

            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <a
                href="mailto:hello@dppforge.com?subject=DPPForge Demo Request"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 42,
                  padding: '0 18px',
                  borderRadius: 999,
                  background: '#22d3ee',
                  color: '#0b0f17',
                  fontWeight: 800,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Request Demo
              </a>

              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 42,
                  padding: '0 18px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#e6e6e6',
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                Back to Website
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        ...cardStyle('default'),
        borderRadius: 14,
        padding: 14,
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  )
}