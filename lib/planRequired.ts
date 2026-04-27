// lib/planRequired.ts
import { NextResponse } from 'next/server'

export function planRequiredEnterprise() {
  return NextResponse.json(
    { ok: false, error: 'plan_required', required_plan: 'enterprise' },
    { status: 402 }
  )
}