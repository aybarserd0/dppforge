import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  return user
}

type ReportRow = {
  id: string
  page_id: string
  reason: string | null
  detail: string | null
  reporter_email: string | null
  created_at: string
  status: string
}

type PageRow = {
  id: string
  slug: string | null
  product_id: string | null
}

type ProductRow = {
  id: string
  name_tr: string | null
  sku: string | null
}

function fmt(dt?: string | null) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
}

function pill(bg: string, border: string, color: string) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 800 as const,
  }
}

export default async function AdminReportsPage() {
  await requireAdmin()
  const supabase = getSupabaseAdmin()

  const { data: reportsRaw, error: reportsErr } = await supabase
    .from('dpp_reports')
    .select('id, page_id, reason, detail, reporter_email, created_at, status')
    .order('created_at', { ascending: false })
    .limit(100)

  if (reportsErr) {
    return <div style={{ padding: 40 }}>Reports Error: {reportsErr.message}</div>
  }

  const reports = (reportsRaw ?? []) as ReportRow[]
  const pageIds = Array.from(new Set(reports.map((r) => r.page_id)))

  let pageMap = new Map<string, PageRow>()
  let productMap = new Map<string, ProductRow>()

  if (pageIds.length > 0) {
    const { data: pagesRaw } = await supabase
      .from('public_pages')
      .select('id, slug, product_id')
      .in('id', pageIds)

    const pages = (pagesRaw ?? []) as PageRow[]
    pageMap = new Map(pages.map((p) => [p.id, p]))

    const productIds = Array.from(
      new Set(pages.map((p) => p.product_id).filter(Boolean) as string[])
    )

    if (productIds.length > 0) {
      const { data: productsRaw } = await supabase
        .from('products')
        .select('id, name_tr, sku')
        .in('id', productIds)

      const products = (productsRaw ?? []) as ProductRow[]
      productMap = new Map(products.map((p) => [p.id, p]))
    }
  }

  return (
    <div
      style={{
        padding: 40,
        background: '#0b0f17',
        minHeight: '100vh',
        color: '#e6e6e6',
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0 }}>Ürün Bildirimleri</h1>
          <p style={{ opacity: 0.7 }}>Public sayfadan gelen şüpheli ürün bildirimleri</p>
        </div>

        <Link
          href="/admin"
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#e6e6e6',
            textDecoration: 'none',
            fontWeight: 800,
            height: 'fit-content',
          }}
        >
          ← Admin’e dön
        </Link>
      </div>

      {reports.length === 0 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          Henüz bildirim yok.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {reports.map((report) => {
            const page = pageMap.get(report.page_id)
            const product = page?.product_id ? productMap.get(page.product_id) : undefined

            return (
              <div
                key={report.id}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {product?.name_tr || '-'}
                    </div>
                    <div style={{ opacity: 0.75, marginTop: 6 }}>
                      SKU: {product?.sku || '-'} • Slug: {page?.slug || '-'}
                    </div>
                  </div>

                  <div style={pill('rgba(245,158,11,0.14)', 'rgba(245,158,11,0.35)', '#fde68a')}>
                    {report.status}
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <b>Sebep:</b> {report.reason || '-'}
                </div>

                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <b>Açıklama:</b> {report.detail || '-'}
                </div>

                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <b>E-posta:</b> {report.reporter_email || '-'}
                </div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  {fmt(report.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}