import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getDailyLimit, PlanId } from '@/lib/plans'

const BACKEND_URL = process.env.ORACLE_BACKEND_URL || 'http://204.168.154.237:8002'

const ALLOWED_ORIGINS = [
  'https://www.universal-transmissions.com',
  'https://universal-transmissions.com',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
  if (origin && ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith(`.${o.replace('https://', '')}`))) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
  }
  return headers
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// ─── GET /api/oracle → usage status ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Check for Supabase session token in Authorization header
  const authHeader = req.headers.get('authorization')
  const sessionToken = authHeader?.replace('Bearer ', '')

  let userId: string | null = null
  let plan: PlanId = 'free'
  let isLoggedIn = false

  if (sessionToken) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(sessionToken)
      if (user) {
        userId = user.id
        isLoggedIn = true
        // Fetch plan from profiles table (try UUID first, fall back to email)
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('plan')
          .eq('id', userId)
        const profileByEmail = !profile
          ? await supabaseAdmin.from('profiles').select('plan').eq('email', email).maybeSingle()
          : null
          .maybeSingle()
        const profileByEmail = !profile
          ? await supabaseAdmin.from('profiles').select('plan').eq('email', email).maybeSingle()
          : null
        plan = ((profile ?? profileByEmail)?.plan as PlanId) || 'free'
      }
    } catch {
      // continue as guest
    }
  }

  // Guest gets 10 total
  if (!isLoggedIn) {
    const guestUsed = parseInt(req.cookies.get('ut_guest_questions_total')?.value || '0', 10)
    const lastDay = req.cookies.get('ut_guest_last_day')?.value
    const used = lastDay === todayKey() ? guestUsed : 0
    return NextResponse.json({
      used,
      limit: 10,
      plan: 'guest',
      isLoggedIn: false,
      upgrade: '/pricing',
      login: '/signup',
    }, { headers: corsHeaders })
  }

  // Logged-in user: get today's usage
  const today = todayKey()
  let used = 0
  if (userId) {
    const { data: usage } = await supabaseAdmin
      .from('oracle_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
    used = usage?.count ?? 0
  }

  const limit = getDailyLimit(plan)

  return NextResponse.json({
    used,
    limit,
    plan,
    isLoggedIn: true,
    upgrade: plan === 'free' ? '/pricing' : undefined,
  }, { headers: corsHeaders })
}

// ─── POST /api/oracle → ask the Oracle ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  const body = await req.json().catch(() => ({}))
  const message = String(body?.message || '').trim()
  const mode = String(body?.mode || 'oracle')
  const lang = String(body?.lang || 'en')
  const speed = String(body?.speed || 'fast')

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400, headers: corsHeaders })
  }

  // Auth check
  const authHeader = req.headers.get('authorization')
  const sessionToken = authHeader?.replace('Bearer ', '')

  let userId: string | null = null
  let plan: PlanId = 'free'
  let isLoggedIn = false

  if (sessionToken) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(sessionToken)
      if (user) {
        userId = user.id
        isLoggedIn = true
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('plan')
          .eq('id', userId)
        const profileByEmail = !profile
          ? await supabaseAdmin.from('profiles').select('plan').eq('email', email).maybeSingle()
          : null
          .maybeSingle()
        plan = ((profile ?? profileByEmail)?.plan as PlanId) || 'free'
      }
    } catch {
      // continue
    }
  }

  const today = todayKey()

  // ── Guest gate: 10 total questions ──────────────────────────────────────
  if (!isLoggedIn) {
    const guestUsed = parseInt(req.cookies.get('ut_guest_questions_total')?.value || '0', 10)
    const lastDay = req.cookies.get('ut_guest_last_day')?.value
    const effectiveUsed = lastDay === today ? guestUsed : 0

    if (effectiveUsed >= 10) {
      return NextResponse.json({
        error: 'limit_reached',
        upgrade: '/pricing',
        login: '/signup',
        limit: 10,
        used: effectiveUsed,
      }, { status: 403, headers: corsHeaders })
    }

    // Call backend
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)
      const upstream = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: 'codex', mode, lang, speed, message }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!upstream.ok) {
        return NextResponse.json(
          { error: 'The Codex Oracle is temporarily unavailable.' },
          { status: 502, headers: corsHeaders }
        )
      }

      const data = await upstream.json()
      const response = new NextResponse(JSON.stringify({ response: data.response || data.answer || '' }), {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })

      const nextUsed = effectiveUsed + 1
      response.cookies.set('ut_guest_questions_total', String(nextUsed), { path: '/', maxAge: 31536000, httpOnly: true, sameSite: 'lax' })
      response.cookies.set('ut_guest_last_day', today, { path: '/', maxAge: 31536000, httpOnly: true, sameSite: 'lax' })
      return response
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('abort')) {
        return NextResponse.json({ error: 'The Oracle took too long.' }, { status: 504, headers: corsHeaders })
      }
      return NextResponse.json({ error: 'The transmission was interrupted.' }, { status: 500, headers: corsHeaders })
    }
  }

  // ── Authenticated gate ────────────────────────────────────────────────────
  if (plan === 'free') {
    // Get today's usage
    const { data: usage } = await supabaseAdmin
      .from('oracle_usage')
      .select('count')
      .eq('user_id', userId!)
      .eq('date', today)
      .maybeSingle()

    const used = usage?.count ?? 0
    if (used >= 25) {
      return NextResponse.json({
        error: 'limit_reached',
        upgrade: '/pricing',
        login: undefined,
        limit: 25,
        used,
      }, { status: 403, headers: corsHeaders })
    }
  }

  // ── Call Oracle backend ───────────────────────────────────────────────────
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000)
    const upstream = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'codex', mode, lang, speed, message }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'The Codex Oracle is temporarily unavailable.' },
        { status: 502, headers: corsHeaders }
      )
    }

    const data = await upstream.json()

    // Record usage for authenticated free users
    if (userId && plan === 'free') {
      const { data: existing } = await supabaseAdmin
        .from('oracle_usage')
        .select('id, count')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle()

      if (existing) {
        await supabaseAdmin
          .from('oracle_usage')
          .update({ count: existing.count + 1 })
          .eq('id', existing.id)
      } else {
        await supabaseAdmin
          .from('oracle_usage')
          .insert({ user_id: userId, date: today, count: 1 })
      }
    }

    return NextResponse.json({ response: data.response || data.answer || '' }, { headers: corsHeaders })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('abort')) {
      return NextResponse.json({ error: 'The Oracle took too long.' }, { status: 504, headers: corsHeaders })
    }
    return NextResponse.json({ error: 'The transmission was interrupted.' }, { status: 500, headers: corsHeaders })
  }
}

// ─── OPTIONS for CORS ─────────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}
