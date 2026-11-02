import { NextRequest, NextResponse } from 'next/server'
import { peekQuota } from '@/lib/oracle-quota'

/**
 * GET /api/oracle/usage — report the caller's allowance. Read only.
 *
 * The counter is owned by /api/oracle, which spends a unit per question it answers
 * (see src/lib/oracle-quota.ts). This endpoint no longer increments: it used to, which
 * let a client inflate its own usage, and it disagreed with what the chat route had
 * actually spent.
 *
 * Contract (unchanged for existing callers, plus fields):
 *   { used, limit, remaining, resetAt, tier }   tier mirrors plan
 *   { plan, window, allowed }                   added
 *
 * Guest    → lifetime allowance, keyed by a server-bound identity (the `anonymous_id`
 *            query string is ignored: a caller can invent it).
 * Free     → daily allowance, resetting at 00:00 UTC.
 * Initiate → unlimited, subject to a rate window as abuse protection.
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
    console.error('[oracle/usage GET]', err)
    // Report an unreadable counter as unknown — never as a fresh allowance.
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
