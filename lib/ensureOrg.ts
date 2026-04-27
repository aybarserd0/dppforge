import { supabase } from '@/lib/supabase'

type EnsureOrgResult = string

export async function ensureOrg(): Promise<EnsureOrgResult> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr) {
    throw new Error(`Auth error: ${userErr.message}`)
  }

  if (!user) {
    throw new Error('User not authenticated')
  }

  const userId = user.id

  const { data: membership, error: memErr } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (memErr) {
    throw new Error(`Failed to read org membership: ${memErr.message}`)
  }

  if (membership?.org_id) {
    return membership.org_id
  }

  const fallbackName =
    user.email?.split('@')[0]?.trim() || 'My Company'

  const { data: org, error: orgErr } = await supabase
    .from('orgs')
    .insert({
      name: fallbackName,
    })
    .select('id')
    .single()

  if (orgErr || !org?.id) {
    throw new Error(`Failed to create org: ${orgErr?.message || 'unknown error'}`)
  }

  const { error: joinErr } = await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: userId,
    role: 'admin',
  })

  if (joinErr) {
    throw new Error(`Failed to create org membership: ${joinErr.message}`)
  }

  return org.id
}