type PortalComingSoonProps = {
  eyebrow: string;
  title: string;
  description: string;
  accent?: string;
};

export default function PortalComingSoon({
  eyebrow,
  title,
  description,
  accent = "var(--ut-gold)",
}: PortalComingSoonProps) {
  return (
    <section className="min-h-[calc(100vh-64px)] pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
      <div className="container-ut max-w-3xl mx-auto">
        <div className="text-center border p-10 md:p-14 ut-card" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: accent, opacity: 0.7 }}>
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl md:text-5xl mb-5" style={{ color: "var(--ut-white)" }}>
            {title}
          </h1>
          <p className="font-body text-base md:text-lg leading-relaxed mb-8" style={{ color: "var(--ut-white-dim)", opacity: 0.78 }}>
            {description}
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2 border font-mono text-[10px] tracking-[0.25em] uppercase"
            style={{ borderColor: "rgba(212,168,71,0.35)", color: accent, background: "rgba(212,168,71,0.06)" }}>
            Coming Soon
          </div>
        </div>
      </div>
    </section>
  );
}
