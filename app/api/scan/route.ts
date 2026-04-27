import { computeRisk } from '@/lib/risk'
import { sendAlertMail } from '@/lib/mail'
import { canSendEmail } from '@/src/lib/server/plan'
import { canUseMonthlyScan, getPlanLimits } from '@/lib/plan'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

async function resolveAlertRecipientEmail(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  pageId: string
) {
  const fallback = process.env.ALERT_EMAIL_TO?.trim() || null

  const { data: pageRow, error: pageErr } = await supabase
    .from('public_pages')
    .select('product_id')
    .eq('id', pageId)
    .maybeSingle()

  if (pageErr || !pageRow?.product_id) {
    console.error('[resolveAlertRecipientEmail] public_pages error:', pageErr)
    return fallback
  }

  const { data: productRow, error: productErr } = await supabase
    .from('products')
    .select('account_id')
    .eq('id', pageRow.product_id)
    .maybeSingle()

  if (productErr || !productRow?.account_id) {
    console.error('[resolveAlertRecipientEmail] products error:', productErr)
    return fallback
  }

  const { data: accountRow, error: accountErr } = await supabase
    .from('accounts')
    .select('email')
    .eq('id', productRow.account_id)
    .maybeSingle()

  if (accountErr) {
    console.error('[resolveAlertRecipientEmail] accounts error:', accountErr)
    return fallback
  }

  return accountRow?.email?.trim() || fallback
}

async function getAccountPlan(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  pageId: string
): Promise<'free' | 'pro' | 'enterprise'> {
  const { data: pageRow } = await supabase
    .from('public_pages')
    .select('product_id')
    .eq('id', pageId)
    .maybeSingle()

  if (!pageRow?.product_id) return 'free'

  const { data: productRow } = await supabase
    .from('products')
    .select('account_id')
    .eq('id', pageRow.product_id)
    .maybeSingle()

  if (!productRow?.account_id) return 'free'

  const { data: accountRow } = await supabase
    .from('accounts')
    .select('plan_type')
    .eq('id', productRow.account_id)
    .maybeSingle()

  return (accountRow?.plan_type as 'free' | 'pro' | 'enterprise') || 'free'
}

function hashIp(ip?: string | null) {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24)
}

function getClientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const rip = req.headers.get('x-real-ip')
  if (rip) return rip.trim()
  return null
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  )
}

async function getPageProductInfo(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  pageId: string
) {
  const { data: pageRow } = await supabase
    .from('public_pages')
    .select('slug, product_id')
    .eq('id', pageId)
    .maybeSingle()

  let productName = ''
  let sku = ''

  if (pageRow?.product_id) {
    const { data: prodRow } = await supabase
      .from('products')
      .select('name_tr, sku')
      .eq('id', pageRow.product_id)
      .maybeSingle()

    productName = String(prodRow?.name_tr ?? '')
    sku = String(prodRow?.sku ?? '')
  }

  return {
    slug: String(pageRow?.slug ?? ''),
    productName,
    sku,
  }
}

async function maybeCreateAlarmAndSendMail(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  pageId: string
  risk: { score: number; level: string; reasons: string[] }
  count5m: number
  count24h: number
  ips24hSize: number
  countries24h: Set<string>
}) {
  const { supabase, pageId, risk, count5m, count24h, ips24hSize, countries24h } = params

  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: recentMail } = await supabase
    .from('dpp_alert_mail_log')
    .select('id')
    .eq('page_id', pageId)
    .eq('kind', 'suspicious_scan')
    .gte('sent_at', since1h)
    .limit(1)

  const alreadySent = (recentMail?.length ?? 0) > 0
  if (alreadySent) return

  const { slug, productName, sku } = await getPageProductInfo(supabase, pageId)

  const to = await resolveAlertRecipientEmail(supabase, pageId)
  if (!to) {
    console.warn('[maybeCreateAlarmAndSendMail] no recipient email found')
    return
  }

  const plan = await getAccountPlan(supabase, pageId)
  if (!canSendEmail(plan.toUpperCase() as 'FREE' | 'PRO' | 'ENTERPRISE')) {
    console.log('[plan] suspicious email blocked (free plan)')
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const publicUrl = slug ? `${baseUrl}/p/${slug}` : `${baseUrl}/p/<unknown>`

  const trTime = new Date().toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
  })

  const subject = `⚠️ DPPForge Alarm: ${risk.level} (${risk.score}%) • ${
    productName || sku || slug || pageId
  }`

  const message = [
    `⚠️ DPPForge Sahte Ürün Alarmı`,
    ``,
    `Alarm zamanı (TR): ${trTime}`,
    ``,
    `Risk: ${risk.level} (${risk.score}%)`,
    `Nedenler:`,
    ...risk.reasons.map((r) => `- ${r}`),
    ``,
    `Ürün: ${productName || '-'}`,
    `SKU: ${sku || '-'}`,
    `Slug: ${slug || '-'}`,
    `Public URL: ${publicUrl}`,
    ``,
    `Metrikler:`,
    `- Son 5 dk okutma: ${count5m}`,
    `- Son 24 saat okutma: ${count24h}`,
    `- 24 saatte farklı IP: ${ips24hSize}`,
    `- 24 saatte ülke: ${countries24h.size} (${Array.from(countries24h).join(', ') || '-'})`,
    ``,
    `Plan: ${plan.toUpperCase()}`,
    `Not: Bu mail aynı ürün için 60 dakika içinde 1 kez gönderilir (cooldown).`,
  ].join('\n')

  try {
    await supabase.from('dpp_alarms').insert({
      page_id: pageId,
      risk_score: risk.score,
      risk_level: risk.level,
      reasons: risk.reasons,
      resolved: false,
      alarm_type: 'threshold',
    })

    await sendAlertMail({
      to,
      subject,
      text: message,
    })

    await supabase.from('dpp_alert_mail_log').insert({
      page_id: pageId,
      kind: 'suspicious_scan',
      recipient_email: to,
    })
  } catch (e) {
    console.error('[alert_pipeline] failed:', e)
  }
}

async function maybeSendCounterfeitMail(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>
  pageId: string
}) {
  const { supabase, pageId } = params

  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: recentMail } = await supabase
    .from('dpp_alert_mail_log')
    .select('id')
    .eq('page_id', pageId)
    .eq('kind', 'counterfeit')
    .gte('sent_at', since1h)
    .limit(1)

  const alreadySent = (recentMail?.length ?? 0) > 0
  if (alreadySent) return

  const { data: counterfeitAlarm } = await supabase
    .from('dpp_alarms')
    .select('id, risk_score, risk_level, reasons, created_at')
    .eq('page_id', pageId)
    .eq('alarm_type', 'counterfeit')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!counterfeitAlarm) return

  const { slug, productName, sku } = await getPageProductInfo(supabase, pageId)

  const to = await resolveAlertRecipientEmail(supabase, pageId)
  if (!to) {
    console.warn('[maybeSendCounterfeitMail] no recipient email found')
    return
  }

  const plan = await getAccountPlan(supabase, pageId)
  if (!canSendEmail(plan.toUpperCase() as 'FREE' | 'PRO' | 'ENTERPRISE')) {
    console.log('[plan] counterfeit email blocked (free plan)')
    return
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'

  const publicUrl = slug ? `${baseUrl}/p/${slug}` : `${baseUrl}/p/<unknown>`
  const reportUrl = `${baseUrl}/dashboard/p/${pageId}/report`
  const publicReportUrl = `${baseUrl}/r/${pageId}`

  const trTime = new Date().toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
  })

  const subject = `🚨 DPPForge Counterfeit Detected • ${
    productName || sku || slug || pageId
  }`

  const message = [
    `🚨 COUNTERFEIT DETECTED`,
    ``,
    `Alarm zamanı (TR): ${trTime}`,
    ``,
    `Ürün: ${productName || '-'}`,
    `SKU: ${sku || '-'}`,
    `Slug: ${slug || '-'}`,
    ``,
    `Risk Level: ${String(counterfeitAlarm.risk_level ?? 'high').toUpperCase()}`,
    `Risk Score: ${counterfeitAlarm.risk_score ?? '-'}`,
    `Reasons:`,
    ...((counterfeitAlarm.reasons ?? []).length
      ? (counterfeitAlarm.reasons ?? []).map((r: string) => `- ${r}`)
      : ['- No reasons available']),
    ``,
    `Internal Report: ${reportUrl}`,
    `Public Report: ${publicReportUrl}`,
    `Public Product Page: ${publicUrl}`,
    ``,
    `Plan: ${plan.toUpperCase()}`,
    `Not: Bu counterfeit mail aynı ürün için 60 dakika içinde 1 kez gönderilir.`,
  ].join('\n')

  try {
    await sendAlertMail({
      to,
      subject,
      text: message,
    })

    await supabase.from('dpp_alert_mail_log').insert({
      page_id: pageId,
      kind: 'counterfeit',
      recipient_email: to,
    })
  } catch (e) {
    console.error('[counterfeit_mail_pipeline] failed:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const pageId = body?.pageId as unknown

    if (!isUuid(pageId)) {
      return NextResponse.json({ ok: false, error: 'invalid_pageId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    // PLAN + AYLIK SCAN KONTROLÜ
const plan = await getAccountPlan(supabase, pageId)

// bu ayın başlangıcı
const startOfMonth = new Date()
startOfMonth.setDate(1)
startOfMonth.setHours(0, 0, 0, 0)

const { count: monthlyScanCount } = await supabase
  .from('dpp_scans')
  .select('*', { count: 'exact', head: true })
  .eq('page_id', pageId)
  .gte('scanned_at', startOfMonth.toISOString())

const allowed = canUseMonthlyScan({
  plan,
  currentMonthlyScanCount: monthlyScanCount ?? 0,
})

if (!allowed) {
  const limits = getPlanLimits(plan)

  return NextResponse.json(
    {
      ok: false,
      error: 'scan_limit_reached',
      plan,
      limit: limits.maxScansPerMonth,
      current: monthlyScanCount ?? 0,
      upgrade_required: true,
    },
    { status: 402 }
  )
}

    const ip = getClientIp(req)
    const ip_hash = hashIp(ip)
    const user_agent = req.headers.get('user-agent') ?? null
    const country =
      req.headers.get('x-vercel-ip-country') ??
      req.headers.get('cf-ipcountry') ??
      null

    const since1m = new Date(Date.now() - 60 * 1000).toISOString()

    if (ip_hash) {
      const { data: recent } = await supabase
        .from('dpp_scans')
        .select('id')
        .eq('page_id', pageId)
        .eq('ip_hash', ip_hash)
        .gte('scanned_at', since1m)
        .limit(6)

      if ((recent?.length ?? 0) >= 5) {
        const risk = computeRisk({
          count5m: 10,
          count24h: 25,
          uniqueIps24h: 8,
          uniqueCountries24h: 1,
          rateLimited60s: true,
        })

        await maybeCreateAlarmAndSendMail({
          supabase,
          pageId,
          risk,
          count5m: 10,
          count24h: 25,
          ips24hSize: 8,
          countries24h: new Set<string>(),
        })

        return NextResponse.json({
          ok: true,
          suspicious: true,
          stats: {
            reason: 'rate_limited_60s',
            count1m: recent?.length ?? 0,
            riskScore: risk.score,
            riskLevel: risk.level,
            riskReasons: risk.reasons,
          },
        })
      }
    }

    const { error: scanInsertError } = await supabase.from('dpp_scans').insert({
      page_id: pageId,
      ip_hash,
      country,
      user_agent,
    })

    if (scanInsertError) {
      return NextResponse.json(
        { ok: false, error: 'scan_insert_failed', detail: scanInsertError.message },
        { status: 500 }
      )
    }

    const { error: counterfeitError } = await supabase.rpc('fn_detect_counterfeit', {
      page_uuid: pageId,
    })

    if (counterfeitError) {
      console.error('[fn_detect_counterfeit] failed:', counterfeitError.message)
    } else {
      await maybeSendCounterfeitMail({
        supabase,
        pageId,
      })
    }

    const since5m = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ data: scans5m }, { data: scans24h }] = await Promise.all([
      supabase
        .from('dpp_scans')
        .select('country, ip_hash')
        .eq('page_id', pageId)
        .gte('scanned_at', since5m),

      supabase
        .from('dpp_scans')
        .select('country, ip_hash')
        .eq('page_id', pageId)
        .gte('scanned_at', since24h),
    ])

    const count5m = scans5m?.length ?? 0
    const count24h = scans24h?.length ?? 0

    const countries24h = new Set(
      (scans24h ?? []).map((s) => s.country).filter(Boolean) as string[]
    )
    const ips24h = new Set(
      (scans24h ?? []).map((s) => s.ip_hash).filter(Boolean) as string[]
    )
    const ips5m = new Set(
      (scans5m ?? []).map((s) => s.ip_hash).filter(Boolean) as string[]
    )

    const suspicious =
      count5m >= 10 ||
      ips5m.size >= 4 ||
      count24h >= 25 ||
      countries24h.size >= 2 ||
      ips24h.size >= 8

    const risk = computeRisk({
      count5m,
      count24h,
      uniqueIps24h: ips24h.size,
      uniqueCountries24h: countries24h.size,
      rateLimited60s: false,
    })

    if (suspicious) {
      await maybeCreateAlarmAndSendMail({
        supabase,
        pageId,
        risk,
        count5m,
        count24h,
        ips24hSize: ips24h.size,
        countries24h,
      })
    }

    return NextResponse.json({
      ok: true,
      suspicious,
      stats: {
        count5m,
        count24h,
        countries24h: Array.from(countries24h),
        uniqueIps24h: ips24h.size,
        riskScore: risk.score,
        riskLevel: risk.level,
        riskReasons: risk.reasons,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'server_error', detail: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}