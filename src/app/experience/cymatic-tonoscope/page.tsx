"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";

/* ═══════════════════════════════════════════════════════════
   SACRED FREQUENCIES
   ═══════════════════════════════════════════════════════════ */
const SACRED_FREQUENCIES = [
  { hz: 174, name: "Foundation",    chakra: "Base",    color: "#d4a847" },
  { hz: 285, name: "Repair",         chakra: "Sacral",  color: "#22d3ee" },
  { hz: 396, name: "Liberation",     chakra: "Solar",   color: "#a855f7" },
  { hz: 417, name: "Change",         chakra: "Heart",   color: "#22d3ee" },
  { hz: 432, name: "Harmonic",       chakra: "Heart",   color: "#d4a847" },
  { hz: 528, name: "Miracle",        chakra: "Throat",  color: "#ec4899" },
  { hz: 639, name: "Harmony",         chakra: "Third",   color: "#22d3ee" },
  { hz: 741, name: "Intuition",       chakra: "Third",   color: "#a855f7" },
  { hz: 852, name: "Third Eye",       chakra: "Crown",   color: "#0ea5e9" },
  { hz: 963, name: "Crown",           chakra: "Crown",   color: "#d4a847" },
];

const COMMON_FREQUENCIES = [
  { hz: 100, name: "100 Hz", color: "#9ca3af" },
  { hz: 200, name: "200 Hz", color: "#9ca3af" },
  { hz: 300, name: "300 Hz", color: "#9ca3af" },
  { hz: 400, name: "400 Hz", color: "#9ca3af" },
  { hz: 500, name: "500 Hz", color: "#9ca3af" },
  { hz: 600, name: "600 Hz", color: "#9ca3af" },
  { hz: 700, name: "700 Hz", color: "#9ca3af" },
  { hz: 800, name: "800 Hz", color: "#9ca3af" },
  { hz: 900, name: "900 Hz", color: "#9ca3af" },
  { hz: 1000, name: "1 kHz", color: "#9ca3af" },
  { hz: 2000, name: "2 kHz", color: "#9ca3af" },
  { hz: 4000, name: "4 kHz", color: "#9ca3af" },
];

/* ═══════════════════════════════════════════════════════════
   CANVAS CYMATIC PATTERN ENGINE
   ═══════════════════════════════════════════════════════════ */
function drawCymaticPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freq: number,
  plateType: string,
  color: string
) {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = "#0a090e";
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.45;
  const rings = Math.round(freq / 50) + 4;

  // Chladni-style sand/node pattern
  for (let r = 1; r <= rings; r++) {
    const radius = (r / rings) * maxR;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.6 - (r / rings) * 0.4;
    ctx.lineWidth = r % 2 === 0 ? 1.2 : 0.7;
    ctx.stroke();
  }

  // Radial nodes (Chladni nodal lines)
  const nodeCount = Math.round(freq / 40) + 3;
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Concentric standing wave ripples
  const waveCount = Math.round(freq / 30) + 2;
  for (let w = 1; w <= waveCount; w++) {
    const waveR = (w / waveCount) * maxR;
    const opacity = 0.3 - (w / waveCount) * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Center glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.3);
  grad.addColorStop(0, color.replace(")", ", 0.3)").replace("rgb", "rgba").replace("#", "rgba(").replace(/([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i, (_, r, g, b) => `${parseInt(r,16)}, ${parseInt(g,16)}, ${parseInt(b,16)}, 0.4)`));
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 0, width, height);

  // Plate type overlay
  if (plateType === "square") {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - maxR, cy - maxR, maxR * 2, maxR * 2);
  } else if (plateType === "hexagon") {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = cx + Math.cos(angle) * maxR;
      const y = cy + Math.sin(angle) * maxR;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

/* ═══════════════════════════════════════════════════════════
   INTERACTIVE CYMATIC TONOSCOPE
   ═══════════════════════════════════════════════════════════ */
function CymaticCanvas({ freq, plateType, color }: { freq: number; plateType: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      drawCymaticPattern(ctx, w, h, freq, plateType, color);
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [freq, plateType, color]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={800}
      className="w-full aspect-square rounded-2xl"
      style={{ boxShadow: `0 0 40px ${color}22` }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   USAGE TRACKER
   ═══════════════════════════════════════════════════════════ */
async function trackUsage(toolId: string, action: string, anonymousId?: string) {
  try {
    await fetch("/api/experience/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool_id: toolId, action, anonymous_id: anonymousId }),
    });
  } catch (e) { /* silent fail */ }
}

function getOrCreateAnonymousId(): string {
  let id = localStorage.getItem("ut_anon_id");
  if (!id) {
    id = "anon_" + Math.random().toString(36).slice(2);
    localStorage.setItem("ut_anon_id", id);
  }
  return id;
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function CymaticTonoscopePage() {
  const [freq, setFreq] = useState(432);
  const [plateType, setPlateType] = useState("circle");
  const [selectedFreq, setSelectedFreq] = useState<{ hz: number; name: string; chakra: string; color: string } | null>(null);
  const [tab, setTab] = useState<"sacred" | "custom">("sacred");
  const [customHz, setCustomHz] = useState("432");
  const [usageCount, setUsageCount] = useState<{ snapshots: number; videos: number }>({ snapshots: 0, videos: 0 });
  const [lastSnap, setLastSnap] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Load usage
  useEffect(() => {
    const anonId = getOrCreateAnonymousId();
    fetch(`/api/experience/usage?anonymous_id=${anonId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.locked) setLocked(true);
        if (d.usage?.["cymatic-tonoscope"]) {
          setUsageCount({
            snapshots: d.usage["cymatic-tonoscope"].snapshots_used || 0,
            videos: d.usage["cymatic-tonoscope"].videos_used || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const currentColor = selectedFreq?.color ?? "#22d3ee";

  const handleSacredClick = (f: typeof SACRED_FREQUENCIES[0]) => {
    setSelectedFreq(f);
    setFreq(f.hz);
    setTab("sacred");
  };

  const handleCustomFreq = () => {
    const hz = parseInt(customHz);
    if (!isNaN(hz) && hz > 0 && hz <= 20000) {
      setFreq(hz);
      setSelectedFreq(null);
      setTab("custom");
    }
  };

  const handleSnapshot = () => {
    if (locked) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `cymatic-${freq}hz-${Date.now()}.png`;
    a.click();
    setUsageCount((c) => ({ ...c, snapshots: c.snapshots + 1 }));
    setLastSnap(`Snapshot saved — ${freq}Hz pattern captured`);
    trackUsage("cymatic-tonoscope", "snapshot", getOrCreateAnonymousId());
  };

  return (
    <>
      <PageBackground variant="cymatics" />
<main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-12" style={{ borderBottom: "1px solid rgba(34,211,238,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                [ Experience Portal — Cymatic Tonoscope ]
              </p>
              <h1 className="font-display text-4xl md:text-5xl glow-cyan mb-4" style={{ color: "var(--ut-cyan)" }}>
                <ZalgoText text="Cymatic Tonoscope" intensity="subtle" />
              </h1>
              <p className="font-body text-base max-w-2xl" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                Full cymatic field generator — place sand on a virtual plate and watch frequency shape it into sacred geometry.
                Each pattern is a direct visualization of sound.
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── TOOL INTERFACE ──────────────────────────── */}
        <section className="py-12">
          <div className="container-ut">
            <div className="max-w-5xl mx-auto">

              {/* Top bar */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="flex-1 min-w-[200px]">
                  <label className="font-mono text-[9px] tracking-widest uppercase mb-2 block" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>Current Frequency</label>
                  <div className="font-display text-3xl" style={{ color: currentColor }}>
                    {freq}<span className="text-base opacity-60 ml-1">Hz</span>
                  </div>
                  {selectedFreq && (
                    <p className="font-body text-xs mt-1" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                      {selectedFreq.name} · {selectedFreq.chakra} Chakra
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { if (freq > 20) setFreq((f) => f - 10); setSelectedFreq(null); setTab("custom"); }}
                    className="ut-btn px-4 py-2 font-display text-sm"
                    style={{ borderColor: "rgba(34,211,238,0.3)" }}
                  >−</button>
                  <input
                    type="range"
                    min={20}
                    max={4000}
                    value={freq}
                    onChange={(e) => { setFreq(parseInt(e.target.value)); setSelectedFreq(null); setTab("custom"); }}
                    className="w-48"
                    style={{ accentColor: currentColor }}
                  />
                  <button
                    onClick={() => { if (freq < 4000) setFreq((f) => f + 10); setSelectedFreq(null); setTab("custom"); }}
                    className="ut-btn px-4 py-2 font-display text-sm"
                    style={{ borderColor: "rgba(34,211,238,0.3)" }}
                  >+</button>
                </div>

                <div className="flex gap-2">
                  {["circle", "square", "hexagon"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlateType(p)}
                      className="ut-btn px-4 py-2 font-mono text-xs capitalize"
                      style={{ borderColor: plateType === p ? currentColor : "rgba(34,211,238,0.2)", color: plateType === p ? currentColor : "var(--ut-white-dim)", opacity: plateType === p ? 1 : 0.5 }}
                    >{p}</button>
                  ))}
                </div>
              </div>

              {/* Canvas */}
              <div className="relative">
                <div className="ut-card p-4" style={{ background: "rgba(10,9,14,0.8)" }}>
                  <CymaticCanvas freq={freq} plateType={plateType} color={currentColor} />
                </div>

                {/* Overlay info */}
                <div className="absolute top-4 left-4 px-4 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(34,211,238,0.15)" }}>
                  <span className="font-mono text-xs" style={{ color: currentColor }}>{freq} Hz</span>
                  <span className="font-mono text-[10px] ml-3 opacity-50" style={{ color: "var(--ut-white-dim)" }}>{plateType} plate</span>
                </div>
              </div>

              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <button
                  onClick={handleSnapshot}
                  disabled={locked}
                  className="ut-btn px-6 py-3 font-display text-sm flex items-center gap-2"
                  style={{ borderColor: "rgba(34,211,238,0.4)", color: locked ? "var(--ut-white-dim)" : "var(--ut-cyan)", opacity: locked ? 0.4 : 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>
                    <path d="M3 9h2M3 15h2M9 3v2M15 3v2M19 9h2M19 15h2M9 19v2M15 19v2"/>
                  </svg>
                  {locked ? "Guest Limit Reached" : `Save Snapshot (${usageCount.snapshots}/3)`}
                </button>

                {lastSnap && (
                  <span className="font-mono text-xs" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
                    {lastSnap}
                  </span>
                )}

                <div className="ml-auto font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                  Cymatic Tonoscope · Universal Transmissions
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FREQUENCY SELECTOR ─────────────────────── */}
        <section className="py-12" style={{ borderTop: "1px solid rgba(34,211,238,0.06)" }}>
          <div className="container-ut">
            <div className="max-w-5xl mx-auto">

              {/* Tab switch */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setTab("sacred")}
                  className="ut-btn px-6 py-3 font-mono text-xs uppercase"
                  style={{ borderColor: tab === "sacred" ? "var(--ut-gold)" : "rgba(34,211,238,0.2)", color: tab === "sacred" ? "var(--ut-gold)" : "var(--ut-white-dim)", opacity: tab === "sacred" ? 1 : 0.4 }}
                >Sacred Frequencies</button>
                <button
                  onClick={() => setTab("custom")}
                  className="ut-btn px-6 py-3 font-mono text-xs uppercase"
                  style={{ borderColor: tab === "custom" ? "var(--ut-cyan)" : "rgba(34,211,238,0.2)", color: tab === "custom" ? "var(--ut-cyan)" : "var(--ut-white-dim)", opacity: tab === "custom" ? 1 : 0.4 }}
                >Custom Hz</button>
              </div>

              {tab === "sacred" && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {SACRED_FREQUENCIES.map((f) => (
                    <button
                      key={f.hz}
                      onClick={() => handleSacredClick(f)}
                      className="ut-card p-5 text-center transition-all hover:-translate-y-1 cursor-pointer"
                      style={{
                        background: selectedFreq?.hz === f.hz ? `${f.color}18` : "rgba(34,211,238,0.03)",
                        border: `1px solid ${selectedFreq?.hz === f.hz ? f.color + "66" : "rgba(34,211,238,0.1)"}`,
                      }}
                    >
                      <div className="font-display text-2xl mb-1" style={{ color: f.color }}>{f.hz}</div>
                      <div className="text-[10px] font-mono opacity-60 mb-1" style={{ color: "var(--ut-white-dim)" }}>Hz</div>
                      <div className="text-xs font-medium mb-0.5" style={{ color: "var(--ut-white)" }}>{f.name}</div>
                      <div className="text-[9px] font-mono opacity-40" style={{ color: "var(--ut-white-dim)" }}>{f.chakra}</div>
                    </button>
                  ))}
                </div>
              )}

              {tab === "custom" && (
                <div className="ut-card p-8 flex items-center gap-4 flex-wrap" style={{ background: "rgba(34,211,238,0.02)" }}>
                  <div>
                    <label className="font-mono text-[9px] tracking-widest uppercase mb-2 block" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>Frequency (Hz)</label>
                    <input
                      type="number"
                      value={customHz}
                      onChange={(e) => setCustomHz(e.target.value)}
                      className="ut-input w-32 px-4 py-3 font-display text-xl"
                      style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.2)", color: "var(--ut-cyan)" }}
                      min={1}
                      max={20000}
                    />
                  </div>
                  <button
                    onClick={handleCustomFreq}
                    className="ut-btn px-8 py-3 font-display"
                    style={{ borderColor: "rgba(34,211,238,0.4)", color: "var(--ut-cyan)" }}
                  >Apply Frequency</button>
                  <p className="font-body text-xs" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                    Range: 20 Hz — 20,000 Hz. Human hearing: 20Hz–20kHz.
                  </p>
                </div>
              )}

              {/* Chakra map legend */}
              <div className="mt-8 p-6 ut-card" style={{ background: "rgba(10,9,14,0.6)" }}>
                <p className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>Chakra Frequency Map</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { name: "Root", freq: 174, color: "#d4a847" },
                    { name: "Sacral", freq: 285, color: "#22d3ee" },
                    { name: "Solar", freq: 396, color: "#a855f7" },
                    { name: "Heart", freq: 432, color: "#22d3ee" },
                    { name: "Throat", freq: 528, color: "#ec4899" },
                    { name: "Third Eye", freq: 639, color: "#0ea5e9" },
                    { name: "Crown", freq: 963, color: "#d4a847" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${c.color}11`, border: `1px solid ${c.color}33` }}>
                      <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                      <span className="font-mono text-xs" style={{ color: c.color }}>{c.name}: {c.freq}Hz</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── REFERENCE GRID ─────────────────────────── */}
        <section className="py-12" style={{ borderTop: "1px solid rgba(34,211,238,0.06)" }}>
          <div className="container-ut">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ut-card p-8" style={{ background: "rgba(34,211,238,0.02)" }}>
                  <div className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>How it works</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    When a plate vibrates at a specific frequency, sand or liquid moves to the nodes —
                    the points of zero amplitude. The resulting Chladni patterns reveal the hidden
                    geometry of each frequency.
                  </p>
                </div>
                <div className="ut-card p-8" style={{ background: "rgba(34,211,238,0.02)" }}>
                  <div className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>Sacred Geometry</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Universal Transmissions encodes these cymatic patterns into every artwork.
                    The Tonoscope Cymatic Generator captures the geometric field of each frequency —
                    the same forms that emerge in the final images.
                  </p>
                </div>
                <div className="ut-card p-8" style={{ background: "rgba(34,211,238,0.02)" }}>
                  <div className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>Research</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Explore the Cymatics research page for full documentation — Hans Jenny&apos;s
                    Kymatik, the Chladni tradition, standing wave physics, and the full frequency map
                    of the Universal Transmissions project.
                  </p>
                  <a href="/research/cymatics" className="btn-primary mt-4 inline-flex items-center gap-2 font-mono text-xs" style={{ color: "var(--ut-cyan)" }}>
                    Open Research
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
</>
  );
}