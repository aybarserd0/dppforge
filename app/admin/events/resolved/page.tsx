// app/admin/events/resolved/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import React from 'react'
import { headers, cookies } from 'next/headers'
import TrendMiniCharts from './TrendMiniCharts'

export const dynamic = 'force-dynamic'

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, anon)
}

// TODO: Gerçek session guard varsa burayı onunla değiştir.
async function requireSession() {
  return true
}

function fmt(dt?: string | null) {
  if (!dt) return '-'
  try {
    return new Date(dt).toLocaleString('tr-TR')
  } catch {
    return dt
  }
}

type ResolvedEventRow = {
  id: string
  page_id: string
  page_slug: string
  type: string
  severity: string | null
  occurrences: number | null
  reasons: string[] | null
  first_seen_at: string | null
  last_seen_at: string | null
  resolved_at: string | null
  resolved_reason: string | null
  resolved_note: string | null
}

type SP = { [key: string]: string | string[] | undefined }
type PlanType = 'free' | 'pro' | 'enterprise'

function spToStr(v: unknown) {
  return typeof v === 'string' ? v : ''
}

// ✅ RENKLİ KPI Trend Pill
function trendBadge(diff: number, label: string) {
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '•'
  const sign = diff > 0 ? '+' : ''
  const text = diff === 0 ? 'değişim yok' : `${sign}${diff}`

  const style: React.CSSProperties =
    diff > 0
      ? {
          color: '#fecaca',
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.35)',
        }
      : diff < 0
      ? {
          color: '#bbf7d0',
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.35)',
        }
      : {
          color: 'rgba(255,255,255,0.70)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
        }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        ...style,
      }}
    >
      <span style={{ fontSize: 12 }}>{arrow}</span>
      <span>
        {label}: {text}
      </span>
    </span>
  )
}

// ✅ origin (localhost / prod fark etmez)
function getOriginFromHeaders(h: Headers) {
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

async function getCookieHeader() {
  const cookieStore = await cookies()
  return cookieStore.toString()
}

// ✅ whoami (plan okumak için)
async function getWhoami(): Promise<{ ok: true; plan_type: PlanType } | { ok: false }> {
  const h = await headers()
  const origin = getOriginFromHeaders(h)
  const cookieHeader = await getCookieHeader()

  const res = await fetch(`${origin}/api/admin/whoami`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  })

  if (res.status === 401) redirect('/login')
  if (!res.ok) return { ok: false as const }

  const j = (await res.json()) as any
  const plan: PlanType = j?.plan_type === 'enterprise' || j?.plan_type === 'pro' || j?.plan_type === 'free' ? j.plan_type : 'free'
  return { ok: true as const, plan_type: plan }
}

// ✅ Trend endpoint fetch (cookie forward + 401/402 redirect)
async function getResolvedTrend(days: 14 | 30 = 30) {
  const h = await headers()
  const origin = getOriginFromHeaders(h)
  const cookieHeader = await getCookieHeader()

  const res = await fetch(`${origin}/api/admin/events/resolved/trend?days=${days}`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  })

  if (res.status === 401) redirect('/login')
  if (res.status === 402) redirect('/admin/upgrade?required=enterprise')

  if (!res.ok) {
    return { ok: false, days, rows: [], error: `trend fetch failed: ${res.status}` } as const
  }

  return (await res.json()) as {
    ok: boolean
    days: number
    rows: Array<{ day_tr: string; resolved_count: number; false_positive_rate: number }>
    error?: string
  }
}

export default async function ResolvedEventsPage(props: { searchParams?: Promise<SP> | SP }) {
  const ok = await requireSession()
  if (!ok) redirect('/login')

  const supabase = getSupabaseServer()

  // ✅ Next 16: searchParams bazen Promise geliyor → unwrap
  const sp = (await Promise.resolve(props.searchParams)) ?? {}

  const from = spToStr(sp.from) // YYYY-MM-DD
  const to = spToStr(sp.to) // YYYY-MM-DD
  const reason = spToStr(sp.reason)
  const q = spToStr(sp.q)
  const limit = 50

  // ✅ Plan bilgisi: CSV butonu için
  const who = await getWhoami()
  const plan: PlanType = who.ok ? who.plan_type : 'free'
  const isEnt = plan === 'enterprise'

  // =========================
  // ✅ KPI (Son 30 gün)
  // =========================
  const kpiDays = 30
  const kpiFromIso = new Date(Date.now() - kpiDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: kpiRows, error: kpiErr } = await supabase
    .from('dpp_events_resolved')
    .select('page_slug,resolved_reason,resolved_at')
    .gte('resolved_at', kpiFromIso)
    .limit(5000)

  let kpiTotal = 0
  let kpiFalse = 0
  let kpiTopSlug: string | null = null
  let kpiTopCount = 0

  if (!kpiErr && kpiRows) {
    kpiTotal = kpiRows.length

    const counts: Record<string, number> = {}

    for (const r of kpiRows as any[]) {
      if (r.resolved_reason === 'false_positive') kpiFalse++

      const slug = String(r.page_slug ?? '')
      if (!slug) continue
      counts[slug] = (counts[slug] ?? 0) + 1
    }

    for (const [slug, c] of Object.entries(counts)) {
      if (c > kpiTopCount) {
        kpiTopCount = c
        kpiTopSlug = slug
      }
    }
  }

  const kpiFalseRate = kpiTotal > 0 ? Math.round((kpiFalse / kpiTotal) * 100) : 0

  // =========================
  // ✅ KPI TREND (Son 7 gün vs Önceki 7 gün)
  // =========================
  const nowMs = Date.now()
  const d7Ms = 7 * 24 * 60 * 60 * 1000
  const start7Iso = new Date(nowMs - d7Ms).toISOString()
  const start14Iso = new Date(nowMs - 2 * d7Ms).toISOString()

  const { data: trendRows, error: trendErr } = await supabase
    .from('dpp_events_resolved')
    .select('resolved_reason,resolved_at')
    .gte('resolved_at', start14Iso)
    .limit(5000)

  let last7_total = 0
  let last7_false = 0
  let prev7_total = 0
  let prev7_false = 0

  if (!trendErr && trendRows) {
    const start7Ms = Date.parse(start7Iso)

    for (const r of trendRows as any[]) {
      const ra = String(r.resolved_at ?? '')
      if (!ra) continue
      const t = Date.parse(ra)
      if (Number.isNaN(t)) continue

      const isFalse = r.resolved_reason === 'false_positive'

      if (t >= start7Ms) {
        last7_total++
        if (isFalse) last7_false++
      } else {
        prev7_total++
        if (isFalse) prev7_false++
      }
    }
  }

  const last7_rate = last7_total > 0 ? Math.round((last7_false / last7_total) * 100) : 0
  const prev7_rate = prev7_total > 0 ? Math.round((prev7_false / prev7_total) * 100) : 0
  const trend_total_diff = last7_total - prev7_total
  const trend_rate_diff = last7_rate - prev7_rate

  // =========================
  // ✅ Trend grafikleri datası (son 30 gün)
  // =========================
  const trend30 = await getResolvedTrend(30)

  // =========================
  // ✅ Liste Query (filtreli)
  // =========================
  let query = supabase
    .from('dpp_events_resolved')
    .select(
      'id,page_id,page_slug,type,status,severity,occurrences,reasons,first_seen_at,last_seen_at,resolved_at,resolved_reason,resolved_note'
    )

  // ✅ KESİN ÇÖZÜM: TR gün sınırı (+03:00)
  if (from) query = query.gte('resolved_at', `${from}T00:00:00+03:00`)
  if (to) query = query.lte('resolved_at', `${to}T23:59:59.999+03:00`)

  if (reason) query = query.eq('resolved_reason', reason)
  if (q) query = query.ilike('page_slug', `%${q}%`)

  const { data, error } = await query.limit(limit)

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Kapatılmış Alarmlar</h1>
        <p style={{ color: '#fca5a5' }}>Hata: {error.message}</p>
        <p style={{ opacity: 0.8, marginTop: 10 }}>
          Debug: from=<b>{from || '-'}</b> to=<b>{to || '-'}</b> reason=<b>{reason || '-'}</b> q=<b>{q || '-'}</b>
        </p>
      </div>
    )
  }

  const rows = (data ?? []) as ResolvedEventRow[]

  const exportHref =
    `/api/admin/events/resolved/export?limit=2000` +
    `&from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}` +
    `&reason=${encodeURIComponent(reason)}` +
    `&q=${encodeURIComponent(q)}`

  return (
    <div style={{ padding: 24, color: '#e6e6e6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Kapatılmış Alarmlar</h1>
          <p style={{ marginTop: 6, opacity: 0.7 }}>
            Bu liste, incelenmiş ve sonuçlandırılmış şüpheli doğrulama olaylarını gösterir.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/admin" style={btnSecondary}>
            ← Admin’e dön
          </a>

          {isEnt ? (
            <a href={exportHref} style={btnSecondary}>
              ⬇️ CSV indir
            </a>
          ) : (
            <a href="/admin/upgrade?required=enterprise" style={btnSecondary}>
              🔒 Enterprise’a geç
            </a>
          )}
        </div>
      </div>

      {/* ✅ KPI Kartları + UI Trend (RENKLİ) */}
      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <div style={card}>
          <div style={cardLabel}>Son {kpiDays} günde kapatılan alarm</div>
          <div style={cardValue}>{kpiErr ? '-' : kpiTotal}</div>
          <div style={cardHint}>Resolved event sayısı</div>

          <div style={{ marginTop: 10 }}>
            {trendErr ? '-' : trendBadge(trend_total_diff, 'Son 7g vs önceki 7g')}
          </div>
          <div style={{ ...cardHint, marginTop: 6 }}>
            {trendErr ? '' : `Son 7g: ${last7_total} • Önceki 7g: ${prev7_total}`}
          </div>
        </div>

        <div style={card}>
          <div style={cardLabel}>False positive oranı</div>
          <div style={cardValue}>{kpiErr ? '-' : `${kpiFalseRate}%`}</div>
          <div style={cardHint}>{kpiErr ? 'KPI okunamadı' : `${kpiFalse}/${kpiTotal} false_positive`}</div>

          <div style={{ marginTop: 10 }}>{trendErr ? '-' : trendBadge(trend_rate_diff, 'Oran değişimi')}</div>
          <div style={{ ...cardHint, marginTop: 6 }}>
            {trendErr ? '' : `Son 7g: %${last7_rate} • Önceki 7g: %${prev7_rate}`}
          </div>
        </div>

        <div style={card}>
          <div style={cardLabel}>En çok alarm gelen ürün</div>
          <div style={cardValue}>{kpiErr ? '-' : (kpiTopSlug ?? '-')}</div>
          <div style={cardHint}>{kpiErr ? '' : kpiTopSlug ? `${kpiTopCount} alarm` : 'Kayıt yok'}</div>
        </div>
      </div>

      {/* ✅ Mini Grafikler (Son 30 gün) */}
      <div style={{ marginTop: 12 }}>
        {trend30?.ok ? (
          <TrendMiniCharts rows={trend30.rows} days={30} />
        ) : (
          <div style={{ ...card, opacity: 0.8 }}>
            Trend grafik datası okunamadı: {(trend30 as any)?.error ?? 'unknown'}
          </div>
        )}
      </div>

      {/* Filtreler */}
      <form
        action="/admin/events/resolved"
        method="get"
        style={{
          marginTop: 12,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'end',
        }}
      >
        <div>
          <div style={label}>Başlangıç</div>
          <input name="from" type="date" defaultValue={from} style={input} />
        </div>

        <div>
          <div style={label}>Bitiş</div>
          <input name="to" type="date" defaultValue={to} style={input} />
        </div>

        <div>
          <div style={label}>Sonuç</div>
          <select name="reason" defaultValue={reason} style={input}>
            <option value="">Tümü</option>
            <option value="false_positive">false_positive</option>
            <option value="confirmed_counterfeit">confirmed_counterfeit</option>
            <option value="test_event">test_event</option>
            <option value="other">other</option>
          </select>
        </div>

        <div style={{ minWidth: 220 }}>
          <div style={label}>Slug ara</div>
          <input name="q" placeholder="örn: sample" defaultValue={q} style={input} />
        </div>

        <button type="submit" style={btnPrimary}>
          Uygula
        </button>

        <a href="/admin/events/resolved" style={btnSecondary}>
          Sıfırla
        </a>
      </form>

      {/* Table */}
      <div
        style={{
          marginTop: 16,
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255,255,255,0.06)' }}>
            <tr>
              <th style={th}>Ürün</th>
              <th style={th}>Tespit</th>
              <th style={th}>Nedenler</th>
              <th style={th}>İlk</th>
              <th style={th}>Kapatıldı</th>
              <th style={th}>Şiddet</th>
              <th style={th}>Sonuç</th>
              <th style={th}>Olumsuz</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={{ padding: 14, opacity: 0.7 }} colSpan={8}>
                  Filtreye uygun kayıt yok.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 800 }}>{r.page_slug}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{r.type}</div>
                  </td>

                  <td style={td}>
                    <b>{r.occurrences ?? 0}</b>
                  </td>

                  <td style={td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(r.reasons ?? []).map((x) => (
                        <span
                          key={x}
                          style={{
                            fontSize: 12,
                            padding: '4px 8px',
                            borderRadius: 999,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(0,0,0,0.25)',
                          }}
                        >
                          {x}
                        </span>
                      ))}
                      {(!r.reasons || r.reasons.length === 0) && <span style={{ opacity: 0.7 }}>-</span>}
                    </div>
                  </td>

                  <td style={td}>{fmt(r.first_seen_at)}</td>
                  <td style={td}>{fmt(r.resolved_at)}</td>

                  <td style={td}>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background:
                          r.severity === 'high'
                            ? 'rgba(239,68,68,0.18)'
                            : r.severity === 'medium'
                            ? 'rgba(245,158,11,0.18)'
                            : 'rgba(255,255,255,0.06)',
                        color:
                          r.severity === 'high'
                            ? '#fecaca'
                            : r.severity === 'medium'
                            ? '#fde68a'
                            : 'rgba(255,255,255,0.85)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {(r.severity ?? '-').toUpperCase()}
                    </span>
                  </td>

                  <td style={td}>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {r.resolved_reason ?? '-'}
                    </span>
                  </td>

                  <td style={td}>
                    <span style={{ opacity: 0.85 }}>{r.resolved_note ?? '-'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 12,
  opacity: 0.8,
}

const td: React.CSSProperties = {
  padding: '12px 14px',
  verticalAlign: 'top',
  fontSize: 13,
}

const label: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  marginBottom: 6,
}

const input: React.CSSProperties = {
  padding: '10px 10px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(0,0,0,0.25)',
  color: '#e6e6e6',
  outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.10)',
  color: '#e6e6e6',
  fontWeight: 800,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e6e6e6',
  textDecoration: 'none',
  fontWeight: 700,
}

const card: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 14,
  background: 'rgba(255,255,255,0.04)',
}

const cardLabel: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  marginBottom: 8,
}

const cardValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
}

const cardHint: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  marginTop: 6,
}