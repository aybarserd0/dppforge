import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminContext } from '@/lib/auth/adminGuard'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  try {
    // ✅ 1) Auth + account resolve
    const ctx = await requireAdminContext(req)
    if (!ctx.ok) return ctx.res

    const { account_id, user, applyCookies } = ctx

    // ✅ 2) Body parse
    const body = await req.json().catch(() => null)
    const eventId = body?.eventId as string | undefined
    const resolved_reason = body?.resolved_reason ?? null
    const resolved_note = body?.resolved_note ?? null

    if (!eventId) {
      return applyCookies(
        NextResponse.json({ ok: false, error: 'missing_eventId' }, { status: 400 })
      )
    }

    const admin = getSupabaseAdmin()

    // ✅ 3) Multi-tenant güvenlik
    // Event sadece kendi account'ına aitse update edilir
    const { error } = await admin
      .from('dpp_events')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolved_reason,
        resolved_note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('account_id', account_id)

    if (error) {
      return applyCookies(
        NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      )
    }

    return applyCookies(
      NextResponse.json({ ok: true })
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'server_error' },
      { status: 500 }
    )
  }
}