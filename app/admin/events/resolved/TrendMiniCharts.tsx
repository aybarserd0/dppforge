'use client'

type Row = { day_tr: string; resolved_count: number; false_positive_rate: number }

function fillDays(rows: Row[], days: number) {
  const map = new Map(rows.map((r) => [r.day_tr, r]))

  const out: Array<{ day: string; resolved_count: number; false_positive_rate: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const day = d.toISOString().slice(0, 10) // label
    const r = map.get(day)
    out.push({
      day,
      resolved_count: r?.resolved_count ?? 0,
      false_positive_rate: r?.false_positive_rate ?? 0,
    })
  }
  return out
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 46 }}>
      {values.map((v, i) => (
        <div
          key={i}
          title={`${v}`}
          style={{
            width: 8,
            borderRadius: 6,
            background: 'rgba(255,255,255,0.85)',
            height: `${Math.round((v / max) * 100)}%`,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const w = 220
  const h = 46
  const max = Math.max(1, ...values)
  const min = Math.min(...values, 0)

  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * w
    const y = h - ((v - min) / Math.max(1, max - min)) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts.join(' ')} opacity={0.9} />
    </svg>
  )
}

const card: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 14,
  background: 'rgba(255,255,255,0.04)',
}

const label: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  fontWeight: 800,
}

const hint: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  marginTop: 6,
}

export default function TrendMiniCharts({ rows, days }: { rows: Row[]; days: number }) {
  const filled = fillDays(rows, days)
  const counts = filled.map((x) => x.resolved_count)
  const fpRates = filled.map((x) => x.false_positive_rate)

  const total = counts.reduce((a, b) => a + b, 0)

// ✅ Kalite odaklı ortalama: sadece event olan günler
const fpDays = filled.filter((x) => x.resolved_count > 0)
const avgFp =
  fpDays.length > 0
    ? Math.round((fpDays.reduce((sum, x) => sum + x.false_positive_rate, 0) / fpDays.length) * 10) / 10
    : 0

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
      }}
    >
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <div style={label}>Günlük Kapatılan Alarm</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Ortalama (event günleri): %{avgFp}</div>
        </div>

        <div style={{ marginTop: 10 }}>
          <MiniBars values={counts} />
        </div>

        <div style={hint}>Son {days} gün</div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <div style={label}>False Positive Oranı</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Ortalama: %{avgFp}</div>
        </div>

        <div style={{ marginTop: 10 }}>
          <Sparkline values={fpRates} />
        </div>

        <div style={hint}>Son {days} gün</div>
      </div>
    </div>
  )
}