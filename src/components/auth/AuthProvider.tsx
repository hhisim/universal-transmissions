'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'
import { PlanId, normalizeMemberPlan } from '@/lib/plans'

type AuthUser = {
  id: string
  email: string
}

type AuthState = {
  user: AuthUser | null
  plan: PlanId
  isAuthenticated: boolean
  loading: boolean
  stripeCustomerId?: string
}

type AuthContextType = AuthState & {
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  plan: 'free',
  isAuthenticated: false,
  loading: true,
  stripeCustomerId: undefined,
  refresh: async () => {},
  signOut: async () => {},
})

async function fetchPlan(email: string, token?: string): Promise<{ plan: PlanId; stripeCustomerId?: string }> {
  try {
    if (token) {
      const sessionRes = await fetch('/api/billing/session', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (sessionRes.ok) {
        const data = await sessionRes.json()
        return { plan: normalizeMemberPlan(data.plan), stripeCustomerId: data.stripeCustomerId }
      }
    }

    const res = await fetch(`/api/billing/plan-status?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      return { plan: normalizeMemberPlan(data.plan), stripeCustomerId: data.stripeCustomerId }
    }
  } catch {
    // fall through to guest
  }
  return { plan: 'guest' }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    plan: 'free',
    isAuthenticated: false,
    loading: true,
    stripeCustomerId: undefined,
  })

  const refresh = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { plan, stripeCustomerId } = await fetchPlan(session.user.email!, session.access_token)
      setState({
        user: { id: session.user.id, email: session.user.email! },
        plan,
        isAuthenticated: true,
        loading: false,
        stripeCustomerId,
      })
    } else {
      setState({ user: null, plan: 'free', isAuthenticated: false, loading: false })
    }
  }

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchPlan(session.user.email!, session.access_token).then(({ plan, stripeCustomerId }) => {
          setState({
            user: { id: session.user.id, email: session.user.email! },
            plan,
            isAuthenticated: true,
            loading: false,
            stripeCustomerId,
          })
        })
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchPlan(session.user.email!, session.access_token).then(({ plan, stripeCustomerId }) => {
          setState({
            user: { id: session.user.id, email: session.user.email! },
            plan,
            isAuthenticated: true,
            loading: false,
            stripeCustomerId,
          })
        })
      } else {
        setState({ user: null, plan: 'free', isAuthenticated: false, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setState({ user: null, plan: 'free', isAuthenticated: false, loading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
