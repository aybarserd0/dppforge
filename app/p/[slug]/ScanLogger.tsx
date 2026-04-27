'use client'

import { useEffect, useState } from 'react'

type ScanResp =
  | {
      ok: true
      suspicious: boolean
      stats?: {
        count5m?: number
        count24h?: number
        countries24h?: string[]
        uniqueIps24h?: number
        reason?: string
        count1m?: number
      }
    }
  | {
      ok: false
      error?: string
      plan?: string
      limit?: number
      current?: number
      upgrade_required?: boolean
    }

export default function ScanLogger({ pageId }: { pageId: string }) {
  const [data, setData] = useState<ScanResp | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pageId }),
        })

        const json = (await res.json()) as ScanResp
        setData(json)
      } catch {
        // sessiz geç
      }
    }

    run()
  }, [pageId])

  if (!data) return null

  if (data.ok === false && data.error === 'scan_limit_reached') {
    return (
      <div
        style={{
          marginBottom: 12,
          padding: 14,
          borderRadius: 14,
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.35)',
          color: '#fecaca',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 6 }}>
          🚫 Aylık doğrulama limiti doldu
        </div>

        <div>
          Bu ürün için aylık QR okutma limiti doldu. Daha fazla doğrulama için
          marka hesabının plan yükseltmesi gerekiyor.
        </div>

        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
          Plan: <b>{data.plan?.toUpperCase() ?? 'FREE'}</b> • Kullanım:{' '}
          <b>{data.current ?? '-'}</b> / <b>{data.limit ?? '-'}</b>
        </div>
      </div>
    )
  }

  if (data.ok !== true) return null
  if (!data.suspicious) return null

  const s = data.stats ?? {}
  const count5m = s.count5m ?? 0
  const count24h = s.count24h ?? 0
  const uniqueIps = s.uniqueIps24h ?? 0
  const countries = s.countries24h ?? []
  const rateLimited = s.reason === 'rate_limited_60s'

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        border: '1px solid rgba(255, 180, 0, 0.35)',
        background: 'rgba(255, 180, 0, 0.08)',
        color: '#ffd166',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        ⚠️ Şüpheli okutma tespit edildi
      </div>

      <div style={{ opacity: 0.95 }}>
        Bu ürünün okutma geçmişi olağan dışı görünüyor. Sahte kopya ihtimali var.
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid rgba(255, 180, 0, 0.25)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          fontSize: 12,
          opacity: 0.95,
        }}
      >
        {rateLimited ? (
          <div style={{ gridColumn: '1 / -1' }}>
            • Çok hızlı tekrar tespit edildi (60 sn içinde aşırı istek)
          </div>
        ) : null}

        <div>
          • Son 5 dk okutma: <b>{count5m}</b>
        </div>
        <div>
          • Son 24 saat okutma: <b>{count24h}</b>
        </div>

        <div>
          • 24 saatte farklı IP: <b>{uniqueIps}</b>
        </div>
        <div>
          • 24 saatte ülke: <b>{countries.length || 1}</b>
        </div>

        {countries.length > 1 ? (
          <div style={{ gridColumn: '1 / -1' }}>
            • Ülkeler: <b>{countries.join(', ')}</b>
          </div>
        ) : null}
      </div>
    </div>
  )
}