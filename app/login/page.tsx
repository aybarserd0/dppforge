export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f17',
        color: '#e6e6e6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 460,
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18,
          padding: 22,
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>🔐 DPPForge Admin Giriş</h1>
        <p style={{ marginTop: 8, opacity: 0.75, lineHeight: 1.4 }}>
          Admin paneline giriş yapmak için e-posta ve şifre gir.
        </p>

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              background: 'rgba(255,0,0,0.10)',
              border: '1px solid rgba(255,0,0,0.25)',
              color: '#ffb4b4',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        <form action="/login/password" method="post" style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          <input type="hidden" name="next" value={next ?? '/admin'} />

          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
              outline: 'none',
            }}
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
              outline: 'none',
            }}
          />

          <button
            type="submit"
            style={{
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.10)',
              color: '#e6e6e6',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Giriş yap
          </button>

          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Not: Bu giriş, cookie/session ile çalışacak (admin koruması için gerekli).
          </div>
        </form>
      </div>
    </div>
  )
}
