'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ResolveResponse = {
  ok?: boolean
  error?: string
}

export default function ResolveAlarmButton({ alarmId }: { alarmId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onResolve() {
    try {
      setLoading(true)

      const res = await fetch('/api/admin/alarms/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alarmId }),
      })

      const json: ResolveResponse = await res.json().catch(() => ({}))

      if (!res.ok || !json.ok) {
        window.alert(json.error || 'Alarm çözülemedi.')
        return
      }

      router.refresh()
    } catch {
      window.alert('Alarm çözülemedi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={onResolve}
      disabled={loading}
      style={{
        padding: '8px 10px',
        borderRadius: 12,
        border: '1px solid rgba(34,197,94,0.35)',
        background: 'rgba(34,197,94,0.14)',
        color: '#bbf7d0',
        cursor: loading ? 'default' : 'pointer',
        fontWeight: 800,
        fontSize: 13,
        opacity: loading ? 0.7 : 1,
      }}
      title="Alarmı çözüldü olarak işaretle"
    >
      {loading ? 'Çözümleniyor...' : 'Çöz'}
    </button>
  )
}