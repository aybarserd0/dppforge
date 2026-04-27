import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

type DemoPayload = {
  name?: string
  email?: string
  company?: string
  product_count?: number | string | null
  website?: string
}

function normalizeText(value: unknown, maxLen: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLen)
}

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().slice(0, 320)
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function parseProductCount(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  if (num < 0) return null
  return Math.floor(num)
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  return 'unknown'
}

function hashIp(ip: string) {
  const salt = process.env.DEMO_IP_SALT || 'fallback-demo-salt'
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DemoPayload

    const name = normalizeText(body.name, 120)
    const email = normalizeEmail(body.email)
    const company = normalizeText(body.company, 160)
    const website = normalizeText(body.website, 200)
    const product_count = parseProductCount(body.product_count)

    if (website) {
      return NextResponse.json({ ok: true })
    }

    if (!name || !email || !company) {
      return NextResponse.json(
        { ok: false, error: 'Zorunlu alanlar eksik.' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli bir email girin.' },
        { status: 400 }
      )
    }

    if (name.length < 2 || company.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Lütfen daha geçerli bilgiler girin.' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ip = getClientIp(req)
    const ip_hash = hashIp(ip)
    const user_agent = req.headers.get('user-agent')?.slice(0, 500) || null

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: recentIpCount, error: rateError } = await supabase
      .from('demo_leads')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ip_hash)
      .gte('created_at', oneHourAgo)

    if (rateError) {
      return NextResponse.json(
        { ok: false, error: 'Rate limit kontrolü başarısız oldu.' },
        { status: 500 }
      )
    }

    if ((recentIpCount ?? 0) >= 5) {
      return NextResponse.json(
        { ok: false, error: 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    const { count: recentEmailCount, error: dupError } = await supabase
      .from('demo_leads')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', oneHourAgo)

    if (dupError) {
      return NextResponse.json(
        { ok: false, error: 'Tekrar kontrolü başarısız oldu.' },
        { status: 500 }
      )
    }

    if ((recentEmailCount ?? 0) >= 3) {
      return NextResponse.json(
        { ok: false, error: 'Bu email ile kısa sürede çok fazla talep gönderildi.' },
        { status: 429 }
      )
    }

    const { error } = await supabase.from('demo_leads').insert([
      {
        name,
        email,
        company,
        product_count,
        source: 'landing_demo',
        status: 'new',
        ip_hash,
        user_agent,
      },
    ])

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'Kayıt oluşturulamadı.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Beklenmeyen bir hata oluştu.' },
      { status: 500 }
    )
  }
}