import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('dpp_scans')
    .select('scanned_at, country, ip_hash, page_id')
    .order('scanned_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }

  // CSV oluştur
  const header = 'Tarih,Ülke,IP Hash,Page ID\n'

  const rows = data
    .map(
      (row) =>
        `${row.scanned_at},${row.country ?? ''},${row.ip_hash ?? ''},${row.page_id}`
    )
    .join('\n')

  const csv = header + rows

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="scans.csv"',
    },
  })
}