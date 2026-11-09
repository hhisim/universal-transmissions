/**
 * CymaticOrder — the instrument's identity drawn before it runs.
 *
 * A driven plate does not show sound: it shows where sound cancels itself. This figure is the
 * argument the page makes in words — vibration arriving at the centre as concentric ripples and
 * leaving as nodal geometry, the lines where the medium stands still. Purely decorative
 * (aria-hidden): the real engine below is the thing you operate.
 */
export default function CymaticOrder({ className = "" }: { className?: string }) {
  const nodes = Array.from({ length: 24 }).map((_, i) => {
    const a = (i * Math.PI * 2) / 24;
    return { x: 200 + Math.cos(a) * 176, y: 120 + Math.sin(a) * 92, a };
  });

  return (
    <svg
      className={className}
      viewBox="0 0 400 240"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <radialGradient id="cy-field" cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <clipPath id="cy-plate">
          <ellipse cx="200" cy="120" rx="176" ry="92" />
        </clipPath>
      </defs>

      <ellipse cx="200" cy="120" rx="176" ry="92" fill="url(#cy-field)" />

      {/* the plate's rim */}
      <ellipse cx="200" cy="120" rx="176" ry="92" fill="none" stroke="#00e5ff" strokeWidth="0.6" opacity="0.45" />

      <g clipPath="url(#cy-plate)" fill="none" stroke="#d4a847" strokeWidth="0.7" opacity="0.55">
        {/* concentric shells: the vibration arriving */}
        {[0.24, 0.46, 0.68, 0.9].map((r) => (
          <ellipse key={r} cx="200" cy="120" rx={176 * r} ry={92 * r} strokeDasharray="2 5" opacity={0.5} />
        ))}

        {/* nodal lines: the geometry the vibration leaves behind */}
        {[3, 5, 7].map((n) => (
          <g key={n} opacity={0.75}>
            {Array.from({ length: n }).map((_, i) => {
              const a = (i * Math.PI) / n;
              return (
                <ellipse
                  key={i}
                  cx="200"
                  cy="120"
                  rx={176}
                  ry={92}
                  transform={`rotate(${(a * 180) / Math.PI} 200 120)`}
                  stroke="#00e5ff"
                  strokeWidth="0.5"
                  opacity="0.34"
                />
              );
            })}
          </g>
        ))}
      </g>

      {/* sand gathers on the nodes and is thrown from the antinodes */}
      <g fill="#f6f3ff">
        {nodes.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i % 3 === 0 ? 1.35 : 0.85} opacity={i % 2 === 0 ? 0.8 : 0.45} />
        ))}
      </g>

      {/* the centre, where the driver sits */}
      <circle cx="200" cy="120" r="2.4" fill="#00e5ff" opacity="0.9" />
      <circle cx="200" cy="120" r="7" fill="none" stroke="#00e5ff" strokeWidth="0.5" opacity="0.35" />
    </svg>
  );
}
