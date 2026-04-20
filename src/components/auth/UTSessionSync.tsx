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

    if (!session?.user?.email || !session.access_token) {
      window.__utClearSession?.()
      return
    }

    const res = await fetch('/api/billing/session', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      window.__utSetSession?.(session.user.email, 'guest')
      return
    }

    const data = await res.json()
    window.__utSetSession?.(session.user.email, normalizeMemberPlan(data?.plan))
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

    return () => subscription.unsubscribe()
  }, [])

  return null
}
