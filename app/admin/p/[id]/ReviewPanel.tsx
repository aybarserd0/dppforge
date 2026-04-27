'use client'

import { useMemo, useState } from 'react'

type ReviewState = 'open' | 'in_review' | 'resolved_ok' | 'confirmed_fake'

type ReviewResponse = {
  ok?: boolean
  error?: string
}

const LABEL: Record<ReviewState, string> = {
  open: 'Açık',
  in_review: 'İncelemede',
  resolved_ok: 'Temiz',
  confirmed_fake: 'Sahte (Doğrulandı)',
}

export default function ReviewPanel({
  pageId,
  initialState,
  initialNote,
  initialReviewedAt,
  initialReviewedBy,
}: {
  pageId: string
  initialState: ReviewState
  initialNote: string | null
  initialReviewedAt: string | null
  initialReviewedBy: string | null
}) {
  const [state, setState] = useState<ReviewState>(initialState)
  const [note, setNote] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const meta = useMemo(() => {
    const parts: string[] = []

    if (initialReviewedAt) {
      parts.push(
        `Son güncelleme: ${new Date(initialReviewedAt).toLocaleString('tr-TR')}`
      )
    }

    if (initialReviewedBy) {
      parts.push(`Güncelleyen: ${initialReviewedBy}`)
    }

    return parts.join(' • ')
  }, [initialReviewedAt, initialReviewedBy])

  async function save() {
    setSaving(true)
    setMsg(null)

    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          review_state: state,
          review_note: note.trim() || null,
        }),
      })

      const json: ReviewResponse = await res.json().catch(() => ({}))

      if (!res.ok || !json.ok) {
        setMsg(json.error || `Hata oluştu (${res.status})`)
        return
      }

      setMsg('Kaydedildi ✅')
    } catch {
      setMsg('Beklenmeyen bir hata oluştu')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 2500)
    }
  }

  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: 16,
        background: 'rgba(255,255,255,0.04)',
        marginTop: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            İnceleme durumu
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {LABEL[state]}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={state}
            onChange={(e) => setState(e.target.value as ReviewState)}
            style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 12,
              outline: 'none',
            }}
          >
            <option value="open">{LABEL.open}</option>
            <option value="in_review">{LABEL.in_review}</option>
            <option value="resolved_ok">{LABEL.resolved_ok}</option>
            <option value="confirmed_fake">{LABEL.confirmed_fake}</option>
          </select>

          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.14)',
              background: saving
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(255,255,255,0.08)',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
          Not
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Örn: Şüpheli okutmalar inceleniyor..."
          rows={3}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'white',
            padding: 12,
            borderRadius: 12,
            outline: 'none',
            resize: 'vertical',
          }}
        />
      </div>

      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          {meta || '—'}
        </div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>{msg}</div>
      </div>
    </div>
  )
}