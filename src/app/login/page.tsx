'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/ui/Navigation'
import Footer from '@/components/ui/Footer'
import SectionReveal from '@/components/ui/SectionReveal'
import ZalgoText from '@/components/ui/ZalgoText'
import { supabase } from '@/lib/supabase-client'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/account'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push(returnTo)
    })
  }, [router, returnTo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}${returnTo}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20 min-h-screen" style={{ background: 'var(--ut-black)' }}>
        <div className="container-ut max-w-lg mx-auto">

          <SectionReveal>
            <div className="text-center mb-12 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'var(--ut-gold)', opacity: 0.6 }}>
                [ Oracle Access ]
              </p>
              <h1 className="font-display text-3xl md:text-4xl mb-4">
                <ZalgoText text="Sign In" intensity="moderate" />
              </h1>
              <p className="font-body text-base" style={{ color: 'var(--ut-white-dim)' }}>
                Access your Codex Oracle account.
              </p>
            </div>
          </SectionReveal>

          {sent ? (
            <SectionReveal>
              <div className="p-8 border" style={{ borderColor: 'rgba(217,70,239,0.2)', background: 'rgba(217,70,239,0.03)' }}>
                <div className="text-center">
                  <div className="text-4xl mb-4">✉</div>
                  <h2 className="font-heading text-xl mb-3" style={{ color: 'var(--ut-magenta)' }}>
                    <ZalgoText text="Link Dispatched" intensity="subtle" />
                  </h2>
                  <p className="font-body text-base mb-2" style={{ color: 'var(--ut-white-dim)' }}>
                    Check <strong>{email}</strong>
                  </p>
                  <p className="font-body text-sm" style={{ color: 'var(--ut-white-dim)', opacity: 0.6 }}>
                    Click the link in your email to sign in. It expires in 1 hour.
                  </p>
                </div>
              </div>
            </SectionReveal>
          ) : (
            <SectionReveal delay={0.1}>
              <div className="p-8 border" style={{ borderColor: 'rgba(217,70,239,0.12)', background: 'var(--ut-surface)' }}>
                <form onSubmit={handleSubmit}>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--ut-gold)', opacity: 0.6 }}>
                    Email Address
                  </p>
                  <div className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 bg-transparent border font-mono text-sm"
                      style={{ borderColor: 'rgba(217,70,239,0.2)', color: 'var(--ut-white)' }}
                    />
                    {error && (
                      <p className="font-mono text-xs p-3 border" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.04)' }}>
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full btn-primary justify-center text-sm py-4 disabled:opacity-40"
                    >
                      {loading ? 'Sending...' : 'Send Magic Link'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="font-body text-sm text-center" style={{ color: 'var(--ut-white-dim)', opacity: 0.5 }}>
                    New here?{' '}
                    <Link href="/signup" className="underline underline-offset-2" style={{ color: 'var(--ut-magenta)', opacity: 0.8 }}>
                      Create account
                    </Link>
                  </p>
                </div>
              </div>
            </SectionReveal>
          )}

          <SectionReveal delay={0.2}>
            <div className="mt-8 text-center">
              <Link href="/sanctum/member/login" className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--ut-white-dim)', opacity: 0.4 }}>
                ← Store Member Login
              </Link>
            </div>
          </SectionReveal>

        </div>
      </main>
      <Footer />
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <>
        <Navigation />
        <main className="pt-24 pb-20 min-h-screen" style={{ background: 'var(--ut-black)' }}>
          <div className="container-ut max-w-lg mx-auto">
            <div className="text-center pt-8" style={{ color: 'var(--ut-white-dim)' }}>Loading…</div>
          </div>
        </main>
        <Footer />
      </>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
