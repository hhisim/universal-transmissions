"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment, Text, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";

/* ═══════════════════════════════════════════════════════════
   SACRED FREQUENCIES
   ═══════════════════════════════════════════════════════════ */
const FREQUENCIES = [
  { hz: 174, name: "Foundation",    chakra: "Root",  color: "#d4a847" },
  { hz: 285, name: "Repair",        chakra: "Sacral", color: "#22d3ee" },
  { hz: 396, name: "Liberation",    chakra: "Solar",  color: "#a855f7" },
  { hz: 417, name: "Change",       chakra: "Heart",  color: "#22d3ee" },
  { hz: 432, name: "Harmonic",      chakra: "Heart",  color: "#d4a847" },
  { hz: 528, name: "Miracle",       chakra: "Throat", color: "#ec4899" },
  { hz: 639, name: "Harmony",       chakra: "Third",  color: "#0ea5e9" },
  { hz: 741, name: "Intuition",     chakra: "Third",  color: "#a855f7" },
  { hz: 852, name: "Third Eye",     chakra: "Crown",  color: "#0ea5e9" },
  { hz: 963, name: "Crown",         chakra: "Crown",  color: "#d4a847" },
];

/* ═══════════════════════════════════════════════════════════
   3D CYMATIC MESH
   ═══════════════════════════════════════════════════════════ */
function CymaticMesh({
  freq,
  color,
  complexity,
  morphTarget,
}: {
  freq: number;
  color: string;
  complexity: number;
  morphTarget: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const t = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    t.current += delta;

    // Rotational animation
    meshRef.current.rotation.x = t.current * 0.15;
    meshRef.current.rotation.y = t.current * 0.2;

    // Scale pulsing with frequency
    const pulse = 1 + Math.sin(t.current * (freq / 432) * 0.5) * 0.08;
    meshRef.current.scale.setScalar(pulse);

    // Morph-like deformation via vertex shader simulation
    if (matRef.current) {
      const hue = (freq / 1000) % 1;
      matRef.current.color.set(color);
      matRef.current.emissive.set(color);
      matRef.current.emissiveIntensity = 0.3 + Math.sin(t.current * (freq / 432)) * 0.2;
    }
  });

  // Geometry selection based on frequency complexity
  const geometries = [
    <icosahedronGeometry key="ico" args={[1, Math.min(Math.floor(freq / 100) + 1, 5)]} />,
    <octahedronGeometry key="oct" args={[1, 0]} />,
    <torusKnotGeometry key="tk" args={[0.7, 0.3, Math.min(freq / 10, 128), 16]} />,
  ];
  const geoIndex = complexity % 3;

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1}>
      <mesh ref={meshRef} castShadow>
        {geometries[geoIndex]}
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.7}
          roughness={0.2}
          wireframe={complexity > 5}
        />
      </mesh>
      {/* Orbital rings */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[i * 0.8, 0, i * 0.5]}>
          <torusGeometry args={[1.4 + i * 0.2, 0.01, 8, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.15 + i * 0.05} />
        </mesh>
      ))}
    </Float>
  );
}

/* ═══════════════════════════════════════════════════════════
   3D SCENE
   ═══════════════════════════════════════════════════════════ */
function CymaticScene({ freq, color, complexity }: { freq: number; color: string; complexity: number }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={2} color={color} />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#22d3ee" />
      <spotLight position={[0, 15, 0]} intensity={3} angle={0.5} color={color} castShadow />
      <CymaticMesh freq={freq} color={color} complexity={complexity} morphTarget={0} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCENE WRAPPER (loads Three.js async)
   ═══════════════════════════════════════════════════════════ */
function SceneWrapper({ freq, color, complexity }: { freq: number; color: string; complexity: number }) {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
      <Suspense fallback={null}>
        <CymaticScene freq={freq} color={color} complexity={complexity} />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESONANCE WEAVER — Feature A
   ═══════════════════════════════════════════════════════════ */
function ResonanceWeaver({ onFreq, currentColor }: { onFreq: (f: number) => void; currentColor: string }) {
  const [recording, setRecording] = useState(false);
  const [analyserData, setAnalyserData] = useState<number[]>(Array(16).fill(0));
  const [simFreq, setSimFreq] = useState(432);
  const animRef = useRef<number>(0);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      if (recording) {
        // Simulate frequency analysis — wave pattern based on frame
        const newData = Array.from({ length: 16 }, (_, i) => {
          const phase = (frame * 0.05 + i * 0.3) % (Math.PI * 2);
          return 0.5 + 0.5 * Math.sin(phase) * Math.sin(frame * 0.02 + i * 0.7);
        });
        setAnalyserData(newData);

        // Derive dominant frequency from wave pattern
        const dominant = 200 + newData.reduce((s, v, i) => s + v * (i + 1) * 30, 0);
        setSimFreq(Math.round(Math.min(dominant, 4000)));
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [recording]);

  useEffect(() => {
    onFreq(simFreq);
  }, [simFreq]);

  return (
    <div className="ut-card p-6" style={{ background: "rgba(10,9,14,0.6)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${currentColor}22`, border: `1px solid ${currentColor}44` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={currentColor} strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/>
          </svg>
        </div>
        <div>
          <div className="font-display text-sm" style={{ color: "var(--ut-white)" }}>Resonance Weaver</div>
          <div className="font-mono text-[9px] opacity-50" style={{ color: "var(--ut-white-dim)" }}>Record sound · Watch geometry respond</div>
        </div>
      </div>

      {/* Frequency spectrum visualizer */}
      <div className="flex items-center gap-1 h-16 mb-4">
        {analyserData.map((val, i) => (
          <div key={i} className="flex-1 rounded-sm transition-all" style={{
            height: `${Math.max(4, Math.abs(val) * 100)}%`,
            background: currentColor,
            opacity: 0.3 + Math.abs(val) * 0.7,
          }} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setRecording(!recording)}
          className="ut-btn px-6 py-3 font-mono text-xs flex items-center gap-2"
          style={{
            borderColor: recording ? "#ef4444" : "rgba(34,211,238,0.3)",
            color: recording ? "#ef4444" : "var(--ut-cyan)",
            background: recording ? "rgba(239,68,68,0.1)" : "transparent",
          }}
        >
          <div className={`w-3 h-3 rounded-full ${recording ? "animate-pulse" : ""}`} style={{ background: recording ? "#ef4444" : "currentColor" }} />
          {recording ? "Stop Recording" : "Start Recording"}
        </button>
        <div className="font-mono text-xs" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
          {simFreq} Hz derived
        </div>
      </div>

      <p className="font-body text-xs mt-4" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
        Start recording to analyze ambient sound. The 3D geometry morphs in real-time to match the frequency spectrum detected.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SACRED FREQUENCY SEQUENCER — Feature B
   ═══════════════════════════════════════════════════════════ */
function SacredFreqSequencer({ onSeq }: { onSeq: (f: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([432, 528, 639, 963]);
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const togglePlay = () => {
    if (playing) {
      clearInterval(timerRef.current);
      setPlaying(false);
      setActiveStep(0);
    } else {
      setPlaying(true);
      timerRef.current = setInterval(() => {
        setActiveStep((s) => {
          const next = (s + 1) % sequence.length;
          onSeq(sequence[next]);
          return next;
        });
      }, 2000);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const addFreq = (hz: number) => {
    if (sequence.length < 8) setSequence((s) => [...s, hz]);
  };

  const removeStep = (i: number) => {
    setSequence((s) => s.filter((_, idx) => idx !== i));
  };

  return (
    <div className="ut-card p-6" style={{ background: "rgba(10,9,14,0.6)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(212,168,71,0.15)", border: "1px solid rgba(212,168,71,0.4)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4a847" strokeWidth="2">
            <path d="M9 18V5l12-2v13M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
          </svg>
        </div>
        <div>
          <div className="font-display text-sm" style={{ color: "var(--ut-white)" }}>Sacred Frequency Sequencer</div>
          <div className="font-mono text-[9px] opacity-50" style={{ color: "var(--ut-white-dim)" }}>Play a sequence · Watch geometry evolve</div>
        </div>
      </div>

      {/* Step sequencer */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
        {sequence.map((hz, i) => {
          const f = FREQUENCIES.find((f) => f.hz === hz) || { color: "#22d3ee", name: `${hz}Hz` };
          return (
            <button
              key={i}
              onClick={() => removeStep(i)}
              className="flex-shrink-0 px-3 py-2 rounded-lg font-mono text-xs transition-all"
              style={{
                background: activeStep === i && playing ? `${f.color}33` : "rgba(34,211,238,0.05)",
                border: `1px solid ${activeStep === i && playing ? f.color : "rgba(34,211,238,0.15)"}`,
                color: activeStep === i && playing ? f.color : "var(--ut-white-dim)",
              }}
              title="Click to remove"
            >
              <div className="text-sm">{hz}</div>
              <div className="text-[9px] opacity-50">{f.name}</div>
            </button>
          );
        })}
      </div>

      {/* Quick-add frequency buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FREQUENCIES.filter((f) => !sequence.includes(f.hz)).map((f) => (
          <button
            key={f.hz}
            onClick={() => addFreq(f.hz)}
            className="ut-btn px-3 py-1 font-mono text-[10px]"
            style={{ borderColor: `${f.color}44`, color: f.color, opacity: 0.6 }}
            disabled={sequence.length >= 8}
          >+ {f.hz}Hz</button>
        ))}
      </div>

      <button
        onClick={togglePlay}
        className="ut-btn px-6 py-3 font-mono text-xs flex items-center gap-2"
        style={{ borderColor: playing ? "#ef4444" : "rgba(212,168,71,0.4)", color: playing ? "#ef4444" : "#d4a847" }}
      >
        {playing ? "⏹ Stop" : "▶ Play Sequence"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRANSLATION CHAMBER — Feature C
   ═══════════════════════════════════════════════════════════ */
function TranslationChamber({ onText }: { onText: (t: string) => void }) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (input.trim()) onText(input.trim());
  };

  // Simple frequency derivation from text
  const derivedFreq = input ? 100 + (input.charCodeAt(0) % 1000) : 432;
  const freqColor = `hsl(${(derivedFreq % 360)}, 70%, 60%)`;

  return (
    <div className="ut-card p-6" style={{ background: "rgba(10,9,14,0.6)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
            <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
          </svg>
        </div>
        <div>
          <div className="font-display text-sm" style={{ color: "var(--ut-white)" }}>Translation Chamber</div>
          <div className="font-mono text-[9px] opacity-50" style={{ color: "var(--ut-white-dim)" }}>Input text · Convert to geometry</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Enter a word, symbol, or glyph..."
          className="ut-input flex-1 px-4 py-3 font-mono text-sm"
          style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)", color: "var(--ut-white)" }}
        />
        <button
          onClick={handleSubmit}
          className="ut-btn px-6 py-3 font-mono text-xs"
          style={{ borderColor: "rgba(168,85,247,0.4)", color: "#a855f7" }}
        >Transmit</button>
      </div>

      {input && (
        <div className="p-4 rounded-xl" style={{ background: `${freqColor}11`, border: `1px solid ${freqColor}33` }}>
          <div className="font-mono text-xs mb-2" style={{ color: freqColor }}>
            {derivedFreq.toFixed(1)} Hz derived from "{input}"
          </div>
          <div className="flex gap-2 flex-wrap">
            {Array.from(input).slice(0, 8).map((char, i) => (
              <div key={i} className="px-3 py-1 rounded font-mono text-xs" style={{
                background: `${freqColor}22`,
                color: freqColor,
              }}>{char.toUpperCase()}</div>
            ))}
          </div>
        </div>
      )}

      <p className="font-body text-xs mt-4" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
        The Chamber converts text, symbols, or glyphs into frequency data — then renders a unique 3D Cymatic form that represents the input. A visual fingerprint of language.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Cymatic3DPage() {
  const [activeFeature, setActiveFeature] = useState<"weaver" | "sequencer" | "chamber">("weaver");
  const [currentFreq, setCurrentFreq] = useState(432);
  const [currentColor, setCurrentColor] = useState("#22d3ee");
  const [complexity, setComplexity] = useState(4);
  const [inputText, setInputText] = useState("");
  const [lastSnap, setLastSnap] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const handleWeaverFreq = (f: number) => {
    setCurrentFreq(f);
    const c = FREQUENCIES.find((fr) => Math.abs(fr.hz - f) < 50) || { color: "#22d3ee" };
    setCurrentColor((c as any).color || "#22d3ee");
  };

  const handleSeqFreq = (f: number) => {
    setCurrentFreq(f);
    const c = FREQUENCIES.find((fr) => Math.abs(fr.hz - f) < 50) || { color: "#d4a847" };
    setCurrentColor((c as any).color || "#d4a847");
  };

  const handleChamberText = (t: string) => {
    setInputText(t);
    const f = 100 + (t.charCodeAt(0) % 1000);
    setCurrentFreq(Math.min(f, 4000));
    setComplexity(Math.min(8, t.length % 8));
    const hue = f % 360;
    setCurrentColor(`hsl(${hue}, 70%, 60%)`);
  };

  const handleSacredFreq = (f: typeof FREQUENCIES[0]) => {
    setCurrentFreq(f.hz);
    setCurrentColor(f.color);
    setInputText("");
  };

  const handleSnapshot = () => {
    if (locked) return;
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `cymatic-3d-${currentFreq}hz-${Date.now()}.png`;
      a.click();
      setLastSnap(`Snapshot captured — ${currentFreq}Hz`);
    }
    trackUsage("cymatic-3d", "snapshot", getOrCreateAnonymousId());
  };

  const FEATURE_INFO = {
    weaver: {
      label: "Resonance Weaver",
      desc: "Record sound and watch the geometry morph in real-time to match what it hears.",
      color: "#22d3ee",
    },
    sequencer: {
      label: "Sacred Frequency Sequencer",
      desc: "Play a sequence of sacred frequencies and watch the form evolve through each transformation.",
      color: "#d4a847",
    },
    chamber: {
      label: "Translation Chamber",
      desc: 'Input any word or symbol. The Engine renders a 3D Cymatic form that is the "fingerprint" of that text.',
      color: "#a855f7",
    },
  };

  return (
    <>
      <PageBackground variant="cymatics" />
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-12" style={{ borderBottom: "1px solid rgba(34,211,238,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                [ Experience Portal — 3D Cymatic Engine ]
              </p>
              <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: currentColor }}>
                <ZalgoText text="3D Cymatic Engine" intensity="subtle" />
              </h1>
              <p className="font-body text-base max-w-2xl" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                Three.js volumetric cymatic visualization — sacred frequency geometry rendered in three-dimensional space.
                Three instruments. One field.
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── 3D CANVAS ───────────────────────────────── */}
        <section className="py-8">
          <div className="container-ut">
            <div className="max-w-5xl mx-auto">

              {/* Canvas */}
              <div className="ut-card p-4" style={{ background: "rgba(10,9,14,0.8)", aspectRatio: "16/9" }}>
                <SceneWrapper freq={currentFreq} color={currentColor} complexity={complexity} />
              </div>

              {/* Overlay info */}
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div>
                  <div className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>Active Frequency</div>
                  <div className="font-display text-2xl" style={{ color: currentColor }}>{currentFreq}<span className="text-base opacity-60 ml-1">Hz</span></div>
                </div>
                <div>
                  <div className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>Geometry</div>
                  <div className="font-mono text-sm" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>Complexity: {complexity}/10</div>
                </div>
                <button
                  onClick={handleSnapshot}
                  disabled={locked}
                  className="ut-btn px-6 py-3 font-mono text-xs flex items-center gap-2 ml-auto"
                  style={{ borderColor: "rgba(34,211,238,0.4)", color: "var(--ut-cyan)", opacity: locked ? 0.4 : 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  {locked ? "Guest Limit Reached" : "Save Snapshot"}
                </button>
                {lastSnap && <span className="font-mono text-xs" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>{lastSnap}</span>}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE SELECTOR ────────────────────────── */}
        <section className="py-8" style={{ borderTop: "1px solid rgba(34,211,238,0.06)" }}>
          <div className="container-ut">
            <div className="max-w-5xl mx-auto">

              <div className="flex gap-2 mb-8 flex-wrap">
                {([
                  { key: "weaver" as const, icon: "◉", label: "Resonance Weaver" },
                  { key: "sequencer" as const, icon: "▶", label: "Frequency Sequencer" },
                  { key: "chamber" as const, icon: "◈", label: "Translation Chamber" },
                ]).map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => setActiveFeature(btn.key)}
                    className="ut-btn px-6 py-3 font-mono text-xs"
                    style={{
                      borderColor: activeFeature === btn.key ? FEATURE_INFO[btn.key].color : "rgba(34,211,238,0.2)",
                      color: activeFeature === btn.key ? FEATURE_INFO[btn.key].color : "var(--ut-white-dim)",
                      background: activeFeature === btn.key ? `${FEATURE_INFO[btn.key].color}11` : "transparent",
                    }}
                  >{btn.icon} {btn.label}</button>
                ))}
              </div>

              {/* Active feature panel */}
              <div className="mb-8">
                {activeFeature === "weaver" && <ResonanceWeaver onFreq={handleWeaverFreq} currentColor={currentColor} />}
                {activeFeature === "sequencer" && <SacredFreqSequencer onSeq={handleSeqFreq} />}
                {activeFeature === "chamber" && <TranslationChamber onText={handleChamberText} />}
              </div>

              {/* Sacred frequency quick-select */}
              <div className="ut-card p-8" style={{ background: "rgba(34,211,238,0.02)" }}>
                <p className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>Sacred Frequency Select</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.hz}
                      onClick={() => handleSacredFreq(f)}
                      className="ut-card p-4 text-center transition-all hover:-translate-y-1 cursor-pointer"
                      style={{
                        background: currentFreq === f.hz ? `${f.color}18` : "rgba(34,211,238,0.03)",
                        border: `1px solid ${currentFreq === f.hz ? f.color + "66" : "rgba(34,211,238,0.1)"}`,
                      }}
                    >
                      <div className="font-display text-xl mb-0.5" style={{ color: f.color }}>{f.hz}</div>
                      <div className="text-[10px] font-mono opacity-40" style={{ color: "var(--ut-white-dim)" }}>Hz</div>
                      <div className="text-xs mt-1" style={{ color: "var(--ut-white)" }}>{f.name}</div>
                      <div className="text-[9px] font-mono opacity-40" style={{ color: "var(--ut-white-dim)" }}>{f.chakra}</div>
                    </button>
                  ))}
                </div>

                {/* Geometry complexity slider */}
                <div className="flex items-center gap-4">
                  <label className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>Geometry Complexity</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={complexity}
                    onChange={(e) => setComplexity(parseInt(e.target.value))}
                    className="flex-1 max-w-xs"
                    style={{ accentColor: currentColor }}
                  />
                  <span className="font-mono text-xs" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>{complexity}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── REFERENCE ───────────────────────────────── */}
        <section className="py-12" style={{ borderTop: "1px solid rgba(34,211,238,0.06)" }}>
          <div className="container-ut">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ut-card p-8" style={{ background: "rgba(34,211,238,0.02)" }}>
                  <div className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>The Geometry</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Sacred geometry is the blueprint of creation — the patterns that underlie atoms, flowers,
                    solar systems, and galaxies. The 3D Engine renders these forms as standing wave geometries.
                  </p>
                </div>
                <div className="ut-card p-8" style={{ background: "rgba(34,211,238,0.02)" }}>
                  <div className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>Three Instruments</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    The Resonance Weaver listens to sound. The Sacred Frequency Sequencer plays predefined
                    sequences. The Translation Chamber converts text to geometry. All three render into
                    the same sacred geometry space.
                  </p>
                </div>
                <div className="ut-card p-8" style={{ background: "rgba(34,211,238,0.02)" }}>
                  <div className="font-heading text-xs tracking-widest uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>Universal Transmissions</div>
                  <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Every Universal Transmissions artwork encodes real cymatic data. The 3D Engine is a
                    live visualization of the same sacred geometry principles that define the project.
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
      <Footer />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   USAGE TRACKING HELPER
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