'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'
import { PLAN_CONFIG, PlanId } from '@/lib/plans'

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

async function fetchPlan(email: string): Promise<{ plan: PlanId; stripeCustomerId?: string }> {
  try {
    const res = await fetch(`/api/billing/plan-status?email=${encodeURIComponent(email)}`)
    if (res.ok) {
      const data = await res.json()
      return { plan: data.plan ?? 'free', stripeCustomerId: data.stripeCustomerId }
    }
  } catch {
    // fall through to free
  }
  return { plan: 'free' }
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
      const { plan, stripeCustomerId } = await fetchPlan(session.user.email!)
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
        fetchPlan(session.user.email!).then(({ plan, stripeCustomerId }) => {
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
        fetchPlan(session.user.email!).then(({ plan, stripeCustomerId }) => {
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
