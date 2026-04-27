'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type ReviewState =
  | 'all'
  | 'open'
  | 'in_review'
  | 'resolved_ok'
  | 'confirmed_fake'

export default function ReviewSelect({ value }: { value: ReviewState }) {
  const router = useRouter()
  const sp = useSearchParams()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ReviewState
    const params = new URLSearchParams(sp.toString())

    if (next === 'all') params.delete('review')
    else params.set('review', next)

    // önemli: sayfa 1 vb. param varsa reset etmek istersen buraya ekleriz (şimdilik yok)
    router.push(`/admin?${params.toString()}`)
  }

  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.06)',
        color: '#e6e6e6',
      }}
    >
      <option value="all">İnceleme: Hepsi</option>
      <option value="open">İnceleme: Açık</option>
      <option value="in_review">İnceleme: İncelemede</option>
      <option value="resolved_ok">İnceleme: Temiz</option>
      <option value="confirmed_fake">İnceleme: Sahte</option>
    </select>
  )
}
