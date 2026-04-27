import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const conversationId = req.nextUrl.searchParams.get('conversationId')

  const successUrl = new URL('/payment/success', req.url)

  if (token) {
    successUrl.searchParams.set('token', token)
  }

  if (conversationId) {
    successUrl.searchParams.set('conversationId', conversationId)
  }

  return NextResponse.redirect(successUrl, { status: 302 })
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    let token: string | null = null
    let conversationId: string | null = null

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null)
      token = body?.token ?? null
      conversationId = body?.conversationId ?? null
    } else {
      const formData = await req.formData().catch(() => null)
      token = (formData?.get('token') as string) ?? null
      conversationId = (formData?.get('conversationId') as string) ?? null
    }

    const successUrl = new URL('/payment/success', req.url)

    if (token) {
      successUrl.searchParams.set('token', token)
    }

    if (conversationId) {
      successUrl.searchParams.set('conversationId', conversationId)
    }

    return NextResponse.redirect(successUrl, { status: 302 })
  } catch {
    const successUrl = new URL('/payment/success', req.url)
    return NextResponse.redirect(successUrl, { status: 302 })
  }
}