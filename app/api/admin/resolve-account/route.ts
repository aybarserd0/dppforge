import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/route'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = createSupabaseRouteClient(req)

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return applyCookies(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
  }

  // account_members tablosundan account_id çek
  const { data: membership, error: mErr } = await supabase
    .from('account_members')
    .select('account_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (mErr) {
    return applyCookies(
      NextResponse.json({ ok: false, error: 'db_error', detail: mErr.message }, { status: 500 })
    )
  }

  if (!membership?.account_id) {
    return applyCookies(
      NextResponse.json({ ok: false, error: 'no_account' }, { status: 403 })
    )
  }

  return applyCookies(
    NextResponse.json({
      ok: true,
      user_id: user.id,
      account_id: membership.account_id,
      role: membership.role ?? null,
    })
  )
}