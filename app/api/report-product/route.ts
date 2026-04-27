import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const pageId = body?.pageId as unknown
    const reason = String(body?.reason ?? '').trim()
    const detail = String(body?.detail ?? '').trim()
    const reporterEmail = String(body?.reporterEmail ?? '').trim()

    if (!isUuid(pageId)) {
      return NextResponse.json({ ok: false, error: 'invalid_pageId' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ ok: false, error: 'reason_required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase.from('dpp_reports').insert({
      page_id: pageId,
      reason,
      detail: detail || null,
      reporter_email: reporterEmail || null,
      status: 'open',
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'server_error', detail: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}