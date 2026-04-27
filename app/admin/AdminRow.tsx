'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

type ReviewState = 'open' | 'in_review' | 'approved' | 'rejected'

type Counterfeit = {
  id: string
  page_id: string
  alarm_type: string | null
  risk_score: number | null
  risk_level: string | null
  reasons: string[] | null
  created_at: string | null
  resolved: boolean | null
}

type AdminRowProps = {
  page: {
    id: string
    slug: string
    published_at: string | null
  }
  product?: {
    name_tr: string | null
    sku: string | null
  } | null
  scansCount: number
  isSuspicious: boolean
  reviewState: ReviewState
  scans24h?: number
  uniqueIps24h?: number
  uniqueCountries24h?: number
  lastScanAt?: string | null
  counterfeit?: Counterfeit | null
}

type TrustStatus = 'counterfeit' | 'suspicious' | 'clean'

function since(iso?: string | null) {
  if (!iso) return '—'

  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'

  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)

  if (min < 1) return 'şimdi'
  if (min < 60) return `${min} dk`

  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} sa`

  return `${Math.floor(hr / 24)} gün`
}

function pill(className: string) {
  return `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${className}`
}

function translateReason(reason: string) {
  if (reason === 'multi-country burst') return 'Farklı ülkelerden yoğun okutma'
  if (reason === 'high scan velocity') return 'Yoğun okutma'
  if (reason === 'unique ip spike') return 'IP artışı'
  if (reason === 'multi-country scans in short time') {
    return 'Kısa sürede farklı ülkelerden okutma'
  }

  return reason
}

function translateRiskLevel(riskLevel?: string | null) {
  const value = String(riskLevel ?? '').trim().toLowerCase()

  if (value === 'critical') return 'Kritik'
  if (value === 'high') return 'Yüksek'
  if (value === 'medium') return 'Orta'
  if (value === 'low') return 'Düşük'

  return riskLevel ?? '—'
}

function reviewBadgeNode(reviewState: ReviewState) {
  if (reviewState === 'in_review') {
    return (
      <span className={pill('border-yellow-400/30 bg-yellow-500/10 text-yellow-200')}>
        İncelemede
      </span>
    )
  }

  if (reviewState === 'approved') {
    return (
      <span className={pill('border-emerald-400/30 bg-emerald-500/10 text-emerald-200')}>
        Onaylı
      </span>
    )
  }

  if (reviewState === 'rejected') {
    return (
      <span className={pill('border-red-400/30 bg-red-500/10 text-red-200')}>
        Reddedildi
      </span>
    )
  }

  return (
    <span className={pill('border-white/15 bg-white/5 text-white/70')}>
      Açık
    </span>
  )
}

function getStatus(
  counterfeit: Counterfeit | null | undefined,
  isSuspicious: boolean
): TrustStatus {
  if (counterfeit) return 'counterfeit'
  if (isSuspicious) return 'suspicious'
  return 'clean'
}

function tooltipText(
  status: TrustStatus,
  counterfeit: Counterfeit | null | undefined
) {
  if (status !== 'counterfeit' || !counterfeit) {
    return 'Detayları görüntülemek için tıkla'
  }

  const reasons =
    (counterfeit.reasons ?? []).length > 0
      ? (counterfeit.reasons ?? []).map(translateReason).join('\n')
      : '—'

  return `🚨 Sahtecilik alarmı
Risk skoru: ${counterfeit.risk_score ?? '-'}
Seviye: ${translateRiskLevel(counterfeit.risk_level)}

Nedenler:
${reasons}

Tespit zamanı: ${since(counterfeit.created_at)}`
}

export default function AdminRow({
  page,
  product,
  scansCount,
  isSuspicious,
  reviewState,
  scans24h,
  uniqueIps24h,
  uniqueCountries24h,
  lastScanAt,
  counterfeit,
}: AdminRowProps) {
  const router = useRouter()
  const href = `/admin/p/${page.id}`

  const status = getStatus(counterfeit, isSuspicious)

  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)

  const onGo = () => router.push(href)

  async function quickSetReview(next: ReviewState) {
    setErrMsg(null)
    setSaving(true)

    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          review_state: next,
          review_note: '',
        }),
      })

      const json: { ok?: boolean; error?: string } = await res
        .json()
        .catch(() => ({}))

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }

      router.refresh()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'İşlem kaydedilemedi'
      setErrMsg(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()

    if (deleting) return

    const confirmed = window.confirm(
      'Bu ürünü kalıcı olarak silmek istiyor musun? Bu işlem geri alınamaz.'
    )

    if (!confirmed) return

    setErrMsg(null)
    setDeleting(true)

    try {
      const res = await fetch(`/api/admin/delete-product/${page.id}`, {
        method: 'DELETE',
      })

      const data: { error?: string } = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      window.alert('Ürün başarıyla silindi.')
      router.refresh()
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Ürün silinemedi'
      setErrMsg(message)
    } finally {
      setDeleting(false)
    }
  }

  const reviewBadge = reviewBadgeNode(reviewState)

  return (
    <tr
      onClick={onGo}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onGo()
        }
      }}
      tabIndex={0}
      role="link"
      title={tooltipText(status, counterfeit)}
      className={[
        'cursor-pointer select-none',
        'hover:bg-white/5 focus:bg-white/5',
        'outline-none focus:ring-2 focus:ring-white/20',
        status === 'counterfeit' ? 'bg-red-500/5' : '',
      ].join(' ')}
    >
      <td className="px-3 py-3 font-mono text-sm">
        <a
          href={`/p/${page.slug}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="text-blue-300 hover:underline"
          title="Genel ürün sayfasını yeni sekmede aç"
        >
          /p/{page.slug}
        </a>
      </td>

      <td className="px-3 py-3">
        <div className="text-white">
          {product?.name_tr ?? <span className="text-white/40">—</span>}
        </div>
        <div className="text-xs text-white/50">{product?.sku ?? ''}</div>
      </td>

      <td className="px-3 py-3 text-sm text-white/80">
        <div className="text-base font-semibold text-white/95">{scansCount}</div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span
            className={pill('border-white/15 bg-white/5 text-white/70')}
            title="Son okutma zamanı"
          >
            ⏱ {since(lastScanAt)}
          </span>

          <span
            className={pill('border-white/15 bg-white/5 text-white/70')}
            title="Son 24 saat içindeki okutma sayısı"
          >
            24 sa: {scans24h ?? 0}
          </span>

          <span
            className={pill('border-white/15 bg-white/5 text-white/70')}
            title="Son 24 saat içindeki farklı IP sayısı"
          >
            IP: {uniqueIps24h ?? 0}
          </span>

          <span
            className={pill('border-white/15 bg-white/5 text-white/70')}
            title="Son 24 saat içindeki farklı ülke sayısı"
          >
            🌍 {uniqueCountries24h ?? 0}
          </span>
        </div>
      </td>

      <td className="px-3 py-3">
        {page.published_at ? (
          <span className={pill('border-emerald-400/30 bg-emerald-500/10 text-emerald-200')}>
            Yayında
          </span>
        ) : (
          <span className={pill('border-white/15 bg-white/5 text-white/70')}>
            Taslak
          </span>
        )}
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {status === 'counterfeit' && (
              <span className={pill('border-red-400/30 bg-red-500/10 text-red-200')}>
                🚨 Sahtecilik alarmı
              </span>
            )}

            {status === 'counterfeit' && counterfeit?.risk_level ? (
              <span className={pill('border-red-400/30 bg-red-500/10 text-red-200')}>
                {translateRiskLevel(counterfeit.risk_level)}
              </span>
            ) : null}

            {status === 'counterfeit' &&
            typeof counterfeit?.risk_score === 'number' ? (
              <span className={pill('border-white/15 bg-white/5 text-white/80')}>
                Risk skoru: {counterfeit.risk_score}
              </span>
            ) : null}

            {status === 'suspicious' && (
              <span className={pill('border-yellow-400/30 bg-yellow-500/10 text-yellow-200')}>
                ⚠ Şüpheli
              </span>
            )}

            {status === 'clean' && (
              <span className={pill('border-emerald-400/30 bg-emerald-500/10 text-emerald-200')}>
                ✅ Temiz
              </span>
            )}

            {reviewBadge}

            {errMsg ? (
              <span className="text-xs text-red-300/90">{errMsg}</span>
            ) : null}
          </div>

          {status === 'counterfeit' && counterfeit?.reasons?.length ? (
            <div className="flex flex-wrap gap-1">
              {counterfeit.reasons.slice(0, 3).map((reason) => (
                <span
                  key={reason}
                  className={pill('border-white/15 bg-white/5 text-white/70')}
                  title={translateReason(reason)}
                >
                  {translateReason(reason)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </td>

      <td className="px-3 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(href)
            }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/90 hover:bg-white/15"
            title="Detay sayfasını aç"
          >
            Detaylar
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              quickSetReview('approved')
            }}
            disabled={saving || deleting}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-semibold',
              'border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15',
              saving || deleting ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
            title="Kaydı hızlıca onayla"
          >
            ✅ {saving ? 'Kaydediliyor…' : 'Onayla'}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              quickSetReview('rejected')
            }}
            disabled={saving || deleting}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-semibold',
              'border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15',
              saving || deleting ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
            title="Kaydı hızlıca reddet"
          >
            ⛔ {saving ? 'Kaydediliyor…' : 'Reddet'}
          </button>

          <button
            onClick={deleteProduct}
            disabled={saving || deleting}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-semibold',
              'border border-red-600/30 bg-red-600/20 text-red-200 hover:bg-red-600/30',
              saving || deleting ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
            title="Ürünü kalıcı olarak sil"
          >
            🗑 {deleting ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      </td>
    </tr>
  )
}