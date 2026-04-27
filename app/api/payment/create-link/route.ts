import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminContext } from '@/lib/auth/adminGuard'

export const dynamic = 'force-dynamic'

type UpgradePlan = 'pro' | 'enterprise'

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_service_env')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function normalizePlan(value: string | null): UpgradePlan | null {
  const v = String(value ?? '').trim().toLowerCase()
  if (v === 'pro') return 'pro'
  if (v === 'enterprise') return 'enterprise'
  return null
}

function getEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`missing_env_${name}`)
  }
  return value
}

function getAppBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl.replace(/\/+$/, '')

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    throw new Error('missing_app_base_url')
  }

  return `${proto}://${host}`.replace(/\/+$/, '')
}

function buildAuthorization(params: {
  apiKey: string
  secretKey: string
  randomKey: string
  uriPath: string
  body: string
}) {
  const { apiKey, secretKey, randomKey, uriPath, body } = params

  const payload = `${randomKey}${uriPath}${body}`
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(payload, 'utf8')
    .digest('hex')

  const authorizationString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`
  const encoded = Buffer.from(authorizationString, 'utf8').toString('base64')

  return `IYZWSv2 ${encoded}`
}

function buildCheckoutFormBody(params: {
  plan: UpgradePlan
  conversationId: string
  callbackUrl: string
}) {
  const { plan, conversationId, callbackUrl } = params

  if (plan !== 'pro') return null

  return {
    locale: 'tr',
    conversationId,
    price: '299.00',
    paidPrice: '299.00',
    currency: 'TRY',
    basketId: `basket-${conversationId}`,
    paymentGroup: 'PRODUCT',
    callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: conversationId,
      name: 'DPPForge',
      surname: 'Customer',
      gsmNumber: '+905350000000',
      email: 'test@example.com',
      identityNumber: '11111111111',
      lastLoginDate: '2026-01-01 00:00:00',
      registrationDate: '2026-01-01 00:00:00',
      registrationAddress: 'Ankara',
      ip: '127.0.0.1',
      city: 'Ankara',
      country: 'Turkey',
      zipCode: '06000',
    },
    shippingAddress: {
      contactName: 'DPPForge Customer',
      city: 'Ankara',
      country: 'Turkey',
      address: 'Ankara',
      zipCode: '06000',
    },
    billingAddress: {
      contactName: 'DPPForge Customer',
      city: 'Ankara',
      country: 'Turkey',
      address: 'Ankara',
      zipCode: '06000',
    },
    basketItems: [
      {
        id: 'dppforge-pro-plan',
        name: 'DPPForge Pro Plan',
        category1: 'SaaS',
        itemType: 'VIRTUAL',
        price: '299.00',
      },
    ],
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdminContext(req)
    if (!ctx.ok) return ctx.res

    const { account_id, applyCookies } = ctx
    const plan = normalizePlan(req.nextUrl.searchParams.get('plan'))

    if (!plan) {
      return applyCookies(
        NextResponse.json(
          { ok: false, error: 'invalid_plan' },
          { status: 400 }
        )
      )
    }

    if (plan === 'enterprise') {
      return applyCookies(
        NextResponse.redirect(
          'mailto:sales@dppforge.local?subject=DPPForge%20Enterprise%20Upgrade',
          { status: 302 }
        )
      )
    }

    const apiKey = getEnv('IYZICO_API_KEY')
    const secretKey = getEnv('IYZICO_SECRET_KEY')
    const baseUrl = getEnv('IYZICO_BASE_URL')
    const appBaseUrl = getAppBaseUrl(req)

    const sb = supabaseService()
    const conversationId = `dppforge-${account_id}-${Date.now()}`
    const callbackUrl = `${appBaseUrl}/api/payment/callback`

    const uriPath = '/payment/iyzipos/checkoutform/initialize/auth/ecom'
    const requestBodyObject = buildCheckoutFormBody({
      plan,
      conversationId,
      callbackUrl,
    })

    if (!requestBodyObject) {
      return applyCookies(
        NextResponse.json(
          { ok: false, error: 'invalid_checkout_form_body' },
          { status: 400 }
        )
      )
    }

    const requestBody = JSON.stringify(requestBodyObject)
    const randomKey = `${Date.now()}${Math.floor(Math.random() * 1000000)}`
    const authorization = buildAuthorization({
      apiKey,
      secretKey,
      randomKey,
      uriPath,
      body: requestBody,
    })

    const res = await fetch(`${baseUrl}${uriPath}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'x-iyzi-rnd': randomKey,
        'Content-Type': 'application/json',
      },
      body: requestBody,
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return applyCookies(
        NextResponse.json(
          {
            ok: false,
            error: 'iyzico_http_error',
            statusCode: res.status,
            iyzico: data,
          },
          { status: 502 }
        )
      )
    }

    const paymentUrl = data?.paymentPageUrl ?? null
    const iyzicoToken = data?.token ?? null

    if (data?.status !== 'success' || !paymentUrl || !iyzicoToken) {
      return applyCookies(
        NextResponse.json(
          {
            ok: false,
            error: 'iyzico_checkoutform_initialize_failed',
            iyzico: data,
          },
          { status: 502 }
        )
      )
    }

    const { error: sessionErr } = await sb.from('dpp_payment_sessions').insert({
      account_id,
      plan_type: plan,
      provider: 'iyzico',
      conversation_id: conversationId,
      payment_url: paymentUrl,
      iyzico_token: iyzicoToken,
      status: 'pending',
    })

    if (sessionErr) {
      return applyCookies(
        NextResponse.json(
          {
            ok: false,
            error: 'payment_session_insert_failed',
            detail: sessionErr.message,
          },
          { status: 500 }
        )
      )
    }

    return applyCookies(NextResponse.redirect(paymentUrl, { status: 302 }))
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? 'unknown_error',
      },
      { status: 500 }
    )
  }
}