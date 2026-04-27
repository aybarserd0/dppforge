import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_env')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = req.headers.get('authorization') || ''
  return authHeader === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 güvenlik (cron dışı çağrıları engeller)
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const sb = supabaseAdmin()
    const now = new Date().toISOString()

    // 1. expired hesapları bul
    const { data: expiredAccounts, error: findErr } = await sb
      .from('accounts')
      .select('id, plan_type, plan_expires_at')
      .neq('plan_type', 'free')
      .lt('plan_expires_at', now)

    if (findErr) {
      return NextResponse.json(
        { ok: false, error: findErr.message },
        { status: 500 }
      )
    }

    if (!expiredAccounts || expiredAccounts.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'no_expired_accounts',
        processed: 0,
      })
    }

    const ids = expiredAccounts.map((a) => a.id)

    // 2. FREE’e düşür
    const { error: updateErr } = await sb
      .from('accounts')
      .update({
        plan_type: 'free',
        subscription_status: 'expired',
      })
      .in('id', ids)

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      processed: ids.length,
      downgraded_ids: ids,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unknown' },
      { status: 500 }
    )
  }
}