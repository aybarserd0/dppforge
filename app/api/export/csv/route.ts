import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CSV_HEADER = 'Tarih;Ülke;Ürün Adı;SKU;Ürün Sayfası;Okutma Durumu\n'

function csvResponse(csv: string) {
  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="dppforge-okutma-raporu.csv"',
    },
  })
}

export async function GET() {
  const authSupabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userErr,
  } = await authSupabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    )
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  )

  const { data: products, error: productsErr } = await adminSupabase
    .from('products')
    .select('id, name_tr, sku')
    .eq('account_id', user.id)

  if (productsErr) {
    return NextResponse.json(
      { ok: false, error: productsErr },
      { status: 500 }
    )
  }

  const productIds = (products ?? []).map((p) => p.id)

  if (productIds.length === 0) {
    return csvResponse(CSV_HEADER)
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p]))

  const { data: pages, error: pagesErr } = await adminSupabase
    .from('public_pages')
    .select('id, slug, product_id')
    .in('product_id', productIds)

  if (pagesErr) {
    return NextResponse.json({ ok: false, error: pagesErr }, { status: 500 })
  }

  const pageIds = (pages ?? []).map((p) => p.id)

  if (pageIds.length === 0) {
    return csvResponse(CSV_HEADER)
  }

  const pageMap = new Map((pages ?? []).map((p) => [p.id, p]))

  const { data: scans, error: scansErr } = await adminSupabase
    .from('dpp_scans')
    .select('scanned_at, country, page_id')
    .in('page_id', pageIds)
    .order('scanned_at', { ascending: false })
    .limit(500)

  if (scansErr) {
    return NextResponse.json({ ok: false, error: scansErr }, { status: 500 })
  }

  const rows = (scans ?? [])
    .map((row) => {
      const page = pageMap.get(row.page_id)
      const product = page?.product_id ? productMap.get(page.product_id) : null

      const date = new Date(row.scanned_at).toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
      })

      return [
        date,
        row.country ?? 'Bilinmiyor',
        product?.name_tr ?? 'Bilinmiyor',
        product?.sku ?? '-',
        page?.slug ? `/p/${page.slug}` : '-',
        'Başarılı okutma',
      ].join(';')
    })
    .join('\n')

  return csvResponse(CSV_HEADER + rows)
}