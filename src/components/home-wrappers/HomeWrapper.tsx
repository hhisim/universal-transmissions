'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './HomeWrapper.module.css'
import { TRADITIONS } from '@/lib/constants'

const SEARCH_QUERY_URL = '/oracle'

const HomeWrapper = () => {
  const router = useRouter()
  const [traditionSwitcher, setTraditionSwitcher] = useState(false)
  const [tradition, setTradition] = useState(TRADITIONS[Math.floor(Math.random() * TRADITIONS.length)])
  const [traditionSwitcherTimer, setTraditionSwitcherTimer] = useState<NodeJS.Timeout | null>(null)
  const [traditionTimer, setTraditionTimer] = useState<NodeJS.Timeout | null>(null)
  const [heroBgStyle, setHeroBgStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const interval = setInterval(() => {
      setTraditionSwitcherTimer(prev => {
        if (prev) clearTimeout(prev)
        setTraditionSwitcher(true)
        return setTimeout(() => {
          setTraditionSwitcher(false)
          setTradition(TRADITIONS[Math.floor(Math.random() * TRADITIONS.length)])
        }, 1250)
      })
    }, 3500)
    return () => {
      clearInterval(interval)
      if (traditionSwitcherTimer) clearTimeout(traditionSwitcherTimer)
      if (traditionTimer) clearTimeout(traditionTimer)
    }
  }, [])

  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      @keyframes float${tradition.replace(/\s/g, '-')} {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
        50% { transform: translateY(-20px) rotate(3deg); opacity: 1; }
      }
    `
    document.head.appendChild(style)
    setHeroBgStyle({ animation: `float${tradition.replace(/\s/g, '-')} 8s ease-in-out infinite` })
    return () => { document.head.removeChild(style) }
  }, [tradition])

  const TRADITION_ICONS: Record<string, React.ReactNode> = {
    'Tao': <span>☯</span>,
    'Tantra': <span>🔮</span>,
    'Sufi': <span>✧</span>,
    'Tarot': <span>🂡</span>,
    'Entheogen': <span>✦</span>,
    'Dreamwalker': <span>◎</span>,
  }

  return (
    <div className="relative w-full overflow-hidden bg-black text-white font-body">
      {/* Hero */}
      <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className={styles.ctaWrap}>
          <Link href={SEARCH_QUERY_URL} className={styles.ctaLink}>
            <span className="text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] group-hover:text-[var(--primary-gold)] transition-colors">
              BEGIN SEEKING
            </span>
          </Link>
        </div>
      </div>

      {/* Tradition Switcher */}
      <div className="relative w-full py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div
            className="text-center cursor-pointer group"
            onClick={() => router.push(`/oracle?tradition=${tradition.toLowerCase().replace(/\s/g, '-')}`)}
            onMouseEnter={() => document.querySelectorAll('.tradition-card').forEach(el => (el as HTMLElement).style.opacity = '0.4')}
            onMouseLeave={() => document.querySelectorAll('.tradition-card').forEach(el => (el as HTMLElement).style.opacity = '1')}
          >
            <div className={styles.traditionIcon} style={heroBgStyle}>
              {TRADITION_ICONS[tradition]}
            </div>
            <div className={`${styles.traditionLabel} ${traditionSwitcher ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
              {tradition}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12">
            {TRADITIONS.map(t => (
              <Link
                key={t}
                href={`/oracle?tradition=${t.toLowerCase().replace(/\s/g, '-')}`}
                className={`tradition-card ${styles.traditionCard}`}
                onMouseEnter={() => document.querySelectorAll('.tradition-card').forEach(el => (el as HTMLElement).style.opacity = '0.4')}
                onMouseLeave={() => document.querySelectorAll('.tradition-card').forEach(el => (el as HTMLElement).style.opacity = '1')}
                onClick={() => setTradition(t)}
              >
                <div className={styles.traditionCardInner}>
                  <div className={styles.traditionCardIcon}>{TRADITION_ICONS[t]}</div>
                  <div className={styles.traditionCardLabel}>{t}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeWrapper
