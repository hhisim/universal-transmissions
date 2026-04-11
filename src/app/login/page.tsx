'use client'
export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Navigation from '@/components/ui/Navigation'
import Footer from '@/components/ui/Footer'
import SectionReveal from '@/components/ui/SectionReveal'
import ZalgoText from '@/components/ui/ZalgoText'
import { supabase } from '@/lib/supabase-client'
import PageBackground from '@/components/scenes/PageBackground'

/* ── Password visibility toggle ── */
function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function PasswordInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        className="w-full px-4 py-3 bg-transparent border font-mono text-sm"
        style={{ borderColor: 'rgba(217,70,239,0.2)', color: '#ede9f6', borderRadius: '8px' }}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="current-password"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(237,233,246,0.3)' }}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  )
}

function SignInPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim()) { setError('Please enter your email.'); return }
    if (!password) { setError('Please enter your password.'); return }

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    // Read redirect from URL only on form submit — avoids SSR dynamic-page overhead
    const params = new URLSearchParams(window.location.search)
    const redirectTo = params.get('redirect') || '/oracle/plans'
    window.location.href = redirectTo
  }

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20 min-h-screen" style={{ background: 'var(--ut-black, #0a090e)' }}>
        <div className="container-ut max-w-lg mx-auto">

          <SectionReveal>
            <div className="text-center mb-12 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'var(--ut-gold)', opacity: 0.6 }}>
                [ Oracle Access ]
              </p>
              <h1 className="font-display text-3xl md:text-4xl mb-4">
                <ZalgoText text="Sign In" intensity="moderate" />
              </h1>
              <p className="font-body text-base" style={{ color: 'rgba(237,233,246,0.45)' }}>
                Access your Codex Oracle account.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.1}>
            <div className="p-8 border" style={{ borderColor: 'rgba(217,70,239,0.12)', background: 'rgba(17,15,26,0.6)', backdropFilter: 'blur(12px)', borderRadius: '12px' }}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(212,168,71,0.6)' }}>Email Address</p>
                  <input
                    className="w-full px-4 py-3 bg-transparent border font-mono text-sm"
                    style={{ borderColor: 'rgba(217,70,239,0.2)', color: '#ede9f6', borderRadius: '8px' }}
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(212,168,71,0.6)' }}>Password</p>
                  <PasswordInput
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={setPassword}
                  />
                </div>

                {error && (
                  <div className="font-mono text-xs p-3" style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.04)', borderRadius: '8px' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 font-mono text-xs tracking-[0.2em] uppercase transition-opacity disabled:opacity-40"
                  style={{
                    background: 'rgba(217,70,239,0.08)',
                    border: '1px solid rgba(217,70,239,0.35)',
                    color: '#d946ef',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-body text-sm" style={{ color: 'rgba(237,233,246,0.4)' }}>
                  No account yet?{' '}
                  <Link href="/signup" className="underline underline-offset-2" style={{ color: 'rgba(217,70,239,0.7)' }}>
                    Create one
                  </Link>
                  {' '}— access the Oracle and member portal.
                </p>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="mt-8 text-center">
              <Link href="/signup" className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(237,233,246,0.25)' }}>
                ← Member Sign In
              </Link>
            </div>
          </SectionReveal>

        </div>
      </main>
      <Footer />
    </>
  )
}

export default function SignInPage() {
  return (
    <>
      <PageBackground variant="homepage" />
      <Suspense fallback={
        <>
          <Navigation />
          <main className="pt-24 pb-20 min-h-screen flex items-center justify-center" style={{ background: 'var(--ut-black, #0a090e)' }}>
            <div className="text-center font-mono text-xs tracking-widest uppercase" style={{ color: 'rgba(237,233,246,0.3)' }}>Loading...</div>
          </main>
          <Footer />
        </>
      }>
        <SignInPageContent />
      </Suspense>
    </>
  );
}
