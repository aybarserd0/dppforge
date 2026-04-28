import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PaymentSessionStatus = 'pending' | 'paid' | 'failed'

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_env')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function getEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`missing_env_${name}`)
  }
  return value
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

function extractAccountIdFromConversationId(
  conversationId: string | null | undefined
) {
  const match = String(conversationId ?? '').match(
    /^dppforge-([0-9a-fA-F-]{36})-\d+$/
  )
  return match?.[1] ?? null
}

async function findSession(params: {
  sb: ReturnType<typeof supabaseAdmin>
  sessionId: string | null
  token: string | null
}) {
  const { sb, sessionId, token } = params

  if (sessionId) {
    const { data, error } = await sb
      .from('dpp_payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      return { session: null, error: `session_not_found_by_id:${error.message}` }
    }

    return { session: data, error: null }
  }

  if (token) {
    const { data, error } = await sb
      .from('dpp_payment_sessions')
      .select('*')
      .eq('iyzico_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return {
        session: null,
        error: `session_not_found_by_token:${error.message}`,
      }
    }

    return { session: data, error: null }
  }

  const { data, error } = await sb
    .from('dpp_payment_sessions')
    .select('*')
    .in('status', ['pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return { session: null, error: `pending_session_not_found:${error.message}` }
  }

  return { session: data, error: null }
}

async function updateSessionStatus(params: {
  sb: ReturnType<typeof supabaseAdmin>
  sessionId: string
  status: PaymentSessionStatus
  paymentId?: string | number | null
  failureReason?: string | null
  markVerified?: boolean
}) {
  const {
    sb,
    sessionId,
    status,
    paymentId = null,
    failureReason = null,
    markVerified = false,
  } = params

  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (paymentId !== null && paymentId !== undefined && String(paymentId).trim()) {
    payload.iyzico_payment_id = String(paymentId).trim()
  }

  if (failureReason !== null) {
    payload.failure_reason = failureReason
  }

  if (markVerified) {
    payload.verified_at = new Date().toISOString()
  }

  const { error } = await sb
    .from('dpp_payment_sessions')
    .update(payload)
    .eq('id', sessionId)

  return error
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function computeNextExpiry(currentExpiryRaw: string | null | undefined) {
  const now = new Date()

  const currentExpiry = currentExpiryRaw ? new Date(currentExpiryRaw) : null
  const isCurrentExpiryValid =
    currentExpiry instanceof Date &&
    Number.isFinite(currentExpiry.getTime())

  const baseDate =
    isCurrentExpiryValid && currentExpiry.getTime() > now.getTime()
      ? currentExpiry
      : now

  return {
    now,
    expires: addDays(baseDate, 30),
    renewedFrom: baseDate.toISOString(),
  }
}

function normalizePlan(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase()

  if (raw === 'starter') return 'starter'
  if (raw === 'pro') return 'pro'
  if (raw === 'business') return 'business'
  if (raw === 'enterprise') return 'enterprise'

  return 'pro' // fallback
}

function parseFraudStatus(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function getFailureReasonFromIyzico(data: any) {
  return (
    data?.errorMessage ||
    data?.errorCode ||
    data?.paymentStatus ||
    data?.status ||
    'unknown_provider_error'
  )
}

export async function GET(req: NextRequest) {
  try {
    const sb = supabaseAdmin()

    const sessionId = req.nextUrl.searchParams.get('session_id')
    const tokenFromQuery = req.nextUrl.searchParams.get('token')

    const { session, error: sessionFindError } = await findSession({
      sb,
      sessionId,
      token: tokenFromQuery,
    })

    if (!session) {
      return NextResponse.json(
        { ok: false, error: sessionFindError ?? 'no_session' },
        { status: 404 }
      )
    }

    if (session.status === 'paid') {
      return NextResponse.json({
        ok: true,
        verified: true,
        upgraded: true,
        already_paid: true,
        status: 'paid',
        session_id: session.id,
        account_id: session.account_id ?? null,
        paymentId: session.iyzico_payment_id ?? null,
      })
    }

    const conversationId = session.conversation_id
    const account_id =
      session.account_id || extractAccountIdFromConversationId(conversationId)

    if (!conversationId || !account_id) {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'failed',
        failureReason: 'invalid_conversation_or_account',
        markVerified: true,
      })

      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_conversation_or_account',
          conversationId,
          account_id,
        },
        { status: 400 }
      )
    }

    const iyzicoToken = session.iyzico_token || tokenFromQuery

    if (!iyzicoToken) {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'failed',
        failureReason: 'missing_iyzico_token',
        markVerified: true,
      })

      return NextResponse.json(
        { ok: false, error: 'missing_iyzico_token' },
        { status: 400 }
      )
    }

    const apiKey = getEnv('IYZICO_API_KEY')
    const secretKey = getEnv('IYZICO_SECRET_KEY')
    const baseUrl = getEnv('IYZICO_BASE_URL')

    const uriPath = '/payment/iyzipos/checkoutform/auth/ecom/detail'
    const requestBodyObject = {
      locale: 'tr',
      conversationId,
      token: iyzicoToken,
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

    const iyzicoRes = await fetch(`${baseUrl}${uriPath}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'x-iyzi-rnd': randomKey,
        'Content-Type': 'application/json',
      },
      body: requestBody,
      cache: 'no-store',
    })

    const iyzicoData = await iyzicoRes.json().catch(() => null)

    if (!iyzicoRes.ok) {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'pending',
        failureReason: `iyzico_http_error_${iyzicoRes.status}`,
      })

      return NextResponse.json(
        {
          ok: false,
          error: 'iyzico_http_error',
          statusCode: iyzicoRes.status,
          iyzico: iyzicoData,
        },
        { status: 502 }
      )
    }

    const providerStatus = String(iyzicoData?.status ?? '').toLowerCase()
    const paymentStatus = String(iyzicoData?.paymentStatus ?? '').toUpperCase()
    const fraudStatus = parseFraudStatus(iyzicoData?.fraudStatus)
    const paymentId = iyzicoData?.paymentId ?? null
    const retrievedConversationId = iyzicoData?.conversationId ?? null

    if (
      retrievedConversationId &&
      String(retrievedConversationId) !== String(conversationId)
    ) {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'failed',
        paymentId,
        failureReason: 'conversation_id_mismatch',
        markVerified: true,
      })

      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_id_mismatch',
          expected: conversationId,
          actual: retrievedConversationId,
        },
        { status: 400 }
      )
    }

    if (providerStatus !== 'success') {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'pending',
        paymentId,
        failureReason: `provider_status_${providerStatus || 'unknown'}`,
        markVerified: true,
      })

      return NextResponse.json({
        ok: false,
        verified: false,
        upgraded: false,
        status: 'pending',
        reason: 'provider_status_not_success',
        iyzico: iyzicoData,
      })
    }

    if (paymentStatus === 'FAILURE') {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'failed',
        paymentId,
        failureReason: getFailureReasonFromIyzico(iyzicoData),
        markVerified: true,
      })

      return NextResponse.json({
        ok: false,
        verified: true,
        upgraded: false,
        status: 'failed',
        paymentStatus,
        fraudStatus,
        paymentId,
      })
    }

    if (paymentStatus !== 'SUCCESS') {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'pending',
        paymentId,
        failureReason: `payment_status_${paymentStatus || 'unknown'}`,
        markVerified: true,
      })

      return NextResponse.json({
        ok: false,
        verified: true,
        upgraded: false,
        status: 'pending',
        paymentStatus,
        fraudStatus,
        paymentId,
      })
    }

    if (fraudStatus !== null && fraudStatus < 1) {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'pending',
        paymentId,
        failureReason: `fraud_status_${fraudStatus}`,
        markVerified: true,
      })

      return NextResponse.json({
        ok: false,
        verified: true,
        upgraded: false,
        status: 'pending',
        paymentStatus,
        fraudStatus,
        paymentId,
        reason: 'fraud_review_required',
      })
    }

    const { data: accountRow, error: accountReadErr } = await sb
      .from('accounts')
      .select(
        'id, plan_type, plan_expires_at, subscription_status, billing_cycle, last_payment_at'
      )
      .eq('id', account_id)
      .maybeSingle()

    if (accountReadErr || !accountRow?.id) {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'pending',
        paymentId,
        failureReason: `account_read_failed:${accountReadErr?.message ?? 'not_found'}`,
        markVerified: true,
      })

      return NextResponse.json(
        {
          ok: false,
          error: `account_read_failed:${accountReadErr?.message ?? 'not_found'}`,
        },
        { status: 500 }
      )
    }

    const { now, expires, renewedFrom } = computeNextExpiry(
      accountRow.plan_expires_at
    )

    const targetPlan = normalizePlan(session.plan_type)

    const { data: updatedRows, error: updateErr } = await sb
      .from('accounts')
      .update({
        plan_type: targetPlan,
        plan_expires_at: expires.toISOString(),
        subscription_status: 'active',
        billing_cycle: 'monthly',
        last_payment_at: now.toISOString(),
      })
      .eq('id', account_id)
      .select(
        'id, plan_type, plan_expires_at, subscription_status, billing_cycle, last_payment_at'
      )

    if (updateErr) {
      await updateSessionStatus({
        sb,
        sessionId: session.id,
        status: 'pending',
        paymentId,
        failureReason: `account_update_failed:${updateErr.message}`,
        markVerified: true,
      })

      return NextResponse.json(
        { ok: false, error: `account_update_failed:${updateErr.message}` },
        { status: 500 }
      )
    }

    const sessionUpdateErr = await updateSessionStatus({
      sb,
      sessionId: session.id,
      status: 'paid',
      paymentId,
      failureReason: null,
      markVerified: true,
    })

    if (sessionUpdateErr) {
      return NextResponse.json(
        {
          ok: false,
          error: `session_paid_update_failed:${sessionUpdateErr.message}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      upgraded: true,
      renewed: true,
      status: 'paid',
      account_id,
      session_id: session.id,
      paymentId,
      paymentStatus,
      fraudStatus,
      renewed_from: renewedFrom,
      updatedRows,
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? 'unknown',
      },
      { status: 500 }
    )
  }
}