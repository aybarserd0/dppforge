import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/route'

export const dynamic = 'force-dynamic'

export async function requireAdminContext(req: NextRequest) {
  const { supabase, applyCookies } = createSupabaseRouteClient(req)

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    const res = NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    return { ok: false as const, res: applyCookies(res) }
  }

  const { data: membership, error: mErr } = await supabase
    .from('account_members')
    .select('account_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (mErr) {
    const res = NextResponse.json({ ok: false, error: 'db_error', detail: mErr.message }, { status: 500 })
    return { ok: false as const, res: applyCookies(res) }
  }

  if (!membership?.account_id) {
    const res = NextResponse.json({ ok: false, error: 'no_account' }, { status: 403 })
    return { ok: false as const, res: applyCookies(res) }
  }

  return {
    ok: true as const,
    supabase,
    applyCookies,
    user,
    account_id: membership.account_id,
    role: membership.role ?? null,
  }
}