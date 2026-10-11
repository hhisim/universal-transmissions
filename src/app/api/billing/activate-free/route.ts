import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveVerifiedEmail } from '@/lib/verified-identity'
import { writeMembershipRow } from '@/lib/membership-write'

/**
 * Activate the free plan for the signed-in caller.
 *
 * Batch 14 changes:
 *   - Identity comes from resolveVerifiedEmail() (the Batch 12 boundary), not
 *     from a raw auth() call, so the address is normalised the same way as
 *     every other verified path.
 *   - The write goes through writeMembershipRow(), which reads first, inspects
 *     every error, refuses to downgrade a paid plan and refuses to insert a
 *     profiles row without its NOT NULL primary key.
 *   - A failed write is reported as a failure. The previous version answered
 *     `{ success: true, plan: "free" }` unconditionally, including when the
 *     upsert had been rejected with 42P10 because no unique index on email
 *     exists — so callers were told the plan had changed when nothing had.
 */
export async function POST(req: NextRequest) {
  try {
    const email = await resolveVerifiedEmail(req)
    if (!email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const result = await writeMembershipRow(
      supabaseAdmin,
      'profiles',
      email,
      { plan: 'free' },
      { protectPaidPlan: true }
    )

    if (!result.ok) {
      if (result.reason === 'downgrade_refused') {
        // The account already holds a paid plan. Do not touch it, and do not
        // claim a free activation took effect.
        return NextResponse.json(
          {
            error: 'A paid membership is already active on this account',
            code: 'PAID_MEMBERSHIP_ACTIVE',
            plan: (result.detail.match(/"([^"]+)"/)?.[1]) ?? null,
          },
          { status: 409 }
        )
      }
      if (result.reason === 'missing_identity') {
        // profiles.user_id is NOT NULL with no default and the NextAuth session
        // carries no uuid, so a new profile row cannot be created here. Report
        // that honestly instead of returning success.
        return NextResponse.json(
          {
            error: 'Free activation is not available for this account yet',
            code: 'PROFILE_IDENTITY_UNRESOLVED',
          },
          { status: 409 }
        )
      }
      console.error('[activate-free] write failed:', result.reason, result.detail)
      return NextResponse.json({ error: 'Failed to activate free plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, plan: (result.row.plan as string) ?? 'free' })
  } catch (err) {
    console.error('[activate-free]', err)
    return NextResponse.json({ error: 'Failed to activate free plan' }, { status: 500 })
  }
}
