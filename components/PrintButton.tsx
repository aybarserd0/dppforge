'use client'

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        padding: '0 18px',
        background: '#22d3ee',
        color: '#0b0f17',
        borderRadius: 12,
        cursor: 'pointer',
        border: 'none',
        fontSize: 14,
        fontWeight: 800,
        boxShadow: '0 6px 20px rgba(34,211,238,0.25)',
      }}
    >
      Print / Save as PDF
    </button>
  )
}