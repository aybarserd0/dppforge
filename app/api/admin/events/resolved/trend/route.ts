// app/api/admin/events/resolved/trend/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEnterprise, planRequiredEnterprise, type PlanType } from '@/lib/plan'

export const dynamic = 'force-dynamic'

function normalizePlan(p: unknown): PlanType {
  if (p === 'enterprise' || p === 'pro' || p === 'free') return p
  return 'free'
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// Admin session + account + plan_type
async function requireAdminSession() {
  const supa = await createSupabaseServerClient()
  const { data: auth, error: authErr } = await supa.auth.getUser()

  if (authErr) return { ok: false as const, error: authErr.message }
  if (!auth?.user) return { ok: false as const, error: 'unauthorized' }

  const userId = auth.user.id

  const { data: mem, error: memErr } = await supa
    .from('account_members')
    .select('account_id, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (memErr) return { ok: false as const, error: memErr.message }
  if (!mem?.account_id) return { ok: false as const, error: 'no_account' }

  const accountId = mem.account_id as string

  const { data: acc, error: accErr } = await supa
    .from('accounts')
    .select('plan_type')
    .eq('id', accountId)
    .maybeSingle()

  if (accErr) return { ok: false as const, error: accErr.message }

  const plan_type = normalizePlan(acc?.plan_type ?? 'free')

  return { ok: true as const, accountId, plan_type }
}

function clampDays(v: string | null) {
  const n = Number(v ?? 30)
  if (Number.isNaN(n)) return 30
  if (n <= 14) return 14
  if (n >= 30) return 30
  return 30
}

export async function GET(req: Request) {
  // 1) auth
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 })
  }

  // 2) ENTERPRISE KİLİDİ (tek satır)
  if (!isEnterprise(auth.plan_type)) return planRequiredEnterprise()

  // 3) params
  const { searchParams } = new URL(req.url)
  const days = clampDays(searchParams.get('days'))

  // 4) query
  const supabase = getServiceSupabase()

  const since = new Date(Date.now() - (days + 2) * 24 * 60 * 60 * 1000)
  const sinceISO = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('dpp_events_resolved_daily')
    .select('day_tr,resolved_count,false_positive_rate')
    .gte('day_tr', sinceISO)
    .order('day_tr', { ascending: true })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, days, rows: data ?? [] })
}