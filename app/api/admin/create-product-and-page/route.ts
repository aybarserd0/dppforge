import { requireAdminContext } from '@/lib/auth/adminGuard'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  planRequired,
  normalizePlan,
  getPlanLimits,
  canCreateProduct,
} from '@/lib/plan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_NAME_LENGTH = 160
const MAX_SKU_LENGTH = 120
const MAX_SLUG_SOURCE_LENGTH = 180

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_env')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

function asTrimmedString(value: unknown, maxLength: number) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

function isUuid(value: string) {
  return UUID_RE.test(value)
}

function sanitizeSlugInput(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_SOURCE_LENGTH)
}

async function getAccountPlan(
  sb: ReturnType<typeof supabaseService>,
  account_id: string
) {
  const { data, error } = await sb
    .from('accounts')
    .select('id, plan_type, plan_expires_at, subscription_status')
    .eq('id', account_id)
    .maybeSingle()

  if (error) {
    console.error('[create-product-and-page][getAccountPlan] failed:', error)
    throw new Error('account_plan_lookup_failed')
  }

  if (!data?.id) {
    throw new Error('account_not_found')
  }

  const rawPlan = normalizePlan(data.plan_type)

  if (rawPlan === 'free') {
    return 'free' as const
  }

  const expiresAt = data.plan_expires_at ? new Date(data.plan_expires_at) : null
  const isExpiryValid =
    expiresAt instanceof Date && Number.isFinite(expiresAt.getTime())

  const isExpired =
    !isExpiryValid || (expiresAt && expiresAt.getTime() < Date.now())

  const subscriptionStatus = String(data.subscription_status ?? '')
    .trim()
    .toLowerCase()

  if (
    isExpired ||
    (subscriptionStatus && !['active', 'trialing'].includes(subscriptionStatus))
  ) {
    return 'free' as const
  }

  return rawPlan
}

async function getProductCount(
  sb: ReturnType<typeof supabaseService>,
  account_id: string
) {
  const { count, error } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', account_id)

  if (error) {
    console.error('[create-product-and-page][getProductCount] failed:', error)
    throw new Error('product_count_failed')
  }

  return Number(count ?? 0)
}

async function skuExists(params: {
  sb: ReturnType<typeof supabaseService>
  account_id: string
  sku: string
}) {
  const { sb, account_id, sku } = params

  const { data, error } = await sb
    .from('products')
    .select('id')
    .eq('account_id', account_id)
    .eq('sku', sku)
    .maybeSingle()

  if (error) {
    console.error('[create-product-and-page][skuExists] failed:', error)
    throw new Error('sku_lookup_failed')
  }

  return Boolean(data?.id)
}

async function buildUniqueSlug(params: {
  sb: ReturnType<typeof supabaseService>
  base: string
  fallbackSeed: string
}) {
  const { sb, base, fallbackSeed } = params

  const cleanedBase = sanitizeSlugInput(base)

  const { data: slugified, error: slugErr } = await sb.rpc('fn_slugify', {
    p_text: cleanedBase || base,
  })

  if (slugErr) {
    throw new Error(`slugify_failed:${slugErr.message}`)
  }

  const root =
    String(slugified ?? '').trim() ||
    `p-${fallbackSeed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase()}`

  let slug = root

  for (let i = 0; i < 8; i++) {
    const { data: exist, error: existErr } = await sb
      .from('public_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existErr) {
      throw new Error(`slug_exists_check_failed:${existErr.message}`)
    }

    if (!exist) return slug

    const suffix =
      i === 0
        ? fallbackSeed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toLowerCase()
        : `${Date.now().toString().slice(-4)}${i}`

    slug = `${root}-${suffix}`
  }

  throw new Error('unique_slug_generation_failed')
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdminContext(req)
    if (!ctx.ok) return ctx.res

    const { account_id, applyCookies } = ctx
    const sb = supabaseService()

    const body = await req.json().catch(() => ({}))

    const name_tr = asTrimmedString(body?.name_tr, MAX_NAME_LENGTH)
    const sku = asTrimmedString(body?.sku, MAX_SKU_LENGTH)
    const product_id = asTrimmedString(body?.product_id, 80)
    const desired_slug = asTrimmedString(body?.slug, MAX_SLUG_SOURCE_LENGTH)

    if (!name_tr) {
      return applyCookies(
        NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
      )
    }

    if (name_tr.length < 2) {
      return applyCookies(
        NextResponse.json(
          { ok: false, error: 'name_too_short' },
          { status: 400 }
        )
      )
    }

    if (!sku) {
      return applyCookies(
        NextResponse.json({ ok: false, error: 'sku_required' }, { status: 400 })
      )
    }

    if (sku.length < 2) {
      return applyCookies(
        NextResponse.json(
          { ok: false, error: 'sku_too_short' },
          { status: 400 }
        )
      )
    }

    if (product_id && !isUuid(product_id)) {
      return applyCookies(
        NextResponse.json(
          { ok: false, error: 'invalid_product_id' },
          { status: 400 }
        )
      )
    }

    const plan = await getAccountPlan(sb, account_id)
    const currentProductCount = await getProductCount(sb, account_id)
    const limits = getPlanLimits(plan)

    console.log('🔥 PLAN DEBUG', {
  account_id,
  plan,
  currentProductCount,
  maxProducts: limits.maxProducts,
})

    const allowed = canCreateProduct({
      plan,
      currentProductCount,
    })

    console.log('[create-product-and-page][limit-check]', {
      account_id,
      plan,
      currentProductCount,
      maxProducts: limits.maxProducts,
      allowed,
    })

    if (!allowed) {
      return applyCookies(
        planRequired('pro', {
          error: 'product_limit_reached',
          reason: 'product_limit',
          required_plan: 'pro',
          current_plan: plan,
          current_product_count: currentProductCount,
          max_products: limits.maxProducts,
        })
      )
    }

    const duplicateSku = await skuExists({
      sb,
      account_id,
      sku,
    })

    if (duplicateSku) {
      return applyCookies(
        NextResponse.json(
          {
            ok: false,
            error: 'sku_already_exists',
            field: 'sku',
          },
          { status: 409 }
        )
      )
    }

    const { data: prod, error: prodErr } = await sb
      .from('products')
      .insert({
        id: product_id || undefined,
        account_id,
        name_tr,
        sku,
      })
      .select('id')
      .single()

    if (prodErr || !prod?.id) {
      return applyCookies(
        NextResponse.json(
          {
            ok: false,
            error: prodErr?.message ?? 'product_insert_failed',
          },
          { status: 500 }
        )
      )
    }

    try {
      const slugBase = desired_slug || `${name_tr}-${sku}`

      const slug = await buildUniqueSlug({
        sb,
        base: slugBase,
        fallbackSeed: String(prod.id),
      })

      const { data: page, error: pageErr } = await sb
        .from('public_pages')
        .insert({
          account_id,
          product_id: prod.id,
          slug,
          review_state: 'open',
        })
        .select('id, slug')
        .single()

      if (pageErr || !page?.id) {
        throw new Error(pageErr?.message ?? 'page_insert_failed')
      }

      return applyCookies(
        NextResponse.json({
          ok: true,
          account_id,
          product_id: prod.id,
          page_id: page.id,
          slug: page.slug,
          plan_type: plan,
          current_product_count: currentProductCount + 1,
          max_products: limits.maxProducts,
        })
      )
    } catch (pageCreateError: any) {
      const rollback = await sb.from('products').delete().eq('id', prod.id)

      if (rollback.error) {
        console.error(
          '[create-product-and-page][rollback_product_failed]',
          rollback.error
        )
      }

      return applyCookies(
        NextResponse.json(
          {
            ok: false,
            error: pageCreateError?.message ?? 'page_insert_failed',
          },
          { status: 500 }
        )
      )
    }
  } catch (e: any) {
    console.error('[create-product-and-page][fatal]', e)

    const message = String(e?.message ?? 'unknown')

    if (message === 'account_not_found') {
      return NextResponse.json(
        { ok: false, error: 'account_not_found' },
        { status: 404 }
      )
    }

    if (
      message === 'account_plan_lookup_failed' ||
      message === 'product_count_failed' ||
      message === 'sku_lookup_failed'
    ) {
      return NextResponse.json(
        { ok: false, error: message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}