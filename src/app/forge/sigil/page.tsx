"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Sparkles,
  Wand2,
  Orbit,
  RotateCcw,
  Lock,
  Eye,
  Hexagon,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GLYPHS = [
  "✦", "✧", "⟁", "⌬", "⟡", "◈", "◉", "△", "▽", "◇",
  "◬", "◭", "⟢", "⟣", "⟐", "⟠", "⊹", "⟴", "⌘", "☉",
  "☿", "♄", "♃", "♁", "☽", "⧉",
];

const DIALECTS = [
  { id: "codex", name: "Codex Core" },
  { id: "sumerian", name: "Sumerian Register" },
  { id: "enochian", name: "Enochian Register" },
  { id: "akashic", name: "Akashic Register" },
];

const PALETTES = [
  { id: "void", name: "Void Prism", a: "#85f3ff", b: "#c27cff", c: "#f6c35f" },
  { id: "ember", name: "Solar Ember", a: "#ff9868", b: "#f4df72", c: "#ff5db1" },
  { id: "oracle", name: "Oracle Bloom", a: "#92ffa1", b: "#75f1ff", c: "#c48eff" },
];

function normalizeText(text: string) {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, "");
}

function frequencyMap(text: string) {
  const clean = normalizeText(text);
  const map: Record<string, number> = {};
  for (const ch of clean.replace(/ /g, "")) {
    map[ch] = (map[ch] || 0) + 1;
  }
  return map;
}

function deriveSigil(text: string, dialect = "codex") {
  const clean = normalizeText(text);
  const freq = frequencyMap(text);
  const chars = clean.replace(/ /g, "").split("");
  const total = Math.max(1, chars.length - 1);
  const charSum = chars.reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  const digitalRoot = ((charSum - 1) % 9) + 1;
  const ringCount = Math.max(3, Math.min(6, (new Set(chars).size % 7) + 3));

  const points: Array<{
    ch: string;
    count: number;
    x: number;
    y: number;
    radius: number;
    angle: number;
    glyph: string;
    weight: number;
    code: number;
  }> = [];

  const used = Object.entries(freq);
  used.forEach(([ch, count], index) => {
    const code = ch.charCodeAt(0);
    const angle = ((code * 7 + index * 31 + charSum) % 360) * (Math.PI / 180);
    const radius = 80 + ((code + count * 17 + total * 3) % 150);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const glyphIndex = (code + index + count + dialect.length) % GLYPHS.length;
    points.push({
      ch,
      count,
      x,
      y,
      radius,
      angle,
      glyph: GLYPHS[glyphIndex],
      weight: 1 + (count % 4),
      code,
    });
  });

  const sorted = [...points].sort((a, b) => a.angle - b.angle);
  const geometry = sorted
    .map((p, i) => `${i + 1}.${p.ch}→${p.glyph}@${Math.round(p.radius)}`)
    .join(" · ");

  const derivation = {
    normalized: clean,
    uniqueCharacters: new Set(chars).size,
    characterCount: total + 1,
    charSum,
    digitalRoot,
    ringCount,
    geometry,
  };

  return { points: sorted, derivation };
}

interface SigilSVGProps {
  text: string;
  dialect: string;
  palette: string;
  breathing?: boolean;
}

function SigilSVG({ text, dialect, palette, breathing = true }: SigilSVGProps) {
  const { points, derivation } = useMemo(() => deriveSigil(text, dialect), [text, dialect]);
  const paletteObj = PALETTES.find((p) => p.id === palette) || PALETTES[0];
  const pulseScale = breathing ? 1.025 : 1;
  const starPath =
    points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${300 + p.x} ${300 + p.y}`)
      .join(" ") + " Z";

  return (
    <motion.div
      className="absolute inset-0"
      animate={
        breathing
          ? { scale: [1, pulseScale, 1], rotate: [0, 0.9, 0] }
          : {}
      }
      transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
    >
      <svg
        viewBox="0 0 600 600"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sigilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={paletteObj.a} />
            <stop offset="50%" stopColor={paletteObj.b} />
            <stop offset="100%" stopColor={paletteObj.c} />
          </linearGradient>
          <filter id="chromatic">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[110, 160, 210, 250].map((r, idx) => (
          <circle
            key={r}
            cx="300"
            cy="300"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray={idx % 2 ? "2 8" : "10 10"}
          />
        ))}

        {Array.from({ length: derivation.ringCount * 2 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / (derivation.ringCount * 2);
          const x = 300 + Math.cos(angle) * 250;
          const y = 300 + Math.sin(angle) * 250;
          return (
            <line
              key={i}
              x1="300"
              y1="300"
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
            />
          );
        })}

        <path
          d={starPath}
          fill="rgba(255,255,255,0.02)"
          stroke="url(#sigilGradient)"
          strokeWidth="1.8"
          filter="url(#chromatic)"
        />

        {points.map((p, i) => {
          const next = points[(i + 1) % points.length];
          return (
            <g key={`${p.ch}-${i}`}>
              <line
                x1={300 + p.x}
                y1={300 + p.y}
                x2={300 + next.x}
                y2={300 + next.y}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={0.9 + p.weight * 0.35}
              />
              <circle
                cx={300 + p.x}
                cy={300 + p.y}
                r={5 + p.weight}
                fill="url(#sigilGradient)"
                filter="url(#softGlow)"
              />
              <text
                x={300 + p.x}
                y={300 + p.y - 14}
                textAnchor="middle"
                fill="white"
                fontSize="22"
                style={{ letterSpacing: "0.08em" }}
              >
                {p.glyph}
              </text>
              <text
                x={300 + p.x}
                y={300 + p.y + 26}
                textAnchor="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize="10"
              >
                {p.ch}×{p.count}
              </text>
            </g>
          );
        })}

        <circle
          cx="300"
          cy="300"
          r="46"
          fill="rgba(0,0,0,0.7)"
          stroke="url(#sigilGradient)"
          strokeWidth="1.5"
        />
        <text x="300" y="292" textAnchor="middle" fill="white" fontSize="13" style={{ letterSpacing: "0.2em" }}>
          ROOT
        </text>
        <text x="300" y="314" textAnchor="middle" fill="white" fontSize="28">
          {derivation.digitalRoot}
        </text>
      </svg>

      <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-40"
        style={{
          backgroundImage: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.04),transparent)",
          backgroundSize: "100% 3px",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.03)_45%,transparent_55%)] opacity-60" />
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/70 backdrop-blur">
        Breathing Sigil
      </div>
      <div className="absolute right-4 top-4 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-cyan-100 backdrop-blur">
        UT Forge
      </div>
    </motion.div>
  );
}

export default function UTSigilForge() {
  const [text, setText] = useState("creative breakthrough through disciplined vision");
  const [dialect, setDialect] = useState("codex");
  const [palette, setPalette] = useState("void");
  const [subscriberMode] = useState(true);
  const [glitchIntensity, setGlitchIntensity] = useState(0.45);
  const containerRef = useRef<HTMLDivElement>(null);

  const { derivation, points } = useMemo(() => deriveSigil(text, dialect), [text, dialect]);

  useEffect(() => {
    const id = setInterval(() => {
      const el = containerRef.current;
      if (!el) return;
      const x = (Math.random() - 0.5) * glitchIntensity * 8;
      const y = (Math.random() - 0.5) * glitchIntensity * 3;
      el.style.transform = `translate(${x}px, ${y}px)`;
      setTimeout(() => {
        if (el) el.style.transform = "translate(0px, 0px)";
      }, 110);
    }, 2100);
    return () => clearInterval(id);
  }, [glitchIntensity]);

  const topSymbols = useMemo(() => {
    return [...points].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [points]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div>
          <Badge className="mb-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-zinc-300">
            /forge/sigil &middot; xenolinguistic cipher &middot; subscriber artifacts
          </Badge>
          <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-[0.04em] text-zinc-50 md:text-5xl">
            Sigil Forge
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 md:text-base">
            Type an intention and let the system compress it into a living mark. The phrase
            is normalized, weighted, reduced through sacred geometry rules, and re-expressed
            as a breathing sigil in UT visual language with chromatic bloom, rotational
            drift, and ritual derivation.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-50">
              Engagement Layer &mdash; Each sigil is shareable, collectible, and explainable.
              Free users generate and view. Subscribers unlock export packs, derivation
              cards, ritual wallpapers, and animated loops.
            </div>
          </div>
        </div>

        <div className="flex items-start justify-start lg:justify-end">
          <Card className="w-full max-w-xl border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Output</div>
                <div className="mt-1 text-sm font-medium text-zinc-100">Static + Animated</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Math Layer</div>
                <div className="mt-1 text-sm font-medium text-zinc-100">Visible Derivation</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr_360px]">
        {/* Left: Controls */}
        <Card className="rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>
              <Wand2 className="h-5 w-5" />Forge Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.32em] text-white/50">
                Intention
              </label>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Protection during travel"
                className="h-14 rounded-2xl border-white/10 bg-black/40 text-base"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.32em] text-white/50">
                Dialect
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DIALECTS.map((d) => (
                  <Button
                    key={d.id}
                    variant={dialect === d.id ? "default" : "outline"}
                    className={`h-auto rounded-2xl px-3 py-3 text-left ${
                      dialect === d.id ? "bg-white text-black" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                    }`}
                    onClick={() => setDialect(d.id)}
                  >
                    {d.name}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.32em] text-white/50">
                Palette
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      palette === p.id
                        ? "border-white/40 bg-white/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm text-white">{p.name}</span>
                    <span className="flex gap-2">
                      <span className="h-4 w-4 rounded-full" style={{ background: p.a }} />
                      <span className="h-4 w-4 rounded-full" style={{ background: p.b }} />
                      <span className="h-4 w-4 rounded-full" style={{ background: p.c }} />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.32em] text-white/50">
                <span>Glitch Drift</span>
                <span>{Math.round(glitchIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={glitchIntensity}
                onChange={(e) => setGlitchIntensity(Number(e.target.value))}
                className="w-full cursor-pointer accent-white/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button className="rounded-2xl bg-white text-black hover:bg-white/90">
                <Sparkles className="mr-2 h-4 w-4" />Generate
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setText("")}
              >
                <RotateCcw className="mr-2 h-4 w-4" />Reset
              </Button>
            </div>

            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4 text-sm text-cyan-50">
              Suggested premium extension: let users save sigils to a personal vault, then
              evolve them over time by layering multiple intentions into a lineage sigil.
            </div>
          </CardContent>
        </Card>

        {/* Center: Sigil SVG */}
        <div ref={containerRef} className="space-y-6 transition-transform duration-150">
          <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl shadow-black/40">
            <SigilSVG text={text || " "} dialect={dialect} palette={palette} breathing />
          </div>

          <Card className="rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>
                <Orbit className="h-5 w-5" />Mathematical Derivation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/40">Characters</div>
                  <div className="mt-2 text-2xl">{derivation.characterCount}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/40">Unique</div>
                  <div className="mt-2 text-2xl">{derivation.uniqueCharacters}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/40">Char Sum</div>
                  <div className="mt-2 text-2xl">{derivation.charSum}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/40">Digital Root</div>
                  <div className="mt-2 text-2xl">{derivation.digitalRoot}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="mb-2 text-xs uppercase tracking-[0.3em] text-white/40">
                  Normalized Intention
                </div>
                <div className="font-mono text-sm text-white/80">
                  {derivation.normalized || "—"}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="mb-2 text-xs uppercase tracking-[0.3em] text-white/40">
                  Geometry Path
                </div>
                <div className="text-sm leading-7 text-white/70">
                  {derivation.geometry || "Awaiting input."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Tabs + info */}
        <div className="space-y-6">
          <Tabs defaultValue="subscriber" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-white/5">
              <TabsTrigger value="subscriber">Subscriber</TabsTrigger>
              <TabsTrigger value="share">Shareability</TabsTrigger>
            </TabsList>

            <TabsContent value="subscriber">
              <Card className="rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>
                    <Lock className="h-5 w-5" />Premium Unlocks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    [
                      "High-res sigil export",
                      "4k transparent PNG + print-ready vector pass",
                    ],
                    [
                      "Animated breathing loop",
                      "Short vertical loop optimized for social sharing",
                    ],
                    [
                      "Derivation card",
                      "How the phrase became geometry, glyph by glyph",
                    ],
                    [
                      "Ritual wallpaper pack",
                      "Mobile + desktop sacred screen versions",
                    ],
                  ].map(([title, desc]) => (
                    <div
                      key={title as string}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <div className="font-medium text-white">{title as string}</div>
                      <div className="mt-1 text-sm text-white/60">{desc as string}</div>
                    </div>
                  ))}
                  <Button className="mt-2 w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 text-black hover:opacity-90">
                    Become a Subscriber
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="share">
              <Card className="rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>
                    <Eye className="h-5 w-5" />Engagement Mechanics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-white/70">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    Generate a unique sigil from a private intention, then publish the
                    mark without revealing the source phrase.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    Create sigil drops tied to lunar phases, seasonal gates, or artist
                    collaborations.
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    Offer public remix battles where users transform one phrase through
                    different dialect registers.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>
                <Hexagon className="h-5 w-5" />Dominant Glyph Weights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topSymbols.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div>
                    <div className="text-lg text-white">
                      {s.glyph}{" "}
                      <span className="ml-2 text-sm text-white/55">{s.ch}</span>
                    </div>
                    <div className="text-xs uppercase tracking-[0.28em] text-white/35">
                      weight {s.count}
                    </div>
                  </div>
                  <div className="text-right text-xs text-white/45">
                    radius {Math.round(s.radius)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>
                <Play className="h-5 w-5" />Next-Level Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/70">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                Sigil resonance mode: hum or speak into the mic and let the generated
                sigil subtly deform in response.
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                Pair sigil output with a short activation transmission soundscape generated
                from the same letter matrix.
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                Let subscribers mint a time-stamped lineage sequence as a journal of
                evolving intentions.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button className="rounded-2xl bg-white text-black hover:bg-white/90">
          <Download className="mr-2 h-4 w-4" />Export Preview
        </Button>
        <Button
          variant="outline"
          className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          Generate Ritual Card
        </Button>
        <Button
          variant="outline"
          className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          View Mapping Table
        </Button>
      </div>
    </div>
  );
}
