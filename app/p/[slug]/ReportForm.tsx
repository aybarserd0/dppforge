'use client'

import { useState } from 'react'

export default function ReportForm({ pageId }: { pageId: string }) {
  const [reason, setReason] = useState('counterfeit_suspected')
  const [detail, setDetail] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/report-product', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pageId,
          reason,
          detail,
          reporterEmail,
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json?.ok) {
        setError(json?.error || 'report_failed')
        return
      }

      setDone(true)
      setDetail('')
      setReporterEmail('')
    } catch {
      setError('report_failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: '1px solid rgba(16,185,129,0.35)',
          background: 'rgba(16,185,129,0.08)',
          color: '#bbf7d0',
        }}
      >
        Bildiriminiz alındı. İnceleme ekibimiz kontrol edecektir.
      </div>
    )
  }

  return (
    <div
      style={{
        marginTop: 16,
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: 16,
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
        Şüpheli ürün bildir
      </div>

      <div style={{ fontSize: 13, opacity: 0.78, marginBottom: 14 }}>
        Bu ürünle ilgili şüpheli bir durum fark ettiyseniz bize bildirebilirsiniz.
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
            Sebep
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
            }}
          >
            <option value="counterfeit_suspected">Sahte ürün şüphesi</option>
            <option value="packaging_mismatch">Ambalaj uyuşmuyor</option>
            <option value="qr_issue">QR / doğrulama sorunu</option>
            <option value="seller_issue">Satıcı şüpheli</option>
            <option value="other">Diğer</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
            Açıklama
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={4}
            placeholder="Kısa bir açıklama yazın"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
            E-posta (opsiyonel)
          </label>
          <input
            type="email"
            value={reporterEmail}
            onChange={(e) => setReporterEmail(e.target.value)}
            placeholder="ornek@mail.com"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e6e6e6',
            }}
          />
        </div>

        {error ? (
          <div style={{ color: '#fecaca', fontSize: 13 }}>
            Hata: {error}
          </div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(245,158,11,0.35)',
              background: 'rgba(245,158,11,0.14)',
              color: '#fde68a',
              fontWeight: 800,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Gönderiliyor...' : 'Bildir'}
          </button>
        </div>
      </form>
    </div>
  )
}