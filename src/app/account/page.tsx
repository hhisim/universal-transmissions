'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/ui/Navigation'
import Footer from '@/components/ui/Footer'
import SectionReveal from '@/components/ui/SectionReveal'
import ZalgoText from '@/components/ui/ZalgoText'
import PageBackground from '@/components/scenes/PageBackground'
import { PLAN_CONFIG, PlanId } from '@/lib/plans'
import { Crown, User, CreditCard, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function AccountPage() {
  return (
    <>
      <PageBackground variant="homepage" />
      <Suspense fallback={
        <>
          <Navigation />
          <main className="pt-24 pb-20 min-h-screen flex items-center justify-center" style={{ background: 'var(--ut-black)' }}>
            <div className="text-center">
              <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--ut-gold)' }}>Loading...</div>
            </div>
          </main>
          <Footer />
        </>
      }>
        <AccountPageContent />
      </Suspense>
    </>
  );
}

function AccountPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [todayUsage, setTodayUsage] = useState(0)

  const justUpgraded = searchParams.get('success') === '1'

  useEffect(() => {
    async function load() {
      try {
        // Get Supabase session first
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        if (!supabaseSession?.access_token) {
          router.push('/login')
          return
        }

        // Pass Bearer token to /api/billing/session
        const data = await fetch('/api/billing/session', {
          headers: { Authorization: `Bearer ${supabaseSession.access_token}` },
        }).then(r => r.json())

        if (!data.authenticated) {
          router.push('/signup')
          return
        }
        setSession(data)

        // Fetch today's Oracle usage
        try {
          const usageRes = await fetch('/api/oracle', {
            headers: { Authorization: `Bearer ${supabaseSession.access_token}` },
          })
          if (usageRes.ok) {
            const usageData = await usageRes.json()
            setTodayUsage(usageData.used ?? 0)
          }
        } catch {
          // ignore
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      const token = supabaseSession?.access_token
      if (!token) { alert('Not signed in.'); return }
      const r = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json()
      if (d.url) window.location.href = d.url
      else alert('Could not open billing portal.')
    } catch {
      alert('Billing portal error.')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="pt-24 pb-20 min-h-screen flex items-center justify-center" style={{ background: 'var(--ut-black)' }}>
          <div className="text-center">
            <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--ut-gold)' }}>Loading...</div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!session) return null

  const plan = (session.plan as PlanId) || 'free'
  const cfg = PLAN_CONFIG[plan]
  const isInitiate = plan === 'initiate'

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20 min-h-screen" style={{ background: 'var(--ut-black)' }}>
        <div className="container-ut max-w-2xl mx-auto">

          {/* Header */}
          <SectionReveal>
            <div className="text-center mb-12 pt-8">
              {justUpgraded && (
                <div className="mb-6 p-4 border" style={{ borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.04)' }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle size={14} style={{ color: '#22d3ee' }} />
                    <span className="font-heading text-sm tracking-wider" style={{ color: '#22d3ee' }}>Initiate Activated</span>
                  </div>
                  <p className="font-body text-sm" style={{ color: 'var(--ut-white-dim)' }}>Welcome to Initiate. Your Oracle access is now unlimited.</p>
                </div>
              )}
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'var(--ut-gold)', opacity: 0.6 }}>
                [ Member Account ]
              </p>
              <h1 className="font-display text-4xl md:text-5xl mb-4">
                <ZalgoText text="Your Account" intensity="moderate" />
              </h1>
              <p className="font-body text-base" style={{ color: 'var(--ut-white-dim)' }}>
                {session.email}
              </p>
            </div>
          </SectionReveal>

          {/* Plan card */}
          <SectionReveal delay={0.1}>
            <div
              className="p-8 border ut-card"
              style={{ borderColor: isInitiate ? 'rgba(212,168,71,0.3)' : 'rgba(34,211,238,0.2)' }}
            >
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 flex items-center justify-center border"
                    style={{
                      borderColor: isInitiate ? 'rgba(212,168,71,0.4)' : 'rgba(34,211,238,0.3)',
                      background: isInitiate ? 'rgba(212,168,71,0.05)' : 'rgba(34,211,238,0.04)',
                    }}
                  >
                    {isInitiate
                      ? <Crown size={20} style={{ color: '#d4a847' }} />
                      : <Zap size={20} style={{ color: '#22d3ee' }} />
                    }
                  </div>
                  <div>
                    <div className="font-heading text-base tracking-wider" style={{ color: isInitiate ? '#d4a847' : '#22d3ee' }}>
                      {cfg.name}
                    </div>
                    <div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--ut-white-faint)' }}>
                      Oracle Plan
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {cfg.priceMonthly === 0
                    ? <span className="font-heading text-2xl" style={{ color: '#22d3ee' }}>Free</span>
                    : <><span className="font-heading text-2xl" style={{ color: '#d4a847' }}>${cfg.priceMonthly}</span><span className="font-body text-sm ml-1" style={{ color: 'var(--ut-white-faint)' }}>/mo</span></>
                  }
                </div>
              </div>

              <p className="font-body text-sm mb-6" style={{ color: 'var(--ut-white-dim)', lineHeight: 1.7 }}>
                {cfg.description}
              </p>

              {/* Usage stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: 'var(--ut-white-faint)' }}>Today</div>
                  <div className="font-heading text-xl" style={{ color: 'var(--ut-white)' }}>
                    {todayUsage}{isInitiate ? '' : ` / ${cfg.dailyLimit}`}
                  </div>
                  {isInitiate && <div className="font-mono text-[8px] tracking-widest uppercase mt-0.5" style={{ color: '#d4a847' }}>Unlimited</div>}
                </div>
                {session.current_period_end && (
                  <div className="p-4 border" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: 'var(--ut-white-faint)' }}>Renews</div>
                    <div className="font-heading text-base" style={{ color: 'var(--ut-white)' }}>
                      {formatDate(session.current_period_end)}
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription status */}
              {isInitiate && session.subscription_status && session.subscription_status !== 'active' && (
                <div className="mb-4 p-3 border flex items-center gap-2" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
                  <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                  <span className="font-mono text-[10px] tracking-wider" style={{ color: '#f59e0b' }}>
                    Subscription {session.subscription_status.replace('_', ' ')}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {isInitiate && (
                  <button
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    className="btn-primary text-xs px-6 py-3 disabled:opacity-50"
                  >
                    {portalLoading ? 'Opening...' : 'Manage Billing'}
                  </button>
                )}
                {!isInitiate && (
                  <Link href="/sanctum/member/oracle#plans" className="btn-primary text-xs px-6 py-3 inline-flex items-center gap-2">
                    <Crown size={12} /> Upgrade to Initiate
                  </Link>
                )}
              </div>
            </div>
          </SectionReveal>

          {/* Oracle link */}
          <SectionReveal delay={0.2}>
            <div className="mt-6 p-6 border ut-card" style={{ borderColor: 'rgba(217,70,239,0.15)' }}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border" style={{ borderColor: 'rgba(217,70,239,0.2)', background: 'rgba(217,70,239,0.04)' }}>
                    <Zap size={18} style={{ color: '#d946ef' }} />
                  </div>
                  <div>
                    <div className="font-heading text-sm tracking-wider" style={{ color: '#d946ef' }}>Codex Oracle</div>
                    <div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--ut-white-faint)' }}>Access the Oracle</div>
                  </div>
                </div>
                <Link href="/oracle" className="btn-secondary text-[10px] px-5 py-2.5">
                  Open Oracle
                </Link>
              </div>
            </div>
          </SectionReveal>

          {/* Back links */}
          <SectionReveal delay={0.3}>
            <div className="mt-8 text-center">
              <Link href="/sanctum/member" className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ut-white-dim)', opacity: 0.4 }}>
                ← Member Home
              </Link>
            </div>
          </SectionReveal>

        </div>
      </main>
      <Footer />
    </>
  )
}
