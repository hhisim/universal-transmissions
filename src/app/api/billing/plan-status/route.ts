import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PlanId } from '@/lib/plans'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, stripe_customer_id')
      .eq('id', email) // id = email when using email as ID
      .maybeSingle()

    return NextResponse.json({
      plan: (profile?.plan as PlanId) ?? 'free',
      stripeCustomerId: profile?.stripe_customer_id ?? null,
    })
  } catch {
    return NextResponse.json({ plan: 'free' as PlanId })
  }
}
