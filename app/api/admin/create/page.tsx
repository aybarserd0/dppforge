// app/admin/create/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminCreatePage() {
  const r = useRouter()
  const [name_tr, setNameTr] = useState('')
  const [sku, setSku] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/create-product-and-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_tr, sku, slug: slug || undefined }),
      })

      // ✅ 402 -> upgrade
      if (res.status === 402) {
        const j = await res.json().catch(() => ({}))
        const required = encodeURIComponent(j?.required_plan ?? 'pro')
        r.push(`/admin/upgrade?required=${required}&reason=product_limit`)
        return
      }

      const j = await res.json()

      if (!res.ok || !j?.ok) {
        setErr(j?.error ?? `request_failed_${res.status}`)
        return
      }

      // ✅ oluşturduktan sonra admin'e dön veya yeni sayfaya git
      r.push('/admin')
    } catch (e: any) {
      setErr(e?.message ?? 'unknown_error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ margin: 0 }}>Yeni Ürün Oluştur</h1>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        Free plan: 3 ürün limiti. Limit dolarsa otomatik upgrade sayfasına yönlendirir.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div>
          <div style={label}>Ürün adı (TR)</div>
          <input
            value={name_tr}
            onChange={(e) => setNameTr(e.target.value)}
            placeholder="örn: Pamuk Tişört"
            style={input}
          />
        </div>

        <div>
          <div style={label}>SKU</div>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="örn: TST-001"
            style={input}
          />
        </div>

        <div>
          <div style={label}>Slug (opsiyonel)</div>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="örn: pamuk-tisort-tst-001"
            style={input}
          />
        </div>

        {err && (
          <div style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)' }}>
            <b>Hata:</b> {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button disabled={loading} type="submit" style={btnPrimary}>
            {loading ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
          <a href="/admin" style={btnSecondary}>
            ← Admin’e dön
          </a>
        </div>
      </form>
    </main>
  )
}

const label: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  marginBottom: 6,
}

const input: React.CSSProperties = {
  width: '100%',
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