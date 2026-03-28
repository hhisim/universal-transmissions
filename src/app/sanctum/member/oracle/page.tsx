'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/ui/Navigation'
import Footer from '@/components/ui/Footer'
import SectionReveal from '@/components/ui/SectionReveal'
import ZalgoText from '@/components/ui/ZalgoText'
import { Crown, Zap, CheckCircle, ArrowRight } from 'lucide-react'

export default function MemberOraclePage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<string>('guest')
  const [usage, setUsage] = useState<number>(0)
  const [limit, setLimit] = useState<number | 'unlimited'>('unlimited')
  const [planStatus, setPlanStatus] = useState<string>('')

  useEffect(() => {
    fetch('/api/billing/session')
      .then(r => r.json())
      .then(async (data) => {
        if (!data.authenticated) {
          router.push('/sanctum/member/login?returnTo=/sanctum/member/oracle')
          return
        }
        setSession(data)
        setPlan(data.plan || 'guest')
        setPlanStatus(data.subscription_status || '')

        // Fetch oracle usage
        try {
          const tokenRes = await fetch('/api/auth/session')
          const tokenData = await tokenRes.json()
          const token = tokenData?.tokens?.access_token
          if (token) {
            const usageRes = await fetch('/api/oracle', {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (usageRes.ok) {
              const usageData = await usageRes.json()
              setUsage(usageData.used ?? 0)
              setLimit(usageData.limit ?? 'unlimited')
            }
          }
        } catch {}
      })
      .finally(() => setLoading(false))
  }, [router])

  const planConfig: Record<string, { name: string; color: string; desc: string; icon: any }> = {
    guest: {
      name: 'Guest',
      color: 'rgba(107,101,128,0.5)',
      desc: 'Create an account to unlock more questions.',
      icon: Zap,
    },
    free: {
      name: 'Free Account',
      color: '#22d3ee',
      desc: '25 questions per day. Upgrade for unlimited.',
      icon: Zap,
    },
    initiate: {
      name: 'Initiate',
      color: '#d4a847',
      desc: 'Unlimited Oracle access. All modes, all languages.',
      icon: Crown,
    },
  }

  const cfg = planConfig[plan] || planConfig.guest
  const Icon = cfg.icon
  const isUnlimited = limit === 'unlimited'
  const usagePercent = isUnlimited ? 0 : Math.min((usage / (limit as number)) * 100, 100)

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24 pb-20" style={{ background: 'var(--ut-black, #0a090e)' }}>
        <SectionReveal>
          <div className="max-w-2xl mx-auto px-6">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="text-xs uppercase tracking-[0.3em] mb-4" style={{ color: cfg.color, fontFamily: 'Cinzel, serif' }}>
                [ Oracle Access ]
              </div>
              <h1 style={{
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: 'clamp(22px, 5vw, 38px)',
                letterSpacing: '0.08em',
                background: 'linear-gradient(135deg, #d946ef 0%, #9333ea 50%, #22d3ee 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Your Oracle Status
              </h1>
            </div>

            {/* Plan Card */}
            <div className="mb-8 p-8" style={{
              border: `1px solid ${cfg.color}40`,
              background: `linear-gradient(160deg, ${cfg.color}08 0%, rgba(10,9,14,0.95) 60%)`,
              backdropFilter: 'blur(12px)',
            }}>
              <div className="flex items-center gap-4 mb-6">
                <div style={{
                  width: 48, height: 48,
                  border: `1px solid ${cfg.color}60`,
                  background: `${cfg.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={20} color={cfg.color} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, letterSpacing: '0.15em', color: cfg.color }}>
                    {cfg.name}
                  </div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, color: 'rgba(237,233,246,0.4)' }}>
                    {session?.email}
                  </div>
                </div>
                {plan === 'initiate' && (
                  <div className="ml-auto" style={{
                    padding: '4px 12px',
                    border: '1px solid rgba(212,168,71,0.3)',
                    background: 'rgba(212,168,71,0.05)',
                    fontFamily: 'Cinzel, serif', fontSize: 9,
                    letterSpacing: '0.15em', color: '#d4a847',
                    textTransform: 'uppercase'
                  }}>
                    Active
                  </div>
                )}
              </div>

              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, color: 'rgba(237,233,246,0.6)', lineHeight: 1.7, marginBottom: 24 }}>
                {cfg.desc}
              </div>

              {/* Usage meter */}
              {plan !== 'initiate' && (
                <div>
                  <div className="flex justify-between mb-2" style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.15em', color: 'rgba(237,233,246,0.4)' }}>
                    <span>Today&apos;s Usage</span>
                    <span>{isUnlimited ? '∞' : `${usage} / ${limit}`}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${usagePercent}%`,
                      height: '100%',
                      background: plan === 'guest' ? 'rgba(107,101,128,0.5)' : '#22d3ee',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )}

              {plan === 'initiate' && (
                <div className="flex items-center gap-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, color: '#d4a847' }}>
                  <CheckCircle size={14} />
                  Unlimited questions active
                </div>
              )}
            </div>

            {/* Upgrade CTA for non-initiate */}
            <div id="plans" />
            {plan !== 'initiate' && (
              <div className="mb-8 p-6" style={{
                border: '1px solid rgba(212,168,71,0.2)',
                background: 'rgba(212,168,71,0.03)',
              }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: '0.15em', color: '#d4a847', marginBottom: 12 }}>
                  Upgrade to Initiate
                </div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, color: 'rgba(237,233,246,0.5)', marginBottom: 20, lineHeight: 1.7 }}>
                  Unlimited questions, all Oracle modes, all languages, full message history.
                </div>
                <Link href="/sanctum/member/oracle#plans" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 28px',
                  border: '1px solid rgba(212,168,71,0.4)',
                  background: 'rgba(212,168,71,0.06)',
                  color: '#d4a847',
                  fontFamily: 'Cinzel, serif', fontSize: 10,
                  letterSpacing: '0.25em', textTransform: 'uppercase',
                  textDecoration: 'none', transition: 'all 0.3s',
                }}>
                  View Plans <ArrowRight size={12} />
                </Link>
              </div>
            )}

            {/* Go to Oracle */}
            <div className="text-center">
              <Link href="/oracle" className="btn-primary">
                Enter the Oracle
              </Link>
            </div>

            {/* Account links */}
            <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex justify-between items-center">
                <Link href="/account" style={{
                  fontFamily: 'Cinzel, serif', fontSize: 10,
                  letterSpacing: '0.2em', color: 'rgba(237,233,246,0.3)',
                  textTransform: 'uppercase', textDecoration: 'none',
                }}>
                  ← Account
                </Link>
                <Link href="/sanctum/member/oracle#plans" style={{
                  fontFamily: 'Cinzel, serif', fontSize: 10,
                  letterSpacing: '0.2em', color: 'rgba(237,233,246,0.3)',
                  textTransform: 'uppercase', textDecoration: 'none',
                }}>
                  Pricing →
                </Link>
              </div>
            </div>
          </div>
        </SectionReveal>
      </main>
      <Footer />
    </>
  )
}
