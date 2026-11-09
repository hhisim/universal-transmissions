/**
 * SubjectField — the subject drawing itself, behind the card that describes it.
 *
 * The Research nexus cards were text on black. Each now carries a field drawn from its own room's
 * subject rather than a generic ornament:
 *
 *   cymatics     concentric nodal rings with wave traces
 *   symbolism    orbital correspondence rings with linked nodes
 *   linguistics  glyph rows and a constellation that resolves from them
 *   geometry     a scaffold: square, circle, triads, construction lines
 *
 * Decorative and deterministic (aria-hidden, no random at render) so nothing differs between the
 * server and the hydrated tree. Colour comes from the room's own accent.
 */

export type SubjectVariant = "cymatics" | "symbolism" | "linguistics" | "geometry";

export default function SubjectField({
  variant,
  accent,
  className = "",
  opacity = 0.5,
}: {
  variant: SubjectVariant;
  accent: string;
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
      style={{ width: "100%", height: "100%", opacity, display: "block" }}
    >
      {variant === "cymatics" && (
        <g fill="none" stroke={accent}>
          {[0.94, 0.78, 0.62, 0.46, 0.3, 0.16].map((r, i) => (
            <ellipse key={r} cx="100" cy="100" rx={94 * r} ry={94 * r} strokeWidth={i % 2 ? 0.5 : 0.7} opacity={0.34 + i * 0.04} strokeDasharray={i === 1 || i === 3 ? "2 5" : undefined} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i * Math.PI) / 3;
            return (
              <path
                key={i}
                d={`M ${100 + Math.cos(a) * 10} ${100 + Math.sin(a) * 10} Q ${100 + Math.cos(a + 0.5) * 60} ${100 + Math.sin(a + 0.5) * 60} ${100 + Math.cos(a) * 92} ${100 + Math.sin(a) * 92}`}
                strokeWidth="0.45"
                opacity="0.2"
              />
            );
          })}
          <circle cx="100" cy="100" r="2.6" fill={accent} opacity="0.75" />
        </g>
      )}

      {variant === "symbolism" && (
        <g fill="none" stroke={accent}>
          <circle cx="100" cy="100" r="88" strokeWidth="0.55" opacity="0.26" />
          <circle cx="100" cy="100" r="56" strokeWidth="0.55" opacity="0.24" strokeDasharray="4 6" />
          <circle cx="100" cy="100" r="26" strokeWidth="0.55" opacity="0.3" />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i * Math.PI) / 3;
            const b = a + (2 * Math.PI) / 3;
            return (
              <g key={i}>
                <line x1={100 + Math.cos(a) * 26} y1={100 + Math.sin(a) * 26} x2={100 + Math.cos(b) * 88} y2={100 + Math.sin(b) * 88} strokeWidth="0.4" opacity="0.22" />
                <circle cx={100 + Math.cos(a) * 88} cy={100 + Math.sin(a) * 88} r="1.7" fill={accent} opacity="0.7" />
              </g>
            );
          })}
        </g>
      )}

      {variant === "linguistics" && (
        <g stroke={accent} fill="none">
          {[52, 82, 112, 142, 172].map((y, row) => (
            <g key={y}>
              <line x1="18" y1={y} x2="182" y2={y} strokeWidth="0.35" opacity="0.16" />
              {Array.from({ length: 9 }).map((_, i) => (
                <line
                  key={i}
                  x1={22 + i * 18}
                  y1={y - 4 - ((i + row) % 3) * 2}
                  x2={22 + i * 18}
                  y2={y + 4 + ((i * 2 + row) % 4)}
                  strokeWidth="0.6"
                  opacity={0.22 + ((i + row) % 3) * 0.1}
                />
              ))}
            </g>
          ))}
          {[[54, 44], [96, 36], [138, 50], [72, 96], [118, 88], [88, 132]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1.2} fill={accent} opacity="0.65" />
          ))}
        </g>
      )}

      {variant === "geometry" && (
        <g fill="none" stroke={accent}>
          <rect x="26" y="26" width="148" height="148" strokeWidth="0.5" opacity="0.22" />
          <circle cx="100" cy="100" r="74" strokeWidth="0.6" opacity="0.3" />
          <circle cx="100" cy="100" r="74" strokeWidth="0.4" opacity="0.18" transform="rotate(30 100 100)" />
          <polygon points="100,26 174,100 100,174 26,100" strokeWidth="0.45" opacity="0.24" />
          <polygon points="100,42 158,100 100,158 42,100" strokeWidth="0.4" opacity="0.18" transform="rotate(45 100 100)" />
          <line x1="26" y1="100" x2="174" y2="100" strokeWidth="0.35" opacity="0.16" />
          <line x1="100" y1="26" x2="100" y2="174" strokeWidth="0.35" opacity="0.16" />
          <circle cx="100" cy="100" r="2.4" fill={accent} opacity="0.7" />
        </g>
      )}
    </svg>
  );
}
