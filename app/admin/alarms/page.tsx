// app/admin/alarms/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ResolveAlarmButton from './ResolveAlarmButton'

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
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  return user
}

type AlarmRow = {
  id: string
  page_id: string
  risk_score: number
  risk_level: string
  reasons: string[] | null
  created_at: string
  resolved: boolean
}

type PageRow = {
  id: string
  slug: string | null
  product_id: string | null
}

type ProductRow = {
  id: string
  name_tr: string | null
  sku: string | null
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

function buttonStyle() {
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

function translateRiskLevel(level?: string | null) {
  const value = String(level ?? '').trim().toLowerCase()

  if (value === 'critical') return 'Kritik'
  if (value === 'high') return 'Yüksek'
  if (value === 'medium') return 'Orta'
  if (value === 'low') return 'Düşük'

  return level ?? '—'
}

function translateReason(reason: string) {
  if (reason === 'high scan velocity') return 'Çok yüksek okutma hızı'
  if (reason === 'unique ip spike') return 'Farklı IP artışı'
  if (reason === 'multi-country burst') return 'Kısa sürede farklı ülkelerden okutma'
  if (reason === 'multi-country scans in short time') {
    return 'Kısa sürede farklı ülkelerden okutma'
  }
  if (reason === 'rate-limit') return 'Kısa sürede aşırı tekrar'
  return reason
}

function levelBadge(level?: string | null) {
  const value = String(level ?? '').trim().toLowerCase()

  if (value === 'critical' || value === 'high') {
    return pillStyle(
      'rgba(239,68,68,0.14)',
      'rgba(239,68,68,0.35)',
      '#fecaca'
    )
  }

  if (value === 'medium') {
    return pillStyle(
      'rgba(245,158,11,0.14)',
      'rgba(245,158,11,0.35)',
      '#fde68a'
    )
  }

  if (value === 'low') {
    return pillStyle(
      'rgba(59,130,246,0.14)',
      'rgba(59,130,246,0.35)',
      '#bfdbfe'
    )
  }

  return pillStyle(
    'rgba(255,255,255,0.06)',
    'rgba(255,255,255,0.12)',
    'rgba(255,255,255,0.85)'
  )
}

function statusBadge(resolved: boolean) {
  return resolved
    ? pillStyle(
        'rgba(34,197,94,0.14)',
        'rgba(34,197,94,0.35)',
        '#bbf7d0'
      )
    : pillStyle(
        'rgba(249,115,22,0.14)',
        'rgba(249,115,22,0.35)',
        '#fdba74'
      )
}

function fmt(dt?: string | null) {
  if (!dt) return '—'

  const date = new Date(dt)
  if (!Number.isFinite(date.getTime())) return '—'

  return date.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
}

function ErrorBox({
  title,
  error,
}: {
  title: string
  error: unknown
}) {
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
      <h1>{title}</h1>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
        {JSON.stringify(error, null, 2)}
      </pre>
    </div>
  )
}

export default async function AdminAlarmsPage() {
  const user = await requireAdmin()
  const supabase = getSupabaseAdmin()

  const { data: userProductsRaw, error: userProductsErr } = await supabase
    .from('products')
    .select('id, name_tr, sku')
    .eq('account_id', user.id)

  if (userProductsErr) {
    return <ErrorBox title="Ürün verisi hatası" error={userProductsErr} />
  }

  const userProducts = (userProductsRaw ?? []) as ProductRow[]
  const userProductIds = userProducts.map((p) => p.id)

  let alarms: AlarmRow[] = []
  let pageMap = new Map<string, PageRow>()
  let productMap = new Map<string, ProductRow>(
    userProducts.map((p) => [p.id, p])
  )

  if (userProductIds.length > 0) {
    const { data: userPagesRaw, error: userPagesErr } = await supabase
      .from('public_pages')
      .select('id, slug, product_id')
      .in('product_id', userProductIds)

    if (userPagesErr) {
      return <ErrorBox title="Sayfa verisi hatası" error={userPagesErr} />
    }

    const userPages = (userPagesRaw ?? []) as PageRow[]
    pageMap = new Map(userPages.map((p) => [p.id, p]))

    const userPageIds = userPages.map((p) => p.id)

    if (userPageIds.length > 0) {
      const { data: alarmsRaw, error: alarmsErr } = await supabase
        .from('dpp_alarms')
        .select(
          'id, page_id, risk_score, risk_level, reasons, created_at, resolved'
        )
        .in('page_id', userPageIds)
        .order('created_at', { ascending: false })
        .limit(100)

      if (alarmsErr) {
        return <ErrorBox title="Alarm verisi hatası" error={alarmsErr} />
      }

      alarms = (alarmsRaw ?? []) as AlarmRow[]
    }
  }

  const openCount = alarms.filter((a) => !a.resolved).length
  const resolvedCount = alarms.filter((a) => a.resolved).length

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
          <h1 style={{ margin: 0 }}>⚠ Alarm Kayıtları</h1>
          <p style={{ opacity: 0.7, marginTop: 8 }}>
            Sadece bu hesaba ait ürünlerde oluşan alarm kayıtları
          </p>
        </div>

        <Link href="/admin" style={buttonStyle()}>
          ← Admin’e dön
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div
          style={pillStyle(
            'rgba(239,68,68,0.14)',
            'rgba(239,68,68,0.35)',
            '#fecaca'
          )}
        >
          Açık: {openCount}
        </div>

        <div
          style={pillStyle(
            'rgba(34,197,94,0.14)',
            'rgba(34,197,94,0.35)',
            '#bbf7d0'
          )}
        >
          Çözüldü: {resolvedCount}
        </div>

        <div
          style={pillStyle(
            'rgba(255,255,255,0.06)',
            'rgba(255,255,255,0.12)',
            'rgba(255,255,255,0.85)'
          )}
        >
          Toplam: {alarms.length}
        </div>
      </div>

      {alarms.length === 0 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Henüz alarm yok</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Bu hesaba ait ürünlerde şüpheli tarama oluştuğunda kayıtlar burada
            görünecek.
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 10,
            display: 'grid',
            gap: 12,
          }}
        >
          {alarms.map((alarm) => {
            const page = pageMap.get(alarm.page_id)
            const product = page?.product_id
              ? productMap.get(page.product_id)
              : undefined

            const slug = page?.slug ?? '—'
            const productName = product?.name_tr ?? '—'
            const sku = product?.sku ?? '—'

            return (
              <div
                key={alarm.id}
                style={{
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
                    gap: 16,
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: 16 }}>
                        {productName}
                      </div>

                      <span style={levelBadge(alarm.risk_level)}>
                        {translateRiskLevel(alarm.risk_level)}
                      </span>

                      <span style={statusBadge(alarm.resolved)}>
                        {alarm.resolved ? 'Çözüldü' : 'Açık'}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={pillStyle(
                          'rgba(255,255,255,0.06)',
                          'rgba(255,255,255,0.12)',
                          'rgba(255,255,255,0.85)'
                        )}
                      >
                        SKU: {sku}
                      </span>

                      <span
                        style={pillStyle(
                          'rgba(255,255,255,0.06)',
                          'rgba(255,255,255,0.12)',
                          'rgba(255,255,255,0.85)'
                        )}
                      >
                        Risk skoru: {alarm.risk_score}%
                      </span>

                      <span
                        style={pillStyle(
                          'rgba(255,255,255,0.06)',
                          'rgba(255,255,255,0.12)',
                          'rgba(255,255,255,0.85)'
                        )}
                      >
                        Zaman: {fmt(alarm.created_at)}
                      </span>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
                      Sayfa yolu:{' '}
                      {slug !== '—' ? (
                        <Link
                          href={`/p/${slug}`}
                          target="_blank"
                          style={{ color: '#a7c7ff', textDecoration: 'none' }}
                        >
                          /p/{slug}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          fontSize: 13,
                          opacity: 0.75,
                          marginBottom: 8,
                        }}
                      >
                        Nedenler
                      </div>

                      {(alarm.reasons ?? []).length > 0 ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(alarm.reasons ?? []).map((reason, i) => (
                            <span
                              key={`${alarm.id}-${i}`}
                              style={pillStyle(
                                'rgba(255,255,255,0.06)',
                                'rgba(255,255,255,0.12)',
                                'rgba(255,255,255,0.85)'
                              )}
                            >
                              {translateReason(reason)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ opacity: 0.6, fontSize: 13 }}>—</div>
                      )}
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
                    <Link
                      href={`/admin/p/${alarm.page_id}`}
                      style={{
                        ...buttonStyle(),
                        padding: '8px 10px',
                        fontSize: 13,
                      }}
                    >
                      Detaylar
                    </Link>

                    {!alarm.resolved ? (
                      <ResolveAlarmButton alarmId={alarm.id} />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}