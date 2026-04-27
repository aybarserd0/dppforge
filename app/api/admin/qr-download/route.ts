import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url')
    const filename = req.nextUrl.searchParams.get('filename') || 'qr-code.png'

    if (!url) {
      return NextResponse.json(
        { ok: false, error: 'missing_url' },
        { status: 400 }
      )
    }

    const qrApiUrl =
      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
      encodeURIComponent(url)

    const upstream = await fetch(qrApiUrl, {
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: 'qr_fetch_failed' },
        { status: 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') || 'image/png'
    const arrayBuffer = await upstream.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unknown_error' },
      { status: 500 }
    )
  }
}