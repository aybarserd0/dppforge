// app/api/admin/events/resolved/export/route.ts
import { isEnterprise, planRequiredEnterprise, type PlanType } from '@/lib/plan'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

type PlanType = 'free' | 'pro' | 'enterprise'
const planRank: Record<PlanType, number> = { free: 0, pro: 1, enterprise: 2 }

function normalizePlan(p: unknown): PlanType {
  if (p === 'enterprise' || p === 'pro' || p === 'free') return p
  return 'free'
}

// Admin API’lerinde service role kullanıyoruz (RLS’den bağımsız)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// Admin session + account bilgisi (owner/member) + plan_type
async function requireAdminSession() {
  const supa = await createSupabaseRouteClient()
  const { data: auth, error: authErr } = await supa.auth.getUser()

  if (authErr) return { ok: false as const, error: authErr.message }
  if (!auth?.user) return { ok: false as const, error: 'unauthorized' }

  const userId = auth.user.id

  // user -> account member map
  const { data: mem, error: memErr } = await supa
    .from('account_members')
    .select('account_id, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (memErr) return { ok: false as const, error: memErr.message }
  if (!mem?.account_id) return { ok: false as const, error: 'no_account' }

  const accountId = mem.account_id as string
  const role = (mem.role ?? 'member') as string

  // plan_type (accounts.plan_type)
  const { data: acc, error: accErr } = await supa
    .from('accounts')
    .select('plan_type')
    .eq('id', accountId)
    .maybeSingle()

  if (accErr) return { ok: false as const, error: accErr.message }

  const plan_type = normalizePlan(acc?.plan_type ?? 'free')

  return { ok: true as const, userId, accountId, role, plan_type }
}

function escCsv(v: unknown) {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

// Excel + müşteri memnuniyeti: TR saat diliminde okunur tarih
function fmtCsvDate(dt?: string | null) {
  if (!dt) return ''
  try {
    return new Date(dt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
  } catch {
    return dt
  }
}

function isValidYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // 1) auth
  const auth = await requireAdminSession()
  if (!auth.ok) {
    // no_account da 401 yerine 403 tercih edebilirsin ama şimdilik bozmadım
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 })
  }

  // ✅ 1.5) ENTERPRISE KİLİDİ (premium endpoint)
  if (!isEnterprise(auth.plan_type as PlanType)) return planRequiredEnterprise()

  // 2) params
  const { searchParams } = new URL(req.url)

  const limit = Math.min(Number(searchParams.get('limit') ?? '500'), 5000)

  const from = (searchParams.get('from') ?? '').trim() // YYYY-MM-DD
  const to = (searchParams.get('to') ?? '').trim() // YYYY-MM-DD
  const reason = (searchParams.get('reason') ?? '').trim()
  const q = (searchParams.get('q') ?? '').trim()

  // input validation
  if (from && !isValidYmd(from)) {
    return NextResponse.json({ ok: false, error: 'invalid_from' }, { status: 400 })
  }
  if (to && !isValidYmd(to)) {
    return NextResponse.json({ ok: false, error: 'invalid_to' }, { status: 400 })
  }

  // 3) account'a ait page_id listesini çek (RLS ile güvenli)
  const supa = await createSupabaseRouteClient()

  const { data: pages, error: pagesErr } = await supa
    .from('public_pages')
    .select('id')
    .eq('account_id', auth.accountId)
    .limit(5000)

  if (pagesErr) {
    return NextResponse.json({ ok: false, error: pagesErr.message }, { status: 500 })
  }

  const pageIds = (pages ?? []).map((p: any) => p.id).filter(Boolean)

  // hiç sayfa yoksa boş csv indir
  if (pageIds.length === 0) {
    const header = [
      'id',
      'page_slug',
      'type',
      'occurrences',
      'reasons',
      'first_seen_at',
      'last_seen_at',
      'resolved_at',
      'resolved_reason',
      'resolved_note',
    ]
    const csv = '\uFEFF' + header.join(',') + '\n'
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="dpp-events-resolved-empty.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // 4) query (service role ile, ama scope'u page_id listesi ile kısıtlıyoruz)
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('dpp_events_resolved')
    .select(
      'id,page_id,page_slug,type,occurrences,reasons,first_seen_at,last_seen_at,resolved_at,resolved_reason,resolved_note'
    )
    .in('page_id', pageIds)

  // date filtreleri (timestamptz)
  if (from) query = query.gte('resolved_at', `${from}T00:00:00.000Z`)
  if (to) query = query.lte('resolved_at', `${to}T23:59:59.999Z`)
  if (reason) query = query.eq('resolved_reason', reason)
  if (q) query = query.ilike('page_slug', `%${q}%`)

  const { data, error } = await query.limit(limit)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows = data ?? []

  // 5) CSV build
  const header = [
    'id',
    'page_slug',
    'type',
    'occurrences',
    'reasons',
    'first_seen_at',
    'last_seen_at',
    'resolved_at',
    'resolved_reason',
    'resolved_note',
  ]

  const lines: string[] = []
  lines.push(header.join(','))

  for (const r of rows as any[]) {
    lines.push(
      [
        escCsv(r.id),
        escCsv(r.page_slug),
        escCsv(r.type),
        escCsv(r.occurrences ?? 0),
        escCsv(Array.isArray(r.reasons) ? r.reasons.join('|') : ''),
        escCsv(fmtCsvDate(r.first_seen_at ?? '')),
        escCsv(fmtCsvDate(r.last_seen_at ?? '')),
        escCsv(fmtCsvDate(r.resolved_at ?? '')),
        escCsv(r.resolved_reason ?? ''),
        escCsv(r.resolved_note ?? ''),
      ].join(',')
    )
  }

  // Excel uyumu: BOM
  const bom = '\uFEFF'
  const csv = bom + lines.join('\n')

  const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const filename = `dpp-events-resolved-${now}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}