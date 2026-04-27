import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_env')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function pageStyle() {
  return {
    padding: 40,
    background: '#0b0f17',
    minHeight: '100vh',
    color: '#e6e6e6',
    fontFamily: 'system-ui',
  } as const
}

function cardStyle() {
  return {
    padding: 18,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
  } as const
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
    fontWeight: 800,
  } as const
}

function translateStatus(status?: string | null) {
  const s = String(status ?? '').toLowerCase()

  if (s === 'paid') return 'Ödendi'
  if (s === 'failed') return 'Başarısız'
  if (s === 'pending') return 'Bekliyor'

  return s ? s : 'Bilinmiyor'
}

function badgeStyle(status?: string | null) {
  const s = String(status ?? '').toLowerCase()

  if (s === 'paid') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      background: 'rgba(34,197,94,0.16)',
      border: '1px solid rgba(34,197,94,0.35)',
      color: '#bbf7d0',
      fontSize: 12,
      fontWeight: 900,
      textTransform: 'uppercase' as const,
    }
  }

  if (s === 'failed') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      background: 'rgba(239,68,68,0.16)',
      border: '1px solid rgba(239,68,68,0.35)',
      color: '#fecaca',
      fontSize: 12,
      fontWeight: 900,
      textTransform: 'uppercase' as const,
    }
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(245,158,11,0.16)',
    border: '1px solid rgba(245,158,11,0.35)',
    color: '#fde68a',
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase' as const,
  }
}

function formatDate(date?: string | null) {
  if (!date) return '—'

  const d = new Date(date)
  if (!Number.isFinite(d.getTime())) return '—'

  return d.toLocaleString('tr-TR')
}

function shortText(value?: string | null, len = 12) {
  if (!value) return '—'
  if (value.length <= len) return value
  return `${value.slice(0, len)}...`
}

function formatProvider(provider?: string | null) {
  const value = String(provider ?? '').trim().toLowerCase()

  if (!value) return '—'
  if (value === 'iyzico') return 'İyzico'

  return provider ?? '—'
}

export default async function BillingPage() {
  const authSupabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userErr,
  } = await authSupabase.auth.getUser()

  if (userErr || !user) {
    redirect('/login?next=/admin/billing')
  }

  const { data: membership, error: membershipErr } = await authSupabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipErr || !membership?.account_id) {
    return (
      <main style={pageStyle()}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={cardStyle()}>
            <h1 style={{ marginTop: 0 }}>Hesap bulunamadı</h1>
            <p style={{ opacity: 0.8 }}>
              Giriş yapıldı ama account_members içinde bu kullanıcıya bağlı bir hesap bulunamadı.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link href="/admin" style={buttonStyle()}>
                ← Admin’e dön
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const accountId = membership.account_id
  const supabase = getSupabaseAdmin()

  const { data: sessions, error } = await supabase
    .from('dpp_payment_sessions')
    .select(
      'id, plan_type, status, provider, iyzico_token, payment_url, created_at, updated_at, conversation_id'
    )
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return (
      <main style={pageStyle()}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={cardStyle()}>
            <h1 style={{ marginTop: 0 }}>Ödeme geçmişi hatası</h1>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={pageStyle()}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 8 }}>
              💳 DPPForge • Ödemeler
            </div>
            <h1 style={{ margin: 0 }}>Ödeme Geçmişi</h1>
            <p style={{ opacity: 0.78, marginTop: 8 }}>
              Son ödeme denemeleri ve abonelik akışı kayıtları
            </p>
          </div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Hesap özeti</div>
          <div style={{ opacity: 0.78, fontSize: 14 }}>
            Hesap ID: <span style={{ opacity: 1 }}>{accountId}</span>
          </div>
        </div>

        {!sessions?.length ? (
          <div style={cardStyle()}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Henüz ödeme yok</div>
            <div style={{ opacity: 0.78, fontSize: 14 }}>
              Bu hesap için henüz kayıtlı ödeme denemesi bulunmuyor.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {sessions.map((s) => (
              <div key={s.id} style={cardStyle()}>
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
                    <div style={{ fontSize: 18, fontWeight: 900 }}>
                      {String(s.plan_type ?? 'pro').toUpperCase()} Plan
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.72, marginTop: 6 }}>
                      {formatDate(s.created_at)}
                    </div>
                  </div>

                  <span style={badgeStyle(s.status)}>
                    {translateStatus(s.status)}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Oturum ID</div>
                    <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700 }}>
                      {s.id}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Ödeme sağlayıcı</div>
                    <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700 }}>
                      {formatProvider(s.provider)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>İşlem tokenı</div>
                    <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700 }}>
                      {shortText(s.iyzico_token, 14)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Güncellenme zamanı</div>
                    <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700 }}>
                      {formatDate(s.updated_at)}
                    </div>
                  </div>
                </div>

                {s.conversation_id ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Konuşma ID</div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        fontWeight: 700,
                        wordBreak: 'break-word',
                      }}
                    >
                      {s.conversation_id}
                    </div>
                  </div>
                ) : null}

                {s.payment_url ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Ödeme bağlantısı</div>
                    <div
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <a
                        href={s.payment_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(59,130,246,0.35)',
                          background: 'rgba(59,130,246,0.12)',
                          color: '#bfdbfe',
                          textDecoration: 'none',
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        Ödeme sayfasını aç
                      </a>

                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.75,
                          wordBreak: 'break-all',
                        }}
                      >
                        {s.payment_url}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}