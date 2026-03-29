'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/ui/Navigation'
import Footer from '@/components/ui/Footer'
import { Crown, Zap, Star, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

const TIERS = [
  {
    id: 'guest',
    name: 'Guest',
    icon: Star,
    color: 'rgba(107,101,128,0.5)',
    borderColor: 'rgba(255,255,255,0.06)',
    price: 'Free',
    priceSub: 'No account required',
    description: 'Explore the Codex Oracle in demo mode',
    features: [
      { text: '10 questions total (no account)', included: true },
      { text: 'English only', included: true },
      { text: 'Demo responses only', included: true },
      { text: 'Full correspondence web', included: false },
    ],
    cta: 'Try the Oracle',
    ctaHref: '/oracle',
    ctaStyle: 'ghost',
  },
  {
    id: 'free',
    name: 'Free Account',
    icon: Zap,
    color: '#22d3ee',
    borderColor: 'rgba(34,211,238,0.2)',
    price: 'Free',
    priceSub: 'Create an account',
    description: 'Create an account to unlock more questions',
    features: [
      { text: '25 questions per day (reset daily)', included: true },
      { text: 'EN, TR, and RU languages', included: true },
      { text: 'Full oracle responses', included: true },
      { text: 'Full correspondence web', included: false },
    ],
    cta: 'Create Free Account',
    ctaHref: '/signup',
    ctaStyle: 'cyan',
  },
  {
    id: 'initiate',
    name: 'Initiate',
    icon: Crown,
    color: '#d4a847',
    borderColor: 'rgba(212,168,71,0.35)',
    price: '$3.99',
    priceSub: 'per month',
    description: 'Unlimited access to the Codex Oracle',
    popular: true,
    features: [
      { text: 'Unlimited questions', included: true },
      { text: 'Unlimited voice messages', included: true },
      { text: 'All languages', included: true },
      { text: 'Full correspondence web', included: true },
    ],
    cta: 'Begin Initiate',
    ctaHref: '#subscribe',
    ctaStyle: 'gold',
  },
]

export default function OraclePlansPage() {
  const [session, setSession] = useState<any>(null)
  const [plan, setPlan] = useState<string>('guest')
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    fetch('/api/billing/session')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setSession(data)
          setPlan(data.plan || 'guest')
        }
      })
  }, [])

  async function handleInitiateCheckout() {
    // Check session directly via supabase client (not via API — avoids race conditions)
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) {
      window.location.href = '/signup?redirect=/oracle/plans'
      return
    }
    setCheckingOut(true)
    try {
      const r = await fetch('/api/billing/checkout', { method: 'POST' })
      const d = await r.json()
      if (d.url) window.location.href = d.url
      else alert('Could not start checkout. Please try again.')
    } catch {
      alert('Checkout failed. Please try again.')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-24 pb-20" style={{ background: 'var(--ut-black, #0a090e)', position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse, rgba(147,51,234,0.06) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '5%', width: 400, height: 300, background: 'radial-gradient(ellipse, rgba(212,168,71,0.04) 0%, transparent 70%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* Logged-in status */}
          {session && (
            <div className="mb-8 text-center" style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(212,168,71,0.5)' }}>
              Signed in as {session.email} · <Link href="/account" style={{ color: 'rgba(212,168,71,0.7)', textDecoration: 'none' }}>Account</Link>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-16">
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.3em', color: 'rgba(212,168,71,0.5)', marginBottom: 16 }}>[ CODEX ORACLE ]</div>
            <h1 style={{
              fontFamily: "'Cinzel Decorative', serif",
              fontSize: 'clamp(28px, 5vw, 48px)',
              letterSpacing: '0.08em',
              background: 'linear-gradient(135deg, #d946ef 0%, #d4a847 35%, #9333ea 65%, #22d3ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 16,
            }}>
              Oracle Access
            </h1>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: 'rgba(237,233,246,0.45)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
              {session
                ? plan === 'initiate'
                  ? 'Your Initiate membership is active. Unlimited questions, all modes.'
                  : 'Choose your level of access to the Codex Oracle.'
                : 'Choose your level of access to the Codex Oracle. From exploration to mastery — all paths begin with a single question.'}
            </p>
            <div style={{ width: 260, height: 1, margin: '32px auto 0', background: 'linear-gradient(90deg, transparent, rgba(217,70,239,0.3), rgba(212,168,71,0.5), rgba(147,51,234,0.3), transparent)' }} />
          </div>

          {/* Current plan status — logged in non-initiate */}
          {session && plan !== 'initiate' && (
            <div className="mb-8 p-4 text-center" style={{
              border: '1px solid rgba(34,211,238,0.2)',
              background: 'rgba(34,211,238,0.03)',
              maxWidth: 600, margin: '0 auto 32px',
            }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.2em', color: '#22d3ee', marginBottom: 8 }}>
                Current Plan: {plan === 'guest' ? 'Guest' : 'Free Account'}
              </div>
              {plan === 'free' && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={handleInitiateCheckout} className="btn-primary text-xs px-6 py-2" style={{ cursor: 'pointer' }}>
                    Upgrade to Initiate — $3.99/mo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Plan cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 60 }}>
            {TIERS.map((t) => {
              const Icon = t.icon
              const isCurrentTier = (plan === t.id) || (plan === 'guest' && t.id === 'guest') || (plan === 'free' && t.id === 'free')
              const isLoading = checkingOut

              return (
                <div
                  key={t.id}
                  style={{
                    position: 'relative',
                    padding: '32px 28px',
                    border: `1px solid ${t.borderColor}`,
                    background: t.popular
                      ? 'linear-gradient(160deg, rgba(212,168,71,0.04) 0%, rgba(10,9,14,0.95) 60%)'
                      : 'rgba(17,15,26,0.6)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {t.popular && (
                    <div style={{
                      position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                      padding: '4px 16px', border: '1px solid rgba(212,168,71,0.3)',
                      borderTop: 'none', background: 'rgba(10,9,14,0.9)',
                      fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: '0.2em',
                      color: '#d4a847', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      Most Popular
                    </div>
                  )}
                  {isCurrentTier && !t.popular && (
                    <div style={{
                      position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                      padding: '4px 14px', border: '1px solid rgba(255,255,255,0.1)',
                      borderTop: 'none', background: 'rgba(10,9,14,0.9)',
                      fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: '0.2em',
                      color: 'rgba(237,233,246,0.4)', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      Current Plan
                    </div>
                  )}

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 36, height: 36, border: `1px solid ${t.borderColor}`,
                        background: `${t.color}08`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={16} color={t.color} />
                      </div>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, letterSpacing: '0.15em', color: t.color }}>
                        {t.name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 32, color: '#ede9f6' }}>{t.price}</span>
                      {t.priceSub && <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: 'rgba(237,233,246,0.35)' }}>{t.priceSub}</span>}
                    </div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: 'rgba(237,233,246,0.4)', lineHeight: 1.5 }}>
                      {t.description}
                    </p>
                  </div>

                  <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${t.borderColor}, transparent)`, marginBottom: 24 }} />

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {t.features.map((f) => (
                      <li key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: f.included ? 'rgba(237,233,246,0.65)' : 'rgba(107,101,128,0.3)' }}>
                        <CheckCircle size={13} color={f.included ? t.color : 'rgba(107,101,128,0.3)'} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                        <span style={{ textDecoration: f.included ? 'none' : 'line-through' }}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  {t.id === 'initiate' ? (
                    <button
                      id="subscribe"
                      onClick={handleInitiateCheckout}
                      disabled={isLoading || plan === 'initiate'}
                      style={{
                        width: '100%', padding: '14px 20px',
                        border: '1px solid rgba(212,168,71,0.4)',
                        background: isLoading ? 'rgba(212,168,71,0.05)' : plan === 'initiate' ? 'rgba(212,168,71,0.02)' : 'rgba(212,168,71,0.06)',
                        color: plan === 'initiate' ? 'rgba(212,168,71,0.4)' : '#d4a847',
                        fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: '0.25em',
                        textTransform: 'uppercase', cursor: isLoading || plan === 'initiate' ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s',
                      }}
                    >
                      {plan === 'initiate' ? 'Active — Initiate' : isLoading ? 'Redirecting...' : t.cta}
                    </button>
                  ) : (
                    <Link
                      href={t.ctaHref}
                      style={{
                        display: 'block', width: '100%', padding: '14px 20px',
                        border: `1px solid ${t.borderColor}`, background: 'transparent',
                        color: t.color, fontFamily: 'Cinzel, serif', fontSize: 10,
                        letterSpacing: '0.25em', textTransform: 'uppercase',
                        textDecoration: 'none', textAlign: 'center', transition: 'all 0.3s',
                      }}
                    >
                      {t.cta}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>

          {/* FAQ */}
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ width: 200, height: 1, margin: '0 auto 40px', background: 'linear-gradient(90deg, transparent, rgba(217,70,239,0.2), transparent)' }} />
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, letterSpacing: '0.15em', color: 'rgba(237,233,246,0.5)', marginBottom: 28 }}>Frequently Asked</h2>
            {[
              { q: 'Can I cancel anytime?', a: 'Yes — cancel from your account portal at any time. Your access continues until the end of the billing period.' },
              { q: 'What counts as a question?', a: 'Each message you send to the Oracle counts as one question. Voice messages also count as questions.' },
              { q: 'What happens to my history?', a: 'Initiate members have full access to their message history. Guest and free accounts reset daily.' },
              { q: 'Is there a yearly option?', a: 'Yearly billing is coming soon at a discounted rate. Monthly is available now.' },
            ].map(item => (
              <div key={item.q} style={{ marginBottom: 24, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(17,15,26,0.3)' }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.1em', color: '#d946ef', marginBottom: 8 }}>{item.q}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: 'rgba(237,233,246,0.4)', lineHeight: 1.6 }}>{item.a}</div>
              </div>
            ))}
          </div>

          {/* Vault of Arcana cross-sell */}
          <div style={{ marginTop: 80, textAlign: 'center', padding: '40px 24px', border: '1px solid rgba(147,51,234,0.12)', background: 'rgba(147,51,234,0.02)' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(147,51,234,0.5)', marginBottom: 12 }}>Beyond the Codex</div>
            <h3 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 20, letterSpacing: '0.08em', color: '#ede9f6', marginBottom: 12 }}>Vault of Arcana</h3>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: 'rgba(237,233,246,0.4)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.7 }}>
              Six living traditions — Tao, Tarot, Tantra, Entheogens, Dreamwalker, and the Codex. One membership, unlimited exploration.
            </p>
            <a href="https://www.vaultofarcana.com/pricing" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '12px 28px', border: '1px solid rgba(147,51,234,0.3)', color: '#9333ea', fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Explore Vault of Arcana
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
