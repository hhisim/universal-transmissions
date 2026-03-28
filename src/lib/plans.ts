// UT Oracle Plan Configuration
// Free: 25 questions/day, account required
// Initiate: $3.99/month, unlimited questions

export type PlanId = 'free' | 'initiate'

export type PlanConfig = {
  id: PlanId
  name: string
  description: string
  dailyLimit: number | 'unlimited'
  priceMonthly: number
  stripePriceId?: string
}

const INITIATE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY ?? 'price_UT_INITIATE_PLACEHOLDER'

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: '25 questions per day. Create an account to begin.',
    dailyLimit: 25,
    priceMonthly: 0,
  },
  initiate: {
    id: 'initiate',
    name: 'Initiate',
    description: 'Unlimited questions. Full access to all Oracle modes.',
    dailyLimit: 'unlimited',
    priceMonthly: 3.99,
    stripePriceId: INITIATE_PRICE_ID,
  },
}

export function getPlanLimits(plan: PlanId) {
  return PLAN_CONFIG[plan] ?? PLAN_CONFIG.free
}

export function getDailyLimit(plan: PlanId): number | 'unlimited' {
  return getPlanLimits(plan).dailyLimit
}

export function planFromPriceId(priceId?: string | null): PlanId | null {
  if (!priceId) return null
  if (priceId === INITIATE_PRICE_ID) return 'initiate'
  return null
}
