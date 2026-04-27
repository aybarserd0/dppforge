import { NextResponse } from 'next/server'
import import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supa = await createSupabaseServerClient()

  // 1) Session kontrol
  const { data: auth, error: authErr } = await supa.auth.getUser()

  if (authErr || !auth?.user) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized', detail: 'Auth session missing!' },
      { status: 401 }
    )
  }

  const userId = auth.user.id

  // 2) account_members'tan account bul
  const { data: member, error: memberErr } = await supa
    .from('account_members')
    .select('account_id, role')
    .eq('user_id', userId)
    .single()

  if (memberErr || !member) {
    return NextResponse.json(
      { ok: false, error: 'account_not_found' },
      { status: 404 }
    )
  }

  // 3) accounts'tan plan çek
  const { data: account, error: accountErr } = await supa
    .from('accounts')
    .select('plan_type')
    .eq('id', member.account_id)
    .single()

  if (accountErr || !account) {
    return NextResponse.json(
      { ok: false, error: 'account_not_found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    ok: true,
    user_id: userId,
    account_id: member.account_id,
    role: member.role,
    plan_type: account.plan_type,
  })
}