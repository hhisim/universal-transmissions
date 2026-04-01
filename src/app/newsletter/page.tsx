'use client'
export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import Navigation from '@/components/ui/Navigation'
import Footer from '@/components/ui/Footer'
import SectionReveal from '@/components/ui/SectionReveal'
import ZalgoText from '@/components/ui/ZalgoText'
import PageBackground from '@/components/scenes/PageBackground'
import { useSearchParams } from 'next/navigation'

function NewsletterPageContent() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const searchParams = useSearchParams()

  // Capture UTM params
  const utmSource = searchParams.get('utm_source') || ''
  const utmMedium = searchParams.get('utm_medium') || ''
  const utmCampaign = searchParams.get('utm_campaign') || ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setStatus('error')
      setMsg('Please enter a valid email address.')
      return
    }
    setStatus('loading')
    setMsg('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMsg("You're in the signal. Welcome to the transmission.")
        setEmail('')
        setName('')
      } else {
        setStatus('error')
        setMsg(data.error || 'Signup failed. Please try again.')
      }
    } catch {
      setStatus('error')
      setMsg('Connection error. Try again.')
    }
  }

  return (
    <>
      <main className="pt-24 pb-20 min-h-screen" style={{ background: 'var(--ut-black, #0a090e)' }}>
        <div className="container-ut max-w-2xl mx-auto">

          <SectionReveal>
            <div className="text-center mb-12 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'var(--ut-gold)', opacity: 0.6 }}>
                [ The Signal ]
              </p>
              <h1 className="font-display text-3xl md:text-4xl mb-4">
                <ZalgoText text="Join the Transmission" intensity="moderate" />
              </h1>
              <p className="font-body text-base" style={{ color: 'rgba(237,233,246,0.45)' }}>
                Occasional dispatches from Universal Transmissions.<br />
                Sacred geometry, esoteric knowledge, and what's next.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.1}>
            <div className="p-8 border" style={{ borderColor: 'rgba(217,70,239,0.12)', background: 'rgba(17,15,26,0.6)', backdropFilter: 'blur(12px)', borderRadius: '12px' }}>
              {status === 'success' ? (
                <div className="text-center py-8">
                  <div className="font-display text-2xl mb-4" style={{ color: 'var(--ut-cyan)' }}>
                    <ZalgoText text="You're in the signal." intensity="light" />
                  </div>
                  <p className="font-body text-sm" style={{ color: 'rgba(237,233,246,0.6)' }}>
                    Welcome. The frequency is strong with this one.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(212,168,71,0.6)' }}>
                      Your Name
                    </p>
                    <input
                      className="w-full px-4 py-3 bg-transparent border font-mono text-sm"
                      style={{ borderColor: 'rgba(217,70,239,0.2)', color: '#ede9f6', borderRadius: '8px' }}
                      placeholder="How shall we address you?"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>

                  <div>
                    <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(212,168,71,0.6)' }}>
                      Email Address
                    </p>
                    <input
                      className="w-full px-4 py-3 bg-transparent border font-mono text-sm"
                      style={{ borderColor: 'rgba(217,70,239,0.2)', color: '#ede9f6', borderRadius: '8px' }}
                      type="email"
                      placeholder="your@frequency.com"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  {msg && (
                    <div className="font-mono text-xs p-3" style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.04)', borderRadius: '8px' }}>
                      {msg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-4 font-mono text-xs tracking-[0.2em] uppercase transition-opacity disabled:opacity-40"
                    style={{
                      background: 'rgba(217,70,239,0.08)',
                      border: '1px solid rgba(217,70,239,0.35)',
                      color: '#d946ef',
                      borderRadius: '8px',
                      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {status === 'loading' ? 'Tuning in...' : 'Join the Signal'}
                  </button>

                  <p className="font-mono text-[9px] text-center tracking-wide" style={{ color: 'rgba(237,233,246,0.25)' }}>
                    No spam. No selling. Just transmissions when something is worth sharing.
                  </p>
                </form>
              )}
            </div>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="mt-12 text-center">
              <p className="font-heading text-[10px] tracking-[0.25em] uppercase mb-4" style={{ color: 'rgba(212,168,71,0.4)' }}>
                What You'll Receive
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'New Work', desc: 'Artwork reveals, Codex pages, behind the process' },
                  { label: 'Knowledge', desc: 'Journal articles, esoteric research, oracle insights' },
                  { label: 'First Access', desc: "Early notice of drops, collaborations, and what's next" },
                ].map(item => (
                  <div key={item.label} className="p-4 text-center" style={{ border: '1px solid rgba(217,70,239,0.08)', borderRadius: '8px' }}>
                    <p className="font-mono text-xs mb-1" style={{ color: 'var(--ut-gold)' }}>{item.label}</p>
                    <p className="font-body text-xs" style={{ color: 'rgba(237,233,246,0.4)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.3}>
            <div className="mt-12 text-center">
              <a href="/" className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(237,233,246,0.25)' }}>
                ← Return to Universal Transmissions
              </a>
            </div>
          </SectionReveal>

        </div>
      </main>
    </>
  )
}

export default function NewsletterPage() {
  return (
    <>
      <PageBackground variant="homepage" />
      <Navigation />
      <Suspense fallback={
        <main className="pt-24 pb-20 min-h-screen flex items-center justify-center" style={{ background: 'var(--ut-black, #0a090e)' }}>
          <div className="text-center font-mono text-xs tracking-widest uppercase" style={{ color: 'rgba(237,233,246,0.3)' }}>
            Loading...
          </div>
        </main>
      }>
        <NewsletterPageContent />
      </Suspense>
      <Footer />
    </>
  )
}
