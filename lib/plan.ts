// lib/plan.ts
import { NextResponse } from 'next/server'

export type PlanType = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

export type PlanLimits = {
  maxProducts: number
  maxScansPerMonth: number
  canUseAlerts: boolean
  canUseAdvancedAnalytics: boolean
  canUseExports: boolean
  canUseAPI: boolean
  canUseWhiteLabel: boolean
  canUseMultiUser: boolean
}

const rank: Record<PlanType, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
}


  const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxProducts: 1,
    maxScansPerMonth: 50,
    canUseAlerts: false,
    canUseAdvancedAnalytics: false,
    canUseExports: false,
    canUseAPI: false,
    canUseWhiteLabel: false,
    canUseMultiUser: false,
  },

  starter: {
    maxProducts: 5,
    maxScansPerMonth: 1000,
    canUseAlerts: false,
    canUseAdvancedAnalytics: false,
    canUseExports: false,
    canUseAPI: false,
    canUseWhiteLabel: false,
    canUseMultiUser: false,
  },

  pro: {
    maxProducts: 25,
    maxScansPerMonth: 10000,
    canUseAlerts: true,
    canUseAdvancedAnalytics: true,
    canUseExports: false,
    canUseAPI: false,
    canUseWhiteLabel: false,
    canUseMultiUser: false,
  },

  business: {
    maxProducts: 100,
    maxScansPerMonth: 50000,
    canUseAlerts: true,
    canUseAdvancedAnalytics: true,
    canUseExports: true,
    canUseAPI: false,
    canUseWhiteLabel: false,
    canUseMultiUser: true,
  },

  enterprise: {
    maxProducts: 999999,
    maxScansPerMonth: 999999999,
    canUseAlerts: true,
    canUseAdvancedAnalytics: true,
    canUseExports: true,
    canUseAPI: true,
    canUseWhiteLabel: true,
    canUseMultiUser: true,
  },
}
export function normalizePlan(p: unknown): PlanType {
  const value = String(p ?? '').trim().toLowerCase()

  if (value === 'enterprise') return 'enterprise'
  if (value === 'business') return 'business'
  if (value === 'pro') return 'pro'
  if (value === 'starter') return 'starter'

  return 'free'
}

export function isAtLeast(plan: PlanType, required: PlanType) {
  return rank[plan] >= rank[required]
}

export function isEnterprise(plan: PlanType) {
  return isAtLeast(plan, 'enterprise')
}

export function isPro(plan: PlanType) {
  return isAtLeast(plan, 'pro')
}

export function getPlanLimits(plan: unknown): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)]
}

export function canCreateProduct(params: {
  plan: unknown
  currentProductCount: number
}) {
  const limits = getPlanLimits(params.plan)
  return params.currentProductCount < limits.maxProducts
}

export function canUseAlerts(plan: unknown) {
  return getPlanLimits(plan).canUseAlerts
}

export function canUseAdvancedAnalytics(plan: unknown) {
  return getPlanLimits(plan).canUseAdvancedAnalytics
}

export function canUseExports(plan: unknown) {
  return getPlanLimits(plan).canUseExports
}
export function canUseAPI(plan: unknown) {
  return getPlanLimits(plan).canUseAPI
}

export function canUseWhiteLabel(plan: unknown) {
  return getPlanLimits(plan).canUseWhiteLabel
}

export function canUseMultiUser(plan: unknown) {
  return getPlanLimits(plan).canUseMultiUser
}

export function canUseMonthlyScan(params: {
  plan: unknown
  currentMonthlyScanCount: number
}) {
  const limits = getPlanLimits(params.plan)
  return params.currentMonthlyScanCount < limits.maxScansPerMonth
}

export function planRequiredEnterprise(extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: 'plan_required',
      required_plan: 'enterprise',
      ...(extra ?? {}),
    },
    { status: 402 }
  )
}

export function planRequired(
  required_plan: PlanType,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      ok: false,
      error: 'plan_required',
      required_plan,
      ...(extra ?? {}),
    },
    { status: 402 }
  )
}

export function productLimitReached(extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: 'product_limit_reached',
      required_plan: 'pro',
      ...(extra ?? {}),
    },
    { status: 402 }
  )
}