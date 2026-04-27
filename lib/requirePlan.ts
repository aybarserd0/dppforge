// lib/requirePlan.ts
import { NextResponse } from 'next/server'
import { getAccountPlanType, type PlanType } from './getAccountPlan'

const rank: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

export async function requirePlanOr402(opts: {
  supabase: any
  account_id: string | null | undefined
  required: PlanType
}) {
  const { supabase, account_id, required } = opts

  if (!account_id) {
    return NextResponse.json({ ok: false, error: 'no_account' }, { status: 401 })
  }

  const current = await getAccountPlanType(supabase, account_id)

  if (rank[current] < rank[required]) {
    return NextResponse.json(
      { ok: false, error: 'plan_required', required_plan: required },
      { status: 402 }
    )
  }

  return null
}