import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/route'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createSupabaseRouteClient(req)

  const formData = await req.formData()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/admin')

  if (!email || !password) {
    const url = new URL('/login', req.url)
    url.searchParams.set('error', 'Email ve şifre gerekli')
    url.searchParams.set('next', next)
    return applyCookies(NextResponse.redirect(url))
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const url = new URL('/login', req.url)
    url.searchParams.set('error', error.message)
    url.searchParams.set('next', next)
    return applyCookies(NextResponse.redirect(url))
  }

  return applyCookies(NextResponse.redirect(new URL(next, req.url)))
}