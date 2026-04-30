import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import PrintButton from '../../../../../components/PrintButton'
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
      fontSize: 13,
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
      fontSize: 13,
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
      fontSize: 13,
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
    fontSize: 13,
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
      border: '1px solid rgba(239,68,68,0.25)',
      background: 'rgba(239,68,68,0.08)',
      color: '#fecaca',
    }
  }

  if (tone === 'warn') {
    return {
      border: '1px solid rgba(245,158,11,0.25)',
      background: 'rgba(245,158,11,0.08)',
      color: '#fde68a',
    }
  }

  if (tone === 'success') {
    return {
      border: '1px solid rgba(16,185,129,0.25)',
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

function translateReason(r: string) {
  if (r === 'multi-country burst') return 'Farklı ülkeler'
  if (r === 'high scan velocity') return 'Yoğun okutma'
  if (r === 'unique ip spike') return 'IP artışı'
  if (r === 'multi-country scans in short time') return 'Farklı ülkeler'
  return r
}

async function getCurrentAccountId() {
  const supabaseAuth = await createSupabaseServerClient()
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser()

  if (userErr || !user) return null

  const supabase = getSupabaseAdmin()

  const { data: membership, error: membershipErr } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipErr) {
    console.error('membership error', membershipErr)
    return null
  }

  return membership?.account_id ?? null
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const accountId = await getCurrentAccountId()

  if (!accountId) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/p/${id}/report`)}`)
  }

  const supabase = getSupabaseAdmin()

  const { data: page } = await supabase
    .from('public_pages')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .maybeSingle()

  if (!page) {
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
        <h1>Page not found</h1>
      </div>
    )
  }

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', page.product_id)
    .eq('account_id', accountId)
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
      <style>{`
        @media print {
          body {
            background: white !important;
          }

          .print-shell {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }

          .print-card {
            background: white !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            color: black !important;
          }

          .print-pill {
            color: black !important;
            border-color: #bbb !important;
            background: #f3f4f6 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-logo img {
            max-height: 40px !important;
            width: auto !important;
          }
        }
      `}</style>

      <div
        className="print-shell"
        style={{
          maxWidth: 980,
          margin: '0 auto',
        }}
      >
        <div
          className="print-card"
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
              <div className="print-logo">
                <Logo size={44} />
              </div>

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
                  Brand Protection Report
                </div>
                <div style={{ marginTop: 4, opacity: 0.6, fontSize: 13 }}>
                  Internal Report View
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
              <span
                style={{
                  fontSize: 12,
                  opacity: 0.65,
                  letterSpacing: 0.3,
                }}
              >
                Generated Report
              </span>

              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {new Date().toLocaleDateString('tr-TR')}
              </div>

              <div className="no-print">
                <div
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(238, 34, 34, 0.25)',
                  }}
                >
                  <PrintButton />
                </div>
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
            <div>
              <h2 style={{ margin: 0, fontSize: 28 }}>
                {product?.name_tr ?? 'Unknown Product'}
              </h2>
              <div style={{ marginTop: 10, opacity: 0.8 }}>
                SKU: {product?.sku ?? '-'}
              </div>
              <div style={{ marginTop: 4, opacity: 0.8 }}>
                Slug: {page.slug ?? '-'}
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
              {status === 'counterfeit' && (
                <>
                  <span className="print-pill" style={pillStyle('risk')}>
                    🚨 Counterfeit
                  </span>
                  {alarm?.risk_level ? (
                    <span className="print-pill" style={pillStyle('risk')}>
                      {String(alarm.risk_level).toUpperCase()}
                    </span>
                  ) : null}
                  {typeof alarm?.risk_score === 'number' ? (
                    <span className="print-pill" style={pillStyle('default')}>
                      Risk {alarm.risk_score}
                    </span>
                  ) : null}
                </>
              )}

              {status === 'suspicious' && (
                <span className="print-pill" style={pillStyle('warn')}>
                  ⚠ Suspicious
                </span>
              )}

              {status === 'clean' && (
                <span className="print-pill" style={pillStyle('success')}>
                  ✅ Clean
                </span>
              )}
            </div>
          </div>

          <div
            className="print-card"
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
            <div style={{ fontSize: 22, fontWeight: 900 }}>{statusTitle}</div>

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
              className="print-card"
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
                  gap: 12,
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
              className="print-card"
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
                  gap: 12,
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
              className="print-card"
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
                      className="print-pill"
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
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="print-card"
      style={{
        ...cardStyle('default'),
        borderRadius: 14,
        padding: 14,
        cursor: 'default',
        transition: 'all 0.2s ease',
        border: '1px solid rgba(255,255,255,0.14)',
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  )
}