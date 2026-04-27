export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE'

export function normalizePlan(plan: string): Plan {
  const normalized = String(plan || 'FREE').toUpperCase()

  if (normalized === 'PRO') return 'PRO'
  if (normalized === 'ENTERPRISE') return 'ENTERPRISE'
  return 'FREE'
}

export function canSendEmail(plan: Plan) {
  return plan === 'PRO' || plan === 'ENTERPRISE'
}

export function getProductLimit(plan: Plan) {
  if (plan === 'FREE') return 3
  return Infinity
}