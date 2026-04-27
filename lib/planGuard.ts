// lib/planGuard.ts
import { NextResponse } from 'next/server'

export type PlanType = 'free' | 'pro' | 'enterprise'

const rank: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

export function planAllows(current: PlanType, required: PlanType) {
  return rank[current] >= rank[required]
}

export function planRequiredResponse(required: PlanType) {
  return NextResponse.json(
    { ok: false, error: 'plan_required', required_plan: required },
    { status: 402 }
  )
}