import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

const ALLOWED_REASONS = new Set([
  'false_positive',
  'confirmed_counterfeit',
  'test_event',
  'other',
])

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export async function POST(req: Request) {
  // 1) session guard
  const supa = await createSupabaseServerClient()
  const { data: auth, error: authErr } = await supa.auth.getUser()

  if (authErr) {
    return NextResponse.json({ ok: false, error: authErr.message }, { status: 401 })
  }
  if (!auth?.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // 2) body
  const body = await req.json().catch(() => ({} as any))
  const eventId = String(body?.eventId ?? '').trim()
  const resolved_reason = String(body?.resolved_reason ?? '').trim()
  const resolved_note_raw = typeof body?.resolved_note === 'string' ? body.resolved_note : ''
  const resolved_note = resolved_note_raw.trim() ? resolved_note_raw.trim() : null

  if (!eventId) {
    return NextResponse.json({ ok: false, error: 'missing_eventId' }, { status: 400 })
  }
  if (!isUuid(eventId)) {
    return NextResponse.json({ ok: false, error: 'invalid_eventId' }, { status: 400 })
  }
  if (!ALLOWED_REASONS.has(resolved_reason)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_resolved_reason', allowed: Array.from(ALLOWED_REASONS) },
      { status: 400 }
    )
  }

  // 3) update
  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()

  const { data: updated, error } = await admin
    .from('dpp_events')
    .update({
      status: 'resolved', // ⚠️ DB’de open/closed ise: 'closed' yap
      resolved_at: now,
      resolved_by: auth.user.id,
      resolved_reason,
      resolved_note,
      updated_at: now,
    })
    .eq('id', eventId)
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  if (!updated?.id) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
