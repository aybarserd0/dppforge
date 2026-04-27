import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAlertMail } from '@/lib/mail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase env eksik')
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const pageId = String(body?.page_id ?? '').trim()

    if (!pageId) {
      return NextResponse.json(
        { ok: false, error: 'page_id_required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1) Page bul
    const { data: page, error: pageErr } = await supabase
      .from('public_pages')
      .select('id, slug, product_id, account_id')
      .eq('id', pageId)
      .maybeSingle()

    if (pageErr) {
      return NextResponse.json(
        { ok: false, error: `page_read_failed: ${pageErr.message}` },
        { status: 500 }
      )
    }

    if (!page) {
      return NextResponse.json(
        { ok: false, error: 'page_not_found' },
        { status: 404 }
      )
    }

    // 2) Product bul
    const { data: product, error: productErr } = await supabase
      .from('products')
      .select('id, name_tr, sku')
      .eq('id', page.product_id)
      .maybeSingle()

    if (productErr) {
      return NextResponse.json(
        { ok: false, error: `product_read_failed: ${productErr.message}` },
        { status: 500 }
      )
    }

    // 3) Aktif counterfeit alarm bul
    const { data: alarm, error: alarmErr } = await supabase
      .from('dpp_alarms')
      .select('id, page_id, risk_score, risk_level, reasons, created_at')
      .eq('page_id', pageId)
      .eq('alarm_type', 'counterfeit')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (alarmErr) {
      return NextResponse.json(
        { ok: false, error: `alarm_read_failed: ${alarmErr.message}` },
        { status: 500 }
      )
    }

    if (!alarm) {
      return NextResponse.json(
        { ok: false, error: 'no_active_counterfeit_alarm' },
        { status: 404 }
      )
    }

    // 4) Report link üret
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:3000'

    const reportUrl = `${appUrl}/dashboard/p/${pageId}/report`
    const publicReportUrl = `${appUrl}/r/${pageId}`
    const publicPageUrl = `${appUrl}/p/${page.slug}`

    const productName = product?.name_tr ?? 'Unknown Product'
    const sku = product?.sku ?? '-'
    const riskLevel = String(alarm.risk_level ?? 'high').toUpperCase()
    const riskScore =
      typeof alarm.risk_score === 'number' ? alarm.risk_score : 0

    const reasons =
      Array.isArray(alarm.reasons) && alarm.reasons.length > 0
        ? alarm.reasons.join(', ')
        : 'No reason data'

    const subject = `🚨 Counterfeit Detected – ${productName}`

    const text = [
      'DPPForge Alert',
      '',
      `Product: ${productName}`,
      `SKU: ${sku}`,
      `Risk Level: ${riskLevel}`,
      `Risk Score: ${riskScore}`,
      `Reasons: ${reasons}`,
      '',
      `Internal Report: ${reportUrl}`,
      `Public Report: ${publicReportUrl}`,
      `Public Product Page: ${publicPageUrl}`,
    ].join('\n')

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2>🚨 Counterfeit Detected</h2>
        <p><b>Product:</b> ${productName}</p>
        <p><b>SKU:</b> ${sku}</p>
        <p><b>Risk Level:</b> ${riskLevel}</p>
        <p><b>Risk Score:</b> ${riskScore}</p>
        <p><b>Reasons:</b> ${reasons}</p>

        <div style="margin-top:20px">
          <p><a href="${reportUrl}">Open Internal Report</a></p>
          <p><a href="${publicReportUrl}">Open Public Report</a></p>
          <p><a href="${publicPageUrl}">Open Public Product Page</a></p>
        </div>
      </div>
    `

    const mailResult = await sendAlertMail(subject, text, html)

    return NextResponse.json({
      ok: true,
      page_id: pageId,
      product_name: productName,
      mail: mailResult,
    })
  } catch (err: any) {
    console.error('SEND ALERT ERROR:', err)

    return NextResponse.json(
      { ok: false, error: err?.message ?? 'unknown_error' },
      { status: 500 }
    )
  }
}