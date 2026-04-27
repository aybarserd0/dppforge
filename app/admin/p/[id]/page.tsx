import { redirect } from 'next/navigation'
import ReviewPanel from './ReviewPanel'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

  return 'open'
}

type ScanRow = {
  id: string
  page_id: string
  ip_hash: string | null
  country: string | null
  scanned_at: string
}

type CounterfeitAlarmRow = {
  alarm_type: string | null
  risk_score: number | null
  risk_level: string | null
  reasons: string[] | null
  created_at: string | null
  resolved: boolean | null
}

type PageRow = {
  id: string
  slug: string
  product_id: string
  account_id: string
  published_at: string | null
  review_state: string | null
  review_note: string | null
  reviewed_at: string | null
  reviewed_by: string | null
}

type ProductRow = {
  id: string
  account_id: string
  name_tr: string | null
  sku: string | null
  brand: string | null
  manufacturer: string | null
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('tr-TR')
  } catch {
    return dt
  }
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

function inWindow(iso: string, sinceIso: string) {
  return new Date(iso).getTime() >= new Date(sinceIso).getTime()
}

function shortHash(value?: string | null) {
  if (!value) return '—'
  if (value.length <= 10) return value
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function formatScanTime(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timelineItemStyle() {
  return {
    display: 'grid',
    gridTemplateColumns: '160px 120px 1fr',
    gap: 12,
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
  } as const
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }

  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL.startsWith('http')
      ? process.env.VERCEL_URL
      : `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
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

export default async function AdminPageDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const accountId = await getCurrentAccountId()

  if (!accountId) {
    redirect(`/login?next=${encodeURIComponent(`/admin/p/${id}`)}`)
  }

  const supabase = getSupabaseAdmin()

  const { data: pageRaw, error: pageErr } = await supabase
    .from('public_pages')
    .select(
      'id, slug, product_id, account_id, published_at, review_state, review_note, reviewed_at, reviewed_by'
    )
    .eq('id', id)
    .eq('account_id', accountId)
    .maybeSingle()

  const page = (pageRaw ?? null) as PageRow | null

  if (pageErr || !page) {
    return (
      <div
        style={{
          padding: 40,
          background: '#0b0f17',
          color: '#e6e6e6',
          fontFamily: 'system-ui',
          minHeight: '100vh',
        }}
      >
        <h1>Sayfa bulunamadı</h1>
        <div style={{ opacity: 0.7, fontSize: 12 }}>page_id: {id}</div>
      </div>
    )
  }

  const { data: timelineRaw, error: timelineErr } = await supabase
    .from('dpp_scans')
    .select('id, page_id, ip_hash, country, scanned_at')
    .eq('page_id', page.id)
    .order('scanned_at', { ascending: false })
    .limit(20)

  if (timelineErr) {
    console.error('timeline error', timelineErr)
  }

  const timelineScans = (timelineRaw ?? []) as ScanRow[]

  const { data: alarmData } = await supabase
    .from('dpp_alarms')
    .select('alarm_type, risk_score, risk_level, reasons, created_at, resolved')
    .eq('page_id', page.id)
    .eq('alarm_type', 'counterfeit')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const counterfeitAlarm = (alarmData ?? null) as CounterfeitAlarmRow | null

  const { data: productRaw } = await supabase
    .from('products')
    .select('id, account_id, name_tr, sku, brand, manufacturer')
    .eq('id', page.product_id)
    .eq('account_id', accountId)
    .maybeSingle()

  const product = (productRaw ?? null) as ProductRow | null

  const now = Date.now()
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const since5m = new Date(now - 5 * 60 * 1000).toISOString()

  const { data: scansRaw, error: scansErr } = await supabase
    .from('dpp_scans')
    .select('id, page_id, ip_hash, country, scanned_at')
    .eq('page_id', page.id)
    .gte('scanned_at', since7d)
    .order('scanned_at', { ascending: false })
    .limit(5000)

  if (scansErr) {
    return (
      <div
        style={{
          padding: 40,
          background: '#0b0f17',
          color: '#e6e6e6',
          fontFamily: 'system-ui',
          minHeight: '100vh',
        }}
      >
        <h1>Okutma verisi okunamadı</h1>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
          {JSON.stringify(scansErr, null, 2)}
        </pre>
      </div>
    )
  }

  const scans = (scansRaw ?? []) as ScanRow[]

  const scans5m = scans.filter((s) => inWindow(s.scanned_at, since5m))
  const scans24h = scans.filter((s) => inWindow(s.scanned_at, since24h))
  const scans7d = scans

  const uniqIps24h = new Set(
    scans24h.map((s) => s.ip_hash).filter(Boolean) as string[]
  )
  const uniqCountries24h = new Set(
    scans24h.map((s) => s.country).filter(Boolean) as string[]
  )

  const suspicious =
    scans24h.length >= 15 || uniqCountries24h.size >= 2 || uniqIps24h.size >= 6

  const reasons: string[] = []
  if (scans24h.length >= 15) {
    reasons.push(`24 saatte yüksek okutma (${scans24h.length})`)
  }
  if (uniqCountries24h.size >= 2) {
    reasons.push(`24 saatte birden fazla ülke (${uniqCountries24h.size})`)
  }
  if (uniqIps24h.size >= 6) {
    reasons.push(`24 saatte çok farklı IP (${uniqIps24h.size})`)
  }
  if (!reasons.length) reasons.push('Eşik aşımı yok (normal görünüyor)')

  const countryCount = new Map<string, number>()
  for (const s of scans24h) {
    if (!s.country) continue
    countryCount.set(s.country, (countryCount.get(s.country) ?? 0) + 1)
  }

  const topCountries = Array.from(countryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const backToAdminHref = '/admin'
  const appUrl = getAppUrl()
  function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  ).replace(/\/+$/, '')
}
  const qrImageUrl =
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
    encodeURIComponent(publicUrl)

  const showNormalBox = !counterfeitAlarm

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
      {counterfeitAlarm && (
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 16,
            border: '1px solid rgba(239,68,68,0.4)',
            background: 'rgba(239,68,68,0.10)',
            color: '#fecaca',
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            🚨 Sahtecilik Tespit Edildi
          </div>

          <div style={{ marginTop: 8 }}>
            Bu ürün için yüksek sahtecilik riski tespit edildi.
          </div>

          <div style={{ marginTop: 8 }}>
            Risk skoru: <b>{counterfeitAlarm.risk_score ?? '-'}</b> • Seviye:{' '}
            <b>{translateRiskLevel(counterfeitAlarm.risk_level)}</b>
          </div>

          {counterfeitAlarm.reasons?.length ? (
            <ul style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.7 }}>
              {counterfeitAlarm.reasons.map((r, i) => (
                <li key={i}>{translateReason(r)}</li>
              ))}
            </ul>
          ) : null}

          <div style={{ marginTop: 8, fontSize: 12 }}>
            Alarm zamanı:{' '}
            {counterfeitAlarm.created_at ? fmt(counterfeitAlarm.created_at) : '-'}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>🔐 Admin • Detay</div>
          <h1 style={{ margin: '6px 0 0' }}>{product?.name_tr ?? 'Ürün'}</h1>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            SKU: <b style={{ opacity: 1 }}>{product?.sku ?? '-'}</b> • Sayfa
            yolu:{' '}
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#a7c7ff', textDecoration: 'none' }}
            >
              /p/{page.slug}
            </a>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Marka: <b style={{ opacity: 1 }}>{product?.brand ?? '-'}</b> •
            Üretici:{' '}
            <b style={{ opacity: 1 }}>{product?.manufacturer ?? '-'}</b>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Yayın tarihi:{' '}
            <b style={{ opacity: 1 }}>
              {page.published_at ? fmt(page.published_at) : '-'}
            </b>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignSelf: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: '#39d98a',
              textDecoration: 'none',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(60,220,140,0.35)',
              background: 'rgba(60,220,140,0.08)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            🌍 Genel ürün sayfasını aç
          </a>

          <a
            href={backToAdminHref}
            style={{
              color: '#a7c7ff',
              textDecoration: 'none',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ← Admin listesine dön
          </a>

          <form action="/logout" method="post">
            <button
              type="submit"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.08)',
                color: '#e6e6e6',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </div>

      {showNormalBox && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            border: suspicious
              ? '1px solid rgba(255, 180, 0, 0.35)'
              : '1px solid rgba(60, 220, 140, 0.25)',
            background: suspicious
              ? 'rgba(255, 180, 0, 0.08)'
              : 'rgba(60, 220, 140, 0.08)',
            color: suspicious ? '#ffd166' : '#b9ffd6',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            {suspicious ? '⚠️ Şüpheli okuma paterni' : '✅ Normal görünüm'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            Neden: {reasons.join(' • ')}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <ReviewPanel
          pageId={page.id}
          initialState={normalizeReviewState(page.review_state)}
          initialNote={page.review_note ?? null}
          initialReviewedAt={page.reviewed_at ?? null}
          initialReviewedBy={page.reviewed_by ?? null}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: 18,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              borderRadius: 16,
              background: '#fff',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 320,
            }}
          >
            <img
              src={qrImageUrl}
              alt={`QR - ${page.slug}`}
              style={{
                width: 260,
                height: 260,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 8 }}>
              🧾 QR Kod
            </div>

            <div style={{ fontSize: 14, opacity: 0.78, lineHeight: 1.6 }}>
              Bu QR kod müşteriyi doğrudan genel doğrulama sayfasına yönlendirir.
              Baskıya gönderilebilir, etikete eklenebilir ve ürün kutusu üzerine
              basılabilir.
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                opacity: 0.68,
              }}
            >
              Ürünün doğrulama sayfasına yönlendirir.
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 13,
                wordBreak: 'break-all',
              }}
            >
              <div style={{ opacity: 0.65, marginBottom: 6 }}>Genel URL</div>
              <div style={{ color: '#a7c7ff' }}>{publicUrl}</div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                marginTop: 14,
              }}
            >
              <a
                href={`/api/admin/qr-download?url=${encodeURIComponent(publicUrl)}&filename=${encodeURIComponent(`qr-${page.slug}.png`)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(60,220,140,0.10)',
                  border: '1px solid rgba(60,220,140,0.35)',
                  color: '#b9ffd6',
                  textDecoration: 'none',
                  fontWeight: 800,
                }}
              >
                ⬇ QR indir
              </a>

              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#e6e6e6',
                  textDecoration: 'none',
                  fontWeight: 800,
                }}
              >
                🌍 Genel sayfayı aç
              </a>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        {[
          { label: 'Son 5 dk okutma', val: scans5m.length },
          { label: 'Son 24 saat okutma', val: scans24h.length },
          { label: 'Son 7 gün okutma', val: scans7d.length },
          { label: '24 saatte farklı IP', val: uniqIps24h.size },
        ].map((x) => (
          <div
            key={x.label}
            style={{
              padding: 14,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>{x.label}</div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>
              {x.val}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          🌍 Son 24 saat ülke dağılımı
        </div>

        {topCountries.length === 0 ? (
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            Henüz konum verisi içeren okutma kaydı yok.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
              gap: 8,
            }}
          >
            {topCountries.map(([c, n]) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ fontWeight: 700 }}>{c}</span>
                <span style={{ opacity: 0.8 }}>{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 800 }}>🚨 Sahtecilik zaman çizelgesi</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Son 20 okutmanın zaman akışı
            </div>
          </div>

          <div style={{ fontSize: 12, opacity: 0.6 }}>En yeni kayıt üstte</div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {timelineScans.length === 0 ? (
            <div style={{ opacity: 0.65, fontSize: 14 }}>
              Henüz okutma kaydı yok.
            </div>
          ) : (
            timelineScans.map((scan) => (
              <div key={scan.id} style={timelineItemStyle()}>
                <div style={{ fontWeight: 800 }}>
                  {formatScanTime(scan.scanned_at)}
                </div>

                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#e6e6e6',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {scan.country || 'Bilinmeyen konum'}
                  </span>
                </div>

                <div style={{ opacity: 0.8, fontFamily: 'monospace' }}>
                  IP Hash: {shortHash(scan.ip_hash)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          🧾 Son okutmalar (7 gün, en yeni)
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.7 }}>
              <th style={{ padding: '10px 8px' }}>Tarih</th>
              <th style={{ padding: '10px 8px' }}>Ülke</th>
              <th style={{ padding: '10px 8px' }}>IP Hash</th>
            </tr>
          </thead>
          <tbody>
            {scans.slice(0, 25).map((s) => (
              <tr
                key={s.id}
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <td style={{ padding: '10px 8px' }}>{fmt(s.scanned_at)}</td>
                <td style={{ padding: '10px 8px' }}>{s.country ?? '-'}</td>
                <td style={{ padding: '10px 8px', opacity: 0.85 }}>
                  {s.ip_hash ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
          Not: Bu liste en fazla 25 kayıt gösterir. Sonraki aşamada sayfalama
          eklenebilir.
        </div>
      </div>
    </div>
  )
}