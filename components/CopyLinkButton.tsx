'use client'

import { useState } from 'react'

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.05)',
        color: '#e6e6e6',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {copied ? '✔ Kopyalandı' : '🔗 Bağlantıyı Kopyala'}
    </button>
  )
}