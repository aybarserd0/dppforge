// lib/risk.ts

export type RiskInput = {
  count5m: number
  count24h: number
  uniqueIps24h: number
  uniqueCountries24h: number
  rateLimited60s: boolean
}

export type RiskOutput = {
  score: number // 0..100
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  reasons: string[]
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

export function computeRisk(i: RiskInput): RiskOutput {
  const reasons: string[] = []
  let score = 0

  // 60sn rate-limit yakalandıysa (spam/bot) güçlü sinyal
  if (i.rateLimited60s) {
    score += 30
    reasons.push('60 saniyede aşırı tekrar (rate-limit)')
  }

  // Son 5dk okutma
  if (i.count5m >= 10) {
    score += 25
    reasons.push(`Son 5dk yüksek okutma (${i.count5m})`)
  } else if (i.count5m >= 6) {
    score += 15
    reasons.push(`Son 5dk artmış okutma (${i.count5m})`)
  } else if (i.count5m >= 3) {
    score += 8
    reasons.push(`Son 5dk hareket var (${i.count5m})`)
  }

  // Son 24s okutma
  if (i.count24h >= 35) {
    score += 25
    reasons.push(`24 saatte çok yüksek okutma (${i.count24h})`)
  } else if (i.count24h >= 25) {
    score += 18
    reasons.push(`24 saatte yüksek okutma (${i.count24h})`)
  } else if (i.count24h >= 15) {
    score += 10
    reasons.push(`24 saatte artmış okutma (${i.count24h})`)
  }

  // 24 saatte farklı IP
  if (i.uniqueIps24h >= 10) {
    score += 20
    reasons.push(`24 saatte çok farklı IP (${i.uniqueIps24h})`)
  } else if (i.uniqueIps24h >= 6) {
    score += 14
    reasons.push(`24 saatte farklı IP (${i.uniqueIps24h})`)
  } else if (i.uniqueIps24h >= 3) {
    score += 8
    reasons.push(`24 saatte birkaç farklı IP (${i.uniqueIps24h})`)
  }

  // 24 saatte farklı ülke
  if (i.uniqueCountries24h >= 3) {
    score += 25
    reasons.push(`Birden fazla ülke (${i.uniqueCountries24h})`)
  } else if (i.uniqueCountries24h >= 2) {
    score += 18
    reasons.push(`2 ülkeden okutma (${i.uniqueCountries24h})`)
  }

  score = clamp(score)

  const level: RiskOutput['level'] =
    score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'

  if (reasons.length === 0) reasons.push('Belirgin anomali yok')

  return { score, level, reasons }
}