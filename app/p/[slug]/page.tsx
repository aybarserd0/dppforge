// app/p/[slug]/page.tsx
import ReportForm from './ReportForm'
import ScanLogger from './ScanLogger'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function labelStatus(s?: string | null) {
  if (!s) return '-'
  if (s === 'published') return 'yayında'
  if (s === 'draft') return 'taslak'
  return s
}

function fmt(dt?: string | null) {
  if (!dt) return '-'
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

type PublicStatus = {
  page_id: string
  page_slug: string
  review_state: string | null
  has_open_alarm: boolean | null
  open_reasons: string[] | null
  open_occurrences: number | null
  open_last_seen_at: string | null
  last_resolved_reason: string | null
  last_resolved_note: string | null
  last_resolved_at: string | null
}

type AlarmRow = {
  risk_score: number | null
  risk_level: string | null
  reasons: string[] | null
  created_at: string | null
  resolved: boolean | null
}

type CounterfeitAlarmRow = {
  alarm_type: string | null
  risk_level: string | null
  reasons: string[] | null
  created_at: string | null
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

type AuthenticityModel = {
  score: number
  status: string
  note: string
  tone: 'safe' | 'review' | 'risk'
}

type TrustBadgeStatus = 'safe' | 'suspicious' | 'fake'

function TrustBadge({ status }: { status: TrustBadgeStatus }) {
  const config =
    status === 'fake'
      ? {
          icon: '🚨',
          title: 'Bu ürün sahte olabilir',
          desc: 'Bu ürün için yüksek riskli doğrulama davranışı tespit edildi.',
          border: 'rgba(239,68,68,0.40)',
          bg: 'rgba(239,68,68,0.12)',
          color: '#fecaca',
        }
      : status === 'suspicious'
      ? {
          icon: '⚠️',
          title: 'Bu ürün şüpheli davranış gösteriyor',
          desc: 'Doğrulama hareketlerinde inceleme gerektiren sinyaller görüldü.',
          border: 'rgba(245,158,11,0.40)',
          bg: 'rgba(245,158,11,0.12)',
          color: '#fde68a',
        }
      : {
          icon: '✅',
          title: 'Bu ürün doğrulanmıştır',
          desc: 'Şu anda olağandışı doğrulama davranışı tespit edilmedi.',
          border: 'rgba(16,185,129,0.40)',
          bg: 'rgba(16,185,129,0.12)',
          color: '#bbf7d0',
        }

  return (
    <div
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 18,
        border: `1px solid ${config.border}`,
        background: config.bg,
        color: config.color,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 24, lineHeight: 1 }}>{config.icon}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{config.title}</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
            {config.desc}
          </div>
        </div>
      </div>
    </div>
  )
}

async function generateQrDataUrl(url: string) {
  return await QRCode.toDataURL(url, {
    margin: 1,
    width: 220,
    color: {
      dark: '#ffffff',
      light: '#0b0f17',
    },
  })
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function getAuthenticityModel(params: {
  suspicious: boolean
  hasOpenAlarm: boolean
  hasCounterfeitAlarm: boolean
  lastAlarmRisk?: number | null
  lastAlarmLevel?: string | null
  lastAlarmResolved?: boolean | null
}): AuthenticityModel {
  const rawRisk = clamp(params.lastAlarmRisk ?? 8, 0, 100)
  const inverted = clamp(100 - rawRisk, 12, 98)
  const level = String(params.lastAlarmLevel ?? '').toUpperCase()
  const hasActiveAlarm = params.hasOpenAlarm || params.lastAlarmResolved === false

  if (params.hasCounterfeitAlarm) {
    return {
      score: clamp(Math.min(inverted, 28), 8, 28),
      status: '❌ Olası Sahte Ürün',
      note:
        'Bu ürün kısa süre içinde farklı ülkelerden okutuldu. Sahte olma ihtimali yüksektir.',
      tone: 'risk',
    }
  }

  if (hasActiveAlarm && (level === 'HIGH' || level === 'CRITICAL')) {
    return {
      score: clamp(inverted, 12, 38),
      status: '❌ Olası Sahte Ürün',
      note:
        'Bu üründe olağandışı doğrulama davranışları tespit edildi. Lütfen satın alma kanalını kontrol edin.',
      tone: 'risk',
    }
  }

  if (hasActiveAlarm || params.suspicious || level === 'MEDIUM' || level === 'LOW') {
    return {
      score: clamp(inverted, 40, 74),
      status: '⚠ Şüpheli Aktivite',
      note:
        'Bu ürün için dikkat gerektiren doğrulama sinyalleri görüldü. İnceleme önerilir.',
      tone: 'review',
    }
  }

  return {
    score: clamp(Math.max(inverted, 92), 92, 98),
    status: '✔ Orijinal Ürün',
    note: 'Bu ürün için şu anda olağandışı tarama davranışı tespit edilmedi.',
    tone: 'safe',
  }
}

function scoreCardStyle(tone: AuthenticityModel['tone']) {
  if (tone === 'risk') {
    return {
      border: '1px solid rgba(239,68,68,0.35)',
      background: 'rgba(239,68,68,0.08)',
      accent: '#fecaca',
      badgeBg: 'rgba(239,68,68,0.14)',
      badgeBorder: 'rgba(239,68,68,0.35)',
    }
  }

  if (tone === 'review') {
    return {
      border: '1px solid rgba(245,158,11,0.35)',
      background: 'rgba(245,158,11,0.08)',
      accent: '#fde68a',
      badgeBg: 'rgba(245,158,11,0.14)',
      badgeBorder: 'rgba(245,158,11,0.35)',
    }
  }

  return {
    border: '1px solid rgba(16,185,129,0.35)',
    background: 'rgba(16,185,129,0.08)',
    accent: '#bbf7d0',
    badgeBg: 'rgba(16,185,129,0.14)',
    badgeBorder: 'rgba(16,185,129,0.35)',
  }
}

function AuthenticityCard({
  model,
  summary,
  lastAlarm,
  counterfeitAlarm,
}: {
  model: AuthenticityModel
  summary: ScanSummaryRow | null
  lastAlarm: AlarmRow | null
  counterfeitAlarm: CounterfeitAlarmRow | null
}) {
  const ui = scoreCardStyle(model.tone)

  return (
    <div
      style={{
        marginTop: 14,
        padding: 18,
        borderRadius: 18,
        border: ui.border,
        background: ui.background,
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
          <div style={{ fontSize: 12, opacity: 0.72, letterSpacing: 0.3 }}>
            AUTHENTICITY SCORE
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 1.1,
              color: ui.accent,
              marginTop: 4,
            }}
          >
            {model.score}/100
          </div>
        </div>

        <div
          style={{
            padding: '8px 12px',
            borderRadius: 999,
            border: `1px solid ${ui.badgeBorder}`,
            background: ui.badgeBg,
            color: ui.accent,
            fontWeight: 900,
            fontSize: 13,
            height: 'fit-content',
          }}
        >
          {model.status}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 14, opacity: 0.92 }}>{model.note}</div>

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {counterfeitAlarm ? (
          <>
            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(239,68,68,0.28)',
                background: 'rgba(239,68,68,0.10)',
                fontSize: 12,
              }}
            >
              Counterfeit pattern
            </span>

            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(239,68,68,0.28)',
                background: 'rgba(239,68,68,0.10)',
                fontSize: 12,
              }}
            >
              Multi-country scan
            </span>

            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(239,68,68,0.28)',
                background: 'rgba(239,68,68,0.10)',
                fontSize: 12,
              }}
            >
              Risk: <b>CRITICAL</b>
            </span>
          </>
        ) : (
          <>
            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                fontSize: 12,
              }}
            >
              24s okutma: <b>{summary?.scans_24h ?? 0}</b>
            </span>

            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                fontSize: 12,
              }}
            >
              Farklı IP: <b>{summary?.unique_ips_24h ?? 0}</b>
            </span>

            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                fontSize: 12,
              }}
            >
              Ülke: <b>{summary?.unique_countries_24h ?? 0}</b>
            </span>

            {lastAlarm?.risk_level ? (
              <span
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  fontSize: 12,
                }}
              >
                Son risk: <b>{String(lastAlarm.risk_level).toUpperCase()}</b>
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  lastAlarm,
}: {
  status: PublicStatus | null
  lastAlarm: AlarmRow | null
}) {
  const hasActiveAlarm =
    Boolean(status?.has_open_alarm) || lastAlarm?.resolved === false

  if (!status && !hasActiveAlarm) return null

  if (hasActiveAlarm) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.4)',
          color: '#fde68a',
          fontWeight: 800,
          fontSize: 13,
        }}
      >
        ⚠️ Olağandışı doğrulama aktivitesi izleniyor
        {typeof status?.open_occurrences === 'number' ? (
          <span style={{ opacity: 0.85, fontWeight: 700 }}>
            {' '}
            • {status.open_occurrences} tespit
          </span>
        ) : null}
        {status?.open_last_seen_at ? (
          <div
            style={{
              marginTop: 6,
              opacity: 0.8,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Son aktivite: {fmt(status.open_last_seen_at)}
          </div>
        ) : null}
      </div>
    )
  }

  if (!hasActiveAlarm && status?.review_state === 'approved') {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.4)',
          color: '#bbf7d0',
          fontWeight: 800,
          fontSize: 13,
        }}
      >
        ✅ İncelendi – Onaylandı
      </div>
    )
  }

  if (
    !hasActiveAlarm &&
    (status?.review_state === 'under_review' ||
      status?.review_state === 'in_review')
  ) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(59,130,246,0.12)',
          border: '1px solid rgba(59,130,246,0.35)',
          color: '#bfdbfe',
          fontWeight: 800,
          fontSize: 13,
        }}
      >
        🔍 İnceleme altında
      </div>
    )
  }

  if (!hasActiveAlarm && status?.review_state === 'rejected') {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.4)',
          color: '#fecaca',
          fontWeight: 800,
          fontSize: 13,
        }}
      >
        ❌ İncelendi – Kısıtlı / Uygun değil
      </div>
    )
  }

  if (status?.last_resolved_reason === 'false_positive') {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.4)',
          color: '#bbf7d0',
          fontWeight: 800,
          fontSize: 13,
        }}
      >
        ✅ Son kontrol – yanlış alarm
        {status.last_resolved_at ? (
          <div
            style={{
              marginTop: 6,
              opacity: 0.8,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Son inceleme: {fmt(status.last_resolved_at)}
            {status.last_resolved_note ? ` • ${status.last_resolved_note}` : ''}
          </div>
        ) : null}
      </div>
    )
  }

  if (status?.last_resolved_reason) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 12,
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.35)',
          color: '#fecaca',
          fontWeight: 800,
          fontSize: 13,
        }}
      >
        ℹ️ Son kontrol tamamlandı
        {status.last_resolved_at ? (
          <div
            style={{
              marginTop: 6,
              opacity: 0.8,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Son inceleme: {fmt(status.last_resolved_at)}
            {status.last_resolved_note ? ` • ${status.last_resolved_note}` : ''}
          </div>
        ) : null}
      </div>
    )
  }

  return null
}

function CounterfeitAlert({
  alarm,
}: {
  alarm: CounterfeitAlarmRow | null
}) {
  if (!alarm) return null

  const isCriticalCounterfeit =
    alarm?.risk_level?.toLowerCase() === 'critical'

  return (
    <div
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 16,
        background: 'rgba(239,68,68,0.10)',
        border: '1px solid rgba(239,68,68,0.35)',
        color: '#fecaca',
      }}
    >
      {isCriticalCounterfeit && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(127,29,29,0.35)',
            border: '1px solid rgba(255,77,79,0.45)',
            color: '#ffe2e2',
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          🚨 Yüksek riskli sahte ürün tespiti
        </div>
      )}

      <div style={{ fontWeight: 900, fontSize: 18 }}>
        🚨 Olası sahte ürün tespit edildi
      </div>

      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, opacity: 0.95 }}>
        Bu ürün kısa süre içinde farklı ülkelerden okutuldu. Sahte olma ihtimali yüksektir.
      </div>

      {Array.isArray(alarm.reasons) && alarm.reasons.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            Tespit edilen sinyaller:
          </div>

          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            {alarm.reasons.map((reason, index) => (
              <li key={`${reason}-${index}`}>{translateReason(reason)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {alarm.risk_level ? (
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
          Risk seviyesi: <b>{String(alarm.risk_level).toUpperCase()}</b>
        </div>
      ) : null}

      {alarm.created_at ? (
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          Alarm zamanı: {fmt(alarm.created_at)}
        </div>
      ) : null}
    </div>
  )
}

function infoCardStyle(): React.CSSProperties {
  return {
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 18,
    background: 'rgba(255,255,255,0.04)',
  }
}

export default async function PublicDppPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = getSupabaseServer()

  const { slug } = await params
  const safeSlug = decodeURIComponent(slug ?? '').trim().toLowerCase()

  const { data: page, error: pageErr } = await supabase
    .from('public_pages')
    .select('id, slug, lang_default, product_id, published_at, review_state')
    .eq('slug', safeSlug)
    .maybeSingle()

  let counterfeitAlarm: CounterfeitAlarmRow | null = null

  if (page?.id) {
    const { data: alarmData } = await supabase
      .from('dpp_alarms')
      .select('alarm_type, risk_level, reasons, created_at')
      .eq('page_id', page.id)
      .eq('alarm_type', 'counterfeit')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    counterfeitAlarm = (alarmData ?? null) as CounterfeitAlarmRow | null
  }

  if (pageErr || !page) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0b0f17',
          color: '#e6e6e6',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px 12px',
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ maxWidth: 600 }}>
          <h1>Bulunamadı</h1>
          <p>Bu DPP sayfası bulunamadı.</p>
        </div>
      </div>
    )
  }

  if (!page.published_at) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0b0f17',
          color: '#e6e6e6',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ maxWidth: 600 }}>
          <h1>Ürün henüz yayında değil</h1>
          <p>
            Bu ürün taslak aşamasındadır. Yayınlandığında herkese açık olarak
            görüntülenecektir.
          </p>
        </div>
      </div>
    )
  }

  let status: PublicStatus | null = null
  try {
    const { data: statusRows, error: statusErr } = await supabase.rpc(
      'fn_public_get_dpp_status',
      {
        p_slug: safeSlug,
      }
    )

    if (statusErr) {
      console.error('[fn_public_get_dpp_status] error:', statusErr)
    } else {
      status = (statusRows?.[0] ?? null) as PublicStatus | null
    }
  } catch (e) {
    console.error('[fn_public_get_dpp_status] fetch failed:', e)
  }

  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select(
      'id, name_tr, name_en, sku, category, brand, manufacturer, country_of_manufacture, status, brand_logo_url, cover_image_url'
    )
    .eq('id', page.product_id)
    .maybeSingle()

  if (prodErr || !product) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0b0f17',
          color: '#e6e6e6',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ maxWidth: 600 }}>
          <h1>Ürün bulunamadı</h1>
        </div>
      </div>
    )
  }

  let summary: ScanSummaryRow | null = null
  try {
    const { data: summaryRow } = await supabase
      .from('dpp_scan_summary')
      .select(
        'page_id, scans_total, last_scan_at, scans_24h, unique_ips_24h, unique_countries_24h, is_suspicious'
      )
      .eq('page_id', page.id)
      .maybeSingle()

    summary = (summaryRow ?? null) as ScanSummaryRow | null
  } catch (e) {
    console.error('[dpp_scan_summary] fetch failed:', e)
  }

  let lastAlarm: AlarmRow | null = null
  try {
    const { data: alarmRow } = await supabase
      .from('dpp_alarms')
      .select('risk_score, risk_level, reasons, created_at, resolved')
      .eq('page_id', page.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    lastAlarm = (alarmRow ?? null) as AlarmRow | null
  } catch (e) {
    console.error('[dpp_alarms] fetch failed:', e)
  }

  const authenticity = getAuthenticityModel({
    suspicious: summary?.is_suspicious ?? false,
    hasOpenAlarm: Boolean(status?.has_open_alarm),
    hasCounterfeitAlarm: Boolean(counterfeitAlarm),
    lastAlarmRisk: counterfeitAlarm ? 92 : lastAlarm?.risk_score ?? null,
    lastAlarmLevel: counterfeitAlarm ? 'CRITICAL' : lastAlarm?.risk_level ?? null,
    lastAlarmResolved: counterfeitAlarm ? false : lastAlarm?.resolved ?? null,
  })

  const trustStatus: TrustBadgeStatus = counterfeitAlarm
  ? 'fake'
  : authenticity.tone === 'risk'
  ? 'fake'
  : authenticity.tone === 'review'
  ? 'suspicious'
  : 'safe'

  const title =
    page.lang_default === 'en'
      ? product.name_en || product.name_tr
      : product.name_tr || product.name_en

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'

  const pageUrl = `${baseUrl}/p/${page.slug}`
  const qrDataUrl = await generateQrDataUrl(pageUrl)

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(37,99,235,0.10), transparent 28%), #0b0f17',
        color: '#e6e6e6',
        padding: 24,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ width: '100%', maxWidth: 980 }}>
        <ScanLogger pageId={page.id} />
        <div id="scan-error" style={{ marginTop: 12 }} />

        <div
          style={{
            marginBottom: 18,
            padding: 20,
            borderRadius: 22,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.04)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ maxWidth: 720 }}>
              <div style={{ fontSize: 12, opacity: 0.68, letterSpacing: 0.4 }}>
                DPPForge • Resmi Dijital Ürün Pasaportu
              </div>

              {product.brand_logo_url && (
                <div style={{ marginTop: 10, marginBottom: 10 }}>
                  <img
                    src={product.brand_logo_url}
                    alt="Brand logo"
                    style={{
                      height: 40,
                      objectFit: 'contain',
                      opacity: 0.9,
                    }}
                  />
                </div>
              )}

              <h1 style={{ margin: '8px 0 0', fontSize: 34 }}>{title}</h1>

              <TrustBadge status={trustStatus} />

              <div style={{ fontSize: 13, opacity: 0.72, marginTop: 8 }}>
                Bu sayfa ürünün doğrulama, izlenebilirlik ve güven değerlendirmesi için
                oluşturulmuş resmi DPP kaydıdır.
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
                Slug: {page.slug} • Yayın: {page.published_at ? fmt(page.published_at) : '-'}
              </div>

              <CounterfeitAlert alarm={counterfeitAlarm} />

              <StatusBadge status={status} lastAlarm={lastAlarm} />

              <AuthenticityCard
                model={authenticity}
                summary={summary}
                lastAlarm={lastAlarm}
                counterfeitAlarm={counterfeitAlarm}
              />
            </div>

            <div
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                fontSize: 12,
                height: 'fit-content',
              }}
            >
              ● Ürün durumu: <b>{labelStatus(product.status)}</b>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div style={infoCardStyle()}>
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Ürün Bilgileri</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 160px) 1fr',
                gap: 10,
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              <div style={{ opacity: 0.7 }}>Ürün adı</div>
              <div style={{ fontWeight: 700 }}>{title || '-'}</div>

              <div style={{ opacity: 0.7 }}>SKU</div>
              <div>{product.sku || '-'}</div>

              <div style={{ opacity: 0.7 }}>Kategori</div>
              <div>{product.category || '-'}</div>

              <div style={{ opacity: 0.7 }}>Marka</div>
              <div>{product.brand || '-'}</div>

              <div style={{ opacity: 0.7 }}>Üretici</div>
              <div>{product.manufacturer || '-'}</div>

              <div style={{ opacity: 0.7 }}>Üretim yeri</div>
              <div>{product.country_of_manufacture || '-'}</div>

              <div style={{ opacity: 0.7 }}>Dil</div>
              <div>{page.lang_default || '-'}</div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 13,
                opacity: 0.82,
                lineHeight: 1.6,
              }}
            >
              Bu kayıt ürünün resmi doğrulama özetidir. Şüpheli aktivite tespit edilirse
              sistem bunu analiz eder ve güven skoruna yansıtır.
            </div>
          </div>

          <div style={infoCardStyle()}>
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Ürün Doğrulama</h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 220,
              }}
            >
              {product.cover_image_url && (
                <img
                  src={product.cover_image_url}
                  alt="Product"
                  style={{
                    width: 140,
                    height: 140,
                    objectFit: 'cover',
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                />
              )}

              <img
              src={qrDataUrl}
              style={{
              width: '100%',
              maxWidth: 200,
              height: 'auto',
              }}
            />
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                opacity: 0.76,
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Bu QR kod ürünün doğrulama bağlantısını temsil eder.
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                fontSize: 12,
                opacity: 0.75,
                wordBreak: 'break-all',
              }}
            >
              {pageUrl}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}
        >
          {[
            { label: 'Toplam okutma', value: summary?.scans_total ?? 0 },
            { label: '24 saat okutma', value: summary?.scans_24h ?? 0 },
            { label: 'Farklı IP', value: summary?.unique_ips_24h ?? 0 },
            { label: 'Farklı ülke', value: summary?.unique_countries_24h ?? 0 },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.04)',
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.68 }}>{item.label}</div>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.04)',
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Sahte ürün şüphesi mi var?</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>
            Ürün veya doğrulama davranışı hakkında şüpheli bir durum fark ettiyseniz bize
            bildirebilirsiniz.
          </div>

          <ReportForm pageId={page.id} />
        </div>

        <div style={{ marginTop: 18, fontSize: 12, opacity: 0.5, textAlign: 'center' }}>
          © {new Date().getFullYear()} DPPForge • Digital Product Passport
        </div>
      </div>
    </div>
  )
}