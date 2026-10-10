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

/**
 * Resolve the plan for the VERIFIED caller.
 *
 * The previous version fell back to the plan-status endpoint with a caller-
 * supplied address, which returned member data to an unauthenticated caller.
 * The session endpoint verifies the Supabase access token when present and
 * otherwise the NextAuth session cookie, so that single verified call replaces
 * the fallback. The locally cached address is never sent as an identity claim.
 */
export async function fetchPlan(token?: string): Promise<{ plan: PlanId; stripeCustomerId?: string }> {
  try {
    const res = await fetch('/api/billing/session', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.authenticated) {
        return { plan: normalizeMemberPlan(data.plan), stripeCustomerId: data.stripeCustomerId }
      }
      // Verified as unauthenticated: report guest, expose no member data.
      return { plan: 'guest' }
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
      const { plan, stripeCustomerId } = await fetchPlan(session.access_token)
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
        fetchPlan(session.access_token).then(({ plan, stripeCustomerId }) => {
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
        fetchPlan(session.access_token).then(({ plan, stripeCustomerId }) => {
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
