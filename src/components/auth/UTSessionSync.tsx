'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { normalizeMemberPlan } from '@/lib/plans'

declare global {
  interface Window {
    __utSetSession?: (email: string | null, plan: string | null) => void
    __utClearSession?: () => void
  }
}

/**
 * Sync the global site session from the verified server session.
 *
 * The previous implementation fell back to `/api/billing/plan-status?email=`,
 * which returned whichever address was supplied and therefore exposed member
 * data to an unauthenticated caller. `/api/billing/session` already covers both
 * credential types — a Supabase access token when one is held, otherwise the
 * NextAuth session cookie — so the unauthenticated fallback is removed rather
 * than replaced.
 *
 * Only the verified address the server reports is published to the UI; the
 * locally cached address is never used as the label for membership state.
 */
export async function syncCurrentSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/billing/session', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      if (data?.authenticated && data?.email) {
        window.__utSetSession?.(data.email, normalizeMemberPlan(data?.plan))
        return
      }
    }

    // Unauthenticated, rejected or failed: clear it rather than leave a
    // previous identity's membership state cached in the UI.
    window.__utClearSession?.()
  } catch {
    window.__utClearSession?.()
  }
}

export default function UTSessionSync() {
  useEffect(() => {
    void syncCurrentSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void syncCurrentSession()
    })

    const onFocus = () => {
      void syncCurrentSession()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  return null
}