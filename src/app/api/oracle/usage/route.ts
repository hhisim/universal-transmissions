import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { getGuestTotalLimit } from '@/lib/plans'

/**
 * GET /api/oracle/usage?anonymous_id=uuid
 * Returns: { used, limit, remaining, resetAt }
 *
 * Logic:
 *  - Authenticated Free user  → query ut_oracle_usage for today (date = now)
 *  - Authenticated Initiate  → { used: 0, limit: 'unlimited' }
 *  - Guest (anonymous_id)    → query ut_guest_usage for total_count vs guestTotalLimit
 */
export async function GET(req: NextRequest) {
  const anonymousId = req.nextUrl.searchParams.get('anonymous_id')

  try {
    const session = await auth()

    // ── Authenticated user ────────────────────────────────────────────────
    if (session?.user?.email) {
      const email = session.user.email

      // Check profile for plan
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('plan')
        .eq('email', email)
        .maybeSingle()

      const plan = profile?.plan ?? 'guest'

      // Initiate = unlimited
      if (plan === 'initiate') {
        return NextResponse.json({ used: 0, limit: 'unlimited', remaining: 'unlimited', resetAt: null, tier: 'initiate' })
      }

      // Free = daily counter
      if (plan === 'free') {
        const today = new Date().toISOString().split('T')[0]
        const { data: row } = await supabaseAdmin
          .from('ut_oracle_usage')
          .select('count')
          .eq('email', email)
          .eq('date', today)
          .maybeSingle()

        const used = row?.count ?? 0
        const limit = 25
        const remaining = Math.max(0, limit - used)
        const resetAt = new Date()
        resetAt.setHours(23, 59, 59, 999)

        return NextResponse.json({ used, limit, remaining, resetAt: resetAt.toISOString(), tier: 'free' })
      }

      // guest plan (authenticated but no profile yet)
      return NextResponse.json({ used: 0, limit: 25, remaining: 25, resetAt: null, tier: 'free' })
    }

    // ── Guest (anonymous_id) ───────────────────────────────────────────────
    if (!anonymousId) {
      // No session, no anonymous_id → treat as brand-new guest
      return NextResponse.json({ used: 0, limit: getGuestTotalLimit(), remaining: getGuestTotalLimit(), resetAt: null, tier: 'guest' })
    }

    const { data: guestRow } = await supabaseAdmin
      .from('ut_guest_usage')
      .select('total_count')
      .eq('anonymous_id', anonymousId)
      .maybeSingle()

    const used = guestRow?.total_count ?? 0
    const limit = getGuestTotalLimit()
    const remaining = Math.max(0, limit - used)

    return NextResponse.json({ used, limit, remaining, resetAt: null, tier: 'guest' })

  } catch (err) {
    console.error('[oracle/usage GET]', err)
    // Fail open — allow the question through
    return NextResponse.json({ used: 0, limit: 25, remaining: 25, resetAt: null, tier: 'guest' }, { status: 200 })
  }
}

/**
 * POST /api/oracle/usage
 * Body: { anonymous_id?: string }
 * Increments the question counter.
 *
 * Logic mirrors GET — Free gets +1 on daily counter, Guest gets +1 on total.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { anonymous_id } = body

  try {
    const session = await auth()

    // ── Authenticated user ────────────────────────────────────────────────
    if (session?.user?.email) {
      const email = session.user.email

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('plan')
        .eq('email', email)
        .maybeSingle()

      const plan = profile?.plan ?? 'guest'

      if (plan === 'initiate') {
        return NextResponse.json({ success: true, tier: 'initiate' })
      }

      if (plan === 'free') {
        const today = new Date().toISOString().split('T')[0]
        // Upsert: increment count for today
        try {
          await supabaseAdmin.rpc('increment_oracle_usage', {
            p_email: email,
            p_date: today,
          })
        } catch {
          // Fallback if RPC not available
          const { data: existing } = await supabaseAdmin
            .from('ut_oracle_usage')
            .select('count')
            .eq('email', email)
            .eq('date', today)
            .maybeSingle()

          if (existing) {
            await supabaseAdmin
              .from('ut_oracle_usage')
              .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
              .eq('email', email)
              .eq('date', today)
          } else {
            await supabaseAdmin
              .from('ut_oracle_usage')
              .insert({ email, date: today, count: 1 })
          }
        }

        return NextResponse.json({ success: true, tier: 'free' })
      }

      return NextResponse.json({ success: true, tier: 'guest' })
    }

    // ── Guest ─────────────────────────────────────────────────────────────
    if (!anonymous_id) {
      // Can't track — allow but don't count (graceful degradation)
      return NextResponse.json({ success: true, tier: 'guest' })
    }

    // Upsert guest total count
    try {
      await supabaseAdmin.rpc('increment_guest_usage', {
        p_anonymous_id: anonymous_id,
      })
    } catch {
      const { data: existing } = await supabaseAdmin
        .from('ut_guest_usage')
        .select('total_count')
        .eq('anonymous_id', anonymous_id)
        .maybeSingle()

      if (existing) {
        await supabaseAdmin
          .from('ut_guest_usage')
          .update({ total_count: existing.total_count + 1, updated_at: new Date().toISOString() })
          .eq('anonymous_id', anonymous_id)
      } else {
        await supabaseAdmin
          .from('ut_guest_usage')
          .insert({ anonymous_id, total_count: 1 })
      }
    }

    return NextResponse.json({ success: true, tier: 'guest' })

  } catch (err) {
    console.error('[oracle/usage POST]', err)
    // Fail open
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
