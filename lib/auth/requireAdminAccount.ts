import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('missing_supabase_env')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

export async function requireAdminAccount(options?: { next?: string }) {
  const authSupabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userErr,
  } = await authSupabase.auth.getUser()

  if (userErr || !user) {
    const next = options?.next
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
  }

  const supabase = getSupabaseAdmin()

  const { data: membership, error: membershipErr } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipErr || !membership?.account_id) {
    redirect('/login')
  }

  return {
    user,
    accountId: membership.account_id,
  }
}