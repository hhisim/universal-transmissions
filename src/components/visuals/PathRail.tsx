/**
 * PathRail — the structure of the path, drawn as a line you can read at a glance.
 *
 * The step pages showed position as a 2 px bar and the words "Stop 3 of 6". That states progress but
 * not structure: you cannot see how many moves remain of what kind, or where you are in the shape of
 * the thing you are walking. This is the path as a signal line — one node per authored stop, the
 * past closed, the present lit and haloed, the future open — and every node is a link, so the rail
 * is also the fastest way to move.
 *
 * It is an addition beside the existing progress element, not a replacement: that element keeps its
 * role and its accessible label.
 */

export default function PathRail({
  total,
  current,
  accent,
  hrefFor,
  labels,
}: {
  total: number;
  current: number;
  accent: string;
  hrefFor: (n: number) => string;
  labels?: string[];
}) {
  const stops = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <nav aria-label="Path structure" style={{ marginBottom: "1.25rem" }}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {stops.map((n, i) => {
          const done = n < current;
          const here = n === current;
          return (
            <li
              key={n}
              style={{ display: "flex", alignItems: "center", flex: i === stops.length - 1 ? "0 0 auto" : "1 1 0" }}
            >
              <a
                href={hrefFor(n)}
                aria-current={here ? "step" : undefined}
                aria-label={labels && labels[n - 1] ? `Stop ${n}: ${labels[n - 1]}` : `Stop ${n}`}
                style={{
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                  width: here ? 26 : 18,
                  height: here ? 26 : 18,
                  flex: "0 0 auto",
                  borderRadius: "50%",
                  border: `1px solid ${here ? accent : done ? `color-mix(in oklab, ${accent} 55%, transparent)` : "rgba(255,255,255,0.32)"}`,
                  background: here ? `color-mix(in oklab, ${accent} 22%, #05050a)` : done ? `color-mix(in oklab, ${accent} 10%, #05050a)` : "#05050a",
                  boxShadow: here ? `0 0 0 4px color-mix(in oklab, ${accent} 12%, transparent), 0 0 18px color-mix(in oklab, ${accent} 40%, transparent)` : "none",
                  textDecoration: "none",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: here ? 10 : 8,
                  letterSpacing: "0.04em",
                  color: here ? `color-mix(in oklab, ${accent} 40%, white)` : done ? `color-mix(in oklab, ${accent} 60%, rgba(255,255,255,0.78))` : "rgba(255,255,255,0.68)",
                  transition: "border-color 240ms ease, box-shadow 240ms ease",
                }}
              >
                {n}
              </a>
              {i < stops.length - 1 && (
                <span
                  aria-hidden="true"
                  style={{
                    flex: "1 1 auto",
                    height: 1,
                    minWidth: 18,
                    background: n < current
                      ? `linear-gradient(90deg, color-mix(in oklab, ${accent} 55%, transparent), color-mix(in oklab, ${accent} 25%, transparent))`
                      : "linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.12))",
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
