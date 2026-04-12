import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const anonymousId = req.nextUrl.searchParams.get('anonymousId')

  if (!email && !anonymousId) {
    return NextResponse.json({ error: 'email or anonymousId required' }, { status: 400 })
  }

  try {
    if (email) {
      // Try ut_members first
      const { data: member } = await supabaseAdmin
        .from('ut_members')
        .select('plan, subscription_status')
        .eq('email', email)
        .maybeSingle()

      if (member?.plan) {
        return NextResponse.json({ plan: member.plan, source: 'ut_members' })
      }

      // Fallback: profiles table
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('plan')
        .eq('email', email)
        .maybeSingle()

      return NextResponse.json({
        plan: profile?.plan ?? 'free',
        source: profile?.plan ? 'profiles' : 'default_free',
      })
    }

    // Anonymous user — always free
    return NextResponse.json({ plan: 'free', source: 'anonymous' })
  } catch (err) {
    console.error('[integration/plan] error:', err)
    return NextResponse.json({ plan: 'free', source: 'error_fallback' })
  }
}