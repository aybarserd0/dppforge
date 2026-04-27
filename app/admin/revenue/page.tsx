import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_env')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function cardStyle() {
  return {
    padding: 16,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
  }
}

function metricCard(
  title: string,
  value: string | number,
  tone: 'default' | 'success' | 'warn' | 'danger' = 'default'
) {
  const toneStyle =
    tone === 'success'
      ? {
          border: '1px solid rgba(34,197,94,0.30)',
          background: 'rgba(34,197,94,0.08)',
          color: '#bbf7d0',
        }
      : tone === 'warn'
      ? {
          border: '1px solid rgba(245,158,11,0.30)',
          background: 'rgba(245,158,11,0.08)',
          color: '#fde68a',
        }
      : tone === 'danger'
      ? {
          border: '1px solid rgba(239,68,68,0.30)',
          background: 'rgba(239,68,68,0.08)',
          color: '#fecaca',
        }
      : {
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.04)',
          color: '#e6e6e6',
        }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        ...toneStyle,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      <div
  style={{
    marginTop: 8,
    fontSize: 26,
    fontWeight: 900,
    lineHeight: 1.1,
    wordBreak: 'break-word',
  }}
>
  {value}
</div>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleString('tr-TR')
}

function statusBadge(status?: string | null) {
  const s = String(status ?? '').toLowerCase()

  const style =
    s === 'paid'
      ? {
          background: 'rgba(34,197,94,0.14)',
          border: '1px solid rgba(34,197,94,0.35)',
          color: '#bbf7d0',
        }
      : s === 'pending'
      ? {
          background: 'rgba(245,158,11,0.14)',
          border: '1px solid rgba(245,158,11,0.35)',
          color: '#fde68a',
        }
      : s === 'failed'
      ? {
          background: 'rgba(239,68,68,0.14)',
          border: '1px solid rgba(239,68,68,0.35)',
          color: '#fecaca',
        }
      : {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#e5e7eb',
        }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        ...style,
      }}
    >
      {s || 'unknown'}
    </span>
  )
}

export default async function RevenuePage() {
  const authSupabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userErr,
  } = await authSupabase.auth.getUser()

  if (userErr || !user) {
    redirect('/login?next=/admin/revenue')
  }

  const { data: membership, error: membershipErr } = await authSupabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipErr || !membership?.account_id) {
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
        <h1>Gelir Paneli</h1>
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 16,
            border: '1px solid rgba(239,68,68,0.30)',
            background: 'rgba(239,68,68,0.08)',
            color: '#fecaca',
          }}
        >
          Hesap üyeliği bulunamadı. account_members kaydını kontrol et.
        </div>

        <div style={{ marginTop: 16 }}>
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
              textDecoration: 'none',
              fontWeight: 800,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            ← Admin’e dön
          </Link>
        </div>
      </div>
    )
  }

  const accountId = membership.account_id
  const supabase = supabaseAdmin()

  const { data: sessions, error: sessionsErr } = await supabase
    .from('dpp_payment_sessions')
    .select(
      'id, plan_type, status, created_at, payment_url, iyzico_token, conversation_id'
    )
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (sessionsErr) {
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
        <h1>Gelir Paneli</h1>
        <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.8 }}>
          {JSON.stringify(sessionsErr, null, 2)}
        </pre>
      </div>
    )
  }

  const items = sessions ?? []
  const now = Date.now()
  const PRICE_PRO = 2999

  const paid = items.filter((x) => x.status === 'paid')
  const pending = items.filter((x) => x.status === 'pending')
  const failed = items.filter((x) => x.status === 'failed')

  const paid7 = paid.filter((x) => {
    const t = new Date(x.created_at).getTime()
    return Number.isFinite(t) && now - t <= 7 * 24 * 60 * 60 * 1000
  })

  const paid30 = paid.filter((x) => {
    const t = new Date(x.created_at).getTime()
    return Number.isFinite(t) && now - t <= 30 * 24 * 60 * 60 * 1000
  })

  const totalRevenue = paid.length * PRICE_PRO
  const revenue7 = paid7.length * PRICE_PRO
  const revenue30 = paid30.length * PRICE_PRO

  return (
    <div
      style={{
        padding: '24px 16px',
        background: '#0b0f17',
        minHeight: '100vh',
        color: '#e6e6e6',
        fontFamily: 'system-ui',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 8 }}>
            💰 DPPForge • Revenue
          </div>
          <h1 style={{ margin: 0 }}>Gelir Paneli</h1>
          <p style={{ opacity: 0.75, marginTop: 8 }}>
            Ödeme geçmişi üzerinden temel gelir görünümü
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/admin/billing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            💳 Ödemeler
          </Link>

          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            ← Admin’e dön
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}
      >
        {metricCard('Toplam gelir', `₺${totalRevenue}`, 'success')}
        {metricCard('Son 7 gün', `₺${revenue7}`, 'success')}
        {metricCard('Son 30 gün', `₺${revenue30}`, 'success')}
        {metricCard('Başarılı ödeme', paid.length, 'success')}
        {metricCard('Bekleyen ödeme', pending.length, 'warn')}
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ maxWidth: 260 }}>
          {metricCard('Başarısız ödeme', failed.length, 'danger')}
        </div>
      </div>

      <div style={cardStyle()}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>Son işlemler</div>

        {items.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Henüz ödeme kaydı yok.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.18)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      Plan: {String(s.plan_type ?? 'pro').toUpperCase()}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13 }}>
                      {formatDate(s.created_at)}
                    </div>
                  </div>

                  <div>{statusBadge(s.status)}</div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: 'grid',
                    gap: 6,
                    fontSize: 12,
                    opacity: 0.78,
                    wordBreak: 'break-word',
                  }}
                >
                  <div>Session: {s.id}</div>
                  <div>
                    Conversation:{' '}
                    {s.conversation_id
                      ? String(s.conversation_id).slice(0, 48)
                      : '—'}
                  </div>
                  <div>
                    Token:{' '}
                    {s.iyzico_token
                      ? `${String(s.iyzico_token).slice(0, 12)}...`
                      : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}