// UT Oracle Plan Configuration
// Guest: 10 questions lifetime (localStorage, no account)
// Free: 25 questions/day (Supabase per-user counter, account required)
// Initiate: $3.99/month, unlimited questions

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
    description: '10 questions total. No account needed.',
    dailyLimit: 10,
    guestTotalLimit: 10,
    priceMonthly: 0,
  },
  free: {
    id: 'free',
    name: 'Free',
    description: '25 questions per day. Create an account to unlock more.',
    dailyLimit: 25,
    priceMonthly: 0,
  },
  initiate: {
    id: 'initiate',
    name: 'Initiate',
    description: 'Unlimited questions. All languages, all Oracle modes.',
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
