import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const email = session.user.email

    // Upsert profile with free plan
    await supabaseAdmin
      .from('profiles')
      .upsert(
        { email, plan: 'free' },
        { onConflict: 'email' }
      )

    return NextResponse.json({ success: true, plan: 'free' })
  } catch (err) {
    console.error('[activate-free]', err)
    return NextResponse.json({ error: 'Failed to activate free plan' }, { status: 500 })
  }
}
