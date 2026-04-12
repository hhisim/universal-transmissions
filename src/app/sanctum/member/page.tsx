"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { supabaseAdmin } from "@/lib/supabase";
import { supabase } from "@/lib/supabase-client";
import {
  Eye, Package, MessageCircle, Sparkles, Wand2, Hexagon,
  Layers3, Aperture, Lock, Unlock, Zap, Radio, ChevronRight,
  Play, Mic, Camera, Video, Star, BookOpen, Send, User,
  LogOut, ExternalLink, Shield, Crown, Flame, Compass, Layers,
  Globe, Sliders, PlayCircle, Image, Mic2
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type TabId = 'dashboard' | 'codex' | 'experience' | 'messages';
type PlanTier = 'free' | 'initiate' | 'master' | 'full';

interface MemberProfile {
  email: string;
  plan: PlanTier;
  name?: string;
  joined_at?: string;
}

interface Message {
  id: string;
  subject: string;
  content: string;
  is_from_member: boolean;
  is_read: boolean;
  created_at: string;
  reply_content?: string;
}

interface ToolAccess {
  toolId: string;
  guestUses: number;
  guestLimit: number;
  freeUses: number;
  freeLimit: number;
  paidLimit: 'unlimited';
}

const TABS: { id: TabId; label: string; icon: React.ReactNode; paidOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Compass size={14} /> },
  { id: 'codex', label: 'Codex II', icon: <BookOpen size={14} />, paidOnly: true },
  { id: 'experience', label: 'Experience Portal', icon: <Zap size={14} /> },
  { id: 'messages', label: 'Messages', icon: <MessageCircle size={14} />, paidOnly: true },
];

// ─── UT Experience Tools Config ─────────────────────────────────────────────
const EXPERIENCE_TOOLS = [
  {
    id: 'cymatic-tonoscope',
    name: 'Cymatic Tonoscope',
    description: 'Full cymatic field generator — Chladni plate patterns with sacred frequency mapping.',
    icon: <Aperture size={20} />,
    href: '/experience/cymatic-tonoscope',
    color: 'cyan',
    guest: { snapshots: 1, video: 0, mic: 1 },
    free: { snapshots: 3, video: 1, mic: 3 },
    paid: { snapshots: 'unlimited', video: 'unlimited', mic: 'unlimited' },
  },
  {
    id: 'cymatic-3d',
    name: '3D Cymatic Engine',
    description: 'Three.js volumetric cymatic visualization — standing waves in three-dimensional sacred geometry space.',
    icon: <Layers3 size={20} />,
    href: '/experience/cymatic-3d',
    color: 'magenta',
    guest: { snapshots: 1, video: 0, mic: 1 },
    free: { snapshots: 3, video: 1, mic: 3 },
    paid: { snapshots: 'unlimited', video: 'unlimited', mic: 'unlimited' },
  },
  {
    id: 'correspondence-continuum',
    name: 'The Correspondence Continuum',
    description: 'Map symbolic relationships across mythologies, frequencies, and geometric archetypes.',
    icon: <Layers size={20} />,
    href: '/experience/correspondence-continuum',
    color: 'gold',
    guest: { snapshots: 1, video: 0, mic: 0 },
    free: { snapshots: 3, video: 0, mic: 0 },
    paid: { snapshots: 'unlimited', video: 'unlimited', mic: 0 },
  },
  {
    id: 'codex-dream-machine',
    name: 'The Codex Dream Machine',
    description: 'Aleatoric composition engine using xenolinguistic glyph systems and cymatic feedback loops.',
    icon: <Star size={20} />,
    href: '/experience/codex-dream-machine',
    color: 'purple',
    guest: { snapshots: 1, video: 0, mic: 0 },
    free: { snapshots: 3, video: 0, mic: 0 },
    paid: { snapshots: 'unlimited', video: 'unlimited', mic: 'unlimited' },
  },
  {
    id: 'correspondence-codex',
    name: 'The UT Correspondence Codex',
    description: 'The master index of all symbolic correspondences — frequencies, geometry, archetypes, and myth.',
    icon: <BookOpen size={20} />,
    href: '/experience/correspondence-codex',
    color: 'green',
    guest: { snapshots: 1, video: 0, mic: 0 },
    free: { snapshots: 'unlimited', video: 0, mic: 0 },
    paid: { snapshots: 'unlimited', video: 0, mic: 0 },
  },
  {
    id: 'oracle',
    name: 'The UT Codex Oracle',
    description: 'Your personal divination system — xenolinguistic glyph casting with cymatic resonance mapping.',
    icon: <Eye size={20} />,
    href: '/sanctum/member/oracle',
    color: 'magenta',
    guest: { snapshots: 0, video: 0, mic: 0 },
    free: { snapshots: 0, video: 0, mic: 0 },
    paid: { snapshots: 'unlimited', video: 'unlimited', mic: 'unlimited' },
  },
];

// ─── Codex II Content Config ────────────────────────────────────────────────
const CODEX_II_SECTIONS = [
  {
    id: 'codex-ii-vol-1',
    title: 'Codex Vol. II — First Transmission',
    subtitle: 'The Foundation Forms',
    description: 'Hakan walks through the foundational geometric forms of Codex Vol. II — how the 60-cell structure was conceived, the first sketches, and the mathematical principles underlying the new visual language.',
    type: 'video',
    videoUrl: '', // To be filled with Cloudinary embed URL
    duration: '~45 min',
    status: 'available',
  },
  {
    id: 'codex-ii-vol-2',
    title: 'Codex Vol. II — Second Transmission',
    subtitle: 'The Correspondences Deepen',
    description: 'Building on the foundation — how each symbol was matched to its frequency, the cymatic testing process, and the moment when the geometry started speaking back.',
    type: 'video',
    videoUrl: '',
    duration: '~52 min',
    status: 'available',
  },
  {
    id: 'personal-notes',
    title: "Hakan's Private Notes",
    subtitle: 'Process Journal — Not for Public Release',
    description: 'Raw process notes, abandoned sketches, the logic behind choices made and unmade. These are Hakan\'s personal working documents — insights, doubts, breakthroughs.',
    type: 'notes',
    galleryUrl: '/sanctum/member/codex-ii/gallery',
    count: 24,
    status: 'available',
  },
  {
    id: 'exclusive-material',
    title: 'Exclusive Release Material',
    subtitle: 'Not on Social Media',
    description: 'Behind-the-scenes content that will never appear on Instagram, X, or any public platform. Early renders, rejected concepts, and the philosophy behind each choice.',
    type: 'gallery',
    galleryUrl: '/sanctum/member/codex-ii/exclusive',
    count: 12,
    status: 'available',
  },
  {
    id: 'codex-ii-gems',
    title: 'Codex II — The Gems',
    subtitle: 'Personal Selections & Commentary',
    description: 'Hakan\'s personal favorite pieces from Codex Vol. II, with audio commentary on what each one means to the project and to him personally.',
    type: 'video',
    videoUrl: '',
    duration: '~38 min',
    status: 'available',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function MemberPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Message form state
  const [msgForm, setMsgForm] = useState({ subject: '', content: '' });
  const [msgStatus, setMsgStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [msgError, setMsgError] = useState('');

  // ─── Auth & Profile ───────────────────────────────────────────────────────
  // Check both Supabase auth (email+password login) and NextAuth (magic link)
  useEffect(() => {
    async function loadSession() {
      try {
        // First: get Supabase session (email+password login)
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        if (supabaseSession?.access_token) {
          // Pass Supabase token to /api/session so it can decode the email
          const r = await fetch("/api/session", {
            headers: { Authorization: `Bearer ${supabaseSession.access_token}` },
          });
          const data = await r.json();
          if (data?.user?.email) {
            setSession(data);
            setUserToken(supabaseSession.access_token);
            fetchProfile(data.user.email || '', supabaseSession.access_token);
            fetchMessages(supabaseSession.access_token);
            setLoading(false);
            return;
          }
        }
        // Fallback: try NextAuth session
        const r = await fetch("/api/session");
        const data = await r.json();
        if (data?.user?.email) {
          setSession(data);
          fetchProfile(data.user.email || '', null);
          fetchMessages(null);
        } else {
          router.push("/sanctum/member/login");
        }
      } catch {
        router.push("/sanctum/member/login");
      }
      setLoading(false);
    }
    loadSession();
  }, [router]);

  async function fetchProfile(email: string, token: string | null) {
    try {
      const headers: Record<string, string> = {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9waXhwa3F1eWFwZXFkY2V5Y3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODM2NzgsImV4cCI6MjA5MDM1OTY3OH0.clqq-XAE7NgY7muFnNqQfhJcLv2i_CALK0d6Kg4P_eQ',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Try ut_members first — confirmed working with user token
      const memberRes = await fetch(
        `https://opixpkquyapeqdceyczs.supabase.co/rest/v1/ut_members?email=eq.${encodeURIComponent(email)}&select=plan,subscription_status&limit=1`,
        { headers }
      );
      if (memberRes.ok) {
        const members = await memberRes.json();
        if (Array.isArray(members) && members[0] && members[0].plan) {
          setProfile({ email, plan: members[0].plan || 'free' });
          // Share session with all UT prototypes via window
          window.__utSetSession?.(email, members[0].plan || 'free');
          return;
        }
      }

      // Fallback: profiles table (no name column — only select plan)
      const profileRes = await fetch(
        `https://opixpkquyapeqdceyczs.supabase.co/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=plan,created_at&limit=1`,
        { headers }
      );
      if (profileRes.ok) {
        const profiles = await profileRes.json();
        if (Array.isArray(profiles) && profiles[0] && profiles[0].plan) {
          setProfile({
            email,
            plan: profiles[0].plan || 'free',
            joined_at: profiles[0].created_at,
          });
          window.__utSetSession?.(email, profiles[0].plan || 'free');
          return;
        }
      }

      setProfile({ email, plan: 'free' });
    } catch (e) {
      console.error('Profile fetch error:', e);
      setProfile({ email, plan: 'free' });
    }
  }

  async function fetchMessages(token: string | null) {
    if (!token) return;
    try {
      const headers: Record<string, string> = {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9waXhwa3F1eWFwZXFkY2V5Y3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODM2NzgsImV4cCI6MjA5MDM1OTY3OH0.clqq-XAE7NgY7muFnNqQfhJcLv2i_CALK0d6Kg4P_eQ',
        'Authorization': `Bearer ${token}`,
      };
      const res = await fetch(
        `https://opixpkquyapeqdceyczs.supabase.co/rest/v1/ut_member_messages?member_email=eq.${encodeURIComponent(session?.user?.email || '')}&select=*&order=created_at.desc&limit=20`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        setUnreadCount(Array.isArray(data) ? data.filter((m: any) => !m.is_read && !m.is_from_member).length : 0);
      }
    } catch (e) {
      console.error('Messages fetch error:', e);
    }
    setMessagesLoading(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.email) return;
    if (!msgForm.subject.trim() || !msgForm.content.trim()) return;

    setMsgStatus('sending');
    setMsgError('');
    try {
      const res = await fetch('/api/member/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          subject: msgForm.subject,
          content: msgForm.content,
          plan: profile?.plan || 'free',
        }),
      });
      if (res.ok) {
        setMsgStatus('success');
        setMsgForm({ subject: '', content: '' });
        fetchMessages(userToken);
      } else {
        setMsgStatus('error');
        setMsgError('Failed to send message. Please try again.');
      }
    } catch {
      setMsgStatus('error');
      setMsgError('Connection failed.');
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  }

  // ─── Render Helpers ───────────────────────────────────────────────────────
  const isPaid = profile?.plan === 'initiate' || profile?.plan === 'master' || profile?.plan === 'full';
  const planLabel = profile?.plan === 'master' ? 'Master' : profile?.plan === 'full' ? 'Full' : profile?.plan === 'initiate' ? 'Initiate' : 'Free';

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="pt-24 pb-20 min-h-screen flex items-center justify-center" style={{ background: "var(--ut-black)" }}>
          <div className="text-center">
            <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>
              Authenticating...
            </div>
            <div className="w-8 h-8 border-2 border-t-transparent mx-auto animate-spin rounded-full" style={{ borderColor: "var(--ut-gold)", borderTopColor: "transparent" }} />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="pt-20 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="border-b" style={{ borderColor: "rgba(217,70,239,0.08)" }}>
          <div className="container-ut max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-0">
            <SectionReveal>
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-[9px] tracking-[0.5em] uppercase" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                      [ Member Sanctum ]
                    </span>
                    <span className={`font-mono text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-full border ${
                      isPaid
                        ? 'border-amber-400/40 text-amber-300'
                        : 'border-white/10 text-white/40'
                    }`}>
                      {planLabel}
                    </span>
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl">
                    <ZalgoText text="Welcome Back" intensity="moderate" />
                  </h1>
                  <p className="font-body text-sm mt-1" style={{ color: "var(--ut-white-dim)" }}>
                    {session?.user?.email}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-all hover:border-white/30"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white-dim)" }}
                >
                  <LogOut size={12} />
                  Sign Out
                </button>
              </div>
            </SectionReveal>

            {/* ── Tab Navigation ─────────────────────────────────────────── */}
            <nav className="flex gap-1 overflow-x-auto pb-0 -mb-px">
              {TABS.map((tab) => {
                const locked = tab.paidOnly && !isPaid;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !locked && setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 font-mono text-[10px] tracking-[0.25em] uppercase whitespace-nowrap border-b-2 transition-all ${
                      locked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      active
                        ? 'border-[var(--ut-magenta)] text-white'
                        : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                    style={active ? { borderColor: "var(--ut-magenta)" } : {}}
                  >
                    {tab.icon}
                    {tab.label}
                    {locked && <Lock size={10} />}
                    {tab.id === 'messages' && unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center" style={{ background: "var(--ut-magenta)", color: "white" }}>
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ── Tab Content ───────────────────────────────────────────────── */}
        <div className="container-ut max-w-6xl mx-auto px-4 md:px-8 py-10">

          {/* ══ DASHBOARD TAB ══════════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              {/* Quick Access */}
              <section>
                <SectionReveal>
                  <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-6" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                    [ Quick Access ]
                  </p>
                </SectionReveal>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <QuickAccessCard
                    icon={<Eye size={22} />}
                    title="The Oracle"
                    subtitle="Custom Transmission"
                    color="magenta"
                    href="/sanctum/member/oracle"
                    locked={false}
                    onClick={() => router.push('/sanctum/member/oracle')}
                  />
                  <QuickAccessCard
                    icon={<Layers3 size={22} />}
                    title="Cymatic Engine"
                    subtitle="3D Visualization"
                    color="cyan"
                    href="/experience/cymatic-3d"
                    locked={false}
                    onClick={() => router.push('/experience/cymatic-3d')}
                  />
                  <QuickAccessCard
                    icon={<Wand2 size={22} />}
                    title="Sigil Forge"
                    subtitle="Xenolinguistic Cipher"
                    color="gold"
                    href="/forge/sigil"
                    locked={false}
                    onClick={() => router.push('/forge/sigil')}
                  />
                  <QuickAccessCard
                    icon={<Package size={22} />}
                    title="Order History"
                    subtitle="Transmissions Log"
                    color="gold"
                    href="/sanctum/orders"
                    locked={false}
                    onClick={() => router.push('/sanctum/orders')}
                  />
                  <QuickAccessCard
                    icon={<BookOpen size={22} />}
                    title="Codex II"
                    subtitle="Exclusive Videos"
                    color="purple"
                    href="#"
                    locked={!isPaid}
                    onClick={() => { if (isPaid) setActiveTab('codex'); }}
                  />
                  <QuickAccessCard
                    icon={<MessageCircle size={22} />}
                    title="Ask Hakan"
                    subtitle="Priority Channel"
                    color="green"
                    href="#"
                    locked={!isPaid}
                    onClick={() => { if (isPaid) setActiveTab('messages'); }}
                  />
                </div>
              </section>

              {/* UT Experience Portal Teaser */}
              {!isPaid && (
                <SectionReveal delay={0.1}>
                  <div
                    className="p-8 border"
                    style={{
                      borderColor: "rgba(217,70,239,0.2)",
                      background: "linear-gradient(135deg, rgba(217,70,239,0.04) 0%, rgba(0,0,0,0) 100%)"
                    }}
                  >
                    <div className="flex items-start gap-6">
                      <div className="hidden md:block p-4 border" style={{ borderColor: "rgba(217,70,239,0.3)", background: "rgba(217,70,239,0.05)" }}>
                        <Crown size={24} style={{ color: "var(--ut-magenta)" }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-mono text-[9px] tracking-[0.4em] uppercase mb-2" style={{ color: "var(--ut-magenta)", opacity: 0.6 }}>
                          [ Unlock the Full Experience ]
                        </p>
                        <h3 className="font-display text-xl mb-2" style={{ color: "var(--ut-white)" }}>
                          <ZalgoText text="UT Experience Portal" intensity="subtle" />
                        </h3>
                        <p className="font-body text-sm leading-relaxed mb-4" style={{ color: "var(--ut-white-dim)" }}>
                          Get unlimited access to the Cymatic Tonoscope, 3D Cymatic Engine, Correspondence Continuum, Codex Dream Machine, and more. Guests get 1 snapshot. Free members get 3 snapshots + 1 video. Paid members get everything, endlessly.
                        </p>
                        <Link href="/sanctum/member/experience" className="btn-primary text-xs px-6 py-2 inline-flex items-center gap-2">
                          <Zap size={12} />
                          View Experience Portal
                          <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </SectionReveal>
              )}

              {/* All Tools Grid (for paid members) */}
              {isPaid && (
                <section>
                  <SectionReveal>
                    <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-6" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                      [ All Experience Tools ]
                    </p>
                  </SectionReveal>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {EXPERIENCE_TOOLS.map((tool, i) => (
                      <SectionReveal key={tool.id} delay={i * 0.05}>
                        <div
                          className="p-6 border cursor-pointer transition-all hover:border-white/20 ut-card"
                          style={{ borderColor: `rgba(${tool.color === 'cyan' ? '34,211,238' : tool.color === 'gold' ? '212,168,71' : tool.color === 'magenta' ? '217,70,239' : '139,92,246'}, 0.2)` }}
                          onClick={() => router.push(tool.href)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 border" style={{
                              borderColor: `rgba(${tool.color === 'cyan' ? '34,211,238' : tool.color === 'gold' ? '212,168,71' : tool.color === 'magenta' ? '217,70,239' : '139,92,246'}, 0.3)`,
                              background: `rgba(${tool.color === 'cyan' ? '34,211,238' : tool.color === 'gold' ? '212,168,71' : tool.color === 'magenta' ? '217,70,239' : '139,92,246'}, 0.05)`
                            }}>
                              <div style={{ color: `var(--ut-${tool.color === 'purple' ? 'purple' : tool.color === 'gold' ? 'gold' : tool.color === 'green' ? 'cyan' : tool.color === 'magenta' ? 'magenta' : 'cyan'})` }}>
                                {tool.icon}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-heading text-sm tracking-wider mb-1" style={{ color: "var(--ut-white)" }}>{tool.name}</h3>
                              <p className="font-body text-xs leading-relaxed mb-3" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>{tool.description}</p>
                              <div className="flex items-center gap-3 font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                                <span>Unlimited Access</span>
                                <ChevronRight size={10} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </SectionReveal>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ══ CODEX II TAB (Paid Only) ═══════════════════════════════════ */}
          {activeTab === 'codex' && (
            <div className="space-y-10">
              {!isPaid ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 border mx-auto mb-6 flex items-center justify-center" style={{ borderColor: "rgba(217,70,239,0.3)" }}>
                    <Lock size={32} style={{ color: "var(--ut-magenta)" }} />
                  </div>
                  <h2 className="font-display text-2xl mb-3">
                    <ZalgoText text="Codex II — Paid Members Only" intensity="moderate" />
                  </h2>
                  <p className="font-body text-base max-w-lg mx-auto mb-8" style={{ color: "var(--ut-white-dim)" }}>
                    Codex II exclusive content — long-form videos, behind-the-scenes process documentation, Hakan&apos;s personal notes, and unreleased material — is available to Initiate and Master members.
                  </p>
                  <Link href="/sanctum/member/experience" className="btn-primary text-sm px-8 py-3 inline-flex items-center gap-2">
                    <Crown size={14} />
                    Unlock with Membership
                  </Link>
                </div>
              ) : (
                <>
                  {/* Codex II Header */}
                  <SectionReveal>
                    <div className="text-center mb-10">
                      <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                        [ Exclusive — Paid Members Only ]
                      </p>
                      <h1 className="font-display text-3xl md:text-4xl mb-3">
                        <ZalgoText text="Codex II — The Inner Transmission" intensity="moderate" />
                      </h1>
                      <p className="font-body text-base max-w-2xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
                        The making of Codex Vol. II — raw, unreleased, and personal. These materials are not available anywhere else.
                      </p>
                    </div>
                  </SectionReveal>

                  {/* Codex II Sections */}
                  <div className="space-y-6">
                    {CODEX_II_SECTIONS.map((section, i) => (
                      <SectionReveal key={section.id} delay={i * 0.06}>
                        <div
                          className="p-8 border ut-card"
                          style={{ borderColor: "rgba(217,70,239,0.12)" }}
                        >
                          <div className="flex items-start gap-6">
                            {/* Icon */}
                            <div className="hidden md:flex flex-col items-center gap-2">
                              <div
                                className="w-14 h-14 border flex items-center justify-center"
                                style={{ borderColor: "rgba(217,70,239,0.3)", background: "rgba(217,70,239,0.05)" }}
                              >
                                {section.type === 'video' ? <PlayCircle size={22} style={{ color: "var(--ut-magenta)" }} /> :
                                 section.type === 'notes' ? <BookOpen size={22} style={{ color: "var(--ut-gold)" }} /> :
                                 <Image size={22} style={{ color: "var(--ut-cyan)" }} />}
                              </div>
                              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                                {section.type}
                              </span>
                              {section.duration && (
                                <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                                  {section.duration}
                                </span>
                              )}
                            </div>

                            <div className="flex-1">
                              <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-1" style={{ color: "var(--ut-magenta)", opacity: 0.6 }}>
                                {section.subtitle}
                              </p>
                              <h3 className="font-display text-xl mb-3" style={{ color: "var(--ut-white)" }}>
                                <ZalgoText text={section.title} intensity="subtle" />
                              </h3>
                              <p className="font-body text-sm leading-relaxed mb-4" style={{ color: "var(--ut-white-dim)" }}>
                                {section.description}
                              </p>

                              {section.type === 'video' && (
                                <div className="flex items-center gap-3">
                                  {section.videoUrl ? (
                                    <button className="btn-primary text-xs px-5 py-2 inline-flex items-center gap-2">
                                      <Play size={12} />
                                      Watch Now
                                    </button>
                                  ) : (
                                    <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 border" style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white-dim)", opacity: 0.4 }}>
                                      Processing — Available Soon
                                    </span>
                                  )}
                                  {section.count && (
                                    <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                                      {section.count} pieces
                                    </span>
                                  )}
                                </div>
                              )}

                              {section.type === 'notes' && (
                                <div className="flex items-center gap-3">
                                  <Link href={section.galleryUrl || '#'} className="btn-primary text-xs px-5 py-2 inline-flex items-center gap-2">
                                    <BookOpen size={12} />
                                    Browse Notes
                                  </Link>
                                </div>
                              )}

                              {section.type === 'gallery' && (
                                <div className="flex items-center gap-3">
                                  <Link href={section.galleryUrl || '#'} className="btn-primary text-xs px-5 py-2 inline-flex items-center gap-2">
                                    <Image size={12} />
                                    View Gallery ({section.count})
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </SectionReveal>
                    ))}
                  </div>

                  {/* Ask Hakan Prompt */}
                  <SectionReveal delay={0.4}>
                    <div
                      className="p-8 border text-center"
                      style={{ borderColor: "rgba(217,70,239,0.15)", background: "linear-gradient(135deg, rgba(217,70,239,0.04) 0%, rgba(0,0,0,0) 100%)" }}
                    >
                      <MessageCircle size={32} className="mx-auto mb-4" style={{ color: "var(--ut-magenta)" }} />
                      <h3 className="font-display text-xl mb-2" style={{ color: "var(--ut-white)" }}>
                        <ZalgoText text="Questions About Codex II?" intensity="subtle" />
                      </h3>
                      <p className="font-body text-sm max-w-md mx-auto mb-5" style={{ color: "var(--ut-white-dim)" }}>
                        Have a question about a piece, a technique, or the process? Ask Hakan directly through the Messages tab. He responds at priority when not deep in making art.
                      </p>
                      <button
                        onClick={() => setActiveTab('messages')}
                        className="btn-primary text-xs px-6 py-2 inline-flex items-center gap-2"
                      >
                        <Send size={12} />
                        Send a Message
                      </button>
                    </div>
                  </SectionReveal>
                </>
              )}
            </div>
          )}

          {/* ══ EXPERIENCE PORTAL TAB ══════════════════════════════════════ */}
          {activeTab === 'experience' && (
            <ExperiencePortalTab profile={profile} isPaid={isPaid} />
          )}

          {/* ══ MESSAGES TAB (Paid Only) ═══════════════════════════════════ */}
          {activeTab === 'messages' && (
            <MessagesTab
              profile={profile}
              isPaid={isPaid}
              messages={messages}
              messagesLoading={messagesLoading}
              msgForm={msgForm}
              msgStatus={msgStatus}
              msgError={msgError}
              onMsgFormChange={setMsgForm}
              onSendMessage={handleSendMessage}
              onRefresh={() => fetchMessages(userToken)}
              onResetMsgStatus={() => setMsgStatus('idle')}
            />
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────────

function QuickAccessCard({ icon, title, subtitle, color, href, locked, onClick }: {
  icon: React.ReactNode; title: string; subtitle: string; color: string;
  href: string; locked: boolean; onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    cyan: 'var(--ut-cyan)', gold: 'var(--ut-gold)', magenta: 'var(--ut-magenta)',
    purple: 'var(--ut-purple)', green: '#10b981', white: 'var(--ut-white)',
  };
  const c = colorMap[color] || colorMap.white;
  return (
    <div
      className="p-6 border cursor-pointer transition-all hover:border-white/20 ut-card group"
      style={{ borderColor: `${c}22` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 flex items-center justify-center border" style={{ borderColor: `${c}33`, background: `${c}08` }}>
          <div style={{ color: c }}>{icon}</div>
        </div>
        <div>
          <h3 className="font-heading text-sm tracking-wider" style={{ color: locked ? "var(--ut-white-dim)" : c }}>
            {locked ? <span className="flex items-center gap-1"><Lock size={11} /> {title}</span> : title}
          </h3>
          <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function AccessBadge({ tier, used, limit }: { tier: string; used: number; limit: number | string }) {
  const isUnlimited = limit === 'unlimited';
  const remaining = isUnlimited ? '∞' : `${limit}-${used}`;
  const pct = isUnlimited ? 100 : Math.max(0, ((Number(limit) - used) / Number(limit)) * 100);
  const color = pct > 66 ? 'var(--ut-cyan)' : pct > 33 ? 'var(--ut-gold)' : '#ef4444';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>{tier}</span>
        <span className="font-mono text-[8px]" style={{ color }}>{isUnlimited ? '∞' : `${remaining} left`}</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function ExperiencePortalTab({ profile, isPaid }: { profile: MemberProfile | null; isPaid: boolean }) {
  const [toolUsage, setToolUsage] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchToolUsage();
  }, []);

  async function fetchToolUsage() {
    try {
      const res = await fetch('/api/experience/usage');
      if (res.ok) {
        const data = await res.json();
        setToolUsage(data);
      }
    } catch (e) {
      console.error('Usage fetch error:', e);
    }
  }

  const planTier = profile?.plan === 'master' ? 'paid' : profile?.plan === 'initiate' ? 'paid' : 'free';

  return (
    <div className="space-y-8">
      <SectionReveal>
        <div className="text-center mb-8">
          <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
            [ Tools & Instruments ]
          </p>
          <h1 className="font-display text-3xl md:text-4xl mb-3">
            <ZalgoText text="UT Experience Portal" intensity="moderate" />
          </h1>
          <p className="font-body text-base max-w-2xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
            Ceremonial instruments for exploring the soul of the Codex. Each tool reveals a different layer of the Universal Transmissions visual language.
          </p>
        </div>
      </SectionReveal>

      {/* Tier Access Legend */}
      <SectionReveal delay={0.1}>
        <div className="flex flex-wrap gap-6 justify-center p-4 border" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
            <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
              Guest: 1 Snapshot, 1 Mic Use
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "var(--ut-gold)" }} />
            <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-gold)" }}>
              Free: 3 Snapshots, 1 Video, 3 Mic
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "var(--ut-magenta)" }} />
            <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-magenta)" }}>
              Paid: Unlimited Everything
            </span>
          </div>
        </div>
      </SectionReveal>

      {/* Tools Grid */}
      <div className="space-y-6">
        {EXPERIENCE_TOOLS.map((tool, i) => (
          <SectionReveal key={tool.id} delay={i * 0.05}>
            <ToolCard
              tool={tool}
              planTier={planTier}
              usage={toolUsage[tool.id]}
            />
          </SectionReveal>
        ))}
      </div>
    </div>
  );
}

function ToolCard({ tool, planTier, usage }: {
  tool: typeof EXPERIENCE_TOOLS[0];
  planTier: 'guest' | 'free' | 'paid';
  usage?: any;
}) {
  const router = useRouter();
  const colorMap: Record<string, string> = {
    cyan: '#22d3ee', gold: '#d4a847', magenta: '#d946ef', purple: '#8b5cf6', green: '#10b981',
  };
  const color = colorMap[tool.color] || '#ffffff';
  const access = planTier === 'paid' ? tool.paid : planTier === 'free' ? tool.free : tool.guest;

  const canSnapshot = access.snapshots !== 0;
  const canVideo = access.video !== 0;
  const canMic = access.mic !== 0;

  return (
    <div
      className="border ut-card"
      style={{ borderColor: `${color}18` }}
    >
      <div className="p-6 md:p-8">
        <div className="flex items-start gap-5">
          {/* Icon */}
          <div
            className="hidden md:flex w-16 h-16 flex-shrink-0 items-center justify-center border"
            style={{ borderColor: `${color}33`, background: `${color}08` }}
          >
            <div style={{ color }}>{tool.icon}</div>
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-display text-lg mb-1" style={{ color: "var(--ut-white)" }}>{tool.name}</h3>
                <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                  {tool.description}
                </p>
              </div>
              <button
                onClick={() => router.push(tool.href)}
                className="flex-shrink-0 flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-all hover:border-white/30"
                style={{ borderColor: `${color}40`, color }}
              >
                Open <ExternalLink size={10} />
              </button>
            </div>

            {/* Feature Access */}
            <div className="mt-4 flex flex-wrap gap-4">
              {canSnapshot && (
                <AccessBadge
                  tier="Snapshots"
                  used={usage?.snapshots_used ?? 0}
                  limit={access.snapshots}
                />
              )}
              {canVideo && (
                <AccessBadge
                  tier="Video Record"
                  used={usage?.video_used ?? 0}
                  limit={access.video}
                />
              )}
              {canMic && (
                <AccessBadge
                  tier="Mic Input"
                  used={usage?.mic_used ?? 0}
                  limit={access.mic}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesTab({ profile, isPaid, messages, messagesLoading, msgForm, msgStatus, msgError, onMsgFormChange, onSendMessage, onRefresh, onResetMsgStatus }: {
  profile: MemberProfile | null; isPaid: boolean; messages: Message[];
  messagesLoading: boolean; msgForm: { subject: string; content: string };
  msgStatus: string; msgError: string;
  onMsgFormChange: (f: any) => void; onSendMessage: (e: React.FormEvent) => void;
  onRefresh: () => void; onResetMsgStatus: () => void;
}) {
  if (!isPaid) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 border mx-auto mb-6 flex items-center justify-center" style={{ borderColor: "rgba(217,70,239,0.3)" }}>
          <Lock size={32} style={{ color: "var(--ut-magenta)" }} />
        </div>
        <h2 className="font-display text-2xl mb-3">
          <ZalgoText text="Priority Channel — Paid Members" intensity="moderate" />
        </h2>
        <p className="font-body text-base max-w-lg mx-auto mb-8" style={{ color: "var(--ut-white-dim)" }}>
          The direct line to Hakan is reserved for Initiate and Master members. Send your questions, ideas, and reflections — he responds at priority between creating.
        </p>
        <button onClick={() => window.location.href = '/sanctum/member/experience'} className="btn-primary text-sm px-8 py-3 inline-flex items-center gap-2">
          <Crown size={14} />
          Unlock with Membership
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
      {/* Message Thread */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">
            <ZalgoText text="Your Messages" intensity="subtle" />
          </h2>
          <button onClick={onRefresh} className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
            Refresh
          </button>
        </div>

        {messagesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 border animate-pulse" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="h-4 rounded mb-2" style={{ background: "rgba(255,255,255,0.05)", width: "60%" }} />
                <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.03)", width: "90%" }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 border text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <MessageCircle size={40} className="mx-auto mb-4" style={{ color: "var(--ut-white-dim)", opacity: 0.2 }} />
            <p className="font-body text-base" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
              No messages yet. Ask Hakan anything about the Codex, the process, or the work.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="p-6 border ut-card"
                style={{ borderColor: msg.is_from_member ? "rgba(212,168,71,0.12)" : "rgba(217,70,239,0.12)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-heading text-sm tracking-wider mb-1" style={{ color: "var(--ut-white)" }}>
                      {msg.subject}
                    </p>
                    <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                      {msg.is_from_member ? 'You' : 'Hakan'} — {new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {!msg.is_from_member && !msg.is_read && (
                    <span className="font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 border" style={{ borderColor: "rgba(217,70,239,0.3)", color: "var(--ut-magenta)" }}>
                      New
                    </span>
                  )}
                </div>
                <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                  {msg.content}
                </p>
                {msg.reply_content && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(217,70,239,0.1)" }}>
                    <p className="font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-magenta)", opacity: 0.6 }}>
                      Hakan's Reply
                    </p>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                      {msg.reply_content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Form */}
      <div>
        <div className="ut-card border p-6" style={{ borderColor: "rgba(217,70,239,0.12)" }}>
          <div className="flex items-center gap-3 mb-5">
            <Send size={16} style={{ color: "var(--ut-magenta)" }} />
            <h3 className="font-heading text-sm tracking-wider" style={{ color: "var(--ut-white)" }}>
              <ZalgoText text="Send to Hakan" intensity="subtle" />
            </h3>
          </div>

          {msgStatus === 'success' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 border mx-auto mb-4 flex items-center justify-center" style={{ borderColor: "rgba(34,211,238,0.3)" }}>
                <Send size={22} style={{ color: "var(--ut-cyan)" }} />
              </div>
              <p className="font-body text-base mb-3" style={{ color: "var(--ut-white)" }}>
                Message sent.
              </p>
              <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                Hakan will respond as soon as he can between creating.
              </p>
              <button
                onClick={() => { (window as any).__msgFormRef?.reset(); setTimeout(() => onResetMsgStatus(), 100); }}
                className="mt-4 font-mono text-[10px] tracking-widest uppercase px-4 py-2 border"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white-dim)" }}
              >
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={onSendMessage} className="space-y-4">
              <div>
                <label className="block font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={msgForm.subject}
                  onChange={(e) => onMsgFormChange({ ...msgForm, subject: e.target.value })}
                  placeholder="About the Cymatic Engine..."
                  className="w-full px-4 py-3 border text-sm font-body"
                  style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white)", outline: "none" }}
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                  Message
                </label>
                <textarea
                  value={msgForm.content}
                  onChange={(e) => onMsgFormChange({ ...msgForm, content: e.target.value })}
                  placeholder="Ask about a technique, a symbol, the process..."
                  rows={6}
                  className="w-full px-4 py-3 border text-sm font-body resize-none"
                  style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white)", outline: "none" }}
                  required
                />
              </div>
              {msgError && (
                <p className="font-body text-xs" style={{ color: "#ef4444" }}>{msgError}</p>
              )}
              <button
                type="submit"
                disabled={msgStatus === 'sending'}
                className="w-full flex items-center justify-center gap-2 py-3 font-mono text-[11px] tracking-widest uppercase transition-all"
                style={{
                  background: msgStatus === 'sending' ? "rgba(217,70,239,0.3)" : "rgba(217,70,239,0.08)",
                  border: "1px solid rgba(217,70,239,0.4)",
                  color: "var(--ut-magenta)",
                  cursor: msgStatus === 'sending' ? 'not-allowed' : 'pointer'
                }}
              >
                {msgStatus === 'sending' ? 'Sending...' : (
                  <>
                    <Send size={12} />
                    Send to Hakan
                  </>
                )}
              </button>
              <p className="font-mono text-[9px] text-center" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                [ MEMBER — Priority Channel ]
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
