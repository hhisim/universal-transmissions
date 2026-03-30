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
// Particle field forming sacred geometry patterns
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
        ox: Math.cos(a) * r, // original offset from center
        oy: Math.sin(a) * r,
        a, r, sp: 0.0003 + Math.random() * 0.001,
        sz: 0.5 + Math.random() * 1.5,
        hue: 280 + Math.random() * 80,
      });
    }
  }

  // Glyph rain
  drawRain(cx, state.drops, H);

  // Particles orbiting center, occasionally forming patterns
  const cx2 = W / 2, cy2 = H / 2;
  const patternPhase = (Math.sin(t * 0.1) + 1) / 2; // 0-1, slow cycle

  for (const p of state.particles) {
    p.a += p.sp;
    const baseX = cx2 + Math.cos(p.a) * p.r;
    const baseY = cy2 + Math.sin(p.a) * p.r;

    // Occasionally attract toward Flower of Life points
    let tx = baseX, ty = baseY;
    if (patternPhase > 0.7) {
      // Flower of Life: 7 circles, 6 around 1
      const fIdx = ~~(p.a * 6 / (Math.PI * 2)) % 7;
      const fAngle = fIdx * Math.PI / 3;
      const fR = Math.min(W, H) * 0.12;
      const fx = cx2 + (fIdx === 0 ? 0 : Math.cos(fAngle) * fR);
      const fy = cy2 + (fIdx === 0 ? 0 : Math.sin(fAngle) * fR);
      const blend = (patternPhase - 0.7) / 0.3; // 0-1
      tx = baseX + (fx - baseX) * blend * 0.4;
      ty = baseY + (fy - baseY) * blend * 0.4;
    }

    p.x += (tx - p.x) * 0.02;
    p.y += (ty - p.y) * 0.02;

    const hueShift = (Math.sin(t * 0.3 + p.a) + 1) / 2;
    const h = 280 + hueShift * 80; // magenta to cyan
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
// SCENE: ABOUT / ORIGIN — "Chromatic Resonance"
// Rain + Luminous Columns + Chromatic Crystals + Streaming Comet
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

    // CHROMATIC COMET SYSTEM
    state.comet = {
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      tail: [],
      nextSpawn: t + 2 + Math.random() * 3
    };

    // CHROMATIC CRYSTALS (Prismatic floating shards)
    state.crystals = Array.from({ length: 6 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 12 + Math.random() * 18,
      r: Math.random() * Math.PI * 2,
      rs: (Math.random() - 0.5) * 0.025,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.2,
      hue: Math.random() * 80 + 140 // Teal to purple range
    }));
  }

  drawRain(cx, state.drops, H);

  // CHROMATIC CRYSTALS - Floating with RGB split
  for (const c of state.crystals) {
    c.r += c.rs;
    c.x += c.dx;
    c.y += c.dy;
    // Wrap screen
    if (c.x < -40) c.x = W + 40;
    if (c.x > W + 40) c.x = -40;
    if (c.y < -40) c.y = H + 40;
    if (c.y > H + 40) c.y = -40;

    const ab = 3; // Aberration offset

    cx.save();
    cx.translate(c.x, c.y);
    cx.rotate(c.r);

    // Draw diamond shape with RGB split
    const drawShard = (ox: number, oy: number, rgb: string, a: number) => {
      cx.beginPath();
      cx.moveTo(ox, oy - c.s);
      cx.lineTo(ox + c.s * 0.7, oy);
      cx.lineTo(ox, oy + c.s);
      cx.lineTo(ox - c.s * 0.7, oy);
      cx.closePath();
      cx.strokeStyle = `rgba(${rgb},${a})`;
      cx.lineWidth = 1.5;
      cx.stroke();
      cx.fillStyle = `rgba(${rgb},${a * 0.15})`;
      cx.fill();
    };

    // Red channel (shifted left/back)
    drawShard(-ab, 0, '255,60,80', 0.5);
    // Blue channel (shifted right/forward)
    drawShard(ab, 0, '60,150,255', 0.5);
    // Green center (sharp)
    drawShard(0, 0, '180,255,120', 0.9);

    // Internal refractive line
    cx.beginPath();
    cx.moveTo(-ab, 0);
    cx.lineTo(ab, 0);
    cx.strokeStyle = 'rgba(255,255,255,0.3)';
    cx.lineWidth = 0.5;
    cx.stroke();

    cx.restore();
  }

  // Luminous columns (original)
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

  // STREAMING COMET with heavy chromatic aberration
  const comet = state.comet;
  if (t > comet.nextSpawn && !comet.active) {
    comet.active = true;
    comet.y = Math.random() * (H * 0.6) + H * 0.2;
    comet.x = -60;
    comet.vx = 15 + Math.random() * 10; // Warp speed
    comet.vy = (Math.random() - 0.5) * 4;
    comet.tail = [];
  }

  if (comet.active) {
    // Update physics
    comet.tail.push({x: comet.x, y: comet.y, age: 0});
    if (comet.tail.length > 30) comet.tail.shift();
    comet.x += comet.vx;
    comet.y += comet.vy;

    // Draw tail - Aberration increases with particle age (older = more separated)
    for (let i = 0; i < comet.tail.length; i++) {
      const p = comet.tail[i];
      p.age++;
      const life = i / comet.tail.length; // 0 (old) to 1 (new)
      const size = life * 5;
      const ab = (1 - life) * 5; // More separation for older particles

      // Red trails (velocity lag - behind)
      cx.beginPath();
      cx.arc(p.x - ab - 2, p.y, size, 0, Math.PI * 2);
      cx.fillStyle = `rgba(255,50,50,${life * 0.4})`;
      cx.fill();

      // Blue leads (velocity ahead)
      cx.beginPath();
      cx.arc(p.x + ab * 0.5, p.y, size * 0.9, 0, Math.PI * 2);
      cx.fillStyle = `rgba(80,150,255,${life * 0.5})`;
      cx.fill();

      // White hot core center
      cx.beginPath();
      cx.arc(p.x, p.y, size * 0.6, 0, Math.PI * 2);
      cx.fillStyle = `rgba(255,255,255,${life * 0.8})`;
      cx.fill();
    }

    // Comet head - Intense RGB split glow
    const cx_ = comet.x, cy = comet.y;

    // Large red bloom (trails behind)
    const gR = cx.createRadialGradient(cx_ - 6, cy, 0, cx_ - 6, cy, 25);
    gR.addColorStop(0, 'rgba(255,80,80,0.6)');
    gR.addColorStop(1, 'rgba(255,0,0,0)');
    cx.fillStyle = gR;
    cx.fillRect(cx_ - 30, cy - 30, 60, 60);

    // Large blue bloom (leads ahead)
    const gB = cx.createRadialGradient(cx_ + 6, cy, 0, cx_ + 6, cy, 25);
    gB.addColorStop(0, 'rgba(80,180,255,0.6)');
    gB.addColorStop(1, 'rgba(0,100,255,0)');
    cx.fillStyle = gB;
    cx.fillRect(cx_ - 30, cy - 30, 60, 60);

    // Sharp white core
    cx.beginPath();
    cx.arc(cx_, cy, 5, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(255,255,255,1)';
    cx.fill();
    cx.beginPath();
    cx.arc(cx_, cy, 2, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(200,255,255,1)';
    cx.fill();

    if (comet.x > W + 100) {
      comet.active = false;
      comet.nextSpawn = t + 4 + Math.random() * 6;
    }
  }

  // Gold scan sweep (original)
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
// SCENE: ORACLE — Stars + glyph rain + nebula
// (Same as what's in the oracle page already)
// ============================================================
function sceneOracle(cx: CanvasRenderingContext2D, W: number, H: number, t: number, state: any) {
  if (!state.init) { state.init = true; state.drops = makeDrops(W); state.stars = makeStars(W, H, 100); }

  drawRain(cx, state.drops, H);
  drawStars(cx, state.stars, t, 0.12);

  // Nebula clouds
  const n1 = cx.createRadialGradient(W * 0.7, H * 0.25, 0, W * 0.7, H * 0.25, W * 0.4);
  n1.addColorStop(0, "rgba(147,51,234,0.025)"); n1.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = n1; cx.fillRect(0, 0, W, H);

  const n2 = cx.createRadialGradient(W * 0.2, H * 0.75, 0, W * 0.2, H * 0.75, W * 0.3);
  n2.addColorStop(0, "rgba(34,211,238,0.015)"); n2.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = n2; cx.fillRect(0, 0, W, H);

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
  oracle: sceneOracle,
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
