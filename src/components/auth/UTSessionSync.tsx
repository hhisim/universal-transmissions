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

async function syncCurrentSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user?.email && session.access_token) {
      const res = await fetch('/api/billing/session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      })

      if (res.ok) {
        const data = await res.json()
        window.__utSetSession?.(session.user.email, normalizeMemberPlan(data?.plan))
        return
      }

      window.__utSetSession?.(session.user.email, 'guest')
      return
    }

    const fallbackSessionRes = await fetch('/api/session', { cache: 'no-store' })
    if (fallbackSessionRes.ok) {
      const fallbackSession = await fallbackSessionRes.json()
      const email = fallbackSession?.user?.email
      if (email) {
        const planRes = await fetch(`/api/billing/plan-status?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
        if (planRes.ok) {
          const planData = await planRes.json()
          window.__utSetSession?.(email, normalizeMemberPlan(planData?.plan))
          return
        }
        window.__utSetSession?.(email, 'guest')
        return
      }
    }

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
