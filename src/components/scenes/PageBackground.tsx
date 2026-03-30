"use client";

// ============================================================
// FILE: src/components/scenes/PageBackground.tsx
//
// COMPLETE per-page background animation system.
// Drop this file in and use: <PageBackground variant="homepage" />
//
// Variants: homepage, gallery, codex, sanctum, journal,
//           connect, about, research, oracle
//
// PRIME: Do NOT modify this file. Just import and use it.
// ============================================================

import { useEffect, useRef } from "react";

// --- Shared glyph set for Zalgo rain (used on ALL pages) ---
const RAIN_GLYPHS = [
  "\u25B3","\u25BD","\u25C7","\u2726","\u269B","\u2609",
  "\u221E","\u25CE","\u2BC5","\u16DA","\u16DE","\u29EB",
  "\u0300","\u0301","\u0334","\u2BC6",
];

// --- Shared types ---
interface Drop { x: number; y: number; sp: number; ch: string; op: number; sz: number; }
interface Star { x: number; y: number; s: number; b: number; sp: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; hue: number; sz: number; }

// --- Shared: create glyph rain drops ---
function makeDrops(W: number, spacing = 35): Drop[] {
  const d: Drop[] = [];
  for (let i = 0; i < Math.floor(W / spacing); i++) {
    d.push({ x: i * spacing + Math.random() * (spacing / 2), y: Math.random() * 1000, sp: 0.15 + Math.random() * 0.35, ch: RAIN_GLYPHS[~~(Math.random() * RAIN_GLYPHS.length)], op: 0.012 + Math.random() * 0.02, sz: 9 + Math.random() * 4 });
  }
  return d;
}

// --- Shared: draw glyph rain ---
function drawRain(cx: CanvasRenderingContext2D, drops: Drop[], H: number, color = "#d946ef") {
  for (const d of drops) {
    d.y += d.sp;
    if (d.y > H + 15) { d.y = -15; d.ch = RAIN_GLYPHS[~~(Math.random() * RAIN_GLYPHS.length)]; d.op = 0.012 + Math.random() * 0.02; }
    cx.save(); cx.globalAlpha = d.op; cx.fillStyle = color; cx.font = d.sz + "px monospace"; cx.fillText(d.ch, d.x, d.y); cx.restore();
  }
}

// --- Shared: draw scan line + CRT ---
function drawScanCRT(cx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const sy = (t * 25) % H;
  cx.fillStyle = "rgba(217,70,239,0.006)";
  cx.fillRect(0, sy - 1, W, 2);
  for (let i = 0; i < H; i += 3) { cx.fillStyle = "rgba(0,0,0,0.012)"; cx.fillRect(0, i, W, 1); }
}

// --- Shared: make stars ---
function makeStars(W: number, H: number, count = 90): Star[] {
  const s: Star[] = [];
  for (let i = 0; i < count; i++) s.push({ x: Math.random() * W, y: Math.random() * H, s: 0.3 + Math.random() * 1.2, b: Math.random() * Math.PI * 2, sp: 0.5 + Math.random() * 2 });
  return s;
}

// --- Shared: draw stars ---
function drawStars(cx: CanvasRenderingContext2D, stars: Star[], t: number, goldChance = 0.12) {
  for (const s of stars) {
    const b = 0.12 + Math.sin(t * s.sp + s.b) * 0.1;
    cx.beginPath(); cx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
    cx.fillStyle = Math.random() > (1 - goldChance) ? `rgba(212,168,71,${b})` : `rgba(237,233,246,${b})`;
    cx.fill();
  }
}

// ============================================================
// SCENE: HOMEPAGE — "The Transmission Field"
// Particle field forming sacred geometry patterns + Comet/Neural overlay
// ============================================================
function sceneHomepage(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) {
    state.init = true;
    state.particles = [];
    state.drops = makeDrops(W);
    for (let i = 0; i < 2000; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 50 + Math.random() * Math.min(W, H) * 0.35;
      state.particles.push({
        x: W / 2 + Math.cos(a) * r,
        y: H / 2 + Math.sin(a) * r,
        ox: Math.cos(a) * r,
        oy: Math.sin(a) * r,
        a, r, sp: 0.0003 + Math.random() * 0.001,
        sz: 0.5 + Math.random() * 1.5,
        hue: 280 + Math.random() * 80,
      });
    }

    // Streaming comets overlay
    state.comets = Array.from({ length: 3 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 3,
      tail: [] as { x: number; y: number }[],
      hue: i % 2 === 0 ? 180 : 280,
    }));

    // Neural constellation overlay
    state.nodes = Array.from({ length: 15 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1.5 + Math.random() * 2.5,
      pulse: Math.random() * Math.PI * 2,
    }));
  }

  // Glyph rain
  drawRain(cx, state.drops, H);

  // Particles orbiting center, occasionally forming patterns
  const cx2 = W / 2, cy2 = H / 2;
  const patternPhase = (Math.sin(t * 0.1) + 1) / 2;

  for (const p of state.particles) {
    p.a += p.sp;
    const baseX = cx2 + Math.cos(p.a) * p.r;
    const baseY = cy2 + Math.sin(p.a) * p.r;

    let tx = baseX, ty = baseY;
    if (patternPhase > 0.7) {
      const fIdx = ~~(p.a * 6 / (Math.PI * 2)) % 7;
      const fAngle = fIdx * Math.PI / 3;
      const fR = Math.min(W, H) * 0.12;
      const fx = cx2 + (fIdx === 0 ? 0 : Math.cos(fAngle) * fR);
      const fy = cy2 + (fIdx === 0 ? 0 : Math.sin(fAngle) * fR);
      const blend = (patternPhase - 0.7) / 0.3;
      tx = baseX + (fx - baseX) * blend * 0.4;
      ty = baseY + (fy - baseY) * blend * 0.4;
    }

    p.x += (tx - p.x) * 0.02;
    p.y += (ty - p.y) * 0.02;

    const hueShift = (Math.sin(t * 0.3 + p.a) + 1) / 2;
    const h = 280 + hueShift * 80;
    cx.beginPath();
    cx.arc(p.x, p.y, p.sz, 0, Math.PI * 2);
    cx.fillStyle = `hsla(${h}, 80%, 65%, 0.3)`;
    cx.fill();
  }

  // Center glow
  const g = cx.createRadialGradient(cx2, cy2, 0, cx2, cy2, Math.min(W, H) * 0.3);
  g.addColorStop(0, `rgba(217,70,239,${0.03 + Math.sin(t * 0.5) * 0.01})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);

  // Streaming comets overlay (semi-transparent over particle field)
  for (const comet of state.comets) {
    comet.x += comet.vx;
    comet.y += comet.vy;

    if (comet.y > H + 30) { comet.y = -30; comet.x = Math.random() * W; }
    if (comet.y < -30) { comet.y = H + 30; comet.x = Math.random() * W; }
    if (comet.x > W + 30) { comet.x = -30; }
    if (comet.x < -30) { comet.x = W + 30; }

    comet.tail.push({ x: comet.x, y: comet.y });
    if (comet.tail.length > 20) comet.tail.shift();

    cx.lineCap = "round";
    for (let i = 0; i < comet.tail.length - 1; i++) {
      const curr = comet.tail[i];
      const next = comet.tail[i + 1];
      const life = i / comet.tail.length;
      const width = life * 3;
      const ab = (1 - life) * 4;

      cx.beginPath();
      cx.moveTo(curr.x - comet.vx * ab * 0.15, curr.y - comet.vy * ab * 0.15);
      cx.lineTo(next.x - comet.vx * ab * 0.15, next.y - comet.vy * ab * 0.15);
      cx.strokeStyle = `rgba(255,40,60,${life * 0.35})`;
      cx.lineWidth = width;
      cx.stroke();

      cx.beginPath();
      cx.moveTo(curr.x + comet.vx * ab * 0.1, curr.y + comet.vy * ab * 0.1);
      cx.lineTo(next.x + comet.vx * ab * 0.1, next.y + comet.vy * ab * 0.1);
      cx.strokeStyle = `rgba(40,200,255,${life * 0.35})`;
      cx.lineWidth = width * 0.7;
      cx.stroke();
    }

    const g = cx.createRadialGradient(comet.x, comet.y, 0, comet.x, comet.y, 16);
    g.addColorStop(0, `hsla(${comet.hue},90%,80%,0.7)`);
    g.addColorStop(0.3, `hsla(${comet.hue},70%,50%,0.3)`);
    g.addColorStop(1, "transparent");
    cx.fillStyle = g;
    cx.fillRect(comet.x - 16, comet.y - 16, 32, 32);

    cx.beginPath();
    cx.arc(comet.x, comet.y, 2, 0, Math.PI * 2);
    cx.fillStyle = "rgba(255,255,255,0.9)";
    cx.fill();
  }

  // Neural constellation overlay
  for (const node of state.nodes) {
    node.x += node.vx;
    node.y += node.vy;
    node.pulse += 0.03;

    if (node.x < 50 || node.x > W - 50) node.vx *= -1;
    if (node.y < 50 || node.y > H - 50) node.vy *= -1;

    for (const other of state.nodes) {
      const dx = other.x - node.x;
      const dy = other.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 180 && dist > 10) {
        const alpha = (1 - dist / 180) * 0.15;
        const midX = (node.x + other.x) / 2;
        const midY = (node.y + other.y) / 2;

        cx.beginPath();
        cx.moveTo(node.x - 1.5, node.y);
        cx.quadraticCurveTo(midX - 1, midY, other.x - 1.5, other.y);
        cx.strokeStyle = `rgba(255,60,80,${alpha})`;
        cx.lineWidth = 0.6;
        cx.stroke();

        cx.beginPath();
        cx.moveTo(node.x + 1.5, node.y);
        cx.quadraticCurveTo(midX + 1, midY, other.x + 1.5, other.y);
        cx.strokeStyle = `rgba(60,180,255,${alpha})`;
        cx.stroke();
      }
    }

    const pulseR = node.r * (1 + Math.sin(node.pulse) * 0.2);

    cx.beginPath();
    cx.arc(node.x - 1, node.y, pulseR, 0, Math.PI * 2);
    cx.fillStyle = "rgba(255,80,100,0.4)";
    cx.fill();

    cx.beginPath();
    cx.arc(node.x + 1, node.y, pulseR, 0, Math.PI * 2);
    cx.fillStyle = "rgba(80,255,220,0.4)";
    cx.fill();

    cx.beginPath();
    cx.arc(node.x, node.y, pulseR * 0.35, 0, Math.PI * 2);
    cx.fillStyle = "rgba(255,255,255,0.8)";
    cx.fill();
  }

  drawScanCRT(cx, W, H, t);
}

// ============================================================
// SCENE: GALLERY — "The Archive Frequency"
// Tron-style perspective grid with pulsing lines
// ============================================================
function sceneGallery(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) { state.init = true; state.drops = makeDrops(W, 40); }

  drawRain(cx, state.drops, H);

  // Perspective grid
  const horizon = H * 0.35;
  const vanishX = W / 2;

  // Vertical lines receding to vanishing point
  cx.strokeStyle = `rgba(217,70,239,${0.04 + Math.sin(t * 0.5) * 0.015})`;
  cx.lineWidth = 0.5;
  const lineCount = 24;
  for (let i = 0; i < lineCount; i++) {
    const xBottom = (i / (lineCount - 1)) * W;
    cx.beginPath();
    cx.moveTo(xBottom, H);
    cx.lineTo(vanishX + (xBottom - vanishX) * 0.05, horizon);
    cx.stroke();
  }

  // Horizontal lines with depth
  const hLines = 20;
  for (let i = 0; i < hLines; i++) {
    const depth = i / hLines;
    const y = horizon + (H - horizon) * Math.pow(depth, 1.5);
    const spread = 1 - depth * 0.9;
    const pulse = Math.sin(t * 2 + i * 0.5) * 0.02;
    cx.strokeStyle = `rgba(217,70,239,${0.02 + depth * 0.04 + pulse})`;
    cx.lineWidth = 0.3 + depth * 0.5;
    cx.beginPath();
    cx.moveTo(vanishX - (W / 2) * spread * 1.2, y);
    cx.lineTo(vanishX + (W / 2) * spread * 1.2, y);
    cx.stroke();
  }

  // Occasional geometric form emerging from grid
  const formPhase = (t * 0.3) % (Math.PI * 2);
  if (Math.sin(formPhase) > 0.8) {
    const alpha = (Math.sin(formPhase) - 0.8) / 0.2 * 0.08;
    cx.save();
    cx.translate(vanishX, horizon + (H - horizon) * 0.4);
    cx.rotate(t * 0.05);
    cx.strokeStyle = `rgba(147,51,234,${alpha})`;
    cx.lineWidth = 0.8;
    // Hexagon
    cx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const r = 40 + Math.sin(t) * 10;
      const method = i === 0 ? "moveTo" : "lineTo";
      (cx as any)[method](Math.cos(a) * r, Math.sin(a) * r);
    }
    cx.closePath(); cx.stroke();
    cx.restore();
  }

  drawScanCRT(cx, W, H, t);
}

// ============================================================
// SCENE: CODEX — "The Star Tetrahedron / Merkaba"
// Counter-rotating tetrahedrons
// ============================================================
function sceneCodex(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) { state.init = true; state.drops = makeDrops(W); state.stars = makeStars(W, H, 60); }

  drawRain(cx, state.drops, H);
  drawStars(cx, state.stars, t, 0.2);

  const mx = W / 2, my = H / 2;
  const sz = Math.min(W, H) * 0.22;

  // Project 3D → 2D (simple perspective)
  function proj(x3: number, y3: number, z3: number): [number, number] {
    const fov = 300;
    const scale = fov / (fov + z3);
    return [mx + x3 * scale, my + y3 * scale];
  }

  // Rotate point around Y axis
  function rotY(x: number, y: number, z: number, a: number): [number, number, number] {
    return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
  }
  // Rotate around X axis
  function rotX(x: number, y: number, z: number, a: number): [number, number, number] {
    return [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  }

  // Tetrahedron vertices (pointing UP)
  const tetraUp = [
    [0, -sz, 0],
    [-sz * 0.94, sz * 0.33, -sz * 0.54],
    [sz * 0.94, sz * 0.33, -sz * 0.54],
    [0, sz * 0.33, sz * 1.09],
  ];
  // Tetrahedron vertices (pointing DOWN — inverted)
  const tetraDown = tetraUp.map(([x, y, z]) => [-x, -y, -z]);

  const edges = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

  // Draw a tetrahedron with rotation
  function drawTetra(verts: number[][], angle: number, color: string, alpha: number) {
    const tilt = 0.3;
    const rotated = verts.map(([x, y, z]) => {
      let [rx, ry, rz] = rotY(x, y, z, angle);
      [rx, ry, rz] = rotX(rx, ry, rz, tilt);
      return [rx, ry, rz];
    });

    const projected = rotated.map(([x, y, z]) => proj(x, y, z));

    cx.strokeStyle = color;
    cx.lineWidth = 1.2;
    cx.globalAlpha = alpha;
    for (const [a, b] of edges) {
      cx.beginPath();
      cx.moveTo(projected[a][0], projected[a][1]);
      cx.lineTo(projected[b][0], projected[b][1]);
      cx.stroke();
    }

    // Glow on edges
    cx.strokeStyle = color;
    cx.lineWidth = 4;
    cx.globalAlpha = alpha * 0.15;
    for (const [a, b] of edges) {
      cx.beginPath();
      cx.moveTo(projected[a][0], projected[a][1]);
      cx.lineTo(projected[b][0], projected[b][1]);
      cx.stroke();
    }
    cx.globalAlpha = 1;
  }

  // CRITICAL: One CLOCKWISE, one COUNTER-CLOCKWISE
  const scrollFactor = 1; // Could be tied to scroll position
  drawTetra(tetraUp, t * 0.3 * scrollFactor, "rgba(212,168,71,0.5)", 0.6);    // Gold, clockwise
  drawTetra(tetraDown, -t * 0.3 * scrollFactor, "rgba(34,211,238,0.4)", 0.5);  // Cyan, counter-clockwise

  // Orbiting ring of light
  const ringR = sz * 1.4;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + t * 0.2;
    const rx = Math.cos(a) * ringR;
    const rz = Math.sin(a) * ringR * 0.3; // flatten for perspective
    const [px, py] = proj(rx, 0, rz);
    const bri = 0.08 + Math.sin(t * 2 + i) * 0.04;
    cx.beginPath(); cx.arc(px, py, 1, 0, Math.PI * 2);
    cx.fillStyle = `rgba(212,168,71,${bri})`; cx.fill();
  }

  // Center glow
  const g = cx.createRadialGradient(mx, my, 0, mx, my, sz * 1.5);
  g.addColorStop(0, "rgba(212,168,71,0.04)");
  g.addColorStop(0.5, "rgba(147,51,234,0.02)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);

  drawScanCRT(cx, W, H, t);
}

// ============================================================
// SCENE: SANCTUM — "The Sanctum Resonance"
// Toroidal particle flow
// ============================================================
function sceneSanctum(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) {
    state.init = true;
    state.drops = makeDrops(W, 45);
    state.torusParticles = [];
    for (let i = 0; i < 400; i++) {
      state.torusParticles.push({
        angle: Math.random() * Math.PI * 2,  // Position on ring
        tube: Math.random() * Math.PI * 2,   // Position on tube
        sp: 0.003 + Math.random() * 0.005,
        tubeSp: 0.008 + Math.random() * 0.01,
        sz: 0.5 + Math.random() * 1,
      });
    }
  }

  drawRain(cx, state.drops, H, "rgba(212,168,71,1)"); // Gold-tinted rain for sanctum

  const mx = W / 2, my = H / 2;
  const R = Math.min(W, H) * 0.18; // Major radius
  const r = R * 0.35; // Minor radius

  for (const p of state.torusParticles) {
    p.angle += p.sp;
    p.tube += p.tubeSp;

    // Torus parametric equations with perspective
    const x3 = (R + r * Math.cos(p.tube)) * Math.cos(p.angle);
    const y3 = r * Math.sin(p.tube);
    const z3 = (R + r * Math.cos(p.tube)) * Math.sin(p.angle);

    // Rotate torus for viewing angle
    const tilt = 0.6;
    const rx = x3;
    const ry = y3 * Math.cos(tilt) - z3 * Math.sin(tilt);
    const rz = y3 * Math.sin(tilt) + z3 * Math.cos(tilt);

    const fov = 400;
    const scale = fov / (fov + rz);
    const px = mx + rx * scale;
    const py = my + ry * scale;

    const depth = (rz + R + r) / (2 * (R + r)); // 0 = far, 1 = near
    const alpha = 0.05 + depth * 0.2;

    cx.beginPath();
    cx.arc(px, py, p.sz * scale, 0, Math.PI * 2);
    const isGold = Math.sin(p.angle * 3 + t) > 0.3;
    cx.fillStyle = isGold ? `rgba(212,168,71,${alpha})` : `rgba(147,51,234,${alpha * 0.7})`;
    cx.fill();
  }

  // Center glow
  const g = cx.createRadialGradient(mx, my, 0, mx, my, R * 1.5);
  g.addColorStop(0, "rgba(212,168,71,0.03)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);

  drawScanCRT(cx, W, H, t);
}

// ============================================================
// SCENE: JOURNAL — "The Akashic Stream"
// Vertical luminous particle columns descending
// ============================================================
function sceneJournal(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) {
    state.init = true;
    state.drops = makeDrops(W);
    state.columns = [];
    const colCount = Math.floor(W / 20);
    for (let i = 0; i < colCount; i++) {
      state.columns.push({
        x: (i / colCount) * W + Math.random() * 10,
        particles: Array.from({ length: 8 + ~~(Math.random() * 12) }, () => ({
          y: Math.random() * H,
          sp: 0.5 + Math.random() * 1.5,
          sz: 1 + Math.random() * 2,
          brightness: 0.03 + Math.random() * 0.08,
        })),
        isCyan: Math.random() > 0.5,
        baseAlpha: 0.02 + Math.random() * 0.06,
      });
    }
  }

  drawRain(cx, state.drops, H);

  // Luminous columns
  for (const col of state.columns) {
    const pulse = col.baseAlpha + Math.sin(t * 1.5 + col.x * 0.01) * 0.02;
    const color = col.isCyan ? "34,211,238" : "217,70,239";

    // Column glow line
    cx.strokeStyle = `rgba(${color},${pulse * 0.3})`;
    cx.lineWidth = 0.3;
    cx.beginPath(); cx.moveTo(col.x, 0); cx.lineTo(col.x, H); cx.stroke();

    // Particles descending in column
    for (const p of col.particles) {
      p.y += p.sp;
      if (p.y > H + 10) p.y = -10;

      cx.beginPath();
      cx.arc(col.x, p.y, p.sz, 0, Math.PI * 2);
      cx.fillStyle = `rgba(${color},${p.brightness})`;
      cx.fill();

      // Small trail
      cx.beginPath();
      cx.arc(col.x, p.y - p.sp * 3, p.sz * 0.5, 0, Math.PI * 2);
      cx.fillStyle = `rgba(${color},${p.brightness * 0.3})`;
      cx.fill();
    }
  }

  // Occasional horizontal scan
  const scanPhase = (t * 0.5) % 8;
  if (scanPhase < 0.3) {
    const scanY = (scanPhase / 0.3) * H;
    cx.fillStyle = "rgba(212,168,71,0.015)";
    cx.fillRect(0, scanY - 2, W, 4);
  }

  drawScanCRT(cx, W, H, t);
}

// ============================================================
// SCENE: CONNECT — "The Signal"
// Pulsing trinary symbol with sonar waves
// ============================================================
function sceneConnect(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) { state.init = true; state.drops = makeDrops(W); state.stars = makeStars(W, H, 70); state.pulses = [] as { r: number; born: number }[]; }

  drawRain(cx, state.drops, H);
  drawStars(cx, state.stars, t);

  const mx = W / 2, my = H / 2;
  const sz = Math.min(W, H) * 0.08;

  // Trinary symbol: 3 circles in triangle formation, connected
  const positions = [
    [mx, my - sz * 1.2],
    [mx - sz * 1.04, my + sz * 0.6],
    [mx + sz * 1.04, my + sz * 0.6],
  ];

  // Slow rotation
  const rot = t * 0.15;
  const rotated = positions.map(([x, y]) => {
    const dx = x - mx, dy = y - my;
    return [mx + dx * Math.cos(rot) - dy * Math.sin(rot), my + dx * Math.sin(rot) + dy * Math.cos(rot)];
  });

  // Draw connecting curves
  cx.strokeStyle = `rgba(147,51,234,${0.15 + Math.sin(t * 0.8) * 0.05})`;
  cx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const [x1, y1] = rotated[i];
    const [x2, y2] = rotated[(i + 1) % 3];
    cx.beginPath();
    cx.moveTo(x1, y1);
    const cpx = mx + (x1 + x2 - 2 * mx) * 0.3;
    const cpy = my + (y1 + y2 - 2 * my) * 0.3;
    cx.quadraticCurveTo(cpx, cpy, x2, y2);
    cx.stroke();
  }

  // Draw 3 spheres
  for (let i = 0; i < 3; i++) {
    const [x, y] = rotated[i];
    const colors = ["#d946ef", "#9333ea", "#22d3ee"];
    // Glow
    const g = cx.createRadialGradient(x, y, 0, x, y, sz * 0.8);
    g.addColorStop(0, colors[i] + "30");
    g.addColorStop(1, "rgba(0,0,0,0)");
    cx.fillStyle = g; cx.fillRect(x - sz, y - sz, sz * 2, sz * 2);

    // Circle
    cx.beginPath(); cx.arc(x, y, sz * 0.35, 0, Math.PI * 2);
    cx.strokeStyle = colors[i] + "66"; cx.lineWidth = 1.5; cx.stroke();
  }

  // Periodic sonar pulse
  if (Math.sin(t * 0.8) > 0.95 && (state.pulses.length === 0 || t - state.pulses[state.pulses.length - 1].born > 3)) {
    state.pulses.push({ r: 0, born: t });
  }

  state.pulses = state.pulses.filter((p: any) => {
    const age = t - p.born;
    if (age > 4) return false;
    p.r = age * Math.min(W, H) * 0.15;
    const alpha = Math.max(0, 1 - age / 4);
    cx.beginPath(); cx.arc(mx, my, p.r, 0, Math.PI * 2);
    cx.strokeStyle = `rgba(217,70,239,${alpha * 0.15})`; cx.lineWidth = 1.5; cx.stroke();
    cx.beginPath(); cx.arc(mx, my, p.r * 0.85, 0, Math.PI * 2);
    cx.strokeStyle = `rgba(34,211,238,${alpha * 0.08})`; cx.lineWidth = 1; cx.stroke();
    return true;
  });

  drawScanCRT(cx, W, H, t);
}

// ============================================================
// SCENE: ABOUT / ORIGIN — "Akashic Stream"
// Journal-style columns + Streaming Comets + Neural Constellation
// ============================================================
function sceneAbout(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) {
    state.init = true;
    state.drops = makeDrops(W);
    state.columns = [];
    const colCount = Math.floor(W / 20);
    for (let i = 0; i < colCount; i++) {
      state.columns.push({
        x: (i / colCount) * W + Math.random() * 10,
        particles: Array.from({ length: 8 + ~~(Math.random() * 12) }, () => ({
          y: Math.random() * H,
          sp: 0.5 + Math.random() * 1.5,
          sz: 1 + Math.random() * 2,
          brightness: 0.03 + Math.random() * 0.08,
        })),
        isCyan: Math.random() > 0.5,
        baseAlpha: 0.02 + Math.random() * 0.06,
      });
    }

    // Streaming comets (always visible, 3 at once)
    state.comets = Array.from({ length: 3 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 3,
      tail: [] as { x: number; y: number }[],
      hue: i % 2 === 0 ? 180 : 280,
      offset: i * 2,
    }));

    // Neural constellation (cosmic web)
    state.nodes = Array.from({ length: 15 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1.5 + Math.random() * 2.5,
      pulse: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  drawRain(cx, state.drops, H);

  // Luminous columns
  for (const col of state.columns) {
    const pulse = col.baseAlpha + Math.sin(t * 1.5 + col.x * 0.01) * 0.02;
    const color = col.isCyan ? "34,211,238" : "217,70,239";

    cx.strokeStyle = `rgba(${color},${pulse * 0.3})`;
    cx.lineWidth = 0.3;
    cx.beginPath(); cx.moveTo(col.x, 0); cx.lineTo(col.x, H); cx.stroke();

    for (const p of col.particles) {
      p.y += p.sp;
      if (p.y > H + 10) p.y = -10;
      cx.beginPath();
      cx.arc(col.x, p.y, p.sz, 0, Math.PI * 2);
      cx.fillStyle = `rgba(${color},${p.brightness})`;
      cx.fill();
      cx.beginPath();
      cx.arc(col.x, p.y - p.sp * 3, p.sz * 0.5, 0, Math.PI * 2);
      cx.fillStyle = `rgba(${color},${p.brightness * 0.3})`;
      cx.fill();
    }
  }

  // Streaming comets with chromatic aberration
  for (const comet of state.comets) {
    comet.x += comet.vx;
    comet.y += comet.vy;

    if (comet.y > H + 30) { comet.y = -30; comet.x = Math.random() * W; }
    if (comet.y < -30) { comet.y = H + 30; comet.x = Math.random() * W; }
    if (comet.x > W + 30) { comet.x = -30; }
    if (comet.x < -30) { comet.x = W + 30; }

    comet.tail.push({ x: comet.x, y: comet.y });
    if (comet.tail.length > 20) comet.tail.shift();

    cx.lineCap = "round";
    for (let i = 0; i < comet.tail.length - 1; i++) {
      const curr = comet.tail[i];
      const next = comet.tail[i + 1];
      const life = i / comet.tail.length;
      const width = life * 4;
      const ab = (1 - life) * 5;

      // Red channel
      cx.beginPath();
      cx.moveTo(curr.x - comet.vx * ab * 0.2, curr.y - comet.vy * ab * 0.2);
      cx.lineTo(next.x - comet.vx * ab * 0.2, next.y - comet.vy * ab * 0.2);
      cx.strokeStyle = `rgba(255,40,60,${life * 0.5})`;
      cx.lineWidth = width;
      cx.stroke();

      // Blue channel
      cx.beginPath();
      cx.moveTo(curr.x + comet.vx * ab * 0.15, curr.y + comet.vy * ab * 0.15);
      cx.lineTo(next.x + comet.vx * ab * 0.15, next.y + comet.vy * ab * 0.15);
      cx.strokeStyle = `rgba(40,200,255,${life * 0.5})`;
      cx.lineWidth = width * 0.8;
      cx.stroke();
    }

    // Head glow
    const g = cx.createRadialGradient(comet.x, comet.y, 0, comet.x, comet.y, 20);
    g.addColorStop(0, `hsla(${comet.hue},90%,80%,0.9)`);
    g.addColorStop(0.3, `hsla(${comet.hue},70%,50%,0.4)`);
    g.addColorStop(1, "transparent");
    cx.fillStyle = g;
    cx.fillRect(comet.x - 20, comet.y - 20, 40, 40);

    // White hot core
    cx.beginPath();
    cx.arc(comet.x, comet.y, 2.5, 0, Math.PI * 2);
    cx.fillStyle = "#fff";
    cx.fill();
  }

  // Neural constellation
  for (const node of state.nodes) {
    node.x += node.vx;
    node.y += node.vy;
    node.pulse += 0.03;

    if (node.x < 50 || node.x > W - 50) node.vx *= -1;
    if (node.y < 50 || node.y > H - 50) node.vy *= -1;

    for (const other of state.nodes) {
      const dx = other.x - node.x;
      const dy = other.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 180 && dist > 10) {
        const alpha = (1 - dist / 180) * 0.2;
        const midX = (node.x + other.x) / 2;
        const midY = (node.y + other.y) / 2;

        cx.beginPath();
        cx.moveTo(node.x - 2, node.y);
        cx.quadraticCurveTo(midX - 1, midY, other.x - 2, other.y);
        cx.strokeStyle = `rgba(255,60,80,${alpha})`;
        cx.lineWidth = 0.8;
        cx.stroke();

        cx.beginPath();
        cx.moveTo(node.x + 2, node.y);
        cx.quadraticCurveTo(midX + 1, midY, other.x + 2, other.y);
        cx.strokeStyle = `rgba(60,180,255,${alpha})`;
        cx.stroke();
      }
    }

    const pulseR = node.r * (1 + Math.sin(node.pulse) * 0.2);

    cx.beginPath();
    cx.arc(node.x - 1.2, node.y, pulseR, 0, Math.PI * 2);
    cx.fillStyle = "rgba(255,80,100,0.5)";
    cx.fill();

    cx.beginPath();
    cx.arc(node.x + 1.2, node.y, pulseR, 0, Math.PI * 2);
    cx.fillStyle = "rgba(80,255,220,0.5)";
    cx.fill();

    cx.beginPath();
    cx.arc(node.x, node.y, pulseR * 0.4, 0, Math.PI * 2);
    cx.fillStyle = "rgba(255,255,255,0.9)";
    cx.fill();
  }

  // Gold scan sweep
  const scanPhase = (t * 0.5) % 8;
  if (scanPhase < 0.3) {
    const scanY = (scanPhase / 0.3) * H;
    cx.fillStyle = "rgba(212,168,71,0.015)";
    cx.fillRect(0, scanY - 2, W, 4);
  }

  drawScanCRT(cx, W, H, t);
}

// ============================================================
// SCENE: RESEARCH — "The Pattern Recognition Field"
// Cymatics: circular waveform patterns morphing
// ============================================================
function sceneResearch(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) { state.init = true; state.drops = makeDrops(W); state.stars = makeStars(W, H, 40); }

  drawRain(cx, state.drops, H);
  drawStars(cx, state.stars, t);

  const mx = W / 2, my = H / 2;
  const baseR = Math.min(W, H) * 0.2;

  // Chladni-like pattern: deforming circle
  const freq = 2 + Math.floor((t * 0.15) % 8); // Cycling through frequencies
  const points = 360;

  for (let layer = 0; layer < 3; layer++) {
    cx.beginPath();
    const layerFreq = freq + layer;
    const layerR = baseR * (0.6 + layer * 0.25);
    const alpha = 0.06 - layer * 0.015;

    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const deform = Math.sin(a * layerFreq + t * 0.5) * baseR * 0.15
                   + Math.cos(a * (layerFreq + 2) - t * 0.3) * baseR * 0.08;
      const r = layerR + deform;
      const x = mx + Math.cos(a) * r;
      const y = my + Math.sin(a) * r;
      if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
    }
    cx.closePath();
    cx.strokeStyle = layer === 0 ? `rgba(237,233,246,${alpha})` : `rgba(217,70,239,${alpha})`;
    cx.lineWidth = 0.8;
    cx.stroke();
  }

  // Inner nodal points (where the pattern crosses zero)
  for (let i = 0; i < freq * 2; i++) {
    const a = (i / (freq * 2)) * Math.PI * 2 + t * 0.1;
    const r = baseR * 0.5;
    const x = mx + Math.cos(a) * r;
    const y = my + Math.sin(a) * r;
    const bri = 0.08 + Math.sin(t * 2 + i) * 0.04;
    cx.beginPath(); cx.arc(x, y, 2, 0, Math.PI * 2);
    cx.fillStyle = `rgba(237,233,246,${bri})`; cx.fill();
  }

  // Frequency label (very faint)
  cx.font = "9px monospace";
  cx.fillStyle = "rgba(237,233,246,0.06)";
  cx.textAlign = "center";
  cx.fillText(`${(100 + freq * 40).toFixed(0)} Hz`, mx, my + baseR + 30);

  drawScanCRT(cx, W, H, t);
}

// ============================================================
// SCENE: ORACLE — Void Tendrils + Levitating Runes + Sanctuary Aura
// Heavy chromatic aberration, mystical rising energy
// ============================================================
function sceneXenolinguistics(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) {
    state.init = true;
    state.drops = makeDrops(W);
    
    // DECODING CASCADES - Falling alien transmission streams
    state.cascades = Array.from({ length: 4 }, (_, i) => ({
      x: (W/5) * (i+1) + (Math.random()-0.5)*40,
      speed: 2 + Math.random() * 2.5,
      glyphs: Array.from({ length: 12 }, (_, j) => ({
        y: Math.random() * H,
        char: ['⌬','⏣','⍟','◈','⬡','⚉','◉','⏧','⬭','◫','⚛','⯃'][Math.floor(Math.random()*12)],
        size: 10 + Math.random() * 6,
        offset: j * (H/12)
      })),
      hue: i % 2 === 0 ? 200 : 280 // Cyan vs Purple
    }));
    
    // ARCANE LEXEMES - Floating holographic word-glyphs
    state.lexemes = Array.from({ length: 8 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.4,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.015,
      scale: 0.8 + Math.random() * 0.7,
      pulse: Math.random() * Math.PI * 2,
      // Alien "word" construction: concentric rings + radial lines
      rings: 2 + Math.floor(Math.random() * 2),
      spokes: 3 + Math.floor(Math.random() * 5)
    }));
    
    // TRANSMISSION BURSTS - Occasional horizontal data packets
    state.bursts = [];
  }

  drawRain(cx, state.drops, H);

  // DECODING CASCADES - Vertical glyph streams with heavy chromatic aberration
  for (const cas of state.cascades) {
    for (const g of cas.glyphs) {
      // Update position
      g.y += cas.speed;
      if (g.y > H + 30) g.y = -30;
      
      const fallProgress = (g.y % H) / H; // 0 to 1 down the screen
      const ab = 4; // Aberration intensity
      
      cx.save();
      cx.translate(cas.x, g.y);
      
      cx.font = `bold ${g.size}px monospace`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      
      // Extreme motion blur RGB split (velocity-based)
      // RED ghost (trails behind - appears above falling object)
      cx.fillStyle = 'rgba(255,40,60,0.35)';
      cx.fillText(g.char, 0, -ab*1.5);
      
      // BLUE ghost (leads ahead - appears below)
      cx.fillStyle = 'rgba(40,180,255,0.35)';
      cx.fillText(g.char, 0, ab*1.5);
      
      // Sharp WHITE center (the glyph itself)
      cx.fillStyle = `hsla(${cas.hue},90%,85%,0.95)`;
      cx.shadowColor = `hsla(${cas.hue},80%,60%,0.8)`;
      cx.shadowBlur = 8;
      cx.fillText(g.char, 0, 0);
      cx.shadowBlur = 0;
      
      // Subtle scanline through glyph
      cx.fillStyle = 'rgba(255,255,255,0.3)';
      cx.fillRect(-g.size/2, -1, g.size, 2);
      
      cx.restore();
    }
    
    // Connection beam between cascade columns (faint interference)
    if (Math.abs(t % 4) < 0.5 && state.cascades.indexOf(cas) < 3) {
      const nextCas = state.cascades[state.cascades.indexOf(cas) + 1];
      const scanY = (t * 50) % H;
      cx.beginPath();
      cx.moveTo(cas.x, scanY);
      cx.lineTo(nextCas.x, scanY);
      cx.strokeStyle = 'rgba(255,255,255,0.03)';
      cx.lineWidth = 20;
      cx.stroke();
    }
  }
  // ARCANE LEXEMES - Complex alien symbols with heavy RGB phase shift
  for (const lex of state.lexemes) {
    lex.x += lex.vx;
    lex.y += lex.vy;
    lex.rot += lex.rotSpeed;
    lex.pulse += 0.04;
    
    // Wrap around screen
    if (lex.x < -100) lex.x = W + 100;
    if (lex.x > W + 100) lex.x = -100;
    if (lex.y < -100) lex.y = H + 100;
    if (lex.y > H + 100) lex.y = -100;
    
    const pulseScale = lex.scale * (1 + Math.sin(lex.pulse) * 0.08);
    const ab = 5; // Heavy aberration for these big symbols
    
    cx.save();
    cx.translate(lex.x, lex.y);
    
    // RED channel (rotates counter, offset left)
    cx.save();
    cx.rotate(lex.rot - 0.03);
    cx.translate(-ab, 0);
    drawAlienGlyph(cx, lex, pulseScale, 'rgba(255,60,80,0.4)');
    cx.restore();
    
    // BLUE channel (rotates clockwise, offset right)
    cx.save();
    cx.rotate(lex.rot + 0.03);
    cx.translate(ab, 0);
    drawAlienGlyph(cx, lex, pulseScale, 'rgba(60,180,255,0.4)');
    cx.restore();
    
    // SHARP CENTER (white/cyan, no offset)
    cx.rotate(lex.rot);
    drawAlienGlyph(cx, lex, pulseScale, `hsla(${200 + Math.sin(lex.pulse)*40},90%,70%,0.9)`);
    
    cx.restore();
  }
  
  // Helper to draw complex alien glyph geometry
  function drawAlienGlyph(cx: CanvasRenderingContext2D, lex: any, scale: number, color: string) {
    const r = 25 * scale;
    cx.strokeStyle = color;
    cx.lineWidth = 1.5 * scale;
    
    // Outer ring
    cx.beginPath();
    cx.arc(0, 0, r, 0, Math.PI*2);
    cx.stroke();
    
    // Inner rings
    for (let i=1; i<=lex.rings; i++) {
      cx.beginPath();
      cx.arc(0, 0, r * (i/(lex.rings+1)), 0, Math.PI*2);
      cx.stroke();
    }
    
    // Radial spokes (rotating)
    for (let i=0; i<lex.spokes; i++) {
      const angle = (i/lex.spokes) * Math.PI*2 + (t * 0.2);
      cx.beginPath();
      cx.moveTo(0, 0);
      cx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
      cx.stroke();
    }
    
    // Central dot
    cx.beginPath();
    cx.arc(0, 0, 3*scale, 0, Math.PI*2);
    cx.fillStyle = color;
    cx.fill();
  }

  // TRANSMISSION BURSTS - Horizontal data packets (random appearance)
  if (Math.random() < 0.02 && state.bursts.length < 3) {
    state.bursts.push({
      y: Math.random() * H,
      x: -50,
      vx: 8 + Math.random() * 6,
      width: 30 + Math.random() * 50
    });
  }
  
  for (let i = state.bursts.length - 1; i >= 0; i--) {
    const b = state.bursts[i];
    b.x += b.vx;
    
    // Draw burst with chromatic separation (motion blur horizontal)
    // Red trails behind
    cx.fillStyle = 'rgba(255,50,80,0.2)';
    cx.fillRect(b.x - b.vx*2, b.y - 2, b.width, 4);
    
    // Blue leads ahead
    cx.fillStyle = 'rgba(50,180,255,0.2)';
    cx.fillRect(b.x + b.vx*1.5, b.y - 2, b.width, 4);
    
    // Sharp center
    const grad = cx.createLinearGradient(b.x, b.y-3, b.x+b.width, b.y+3);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'transparent');
    cx.fillStyle = grad;
    cx.fillRect(b.x, b.y - 3, b.width, 6);
    
    if (b.x > W + 100) state.bursts.splice(i, 1);
  }

  // Decoding scan line (slower, more deliberate)
  const scanY = (t * 0.12) % (H * 1.2) - H*0.1;
  cx.fillStyle = "rgba(180,220,255,0.02)";
  cx.fillRect(0, scanY - 3, W, 6);

  drawScanCRT(cx, W, H, t);
}


// ============================================================
// SCENE REGISTRY
// ============================================================
const SCENES: Record<string, (cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) => void> = {
  homepage: sceneHomepage,
  gallery: sceneGallery,
  codex: sceneCodex,
  sanctum: sceneSanctum,
  journal: sceneJournal,
  connect: sceneConnect,
  about: sceneAbout,
  research: sceneResearch,
  oracle: sceneXenolinguistics,
  xenolinguistics: sceneXenolinguistics,
};


// ============================================================
// MAIN COMPONENT
// ============================================================
export type SceneVariant = keyof typeof SCENES;

interface PageBackgroundProps {
  variant: SceneVariant;
  className?: string;
  opacity?: number;
}

export default function PageBackground({ variant, className = "", opacity = 1 }: PageBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const cx = cv.getContext("2d");
    if (!cx) return;

    let W = 0, H = 0, t = 0, af = 0;
    const state: any = {};
    const sceneFn = SCENES[variant] || sceneOracle;

    function resize() {
      const r = devicePixelRatio || 1;
      const p = cv!.parentElement;
      if (!p) return;
      W = p.clientWidth; H = p.clientHeight;
      cv!.width = W * r; cv!.height = H * r;
      cv!.style.width = W + "px"; cv!.style.height = H + "px";
      cx!.setTransform(r, 0, 0, r, 0, 0);
      // Reset state on resize so particles reinitialize
      state.init = false;
    }
    resize();
    window.addEventListener("resize", resize);

    function frame() {
      t += 0.016;
      cx!.clearRect(0, 0, W, H);
      sceneFn(cx!, W, H, t, state);
      af = requestAnimationFrame(frame);
    }
    frame();

    return () => { cancelAnimationFrame(af); window.removeEventListener("resize", resize); };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity,
      }}
    />
  );
}
