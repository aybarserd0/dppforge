import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminContext } from '@/lib/auth/adminGuard'

export const runtime = 'nodejs'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase env eksik')
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminContext(req)
    if (!ctx.ok) return ctx.res

    const { account_id, applyCookies } = ctx
    const { id: pageId } = await context.params

    if (!pageId) {
      return applyCookies(
        NextResponse.json(
          { ok: false, error: 'Geçersiz page id' },
          { status: 400 }
        )
      )
    }

    const supabase = getSupabaseAdmin()

    console.log('DELETE PAGE ID:', pageId, 'ACCOUNT ID:', account_id)

    // 1) Page gerçekten bu account'a mı ait?
    const { data: pageRow, error: pageFindError } = await supabase
      .from('public_pages')
      .select('id, product_id, account_id')
      .eq('id', pageId)
      .eq('account_id', account_id)
      .single()

    if (pageFindError) {
      return applyCookies(
        NextResponse.json(
          {
            ok: false,
            error: `public_pages bulunamadı veya yetkisiz işlem: ${pageFindError.message}`,
          },
          { status: 404 }
        )
      )
    }

    if (!pageRow) {
      return applyCookies(
        NextResponse.json(
          { ok: false, error: 'Silinecek public page bulunamadı' },
          { status: 404 }
        )
      )
    }

    const productId = pageRow.product_id

    // 2) Bağlı scan kayıtlarını sil
    const { error: scansError } = await supabase
      .from('dpp_scans')
      .delete()
      .eq('page_id', pageId)

    if (scansError) {
      throw new Error(`dpp_scans silinemedi: ${scansError.message}`)
    }

    // 3) Bağlı alarm kayıtlarını sil
    const { error: alarmsError } = await supabase
      .from('dpp_alarms')
      .delete()
      .eq('page_id', pageId)

    if (alarmsError) {
      throw new Error(`dpp_alarms silinemedi: ${alarmsError.message}`)
    }

    // 4) public_page sil
    const { error: pageDeleteError } = await supabase
      .from('public_pages')
      .delete()
      .eq('id', pageId)
      .eq('account_id', account_id)

    if (pageDeleteError) {
      throw new Error(`public_pages silinemedi: ${pageDeleteError.message}`)
    }

    // 5) product varsa ve bu account'a aitse onu da sil
    if (productId) {
      const { error: productDeleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('account_id', account_id)

      if (productDeleteError) {
        throw new Error(`products silinemedi: ${productDeleteError.message}`)
      }
    }

    return applyCookies(
      NextResponse.json({
        ok: true,
        deleted_page_id: pageId,
        deleted_product_id: productId ?? null,
        account_id,
      })
    )
  } catch (err: any) {
    console.error('DELETE ERROR:', err)

    return NextResponse.json(
      { ok: false, error: err?.message || 'Delete failed' },
      { status: 500 }
    )
  }
}