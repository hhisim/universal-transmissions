import type { Metadata } from "next";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";

export const metadata: Metadata = {
  title: "Cymatics — Universal Transmissions",
  description:
    "The science of visible sound and vibration. Hakan Hisim uses a Tonoscope Cymatic Generator to capture and portray frequencies within each artwork.",
};

const cymaticImages = [
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780783030-FIWV3XPO8HFMOTJ18R34/10Hz-11Hz-13Hz-Water-2-1024x348.jpg",
    label: "10Hz · 11Hz · 13Hz — Water",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780784564-F85ZACZM3XO70UGR47QA/10Hz-29Hz-Sweep-Water-2-1024x421+%281%29.jpg",
    label: "10Hz — 29Hz Sweep — Water",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780792472-XP7QLKGE67OHMYJPTYT0/20-Hz-Cornstarch-2.jpg",
    label: "20Hz — Cornstarch",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780803033-SIKIIW4S74N2EZKP4KSO/33Hz-Alcohol-2-1024x680.jpg",
    label: "33Hz — Alcohol",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780793283-2T3XU88ESCC8YQFF32JV/21Hz-28Hz-Water-2-1024x512.jpg",
    label: "21Hz · 28Hz — Water",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780795197-O2NK1D89JHLTO3VDYXH1/22Hz-23Hz-29Hz-2-1024x348.jpg",
    label: "22Hz · 23Hz · 29Hz",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780805372-SNSGHQBCO3A5UZRZCOX9/528Hz-102Hz-2.jpg",
    label: "528Hz · 102Hz",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780825650-2DGDJPI8A29HY76KDO75/790.91Hz.jpg",
    label: "790.91Hz",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780832675-MIPB6H31P1C45DUVTUX1/Chakra-Cymatics-2.jpg",
    label: "Chakra Cymatics",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780851496-E1NE7888X2XNLAD55Y0D/Higher_Plane_Cymatic_Chakra-2.jpg",
    label: "Higher Plane Cymatic Chakra",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780856315-RVKZC2ELWVOAC7PXF1SR/Tortoise-Cymatics-Resistance2010-2-1024x662.jpg",
    label: "Tortoise Cymatics",
  },
  {
    src: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1484780858077-XL9GFQ9V811PHYTQBNF8/Yantra-Mandalas-and-cymatics.jpg",
    label: "Yantra Mandalas and Cymatics",
  },
];

export default function CymaticsPage() {
  return (
    <>
      <PageBackground variant="cymatics" />
<main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-20" style={{ borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
              >
                [ Science of Sound ]
              </p>
              <h1
                className="font-display text-4xl md:text-6xl glow-cyan mb-6"
                style={{ color: "var(--ut-cyan)" }}
              >
                <ZalgoText text="Cymatics" intensity="moderate" />
              </h1>
              <p
                className="font-body text-lg max-w-2xl"
                style={{ color: "var(--ut-white-dim)" }}
              >
                The study of visible sound and vibration — and how frequency shapes form.
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── INTRO ──────────────────────────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <blockquote
                  className="font-display text-xl md:text-2xl mb-8"
                  style={{ color: "var(--ut-gold)" }}
                >
                  <ZalgoText
                    text="The price the God&apos;s exact for this Gift of Song is that we become what we sing."
                    intensity="subtle"
                  />
                  <footer
                    className="font-mono text-[10px] tracking-widest uppercase mt-4"
                    style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                  >
                    — Pythagoras
                  </footer>
                </blockquote>
              </SectionReveal>

              <SectionReveal delay={0.1}>
                <div className="ut-card p-10">
                  <h2
                    className="font-display text-xl mb-6"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="What is Cymatics?" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Cymatics is the study of visible sound and vibration — typically patterns formed
                      by placing sand, water, or other materials on a plate or membrane and then vibrating
                      it at different frequencies. The word comes from the Greek{' '}
                      <em>kyma</em> meaning &apos;wave.&apos;
                    </p>
                    <p>
                      Each frequency produces a unique geometric pattern — circles become squares,
                      squares become fractals. The same principles that govern the rings of Saturn
                      and the spiral of a nautilus shell are at play: standing waves, nodes, and
                      interference patterns create the visual language of vibration itself.
                    </p>
                    <p>
                      In the Universal Transmissions project, cymatics is not merely an aesthetic
                      choice — it is a fundamental building block. The Tonoscope Cymatic Generator
                      is used to capture and portray the range of frequencies that are needed within
                      a single page or image. Each symbol, each line, each geometric form is
                      grounded in the physics of actual sound.
                    </p>
                  </div>
                </div>
              </SectionReveal>

              {/* Hero cymatic image */}
              <SectionReveal delay={0.2}>
                <div
                  className="mt-8 overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                >
                  <img
                    src="https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508398128192-39XM5VNWXQ84FPPP1YTG/cymatics.jpg"
                    alt="Cymatics overview"
                    className="w-full"
                  />
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── FREQUENCY GALLERY ──────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(0,229,255,0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-16">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ Research Imagery ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl glow-cyan"
                  style={{ color: "var(--ut-cyan)" }}
                >
                  <ZalgoText text="Frequency Patterns" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cymaticImages.map((img, i) => (
                <SectionReveal key={i} delay={i * 0.03}>
                  <div className="ut-card overflow-hidden group">
                    <div
                      className="aspect-square overflow-hidden"
                      style={{ background: "rgba(0,0,0,0.3)" }}
                    >
                      <img
                        src={img.src}
                        alt={img.label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <p
                      className="font-mono text-[8px] tracking-widest uppercase p-2 text-center"
                      style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                    >
                      {img.label}
                    </p>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── TONOSCOPE PROCESS ──────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(0,229,255,0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10">
                  <h2
                    className="font-display text-xl mb-6"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Tonoscope" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      The Tonoscope is a cymatic instrument that makes sound visible. Developed from
                      principles laid out by Hans Jenny in his seminal work on cymatics, the tonoscope
                      reveals the geometric patterns that underlie all sound vibration.
                    </p>
                    <p>
                      Each chakra, each organ, each geometric form in the Universal Transmissions
                      project is associated with a specific frequency — captured through the tonoscope
                      and encoded into the visual structure of the artwork. The result is art that
                      doesn&apos;t merely <em>represent</em> sound, but is a direct visualization of it.
                    </p>
                    <p>
                      Frequencies like 528Hz (known as the &apos;Love frequency&apos;), 639Hz (harmony and
                      relationships), 741Hz (expression and awakening), and 963Hz (the &apos;God frequency&apos;
                      or crown chakra tone) are all embedded into the visual field of the artwork.
                    </p>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.2}>
                <div className="mt-8 grid grid-cols-3 gap-4">
                  {[
                    { freq: "144 Hz", note: "Earth Resonance" },
                    { freq: "528 Hz", note: "DNA Repair · Love" },
                    { freq: "639 Hz", note: "Harmony · Relationships" },
                    { freq: "741 Hz", note: "Expression · Awakening" },
                    { freq: "852 Hz", note: "Third Eye · Intuition" },
                    { freq: "963 Hz", note: "Crown · Pure Tone" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="ut-card p-4 text-center"
                      style={{ background: "rgba(0,229,255,0.02)" }}
                    >
                      <p
                        className="font-display text-lg mb-1"
                        style={{ color: "var(--ut-cyan)" }}
                      >
                        {item.freq}
                      </p>
                      <p
                        className="font-mono text-[9px] tracking-widest uppercase"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                      >
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── REFERENCE ───────────────────────────────── */}
        <section
          className="py-12"
          style={{ borderTop: "1px solid rgba(0,229,255,0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <p
                className="text-center font-body text-sm"
                style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
              >
                All cymatic imagery used with permission. See the original research gallery at{' '}
                <a
                  href="https://universaltransmissions.squarespace.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[var(--ut-cyan)] transition-colors"
                  style={{ color: "var(--ut-cyan)", opacity: 0.6 }}
                >
                  universaltransmissions.squarespace.com
                </a>
              </p>
            </SectionReveal>
          </div>
        </section>

      </main>
</>
  );
}
