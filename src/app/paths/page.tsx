import type { Metadata } from "next";
import Link from "next/link";
import PageBackground from "@/components/scenes/PageBackground";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { GUIDED_PATHS, resolvePath } from "@/lib/guided-paths";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/paths" },
  title: "Guided Explorations — Universal Transmissions",
  description:
    "Three curated paths through existing Universal Transmissions material — sound into form, language into glyph, and symbol into correspondence. Each stop is a record the archive already holds.",
};

/**
 * The path index.
 *
 * It shows each path's stops by their RESOLVED titles, so the index cannot advertise a
 * record the room no longer publishes. A stop that fails to resolve is counted and
 * stated rather than quietly dropped.
 */
export default function PathsPage() {
  const paths = GUIDED_PATHS.map((p) => {
    const { stops, unresolved } = resolvePath(p);
    return { path: p, stops, unresolved };
  });

  return (
    <>
      <PageBackground variant="research" />
      <PageBackground variant="homepage" opacity={0.4} />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(240, 199, 94, 0.10) 0%, transparent 60%)",
            }}
          />
          <div className="container-ut relative">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-6"
                style={{ color: "var(--ut-gold)", opacity: 0.6 }}
              >
                [ Guided Explorations ]
              </p>
            </SectionReveal>
            <SectionReveal delay={0.1}>
              <h1
                className="font-display text-4xl md:text-6xl lg:text-7xl tracking-[0.05em] ut-gradient-text mb-6"
                style={{ lineHeight: 1.05 }}
              >
                <ZalgoText text="Guided Explorations" intensity="subtle" />
              </h1>
            </SectionReveal>
            <SectionReveal delay={0.2}>
              <p
                className="font-body text-base md:text-lg max-w-3xl leading-relaxed"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Three curated routes through material that already exists. A path does not add
                records — it orders them, and says why. The reading that carries you from one
                stop to the next is a <em>curated reading</em>, marked as one wherever it
                appears; the records themselves keep their own wording and their own basis.
              </p>
            </SectionReveal>
            <SectionReveal delay={0.3}>
              <p className="mt-6">
                <Link
                  href="/research"
                  className="font-mono text-[10px] tracking-[0.2em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                  style={{ color: "var(--ut-purple)", opacity: 0.8 }}
                >
                  ← Back to the Research Nexus
                </Link>
              </p>
            </SectionReveal>
          </div>
        </section>

        <section className="container-ut pb-10">
          <div className="grid gap-8 lg:gap-10">
            {paths.map(({ path, stops, unresolved }) => (
              <SectionReveal key={path.slug}>
                <article
                  className="p-6 md:p-8"
                  style={{
                    border: "1px solid var(--ut-border)",
                    background: "rgba(255,255,255,0.015)",
                  }}
                  data-guided-path={path.slug}
                >
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-4">
                    <h2
                      className="font-display text-2xl md:text-3xl tracking-[0.04em]"
                      style={{ color: "var(--ut-white)" }}
                    >
                      <Link href={`/paths/${path.slug}`} className="hover:opacity-80">
                        {path.title}
                      </Link>
                    </h2>
                    <span
                      className="font-mono text-[9px] tracking-[0.25em] uppercase"
                      style={{ color: "var(--ut-gold)", opacity: 0.75 }}
                    >
                      {stops.length} stops
                    </span>
                  </div>
                  <p
                    className="font-body text-sm md:text-base mb-2"
                    style={{ color: "var(--ut-white)" }}
                  >
                    {path.theme}
                  </p>
                  <p
                    className="font-body text-sm leading-relaxed mb-6 max-w-3xl"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    {path.summary}
                  </p>

                  <ol className="grid gap-2 mb-6">
                    {stops.map((s) => (
                      <li key={`${s.topic}-${s.anchor ?? "room"}`} className="flex gap-3 items-baseline">
                        <span
                          className="font-mono text-[10px] shrink-0 w-5 text-right"
                          style={{ color: "var(--ut-purple)", opacity: 0.7 }}
                        >
                          {s.number}
                        </span>
                        <span className="font-body text-[13px]" style={{ color: "var(--ut-white-dim)" }}>
                          {s.title}
                          <span
                            className="font-mono text-[9px] tracking-[0.15em] uppercase ml-2"
                            style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                          >
                            {s.kind}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>

                  {unresolved.length > 0 && (
                    <p
                      className="font-body text-[12px] mb-4"
                      style={{ color: "var(--ut-magenta)", opacity: 0.9 }}
                    >
                      Stops {unresolved.join(", ")} could not be resolved against the current
                      registries and are not shown.
                    </p>
                  )}

                  <Link
                    href={`/paths/${path.slug}`}
                    data-path-start={path.slug}
                    className="font-mono text-[10px] tracking-[0.2em] uppercase inline-block px-4 py-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{
                      color: "var(--ut-gold)",
                      border: "1px solid rgba(240,199,94,0.35)",
                    }}
                  >
                    Begin this path →
                  </Link>
                </article>
              </SectionReveal>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
