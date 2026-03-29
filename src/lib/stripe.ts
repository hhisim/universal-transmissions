import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    stripeClient = new Stripe(key, {
      apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
      // Use fetch instead of Node's http module — required for Vercel serverless
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return stripeClient
}

// Alias for existing code that imports `stripe`
export const stripe = getStripe()
