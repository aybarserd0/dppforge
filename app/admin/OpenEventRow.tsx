'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  eventId: string
  pageId: string
  severity: 'low' | 'medium' | 'high'
}

type Reason = 'false_positive' | 'confirmed_counterfeit' | 'test_event' | 'other'

const REASONS: Array<{ value: Reason; label: string; hint: string }> = [
  { value: 'false_positive', label: 'False positive', hint: 'Normal bir kullanım / yanlış alarm' },
  { value: 'confirmed_counterfeit', label: 'Sahte / risk doğrulandı', hint: 'Gerçek sahte/şüpheli vaka' },
  { value: 'test_event', label: 'Test', hint: 'Test amaçlı üretildi' },
  { value: 'other', label: 'Diğer', hint: 'Kısa not ekleyin' },
]

function btnStyle(kind: 'primary' | 'ghost' | 'danger') {
  const base: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e6e6e6',
    cursor: 'pointer',
    fontWeight: 900,
    fontSize: 13,
    lineHeight: '16px',
  }

  if (kind === 'ghost') return { ...base, background: 'rgba(255,255,255,0.06)' }
  if (kind === 'danger')
    return {
      ...base,
      border: '1px solid rgba(239,68,68,0.35)',
      background: 'rgba(239,68,68,0.14)',
      color: '#fecaca',
    }
  return base
}

function severityPill(severity: 'low' | 'medium' | 'high') {
  const style: React.CSSProperties =
    severity === 'high'
      ? { background: 'rgba(239,68,68,0.18)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.35)' }
      : severity === 'medium'
      ? { background: 'rgba(245,158,11,0.18)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.35)' }
      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)' }

  return (
    <span
      title="Alarm şiddeti"
      style={{
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 999,
        fontWeight: 1000,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {severity}
    </span>
  )
}

export default function OpenEventRow({ eventId, pageId, severity }: Props) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<Reason>('false_positive')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const selectedHint = useMemo(() => REASONS.find((r) => r.value === reason)?.hint ?? '', [reason])

  async function onResolve() {
    try {
      setErr(null)
      setLoading(true)

      const res = await fetch('/api/admin/event/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventId,
          resolved_reason: reason,
          resolved_note: note.trim() ? note.trim() : null,
        }),
      })

      const txt = await res.text()
      let json: any = null
      try {
        json = JSON.parse(txt)
      } catch {
        // ignore
      }

      if (!res.ok || !json?.ok) {
        const msg = json?.error ?? `HTTP ${res.status}`
        throw new Error(typeof msg === 'string' ? msg : 'resolve_failed')
      }

      setOpen(false)
      setNote('')
      router.refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'resolve_failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ✅ Mini severity badge (butonların yanında) */}
      

      <button
        style={btnStyle('ghost')}
        onClick={() => router.push(`/admin/p/${pageId}`)}
        title="İlgili sayfayı incele"
      >
        İncele
      </button>

      <button style={btnStyle('danger')} onClick={() => setOpen(true)} title="Alarmı kapat (neden + not)">
        Kapat
      </button>

      {/* ✅ Modal */}
      {open ? (
        <div
          onClick={() => !loading && setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 96vw)',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#0b0f17',
              color: '#e6e6e6',
              padding: 16,
              boxShadow: '0 20px 80px rgba(0,0,0,0.55)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 1000, fontSize: 16 }}>Alarmı kapat</div>
                  {severityPill(severity)}
                </div>

                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                  Neden kapattığını seç — bu, false positive yönetimini “enterprise” yapar.
                </div>
              </div>

              <button style={btnStyle('ghost')} onClick={() => !loading && setOpen(false)} disabled={loading}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>Neden</div>

              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as Reason)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#e6e6e6',
                }}
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>{selectedHint}</div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>Not (opsiyonel)</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading}
                placeholder="Örn: müşterinin QR’ı fuarda yanlışlıkla çok okutuldu."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#e6e6e6',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {err ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 12,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: 'rgba(239,68,68,0.14)',
                  color: '#fecaca',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Hata: {err}
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button style={btnStyle('ghost')} onClick={() => !loading && setOpen(false)} disabled={loading}>
                İptal
              </button>
              <button style={btnStyle('primary')} onClick={onResolve} disabled={loading}>
                {loading ? 'Kaydediliyor…' : 'Kaydet ve Kapat'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}