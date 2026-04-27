// app/admin/analytics/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

type AnalyticsRow = {
  page_id: string
  slug: string
  product_id: string
  name_tr: string | null
  name_en: string | null
  sku: string | null
  scans_24h: number
  unique_ips_24h: number
  unique_countries_24h: number
  is_suspicious: boolean
}

type ScanRow = {
  page_id: string
  ip_hash: string | null
  country: string | null
  scanned_at: string
}

function headerButtonStyle() {
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

function cardStyle() {
  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',

     minHeight: 120,
  }
}

function metricValueStyle() {
  return {
    fontSize: 40,
    fontWeight: 900 as const,
    lineHeight: 1,
    margin: '10px 0 6px',
    color: '#ffffff',
  }
}

function badgeStyle(suspicious: boolean) {
  if (suspicious) {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      border: '1px solid rgba(239,68,68,0.35)',
      background: 'rgba(239,68,68,0.14)',
      color: '#fecaca',
      fontSize: 12,
      fontWeight: 900 as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
    }
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid rgba(34,197,94,0.25)',
    background: 'rgba(34,197,94,0.12)',
    color: '#bbf7d0',
    fontSize: 12,
    fontWeight: 900 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  }
}

export default async function AdminAnalyticsPage() {
  await requireAdmin()
  const supabase = getSupabaseAdmin()

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [analyticsRes, scansRes] = await Promise.all([
    supabase
      .from('dpp_analytics_24h')
      .select('*')
      .order('scans_24h', { ascending: false }),
    supabase
      .from('dpp_scans')
      .select('page_id, ip_hash, country, scanned_at')
      .gte('scanned_at', sinceIso)
      .order('scanned_at', { ascending: false }),
  ])

  if (analyticsRes.error) {
    return (
      <div
        style={{
          padding: 40,
          fontFamily: 'system-ui',
          background: '#0b0f17',
          color: '#e6e6e6',
          minHeight: '100vh',
        }}
      >
        <h1>Analytics Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
          {JSON.stringify(analyticsRes.error, null, 2)}
        </pre>
      </div>
    )
  }

  if (scansRes.error) {
    return (
      <div
        style={{
          padding: 40,
          fontFamily: 'system-ui',
          background: '#0b0f17',
          color: '#e6e6e6',
          minHeight: '100vh',
        }}
      >
        <h1>Scans Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
          {JSON.stringify(scansRes.error, null, 2)}
        </pre>
      </div>
    )
  }

  const analytics = (analyticsRes.data || []) as AnalyticsRow[]
  const scans = (scansRes.data || []) as ScanRow[]

  const totalScans24h = scans.length
  const uniqueIps24h = new Set(scans.map((s) => s.ip_hash).filter(Boolean)).size

  const countryMap = new Map<string, number>()
  for (const scan of scans) {
    const key = scan.country?.trim() || 'Bilinmeyen'
    countryMap.set(key, (countryMap.get(key) || 0) + 1)
  }

  const countries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)

  const suspiciousCount = analytics.filter((row) => row.is_suspicious).length
  const uniqueCountries24h = countries.length

  const topRiskPages = analytics
    .filter((row) => row.scans_24h > 0)
    .sort((a, b) => {
      if (Number(b.is_suspicious) !== Number(a.is_suspicious)) {
        return Number(b.is_suspicious) - Number(a.is_suspicious)
      }
      if (b.unique_countries_24h !== a.unique_countries_24h) {
        return b.unique_countries_24h - a.unique_countries_24h
      }
      if (b.unique_ips_24h !== a.unique_ips_24h) {
        return b.unique_ips_24h - a.unique_ips_24h
      }
      return b.scans_24h - a.scans_24h
    })
    .slice(0, 10)

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
          <h1 style={{ margin: 0 }}>📊 Sahtecilik Analitiği</h1>
          <p style={{ opacity: 0.7, marginTop: 8 }}>
            Son 24 saatlik okutma ve risk görünümü
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin" style={headerButtonStyle()}>
            ← Kontrol Paneli
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div style={cardStyle()}>
          <div style={{ fontSize: 13, opacity: 0.72, fontWeight: 700 }}>
            Toplam Okutma (24s)
          </div>
          <div style={metricValueStyle()}>{totalScans24h}</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>
            Son 24 saatte loglanan tüm okutmalar
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, opacity: 0.72, fontWeight: 700 }}>
            Şüpheli Ürün
          </div>
          <div style={metricValueStyle()}>{suspiciousCount}</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>
            Risk eşiklerini geçen ürün sayısı
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, opacity: 0.72, fontWeight: 700 }}>
            Benzersiz IP (24s)
          </div>
          <div style={metricValueStyle()}>{uniqueIps24h}</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>
            Benzersiz IP sayısı
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 13, opacity: 0.72, fontWeight: 700 }}>
            Ülke Sayısı (24s)
          </div>
          <div style={metricValueStyle()}>{uniqueCountries24h}</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>
            Okutma gelen farklı ülke sayısı
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={cardStyle()}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <h2
  style={{
    margin: 0,
    fontSize: 22,
    lineHeight: 1.2,
    wordBreak: 'break-word',
  }}
>En Riskli Ürünler</h2>
            <span style={{ opacity: 0.6, fontSize: 13 }}>Son 24 saatlik veri</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 10px',
                      opacity: 0.7,
                      fontWeight: 800,
                    }}
                  >
                    Ürün
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 10px',
                      opacity: 0.7,
                      fontWeight: 800,
                    }}
                  >
                    SKU
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 10px',
                      opacity: 0.7,
                      fontWeight: 800,
                    }}
                  >
                    Okutma
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 10px',
                      opacity: 0.7,
                      fontWeight: 800,
                    }}
                  >
                    IP
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 10px',
                      opacity: 0.7,
                      fontWeight: 800,
                    }}
                  >
                    Ülke
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 10px',
                      opacity: 0.7,
                      fontWeight: 800,
                    }}
                  >
                    Durum
                  </th>
                </tr>
              </thead>

              <tbody>
                {topRiskPages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '16px 10px',
                        opacity: 0.65,
                      }}
                    >
                      Son 24 saatte analiz edilecek okutma yok.
                    </td>
                  </tr>
                ) : (
                  topRiskPages.map((row) => (
                    <tr
                      key={row.page_id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <td style={{ padding: '14px 10px', fontWeight: 700 }}>
                        {row.name_tr || row.name_en || row.slug}
                      </td>
                      <td style={{ padding: '14px 10px', opacity: 0.85 }}>
                        {row.sku || '-'}
                      </td>
                      <td style={{ padding: '14px 10px' }}>{row.scans_24h}</td>
                      <td style={{ padding: '14px 10px' }}>{row.unique_ips_24h}</td>
                      <td style={{ padding: '14px 10px' }}>
                        {row.unique_countries_24h}
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <span style={badgeStyle(row.is_suspicious)}>
                          {row.is_suspicious ? 'Şüpheli' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={cardStyle()}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <h2
  style={{
    margin: 0,
    fontSize: 22,
    lineHeight: 1.2,
    wordBreak: 'break-word',
  }}
>Ülke Dağılımı</h2>
            <span style={{ opacity: 0.6, fontSize: 13 }}>24 saat</span>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {countries.length === 0 ? (
              <div style={{ opacity: 0.65, fontSize: 14 }}>Ülke verisi yok.</div>
            ) : (
              countries.slice(0, 10).map((row) => (
                <div
                  key={row.country}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{row.country}</span>
                  <span style={{ fontSize: 14, fontWeight: 900 }}>{row.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}