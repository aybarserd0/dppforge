// lib/getAccountPlan.ts

import type { SupabaseClient } from '@supabase/supabase-js'

export type PlanType = 'free' | 'pro' | 'enterprise'

export async function getAccountPlanType(
  supabase: SupabaseClient,
  account_id: string
): Promise<PlanType> {
  const { data, error } = await supabase
    .from('accounts')
    .select('plan_type')
    .eq('id', account_id)
    .single()

  if (error) {
    throw error
  }

  return (data?.plan_type as PlanType) ?? 'free'
}