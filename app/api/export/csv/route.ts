import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name_tr, sku')
    .eq('account_id', user.id)

  const productIds = (products ?? []).map((p) => p.id)
  const productMap = new Map((products ?? []).map((p) => [p.id, p]))

  if (productIds.length === 0) {
    return new NextResponse('Tarih;Ülke;Ürün Adı;SKU;Ürün Sayfası;Okutma Durumu\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="dppforge-okutma-raporu.csv"',
      },
    })
  }

  const { data: pages } = await supabase
    .from('public_pages')
    .select('id, slug, product_id')
    .in('product_id', productIds)

  const pageIds = (pages ?? []).map((p) => p.id)
  const pageMap = new Map((pages ?? []).map((p) => [p.id, p]))

  if (pageIds.length === 0) {
    return new NextResponse('Tarih;Ülke;Ürün Adı;SKU;Ürün Sayfası;Okutma Durumu\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="dppforge-okutma-raporu.csv"',
      },
    })
  }

  const { data, error } = await supabase
    .from('dpp_scans')
    .select('scanned_at, country, page_id')
    .in('page_id', pageIds)
    .order('scanned_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }

  const header = 'Tarih;Ülke;Ürün Adı;SKU;Ürün Sayfası;Okutma Durumu\n'

  const rows = (data ?? [])
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

  const csv = header + rows

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="dppforge-okutma-raporu.csv"',
    },
  })
}