import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { getGuestTotalLimit } from '@/lib/plans'

/**
 * GET /api/oracle-v2/usage?anonymous_id=uuid
 * Returns: { used, limit, remaining, resetAt }
 */
export async function GET(req: NextRequest) {
  const anonymousId = req.nextUrl.searchParams.get('anonymous_id')

  try {
    const session = await auth()

    if (session?.user?.email) {
      const email = session.user.email

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('plan')
        .eq('email', email)
        .maybeSingle()

      const plan = profile?.plan ?? 'guest'

      if (plan === 'initiate') {
        return NextResponse.json({ used: 0, limit: 'unlimited', remaining: 'unlimited', resetAt: null, tier: 'initiate' })
      }

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

      return NextResponse.json({ used: 0, limit: 25, remaining: 25, resetAt: null, tier: 'free' })
    }

    if (!anonymousId) {
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
    console.error('[oracle-v2/usage GET]', err)
    return NextResponse.json({ used: 0, limit: 25, remaining: 25, resetAt: null, tier: 'guest' }, { status: 200 })
  }
}

/**
 * POST /api/oracle-v2/usage
 * Body: { anonymous_id?: string }
 * Increments the question counter.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { anonymous_id } = body

  try {
    const session = await auth()

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
        try {
          await supabaseAdmin.rpc('increment_oracle_usage', {
            p_email: email,
            p_date: today,
          })
        } catch {
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

    if (!anonymous_id) {
      return NextResponse.json({ success: true, tier: 'guest' })
    }

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
    console.error('[oracle-v2/usage POST]', err)
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
