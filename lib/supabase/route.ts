import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}

export function createSupabaseRouteClient(req: NextRequest) {
  const cookiesToSet: CookieToSet[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }))
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies)
        },
      },
    }
  )

  function applyCookies(res: NextResponse) {
    cookiesToSet.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options)
    })
    return res
  }

  return { supabase, applyCookies }
}