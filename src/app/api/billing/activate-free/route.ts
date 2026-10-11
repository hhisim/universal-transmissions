import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveVerifiedIdentity } from '@/lib/verified-identity'
import { resolveMembershipPlan } from '@/lib/membership-plan'
import { writeMembershipRow } from '@/lib/membership-write'

/**
 * Activate the free plan for the signed-in caller.
 *
 * Batch 14b — option 3 (bounded identity direction):
 *
 *   Free activation persists membership in `ut_members`. A `profiles` row is
 *   written ONLY when the verified credential actually carries a Supabase user
 *   id, because `profiles.user_id` is NOT NULL with no default and its identity
 *   is not the address. The eight `profiles` rows whose `user_id` matches no
 *   `auth.users` row are left alone: no nullable column, no generated default,
 *   no invented identity and no backfill.
 *
 *   The effective plan is resolved across BOTH tables before writing, so this
 *   cannot downgrade a paid membership that lives in `profiles` while
 *   `ut_members` is empty.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveVerifiedIdentity(req)
    if (!identity) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const email = identity.email

    // The plan the application will actually observe, right now.
    const current = await resolveMembershipPlan(supabaseAdmin, email)
    if (!current.ok) {
      // Fail closed: an unreadable membership must not be treated as "no plan".
      console.error('[activate-free] membership lookup failed:', current.detail)
      return NextResponse.json({ error: 'Membership lookup failed' }, { status: 503 })
    }
    if (current.membership.plan === 'initiate') {
      return NextResponse.json(
        {
          error: 'A paid membership is already active on this account',
          code: 'PAID_MEMBERSHIP_ACTIVE',
          plan: current.membership.plan,
        },
        { status: 409 }
      )
    }

    // The membership record the readers consult. This is the write that makes
    // the activation observable, so a failure here is a failure of the request.
    const memberWrite = await writeMembershipRow(
      supabaseAdmin,
      'ut_members',
      email,
      { plan: 'free' },
      { protectPaidPlan: true }
    )

    if (!memberWrite.ok) {
      if (memberWrite.reason === 'downgrade_refused') {
        return NextResponse.json(
          { error: 'A paid membership is already active on this account', code: 'PAID_MEMBERSHIP_ACTIVE' },
          { status: 409 }
        )
      }
      if (memberWrite.reason === 'duplicate_rows') {
        return NextResponse.json({ error: 'Membership records are ambiguous' }, { status: 409 })
      }
      console.error('[activate-free] ut_members write failed:', memberWrite.reason, memberWrite.detail)
      return NextResponse.json({ error: 'Failed to activate free plan' }, { status: 500 })
    }

    // The Oracle profile is optional here. It is attempted only with a verified
    // uid, and a refusal there never turns a successful activation into a lie —
    // nor does a missing uid become a fabricated one.
    let profileNote: string
    if (!identity.userId) {
      profileNote = 'skipped_no_verified_user_id'
    } else {
      const profileWrite = await writeMembershipRow(
        supabaseAdmin,
        'profiles',
        email,
        { plan: 'free' },
        { protectPaidPlan: true, userId: identity.userId }
      )
      if (profileWrite.ok) {
        profileNote = profileWrite.action
      } else {
        profileNote = profileWrite.reason
        console.warn('[activate-free] profiles write skipped:', profileWrite.reason, profileWrite.detail)
      }
    }

    return NextResponse.json({
      success: true,
      plan: 'free',
      source: 'ut_members',
      profile: profileNote,
    })
  } catch (err) {
    console.error('[activate-free]', err)
    return NextResponse.json({ error: 'Failed to activate free plan' }, { status: 500 })
  }
}
