// app/api/admin/review/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminContext } from '@/lib/auth/adminGuard'

export const dynamic = 'force-dynamic'

type ReviewState = 'open' | 'in_review' | 'approved' | 'rejected'

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
    const pageId = body?.pageId as string | undefined
    const review_state = body?.review_state as ReviewState | undefined
    const review_note = (body?.review_note as string | undefined) ?? null

    const allowed: ReviewState[] = ['open', 'in_review', 'approved', 'rejected']
    if (!pageId || !review_state || !allowed.includes(review_state)) {
      return applyCookies(
        NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
      )
    }

    const supabase = getSupabaseAdmin()

    // ✅ 3) Multi-tenant güvenlik: sadece kendi account’ındaki page’i güncelle
    const { error } = await supabase
      .from('public_pages')
      .update({
        review_state,
        review_note,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', pageId)
      .eq('account_id', account_id)

    if (error) {
      return applyCookies(
        NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      )
    }

    return applyCookies(NextResponse.json({ ok: true }))
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'server_error' },
      { status: 500 }
    )
  }
}