import Link from "next/link";

type PathwayLink = {
  href: string;
  title: string;
  description: string;
  label?: string;
  external?: boolean;
  comingSoon?: boolean;
};

export default function ResearchPathways({
  eyebrow,
  title,
  description,
  accent,
  links,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  links: PathwayLink[];
}) {
  return (
    <section className="py-20" style={{ borderTop: `1px solid ${accent}22` }}>
      <div className="container-ut">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p
              className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
              style={{ color: accent, opacity: 0.55 }}
            >
              {eyebrow}
            </p>
            <h2 className="font-display text-2xl md:text-3xl mb-4" style={{ color: "var(--ut-white)" }}>
              {title}
            </h2>
            <p className="font-body text-base max-w-3xl mx-auto" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
              {description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {links.map((link) => {
              const content = (
                <>
                  <p
                    className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                    style={{ color: accent, opacity: 0.6 }}
                  >
                    {link.comingSoon ? 'Coming Soon' : link.label ?? (link.external ? 'External Path' : 'Next Path')}
                  </p>
                  <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                    {link.title}
                  </h3>
                  <p className="font-body text-sm leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
                    {link.description}
                  </p>
                  <span
                    className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                    style={{ color: accent }}
                  >
                    {link.comingSoon ? 'Locked' : 'Open'}
                    <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                      <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </span>
                </>
              );

              const className = "group block ut-card p-8 h-full transition-all duration-300 hover:border-white/20";
              const style = { background: "rgba(255,255,255,0.02)" } as const;

              if (link.comingSoon) {
                return (
                  <div key={link.title} className={className} style={{ ...style, opacity: 0.78 }}>
                    {content}
                  </div>
                );
              }

              return link.external ? (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
                  {content}
                </a>
              ) : (
                <Link key={link.href} href={link.href} className={className} style={style}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
