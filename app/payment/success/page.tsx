'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type VerifyResponse = {
  ok?: boolean
  verified?: boolean
  upgraded?: boolean
  already_paid?: boolean
  renewed?: boolean
  status?: 'paid' | 'pending' | 'failed'
  error?: string
  reason?: string
  paymentStatus?: string | null
  paymentId?: string | null
  plan_type?: string | null
  session_id?: string | null
  account_id?: string | null
  fraudStatus?: number | null
  [key: string]: any
}

type VerifyState =
  | { phase: 'loading'; error: null; data: null }
  | { phase: 'error'; error: string; data: VerifyResponse | null }
  | { phase: 'done'; error: null; data: VerifyResponse }

function pageStyle(): React.CSSProperties {
  return {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: '#0b0f17',
    color: '#e6e6e6',
    fontFamily: 'system-ui, sans-serif',
  }
}

function cardStyle(): React.CSSProperties {
  return {
    width: '100%',
    maxWidth: 760,
    background: '#121826',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
  }
}

function badgeStyle(
  tone: 'success' | 'warn' | 'danger' | 'neutral'
): React.CSSProperties {
  const map = {
    success: {
      background: 'rgba(34,197,94,0.16)',
      border: '1px solid rgba(34,197,94,0.35)',
      color: '#bbf7d0',
    },
    warn: {
      background: 'rgba(245,158,11,0.16)',
      border: '1px solid rgba(245,158,11,0.35)',
      color: '#fde68a',
    },
    danger: {
      background: 'rgba(239,68,68,0.16)',
      border: '1px solid rgba(239,68,68,0.35)',
      color: '#fecaca',
    },
    neutral: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: '#e5e7eb',
    },
  } as const

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    ...map[tone],
  }
}

function buttonStyle(
  variant: 'primary' | 'secondary' | 'success'
): React.CSSProperties {
  if (variant === 'primary') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 14px',
      borderRadius: 12,
      background: '#2563eb',
      color: '#fff',
      textDecoration: 'none',
      fontWeight: 800,
      border: '1px solid rgba(255,255,255,0.10)',
    }
  }

  if (variant === 'success') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 14px',
      borderRadius: 12,
      background: 'rgba(34,197,94,0.16)',
      color: '#bbf7d0',
      textDecoration: 'none',
      fontWeight: 800,
      border: '1px solid rgba(34,197,94,0.35)',
    }
  }

  return {
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
  }
}

function infoRow(label: string, value?: string | number | null) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ opacity: 0.72, fontSize: 14 }}>{label}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          textAlign: 'right',
          wordBreak: 'break-word',
        }}
      >
        {value ?? '—'}
      </div>
    </div>
  )
}

function normalizeStatus(
  data: VerifyResponse | null
): 'paid' | 'pending' | 'failed' | 'error' {
  if (!data) return 'error'
  if (data.status === 'paid') return 'paid'
  if (data.status === 'pending') return 'pending'
  if (data.status === 'failed') return 'failed'
  if (data.ok === false && data.error) return 'error'
  return 'error'
}

function statusMeta(status: 'paid' | 'pending' | 'failed' | 'error') {
  if (status === 'paid') {
    return {
      tone: 'success' as const,
      badge: 'Ödeme başarılı',
      title: 'Planın başarıyla yükseltildi',
      description:
        'Ödemen doğrulandı ve hesabın yeni planına geçirildi. Artık admin panelinden devam edebilirsin.',
    }
  }

  if (status === 'pending') {
    return {
      tone: 'warn' as const,
      badge: 'Kontrol bekleniyor',
      title: 'Ödeme henüz tamamlanmamış görünüyor',
      description:
        'Ödeme sağlayıcı tarafında işlem tamamlanmamış olabilir, sonuç netleşmemiş olabilir veya ek inceleme gerekebilir. Birkaç saniye sonra tekrar deneyebilirsin.',
    }
  }

  if (status === 'failed') {
    return {
      tone: 'danger' as const,
      badge: 'Ödeme başarısız',
      title: 'Ödeme doğrulandı ama başarılı görünmüyor',
      description:
        'İşlem başarısız veya reddedilmiş görünüyor. Upgrade akışını yeniden başlatabilirsin.',
    }
  }

  return {
    tone: 'danger' as const,
    badge: 'Doğrulama hatası',
    title: 'Ödeme sonucu doğrulanamadı',
    description:
      'Ödeme sonucunu kontrol ederken bir hata oluştu. Gerekirse tekrar deneyip admin paneline dönebilirsin.',
  }
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<VerifyState>({
    phase: 'loading',
    error: null,
    data: null,
  })

  const token = searchParams.get('token')
  const conversationId = searchParams.get('conversationId')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    setMounted(true)
  }, [])

  const verifyUrl = useMemo(() => {
    if (!mounted) return null

    const url = new URL('/api/payment/verify', window.location.origin)

    if (sessionId) url.searchParams.set('session_id', sessionId)
    if (token) url.searchParams.set('token', token)
    if (conversationId) url.searchParams.set('conversationId', conversationId)

    return url.toString()
  }, [mounted, sessionId, token, conversationId])

  useEffect(() => {
    let active = true

    async function run() {
      if (!mounted) return

      if (!verifyUrl) {
        if (!active) return
        setState({
          phase: 'error',
          error: 'invalid_verify_url',
          data: null,
        })
        return
      }

      if (!token && !sessionId) {
        if (!active) return
        setState({
          phase: 'error',
          error: 'missing_token_or_session_id',
          data: null,
        })
        return
      }

      try {
        const res = await fetch(verifyUrl, {
          method: 'GET',
          cache: 'no-store',
        })

        const data = (await res.json().catch(() => null)) as VerifyResponse | null

        if (!active) return

        if (!res.ok) {
          setState({
            phase: 'error',
            error: data?.error || 'payment_verify_failed',
            data,
          })
          return
        }

        setState({
          phase: 'done',
          error: null,
          data: data ?? {},
        })
      } catch (e: any) {
        if (!active) return
        setState({
          phase: 'error',
          error: e?.message || 'network_error',
          data: null,
        })
      }
    }

    run()

    return () => {
      active = false
    }
  }, [mounted, verifyUrl, token, sessionId])

  const currentStatus =
    state.phase === 'done'
      ? normalizeStatus(state.data)
      : state.phase === 'error'
      ? 'error'
      : null

  const meta = currentStatus ? statusMeta(currentStatus) : null
  const isDev = process.env.NODE_ENV !== 'production'
  const shouldAutoRedirect =
    state.phase === 'done' && state.data?.status === 'paid'

  useEffect(() => {
    if (!shouldAutoRedirect) return

    const timer = window.setTimeout(() => {
      window.location.href = '/admin'
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [shouldAutoRedirect])

  return (
    <main style={pageStyle()}>
      <div style={cardStyle()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ opacity: 0.68, fontSize: 12, marginBottom: 8 }}>
              💳 DPPForge • Payment Result
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
              Ödeme Sonucu
            </h1>
          </div>

          {meta ? <span style={badgeStyle(meta.tone)}>{meta.badge}</span> : null}
        </div>

        {state.phase === 'loading' && (
          <div
            style={{
              padding: 18,
              borderRadius: 16,
              border: '1px solid rgba(59,130,246,0.25)',
              background: 'rgba(59,130,246,0.08)',
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              Ödeme kontrol ediliyor
            </div>
            <div style={{ opacity: 0.82, lineHeight: 1.6 }}>
              iyzico sonucu doğrulanıyor. Lütfen bu sayfayı kapatma.
            </div>
          </div>
        )}

        {state.phase !== 'loading' && meta && (
          <div
            style={{
              padding: 18,
              borderRadius: 16,
              border:
                meta.tone === 'success'
                  ? '1px solid rgba(34,197,94,0.30)'
                  : meta.tone === 'warn'
                  ? '1px solid rgba(245,158,11,0.30)'
                  : '1px solid rgba(239,68,68,0.30)',
              background:
                meta.tone === 'success'
                  ? 'rgba(34,197,94,0.08)'
                  : meta.tone === 'warn'
                  ? 'rgba(245,158,11,0.08)'
                  : 'rgba(239,68,68,0.08)',
              marginBottom: 18,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 20 }}>{meta.title}</div>
            <div style={{ marginTop: 8, opacity: 0.86, lineHeight: 1.6 }}>
              {meta.description}
            </div>

            {shouldAutoRedirect ? (
              <div style={{ marginTop: 10, opacity: 0.8, fontSize: 14 }}>
                3 saniye içinde admin paneline yönlendirileceksin...
              </div>
            ) : null}
          </div>
        )}

        <div
          style={{
            padding: 18,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 10 }}>İşlem Özeti</div>

          {infoRow(
            'Durum',
            currentStatus === 'error' ? 'error' : state.data?.status ?? '—'
          )}
          {infoRow('Ödeme durumu', state.data?.paymentStatus ?? null)}
          {infoRow('Payment ID', state.data?.paymentId ?? null)}
          {infoRow('Session ID', state.data?.session_id ?? sessionId ?? null)}
          {infoRow('Hesap', state.data?.account_id ?? null)}
          {infoRow('Fraud durumu', state.data?.fraudStatus ?? null)}
          {infoRow('Token', token ? `${token.slice(0, 8)}...` : null)}
        </div>

        <div
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {currentStatus === 'paid' ? (
            <>
              <Link href="/admin" style={buttonStyle('success')}>
                🔐 Admin paneline dön
              </Link>
              <Link href="/admin/create" style={buttonStyle('secondary')}>
                ➕ Yeni ürün oluştur
              </Link>
            </>
          ) : currentStatus === 'pending' ? (
            <>
              <Link href="/admin/upgrade" style={buttonStyle('primary')}>
                🔄 Tekrar kontrol et / tekrar dene
              </Link>
              <Link href="/admin" style={buttonStyle('secondary')}>
                ← Admin’e dön
              </Link>
            </>
          ) : (
            <>
              <Link href="/admin/upgrade" style={buttonStyle('primary')}>
                💳 Upgrade akışına dön
              </Link>
              <Link href="/admin" style={buttonStyle('secondary')}>
                ← Admin’e dön
              </Link>
            </>
          )}
        </div>

        {state.phase === 'error' && (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 16,
              border: '1px solid rgba(239,68,68,0.30)',
              background: 'rgba(239,68,68,0.08)',
              color: '#fecaca',
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Hata</div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              {state.error}
            </div>
          </div>
        )}

        {isDev && mounted ? (
          <details
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
              Geliştirici detayları
            </summary>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                opacity: 0.9,
                background: '#0b1220',
                padding: 12,
                borderRadius: 12,
                overflowX: 'auto',
                marginTop: 12,
              }}
            >
              {JSON.stringify(
                {
                  state,
                  token,
                  sessionId,
                  conversationId,
                  verifyUrl,
                  shouldAutoRedirect,
                },
                null,
                2
              )}
            </pre>
          </details>
        ) : null}
      </div>
    </main>
  )
}