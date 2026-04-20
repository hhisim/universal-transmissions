import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeMemberPlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  try {
    const [{ data: member }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from('ut_members')
        .select('plan, stripe_customer_id')
        .eq('email', email)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('plan, stripe_customer_id')
        .eq('email', email)
        .maybeSingle(),
    ])

    return NextResponse.json({
      plan: normalizeMemberPlan(member?.plan ?? profile?.plan ?? 'guest'),
      stripeCustomerId: member?.stripe_customer_id ?? profile?.stripe_customer_id ?? null,
    })
  } catch (err) {
    console.error('[billing/plan-status]', err)
    return NextResponse.json({ plan: 'guest', stripeCustomerId: null })
  }
}
