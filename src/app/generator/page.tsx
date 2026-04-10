"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Download,
  Copy,
  Sparkles,
  RotateCcw,
  Wand2,
  Layers3,
  Aperture,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type GeometryKey =
  | "dharmachakra"
  | "merkaba"
  | "flower_of_life"
  | "sri_yantra"
  | "metatron"
  | "torus_flow"
  | "interference"
  | "golden_spiral"
  | "void_lattice"
  | "radial_oracle";

type PaletteKey =
  | "crimson_gold"
  | "neon_void"
  | "ultraviolet"
  | "ember_fire"
  | "verdigris"
  | "abyssal_cyan"
  | "solar_bloom";

type GlyphSetKey = "UT" | "CODEX" | "SIGIL" | "RUNE";

type Palette = {
  bg: string;
  glow: string;
  core: string;
  mid: string;
  edge: string;
  accent: string;
};

const GRID = 60;
const CANVAS_SIZE = 960;
const CELL = CANVAS_SIZE / GRID;

const CHARSET_MAP: Record<GlyphSetKey, string[]> = {
  UT: "𓂀△◬◈⟁✶✦⟡⌘⟐◉⊹☉◌◇✧⟢".split(""),
  CODEX: "᚛᚜⟁⟐⟡⌬⟠⋇⋈⋔⋰⋱⋆⋒⋏⌇⌁".split(""),
  SIGIL: "✶✦✹✺✧✩☉☌☍☿♁♆♇⚶⚹⚴".split(""),
  RUNE: "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᛁᛃᛇᛈᛉᛋᛏ".split(""),
};

const GEOMETRY_LABELS: Record<GeometryKey, string> = {
  dharmachakra: "Dharmachakra",
  merkaba: "Merkaba",
  flower_of_life: "Flower of Life",
  sri_yantra: "Sri Yantra",
  metatron: "Metatron",
  torus_flow: "Torus Flow",
  interference: "Interference",
  golden_spiral: "Golden Spiral",
  void_lattice: "Void Lattice",
  radial_oracle: "Radial Oracle",
};

const PALETTES: Record<PaletteKey, Palette> = {
  crimson_gold: {
    bg: "#04030A",
    glow: "#F4B56A",
    core: "#F2D08B",
    mid: "#D25B4D",
    edge: "#7C1E32",
    accent: "#FFD98A",
  },
  neon_void: {
    bg: "#02030A",
    glow: "#78F7FF",
    core: "#E6FAFF",
    mid: "#7B6DFF",
    edge: "#111437",
    accent: "#F55CFF",
  },
  ultraviolet: {
    bg: "#03020A",
    glow: "#C49DFF",
    core: "#EFE5FF",
    mid: "#8E5BFF",
    edge: "#2C1149",
    accent: "#58D0FF",
  },
  ember_fire: {
    bg: "#080304",
    glow: "#FF8A52",
    core: "#FFE0A4",
    mid: "#FF5A36",
    edge: "#521018",
    accent: "#FFD866",
  },
  verdigris: {
    bg: "#02090A",
    glow: "#77E6D2",
    core: "#E5FFF7",
    mid: "#4FB9A7",
    edge: "#123A3C",
    accent: "#A9FFC2",
  },
  abyssal_cyan: {
    bg: "#010810",
    glow: "#3CD8FF",
    core: "#E9FDFF",
    mid: "#1389D6",
    edge: "#06233D",
    accent: "#7CFBFF",
  },
  solar_bloom: {
    bg: "#09070A",
    glow: "#FFD36A",
    core: "#FFF6D7",
    mid: "#FF9B5B",
    edge: "#49220D",
    accent: "#FFF18F",
  },
};

const geometryFns: Record<GeometryKey, (x: number, y: number, t: number) => number> = {
  dharmachakra: (x, y, t) => {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const spokes = Math.cos(a * 8 + t * 1.3) * 0.5 + 0.5;
    const rim = Math.exp(-Math.pow(r - 0.56, 2) * 90);
    const inner = Math.exp(-Math.pow(r - 0.22, 2) * 140);
    const pulse = Math.sin(r * 18 - t * 2.6) * 0.5 + 0.5;
    return clamp01(spokes * 0.5 + rim * 0.7 + inner * 0.35 + pulse * 0.2);
  },
  merkaba: (x, y, t) => {
    const a = Math.atan2(y, x);
    const r = Math.hypot(x, y);
    const triA = Math.cos(a * 3 + t) * 0.5 + 0.5;
    const triB = Math.cos(a * 3 - t + Math.PI) * 0.5 + 0.5;
    const shell = Math.exp(-Math.pow(r - 0.48, 2) * 110);
    const core = Math.exp(-r * 7.5);
    return clamp01((triA * triB) * 0.9 + shell * 0.5 + core * 0.3);
  },
  flower_of_life: (x, y, t) => {
    const scale = 2.3;
    const px = x * scale;
    const py = y * scale;
    const d1 = Math.sin(px * 6 + t);
    const d2 = Math.sin((px * 0.5 + py * 0.866) * 6 - t * 1.2);
    const d3 = Math.sin((px * 0.5 - py * 0.866) * 6 + t * 0.85);
    return clamp01(((d1 + d2 + d3) / 3 + 1) / 2);
  },
  sri_yantra: (x, y, t) => {
    const a = Math.atan2(y, x);
    const r = Math.hypot(x, y);
    const tri = Math.abs(Math.cos(a * 9 + t * 0.8));
    const bands = Math.abs(Math.sin(r * 22 - t * 2.4));
    const center = Math.exp(-r * 8);
    return clamp01(tri * 0.65 + bands * 0.3 + center * 0.5);
  },
  metatron: (x, y, t) => {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const nodes = Math.pow(Math.cos(a * 6 - t * 0.9) * 0.5 + 0.5, 4);
    const rings = Math.abs(Math.cos(r * 24 - t * 1.7));
    return clamp01(nodes * 0.7 + rings * 0.4);
  },
  torus_flow: (x, y, t) => {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const donut = Math.exp(-Math.pow(r - 0.42, 2) * 85);
    const flow = Math.sin(a * 4 + r * 14 - t * 2.1) * 0.5 + 0.5;
    const back = Math.cos(a * 2 - t * 1.4) * 0.5 + 0.5;
    return clamp01(donut * (0.5 + flow * 0.7) + back * 0.2);
  },
  interference: (x, y, t) => {
    const d1 = Math.hypot(x - 0.25 * Math.cos(t), y - 0.25 * Math.sin(t));
    const d2 = Math.hypot(x + 0.25 * Math.cos(t * 1.2), y + 0.25 * Math.sin(t * 1.2));
    const v = Math.sin(d1 * 26 - t * 2.4) + Math.sin(d2 * 26 + t * 2.1);
    return clamp01((v / 2 + 1) / 2);
  },
  golden_spiral: (x, y, t) => {
    const r = Math.hypot(x, y) + 1e-4;
    const a = Math.atan2(y, x);
    const spiral = Math.sin(10 * Math.log(r) + a * 4 - t * 1.5);
    const shell = Math.exp(-r * 1.5);
    return clamp01(((spiral + 1) / 2) * shell + (1 - r) * 0.2);
  },
  void_lattice: (x, y, t) => {
    const gx = Math.sin(x * 18 + t * 0.9);
    const gy = Math.cos(y * 18 - t * 1.1);
    const diag = Math.sin((x + y) * 14 + t * 1.4);
    return clamp01((gx + gy + diag + 3) / 6);
  },
  radial_oracle: (x, y, t) => {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const petals = Math.sin(a * 12 + t * 1.6) * 0.5 + 0.5;
    const wave = Math.sin(r * 30 - t * 2.2) * 0.5 + 0.5;
    const eye = Math.exp(-Math.pow(r - 0.18, 2) * 300);
    return clamp01(petals * 0.45 + wave * 0.35 + eye * 0.55);
  },
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const value =
    cleaned.length === 3
      ? cleaned.split("").map((c) => c + c).join("")
      : cleaned;
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function mixColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca.r, cb.r, t))}, ${Math.round(lerp(ca.g, cb.g, t))}, ${Math.round(lerp(ca.b, cb.b, t))})`;
}

function getColor(palette: Palette, v: number, flicker: number) {
  if (v < 0.33) return mixColor(palette.edge, palette.mid, v / 0.33);
  if (v < 0.66) return mixColor(palette.mid, palette.glow, (v - 0.33) / 0.33);
  return mixColor(
    palette.glow,
    palette.core,
    Math.min(1, (v - 0.66) / 0.34 + flicker * 0.08)
  );
}

function encodeState(state: Record<string, string | number>) {
  const params = new URLSearchParams();
  Object.entries(state).forEach(([k, v]) => params.set(k, String(v)));
  return params.toString();
}

function useSubscriberStub() {
  const [subscriber] = useState(true);
  return subscriber;
}

function Metric({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">{label}</div>
      <div className={`${small ? "text-xs" : "text-sm"} mt-1 font-medium text-zinc-100`}>
        {value}
      </div>
    </div>
  );
}

function SectionLabel({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/50">
      {icon}
      {title}
    </div>
  );
}

function RangeRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.26em] text-white/50">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      {children}
    </div>
  );
}

export default function UTSacredGeometryGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [geometry, setGeometry] = useState<GeometryKey>("dharmachakra");
  const [palette, setPalette] = useState<PaletteKey>("crimson_gold");
  const [glyphSet, setGlyphSet] = useState<GlyphSetKey>("UT");
  const [speed, setSpeed] = useState(1);
  const [density, setDensity] = useState(72);
  const [brightness, setBrightness] = useState(92);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mixMode, setMixMode] = useState<"normal" | "aura" | "ghost">("aura");
  const [status, setStatus] = useState("Signal coherent");

  const subscriber = useSubscriberStub();
  const paletteDef = useMemo(() => PALETTES[palette], [palette]);
  const glyphs = useMemo(() => CHARSET_MAP[glyphSet], [glyphSet]);

  const drawFrame = useCallback(
    (frame: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const t = (frame / 60) * speed;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Background field
      const bgGrad = ctx.createRadialGradient(
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        40,
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        CANVAS_SIZE * 0.65
      );
      bgGrad.addColorStop(0, mixColor(paletteDef.bg, paletteDef.edge, 0.18));
      bgGrad.addColorStop(0.55, paletteDef.bg);
      bgGrad.addColorStop(1, "#000000");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.save();
      if (mixMode === "aura") ctx.globalCompositeOperation = "screen";
      if (mixMode === "ghost") ctx.globalCompositeOperation = "lighter";

      const patternFn = geometryFns[geometry];
      const threshold = lerp(0.11, 0.01, density / 100);
      const alphaBase = lerp(0.35, 1, brightness / 100);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.round(CELL * 0.8)}px ui-monospace, monospace`;

      for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
          const nx = (col / (GRID - 1)) * 2 - 1;
          const ny = (row / (GRID - 1)) * 2 - 1;
          const v = patternFn(nx, ny, t);
          if (v < threshold) continue;

          const idx = Math.max(
            0,
            Math.min(glyphs.length - 1, Math.floor(v * (glyphs.length - 1)))
          );
          const char = glyphs[idx];
          const flicker = Math.sin(col * 0.8 + row * 0.45 + t * 2.7) * 0.5 + 0.5;
          const x = col * CELL + CELL * 0.5;
          const y = row * CELL + CELL * 0.5;
          const px = x + Math.sin(t * 1.7 + row * 0.15) * 0.55;
          const py = y + Math.cos(t * 1.35 + col * 0.11) * 0.55;
          const color = getColor(paletteDef, v, flicker);

          // Chromatic aura
          ctx.shadowBlur = 16 + v * 18;
          ctx.shadowColor = paletteDef.glow;
          ctx.globalAlpha = alphaBase * (0.3 + v * 0.8);
          ctx.fillStyle = color;
          ctx.fillText(char, px, py);

          // Subtle aberration layers
          ctx.globalAlpha = 0.14 + v * 0.08;
          ctx.fillStyle = paletteDef.accent;
          ctx.fillText(char, px - 0.8, py);
          ctx.fillStyle = paletteDef.mid;
          ctx.fillText(char, px + 0.95, py + 0.2);
        }
      }
      ctx.restore();

      // Rings / ceremonial overlay
      ctx.save();
      ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
      for (let i = 0; i < 4; i++) {
        const rr = 130 + i * 88 + Math.sin(t * (0.5 + i * 0.15)) * 6;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 === 0 ? `${paletteDef.glow}22` : `${paletteDef.accent}16`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      // Scanlines
      ctx.save();
      ctx.globalAlpha = 0.06;
      for (let y = 0; y < CANVAS_SIZE; y += 3) {
        ctx.fillStyle = y % 6 === 0 ? "#ffffff" : "#000000";
        ctx.fillRect(0, y, CANVAS_SIZE, 1);
      }
      ctx.restore();

      // Vignette
      const vignette = ctx.createRadialGradient(
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        CANVAS_SIZE * 0.2,
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        CANVAS_SIZE * 0.72
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.58)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    },
    [brightness, density, geometry, glyphs, mixMode, paletteDef, speed]
  );

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      drawFrame(frame);
      frame += 1;
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(loop);
      }
    };
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(loop);
    } else {
      drawFrame(frame);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [drawFrame, isPlaying]);

  const resetScene = useCallback(() => {
    setGeometry("dharmachakra");
    setPalette("crimson_gold");
    setGlyphSet("UT");
    setSpeed(1);
    setDensity(72);
    setBrightness(92);
    setMixMode("aura");
    setStatus("State reset to canonical transmission");
  }, []);

  const copyShareLink = useCallback(async () => {
    const query = encodeState({
      g: geometry,
      p: palette,
      f: glyphSet,
      s: speed.toFixed(2),
      d: density,
      b: brightness,
      m: mixMode,
    });
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/generator?${query}`
        : `/generator?${query}`;
    await navigator.clipboard.writeText(url);
    setStatus("Share link copied");
  }, [brightness, density, geometry, glyphSet, mixMode, palette, speed]);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ut-generator-${geometry}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setStatus("Recording downloaded");
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setStatus("Recording in progress");
  }, [geometry, isRecording]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  return (
    <div className="relative mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div>
          <Badge className="mb-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-zinc-300">
            Universal Transmissions &middot; Generator Node
          </Badge>
          <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-[0.04em] text-zinc-50 md:text-5xl">
            Sacred Geometry Generator
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 md:text-base">
            A ceremonial visual instrument for xenoglyphic fields, recursive geometry,
            and living signal compositions. Tuned to the visual DNA of Universal
            Transmissions, but built with a more immersive, collectible, and shareable
            flow.
          </p>
        </div>
        <div className="flex items-start justify-start lg:justify-end">
          <Card className="w-full max-w-xl border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              <Metric label="Geometry" value={GEOMETRY_LABELS[geometry]} />
              <Metric label="Palette" value={palette.replace("_", " ")} />
              <Metric label="Glyph Field" value={glyphSet} />
              <Metric label="Signal" value={status} small />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_430px]">
        <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="group relative overflow-hidden rounded-[28px] border-white/10 bg-black/30 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_55%)]" />
            <div
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)",
                backgroundSize: "36px 36px",
              }}
            />
            <div className="relative p-3 md:p-5">
              <div className="relative mx-auto aspect-square w-full max-w-[960px] overflow-hidden rounded-[24px] border border-white/10 bg-black">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/5 to-transparent" />
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_rgba(0,0,0,0.5)]" />
                <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-zinc-300 backdrop-blur-md">
                  live transmission
                </div>
                <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-zinc-300 backdrop-blur-md">
                  960 &times; 960 &middot; 30fps
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-4">
          <Card className="rounded-[28px] border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle>
                <Sparkles className="h-4 w-4" /> Engine Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <SectionLabel icon={<Aperture className="h-4 w-4" />} title="Geometry" />
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(GEOMETRY_LABELS) as GeometryKey[]).map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    onClick={() => setGeometry(key)}
                    className={`justify-start rounded-2xl border px-3 py-5 text-left text-xs tracking-[0.12em] ${
                      geometry === key
                        ? "border-white/30 bg-white/12 text-white"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {GEOMETRY_LABELS[key]}
                  </Button>
                ))}
              </div>

              <SectionLabel icon={<Layers3 className="h-4 w-4" />} title="Palette" />
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PALETTES) as PaletteKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setPalette(key)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      palette === key
                        ? "border-white/30 bg-white/10"
                        : "border-white/10 bg-white/5 hover:bg-white/8"
                    }`}
                  >
                    <div className="mb-2 flex gap-2">
                      {[
                        PALETTES[key].edge,
                        PALETTES[key].mid,
                        PALETTES[key].glow,
                        PALETTES[key].core,
                      ].map((c) => (
                        <span
                          key={c}
                          className="h-5 flex-1 rounded-full"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-300">
                      {key.replace("_", " ")}
                    </div>
                  </button>
                ))}
              </div>

              <SectionLabel icon={<Wand2 className="h-4 w-4" />} title="Glyph Field" />
              <Tabs
                value={glyphSet}
                onValueChange={(v) => setGlyphSet(v as GlyphSetKey)}
              >
                <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-black/30">
                  {(["UT", "CODEX", "SIGIL", "RUNE"] as GlyphSetKey[]).map((g) => (
                    <TabsTrigger key={g} value={g}>
                      {g}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="grid grid-cols-8 gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                {glyphs.map((glyph, i) => (
                  <div
                    key={`${glyph}-${i}`}
                    className="flex aspect-square items-center justify-center rounded-xl border border-white/8 bg-white/5 text-lg shadow-[0_0_20px_rgba(255,255,255,0.04)]"
                    style={{
                      color: i % 2 === 0 ? paletteDef.glow : paletteDef.accent,
                    }}
                  >
                    {glyph}
                  </div>
                ))}
              </div>

              <SectionLabel icon={<Crown className="h-4 w-4" />} title="Signal Shaping" />
              <RangeRow label="Speed" value={speed.toFixed(2)}>
                <Slider
                  value={[speed]}
                  onValueChange={(v) => setSpeed(v[0])}
                  min={0.35}
                  max={2.4}
                  step={0.01}
                />
              </RangeRow>
              <RangeRow label="Density" value={`${density}%`}>
                <Slider
                  value={[density]}
                  onValueChange={(v) => setDensity(v[0])}
                  min={25}
                  max={100}
                  step={1}
                />
              </RangeRow>
              <RangeRow label="Brightness" value={`${brightness}%`}>
                <Slider
                  value={[brightness]}
                  onValueChange={(v) => setBrightness(v[0])}
                  min={40}
                  max={100}
                  step={1}
                />
              </RangeRow>

              <div>
                <div className="mb-2 text-[11px] uppercase tracking-[0.26em] text-zinc-400">
                  Blend Mode
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["normal", "aura", "ghost"] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant="outline"
                      onClick={() => setMixMode(mode)}
                      className={`rounded-2xl border text-[11px] uppercase tracking-[0.2em] ${
                        mixMode === mode
                          ? "border-white/30 bg-white/12 text-white"
                          : "border-white/10 bg-white/5 text-zinc-300"
                      }`}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setIsPlaying((v) => !v)}
                  className="h-12 rounded-2xl bg-white text-black hover:bg-zinc-200"
                >
                  {isPlaying ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetScene}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={copyShareLink}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy Share Link
                </Button>
                {subscriber ? (
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    className="h-12 rounded-2xl bg-gradient-to-r from-amber-200 via-orange-200 to-yellow-100 text-black hover:opacity-90"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isRecording ? "Stop Recording" : "Record WebM"}
                  </Button>
                ) : (
                  <Button disabled className="h-12 rounded-2xl bg-white/10 text-zinc-500">
                    Subscriber download only
                  </Button>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">
                <div className="mb-1 text-[11px] uppercase tracking-[0.24em] text-zinc-300">
                  Production path for PRIME
                </div>
                <p>
                  Keep the live canvas fully client-side for instant ritual interaction.
                  Gate instant WebM capture to subscribers, then add queued MP4 renders
                  through{" "}
                  <span className="text-zinc-200">/api/generator/render</span> + worker
                  infrastructure once the front-end experience is stable.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
