import PDFDocument from 'pdfkit'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // DATA
    const { data: page } = await supabase
      .from('public_pages')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!page) {
      return new NextResponse('Page not found', { status: 404 })
    }

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', page.product_id)
      .maybeSingle()

    const { data: summary } = await supabase
      .from('dpp_scan_summary')
      .select('*')
      .eq('page_id', id)
      .maybeSingle()

    const { data: alarm } = await supabase
      .from('dpp_alarms')
      .select('*')
      .eq('page_id', id)
      .eq('alarm_type', 'counterfeit')
      .eq('resolved', false)
      .maybeSingle()

    // PDF
    const doc = new PDFDocument()
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
    })

    // CONTENT
    doc.fontSize(20).text('DPPForge Report', { align: 'center' })
    doc.moveDown()

    doc.fontSize(14).text(`Product: ${product?.name_tr ?? 'Unknown'}`)
    doc.text(`SKU: ${product?.sku ?? '-'}`)
    doc.text(`Slug: ${page?.slug ?? '-'}`)

    doc.moveDown()

    doc.text(`Total Scans: ${summary?.scans_total ?? 0}`)
    doc.text(`24h Scans: ${summary?.scans_24h ?? 0}`)
    doc.text(`Unique IPs: ${summary?.unique_ips_24h ?? 0}`)
    doc.text(`Countries: ${summary?.unique_countries_24h ?? 0}`)

    doc.moveDown()

    if (alarm) {
      doc.fillColor('red').text('⚠ Counterfeit Detected')
      doc.fillColor('black')

      doc.text(`Risk Score: ${alarm.risk_score ?? '-'}`)
      doc.text(`Risk Level: ${alarm.risk_level ?? '-'}`)

      doc.moveDown()
      doc.text('Reasons:')

      ;(alarm.reasons ?? []).forEach((r: string) => {
        doc.text(`- ${r}`)
      })
    } else {
      doc.text('No counterfeit detected')
    }

    doc.end()

    const buffer = await pdfReady

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=report-${id}.pdf`,
      },
    })
  } catch (err: any) {
    console.error('PDF ERROR:', err)

    return new NextResponse(
      JSON.stringify({
        error: err?.message ?? 'Unknown error',
      }),
      { status: 500 }
    )
  }
}