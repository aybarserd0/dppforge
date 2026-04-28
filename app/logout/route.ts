import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/route'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createSupabaseRouteClient(req)

  await supabase.auth.signOut()

  const res = NextResponse.redirect(new URL('/', req.url))
  return applyCookies(res)
}