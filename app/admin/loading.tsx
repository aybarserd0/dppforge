// app/admin/loading.tsx
export default function LoadingAdmin() {
  const box = (w: number | string, h: number, r = 12) => (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    />
  )

  const row = (key: number) => (
    <tr key={key} style={{ opacity: 0.9 }}>
      <td style={{ padding: '12px 8px' }}>{box('70%', 16, 10)}</td>
      <td style={{ padding: '12px 8px' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          {box('55%', 14, 10)}
          {box('35%', 12, 10)}
        </div>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          {box(44, 16, 999)}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {box(72, 18, 999)}
            {box(64, 18, 999)}
            {box(52, 18, 999)}
            {box(46, 18, 999)}
          </div>
        </div>
      </td>
      <td style={{ padding: '12px 8px' }}>{box(62, 18, 999)}</td>
      <td style={{ padding: '12px 8px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {box(74, 18, 999)}
          {box(86, 18, 999)}
        </div>
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {box(88, 32, 10)}
          {box(78, 32, 10)}
          {box(58, 32, 10)}
        </div>
      </td>
    </tr>
  )

  return (
    <div
      style={{
        padding: 40,
        background: '#0b0f17',
        minHeight: '100vh',
        color: '#e6e6e6',
        fontFamily: 'system-ui',
      }}
    >
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {box(220, 26, 12)}
          {box(200, 14, 12)}
        </div>
        {box(92, 38, 12)}
      </div>

      {/* Meta */}
      <div style={{ marginTop: 16, opacity: 0.75, fontSize: 12 }}>{box(240, 14, 12)}</div>

      {/* Filters skeleton */}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {box(320, 38, 12)}
        {box(170, 38, 12)}
        {box(210, 38, 12)}
        {box(150, 18, 999)}
        {box(90, 38, 12)}
        {box(60, 16, 12)}
      </div>

      {/* Table skeleton */}
      <table style={{ width: '100%', marginTop: 20, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', opacity: 0.7 }}>
            <th style={{ padding: '10px 8px' }}>Slug</th>
            <th style={{ padding: '10px 8px' }}>Ürün</th>
            <th style={{ padding: '10px 8px' }}>Toplam Okutma</th>
            <th style={{ padding: '10px 8px' }}>Yayın</th>
            <th style={{ padding: '10px 8px' }}>Durum</th>
            <th style={{ padding: '10px 8px', textAlign: 'right' }} />
          </tr>
        </thead>
        <tbody>{Array.from({ length: 8 }).map((_, i) => row(i))}</tbody>
      </table>

      <div style={{ marginTop: 14, opacity: 0.6, fontSize: 12 }}>Yükleniyor…</div>
    </div>
  )
}
