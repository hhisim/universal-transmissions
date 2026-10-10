// UT Oracle Plan Configuration
// NOTE: dailyLimit values below are NOT enforced by any server route. /api/oracle has no
// plan/quota/tier check, and the Oracle client pins tier to 'guest'. The only real limit is a
// client-side counter that resets on page load. Copy must not describe these as quotas.
// Guest: 10 questions per page session (client-side, resets on reload)
// Free: same client-side behaviour; no additional allowance exists
// Initiate: $3.99/month; adds Codex II process archive + Ask Hakan

export type PlanId = 'guest' | 'free' | 'initiate'

export type PlanConfig = {
  id: PlanId
  name: string
  description: string
  dailyLimit: number | 'unlimited'
  guestTotalLimit?: number       // lifetime total for guest
  priceMonthly: number
  stripePriceId?: string
}

const INITIATE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY ?? 'price_1TG0XHD1VUXAFjstsFd04oXF'

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  guest: {
    id: 'guest',
    name: 'Guest',
    description: 'The full correspondence codex and the Oracle, open without an account.',
    dailyLimit: 10,
    guestTotalLimit: 10,
    priceMonthly: 0,
  },
  free: {
    id: 'free',
    name: 'Free',
    description: 'The same open access, with an account that recognises your membership.',
    dailyLimit: 25,
    priceMonthly: 0,
  },
  initiate: {
    id: 'initiate',
    name: 'Initiate',
    description: 'Adds the Codex II process archive and Ask Hakan, a direct message channel from the member hub. Every language and Oracle mode stays open to all.',
    dailyLimit: 'unlimited',
    priceMonthly: 3.99,
    stripePriceId: INITIATE_PRICE_ID,
  },
}

export function getPlanLimits(plan: PlanId) {
  return PLAN_CONFIG[plan] ?? PLAN_CONFIG.guest
}

export function getDailyLimit(plan: PlanId): number | 'unlimited' {
  return getPlanLimits(plan).dailyLimit
}

export function getGuestTotalLimit(): number {
  return PLAN_CONFIG.guest.guestTotalLimit ?? 10
}

export function planFromPriceId(priceId?: string | null): PlanId | null {
  if (!priceId) return null
  if (priceId === INITIATE_PRICE_ID) return 'initiate'
  return null
}


export type MemberPlan = PlanId

export function normalizeMemberPlan(plan?: string | null): MemberPlan {
  switch (plan) {
    case 'initiate':
    case 'free':
    case 'guest':
      return plan
    default:
      return 'guest'
  }
}

export function isPaidPlan(plan?: string | null): boolean {
  const normalized = normalizeMemberPlan(plan)
  return normalized === 'initiate'
}

export function getPlanLabel(plan?: string | null): string {
  const normalized = normalizeMemberPlan(plan)
  switch (normalized) {
    case 'initiate':
      return 'Initiate'
    case 'free':
      return 'Free'
    default:
      return 'Guest'
  }
}

export function getPlanTierBucket(plan?: string | null): 'guest' | 'free' | 'paid' {
  const normalized = normalizeMemberPlan(plan)
  if (normalized == 'guest') return 'guest'
  if (normalized == 'free') return 'free'
  return 'paid'
}
