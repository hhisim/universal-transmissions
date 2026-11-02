import { NextRequest, NextResponse } from 'next/server'
import { peekQuota } from '@/lib/oracle-quota'

/**
 * GET /api/oracle-v2/usage — the same allowance as /api/oracle/usage, from the same store.
 *
 * Two Oracle surfaces must never disagree: an allowance read here is the allowance spent
 * there. Both call peekQuota, which reads the shared counter and spends nothing.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const decision = await peekQuota(req)
    return NextResponse.json({
      used: decision.used,
      limit: decision.limit,
      remaining: decision.remaining,
      resetAt: decision.resetAt,
      tier: decision.plan,
      plan: decision.plan,
      window: decision.window,
      allowed: decision.allowed,
    })
  } catch (err) {
    console.error('[oracle-v2/usage GET]', err)
    return NextResponse.json(
      { used: null, limit: null, remaining: null, resetAt: null, tier: 'unknown', error: 'usage unavailable' },
      { status: 200 }
    )
  }
}

/** Retained for compatibility. Identical to GET; it does not spend. */
export async function POST(req: NextRequest) {
  return GET(req)
}
