/**
 * The Reliquary — three-bay architectural proof (M1.1B)
 *
 * Everything here is real geometry: the wall is lofted from a carved
 * cross-section around a 13.5 m arc, bays are genuine recesses with
 * returns and a soffit, and the oculus is a coffered ring overhead.
 * No CSS gradients stand in for a surface.
 *
 * Units are metres. Floor at y = 0, oculus at y = 8.6.
 */
import * as THREE from "three";

export type PlateRect = { slug: string; left: number; top: number; width: number; height: number };
export type ChamberWork = { slug: string; image: string };

const R = 13.5;              // wall face radius
const H = 8.6;               // wall head
const NICHE_DEPTH = 1.7;
const NICHE_HALF_DEG = 13;
const BAY_HALF_START = 16;   // side bay start (deg from centre)
const BAY_HALF_END = 30;
const ARC_HALF = 58;

const deg = (d: number) => (d * Math.PI) / 180;

/* ── lofting ─────────────────────────────────────────────────────────── */

type Pt = [y: number, d: number]; // height, protrusion into the room

/** A carved cross-section: plinth, shadow gap, dado, field, frieze, cornice. */
const PROFILE: Pt[] = [
  [0.0, 0.34], [0.14, 0.34], [0.15, 0.26], [0.56, 0.26], [0.57, 0.40],
  [0.64, 0.40], [0.65, 0.05], [0.78, 0.05], [2.55, 0.02], [2.57, 0.11],
  [2.70, 0.11], [2.71, 0.02], [6.30, 0.02], [6.32, 0.16], [7.15, 0.16],
  [7.18, 0.34], [7.62, 0.34], [7.64, 0.52], [7.94, 0.52], [7.95, 0.30],
  [8.60, 0.30],
];

/**
 * Loft a cross-section around the chamber axis between two angles.
 * `r` is the surface radius; lathe = true sweeps around Y from -Z.
 */
function loft(
  profile: Pt[],
  a0deg: number,
  a1deg: number,
  r: number,
  opts: { steps?: number; uvRepeat?: [number, number] } = {}
): THREE.BufferGeometry {
  const steps = opts.steps ?? Math.max(6, Math.round(Math.abs(a1deg - a0deg) * 1.6));
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const a0 = deg(a0deg);
  const a1 = deg(a1deg);

  for (let s = 0; s <= steps; s++) {
    const a = a0 + (a1 - a0) * (s / steps);
    for (let p = 0; p < profile.length; p++) {
      const [y, d] = profile[p];
      const rr = r - d; // protrusion moves the face toward the room
      pos.push(Math.sin(a) * rr, y, -Math.cos(a) * rr);
      uv.push((s / steps) * (opts.uvRepeat?.[0] ?? 4), (y / H) * (opts.uvRepeat?.[1] ?? 1));
    }
  }
  const P = profile.length;
  for (let s = 0; s < steps; s++) {
    for (let p = 0; p < P - 1; p++) {
      const a = s * P + p, b = a + P, c = b + 1, d2 = a + 1;
      idx.push(a, b, d2, b, c, d2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const uvAttr = new THREE.Float32BufferAttribute(uv, 2);
  g.setAttribute("uv", uvAttr);
  g.setAttribute("uv1", uvAttr.clone());   // aoMap reads uv1 in three r15x+
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A flat curved panel spanning an arc, y0..y1 at radius r. */
function panel(a0deg: number, a1deg: number, r: number, y0: number, y1: number, steps = 24) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const a0 = deg(a0deg), a1 = deg(a1deg);
  for (let s = 0; s <= steps; s++) {
    const a = a0 + (a1 - a0) * (s / steps);
    const x = Math.sin(a) * r, z = -Math.cos(a) * r;
    pos.push(x, y0, z, x, y1, z);
    uv.push(s / steps * 2, 0, s / steps * 2, 1);
  }
  for (let s = 0; s < steps; s++) {
    const i = s * 2;
    idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A vertical return (reveal) at angle `adeg` between two radii. */
function reveal(adeg: number, r0: number, r1: number, y0: number, y1: number) {
  const a = deg(adeg);
  const x0 = Math.sin(a) * r0, z0 = -Math.cos(a) * r0;
  const x1 = Math.sin(a) * r1, z1 = -Math.cos(a) * r1;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([
    x0, y0, z0, x0, y1, z0, x1, y0, z1, x1, y1, z1,
  ], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0, 1, 1], 2));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  g.computeVertexNormals();
  return g;
}

/** The arched head of the central niche: a soffit following an ellipse. */
function archSoffit(a0deg: number, a1deg: number, rFront: number, rBack: number,
  ySpring: number, rise: number, steps = 40) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const a0 = deg(a0deg), a1 = deg(a1deg);
  const half = (a1 - a0) / 2;
  for (let s = 0; s <= steps; s++) {
    const a = a0 + (a1 - a0) * (s / steps);
    const t = (a - (a0 + half)) / half;            // -1..1 across the arch
    const y = ySpring + rise * Math.sqrt(Math.max(0, 1 - t * t));
    const xf = Math.sin(a) * rFront, zf = -Math.cos(a) * rFront;
    const xb = Math.sin(a) * rBack, zb = -Math.cos(a) * rBack;
    pos.push(xf, y, zf, xb, y, zb);
    uv.push(s / steps, 0, s / steps, 1);
  }
  for (let s = 0; s < steps; s++) {
    const i = s * 2;
    idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A horizontal floor sector built directly in world space, UVs centred on the axis. */
function floorSector(a0deg: number, a1deg: number, r: number, segs = 72) {
  const pos: number[] = [0, 0, 0];
  const uv: number[] = [0.5, 0.5];
  const idx: number[] = [];
  const a0 = deg(a0deg), a1 = deg(a1deg);
  for (let i = 0; i <= segs; i++) {
    const a = a0 + (a1 - a0) * (i / segs);
    const x = Math.sin(a) * r, z = -Math.cos(a) * r;
    pos.push(x, 0, z);
    uv.push(x / (2 * r) + 0.5, z / (2 * r) + 0.5);
    if (i < segs) idx.push(0, i + 1, i + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ── materials ───────────────────────────────────────────────────────── */

function loadTex(loader: THREE.TextureLoader, url: string, srgb = false, repeat: [number, number] = [1, 1]) {
  const t = loader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function environment(renderer: THREE.WebGLRenderer) {
  // A small authored environment: dark violet room, a warm oculus above, a
  // cool spectral breath at the side. Gives bronze something real to reflect.
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#2a2138");
  grd.addColorStop(0.42, "#120d1e");
  grd.addColorStop(0.75, "#0a0713");
  grd.addColorStop(1, "#05040a");
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  const warm = g.createRadialGradient(512, 20, 4, 512, 20, 260);
  warm.addColorStop(0, "rgba(255,244,224,1)");
  warm.addColorStop(0.35, "rgba(255,214,150,0.55)");
  warm.addColorStop(1, "rgba(255,200,130,0)");
  g.fillStyle = warm; g.fillRect(0, 0, 1024, 512);
  const cool = g.createRadialGradient(150, 260, 6, 150, 260, 300);
  cool.addColorStop(0, "rgba(142,230,245,0.42)");
  cool.addColorStop(1, "rgba(142,230,245,0)");
  g.fillStyle = cool; g.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}

/* ── the chamber ─────────────────────────────────────────────────────── */

export type ChamberOptions = {
  works: ChamberWork[];       // exactly three: left, centre, right
  mobile: boolean;
  reducedMotion: boolean;
  /** low-power path: no shadow maps, reduced resolution — used on weak GPUs */
  lite?: boolean;
  /** render one frame then hold it, so DOM motion stays at video rate on GPU-less hosts */
  freeze?: boolean;
};

export type Chamber = {
  dispose: () => void;
  plateRects: () => PlateRect[];
  setHover: (slug: string | null) => void;
  focusOn: (slug: string | null) => void;
  stats: () => { calls: number; triangles: number; textures: number };
};

export function createChamber(canvas: HTMLCanvasElement, opts: ChamberOptions): Chamber {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: "high-performance",
  });
  renderer.setPixelRatio(opts.lite ? 0.75 : Math.min(window.devicePixelRatio, opts.mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = !opts.lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030208);
  scene.fog = new THREE.FogExp2(0x050309, 0.022);
  scene.environment = environment(renderer);

  const camera = new THREE.PerspectiveCamera(opts.mobile ? 56 : 60, 1, 0.1, 120);
  const lookAt = new THREE.Vector3(0, opts.mobile ? 3.35 : 4.6, -R);

  const loader = new THREE.TextureLoader();
  const ALB = loadTex(loader, "/textures/reliquary/stone_albedo.png", true, [2.4, 1.15]);
  const NRM = loadTex(loader, "/textures/reliquary/stone_normal.png", false, [2.4, 1.15]);
  const RGH = loadTex(loader, "/textures/reliquary/stone_rough.png", false, [2.4, 1.15]);
  const AO = loadTex(loader, "/textures/reliquary/stone_ao.png", false, [2.4, 1.15]);
  const BNRM = loadTex(loader, "/textures/reliquary/bronze_normal.png", false, [4, 4]);
  const BRGH = loadTex(loader, "/textures/reliquary/bronze_rough.png", false, [4, 4]);
  const FLOOR = loadTex(loader, "/textures/reliquary/floor_albedo.png", true, [1, 1]);

  const stone = new THREE.MeshStandardMaterial({
    map: ALB, normalMap: NRM, roughnessMap: RGH, aoMap: AO,
    roughness: 1, metalness: 0.06, envMapIntensity: 0.8,
    color: 0x8f88ad,
  });
  stone.normalScale.set(1.2, 1.2);

  const stonePilaster = stone.clone();
  const ALB2 = ALB.clone(); ALB2.repeat.set(1.1, 2.2); ALB2.needsUpdate = true;
  const NRM2 = NRM.clone(); NRM2.repeat.set(1.1, 2.2); NRM2.needsUpdate = true;
  stonePilaster.map = ALB2; stonePilaster.normalMap = NRM2;
  stonePilaster.color = new THREE.Color(0x7d7698);

  const stoneDeep = stone.clone();
  stoneDeep.color = new THREE.Color(0x8c86a8);   // recesses read cooler and darker
  stoneDeep.envMapIntensity = 0.25;

  const bronze = new THREE.MeshStandardMaterial({
    color: 0xc09a5c, metalness: 1, roughness: 0.85,
    roughnessMap: BRGH, normalMap: BNRM, envMapIntensity: 2.6,
  });
  bronze.normalScale.set(0.5, 0.5);

  const opal = new THREE.MeshStandardMaterial({
    color: 0xd8e4ff, emissive: 0xa9c8ff, emissiveIntensity: 0.55,
    roughness: 0.25, metalness: 0.0,
  });
  const ember = new THREE.MeshStandardMaterial({
    color: 0xffe6c0, emissive: 0xffc27a, emissiveIntensity: 2.2, roughness: 0.4,
  });

  const group = new THREE.Group();
  scene.add(group);

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow; m.receiveShadow = true;
    group.add(m);
    return m;
  };

  /* wall: three spans around the bays, one continuous cornice above */
  const spans: [number, number, number][] = [
    [-ARC_HALF, -BAY_HALF_END, R],          // left wall
    [-BAY_HALF_END, -BAY_HALF_START, R + 0.55], // left bay recess
    [-BAY_HALF_START, -NICHE_HALF_DEG, R],  // left pilaster
    [-NICHE_HALF_DEG, NICHE_HALF_DEG, R + NICHE_DEPTH], // central niche
    [NICHE_HALF_DEG, BAY_HALF_START, R],    // right pilaster
    [BAY_HALF_START, BAY_HALF_END, R + 0.55],
    [BAY_HALF_END, ARC_HALF, R],
  ];

  for (const [a0, a1, r] of spans) {
    add(loft(PROFILE, a0, a1, r, { uvRepeat: [3 * Math.abs(a1 - a0) / 68, 1] }), r > R ? stoneDeep : stone);
  }

  /* returns where the wall steps back into a bay */
  const reveals: Array<[number, number, number, number, number]> = [
    [-BAY_HALF_END, R, R + 0.55, 0, H],
    [-BAY_HALF_START, R, R + 0.55, 0, H],
    [-NICHE_HALF_DEG, R, R + NICHE_DEPTH, 0, H],
    [NICHE_HALF_DEG, R, R + NICHE_DEPTH, 0, H],
    [BAY_HALF_START, R, R + 0.55, 0, H],
    [BAY_HALF_END, R, R + 0.55, 0, H],
  ];
  for (const [a, r0, r1, y0, y1] of reveals) {
    const m = add(reveal(a, r0, r1, y0, y1), stoneDeep);
    (m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  }

  /* the central niche's arched head, springing at 5.1 m */
  add(archSoffit(-NICHE_HALF_DEG, NICHE_HALF_DEG, R - 0.02, R + NICHE_DEPTH, 5.1, 1.25), stoneDeep, false);
  add(panel(-NICHE_HALF_DEG, NICHE_HALF_DEG, R - 0.03, 5.1, 6.35, 30), stone);

  /* ── floor ─────────────────────────────────────────────────────────── */
  const floorGeo = floorSector(-ARC_HALF - 10, ARC_HALF + 10, R + 2.2, 84);
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
    map: FLOOR, roughness: 0.34, metalness: 0.08, envMapIntensity: 0.85,
    color: 0xffffff, side: THREE.DoubleSide,
  }));
  floor.receiveShadow = true;
  group.add(floor);

  /* the floor's own inlay, as geometry: a gold ring and twelve spokes */
  const inlayMat = new THREE.MeshStandardMaterial({
    color: 0xc9a465, metalness: 1, roughness: 0.42, envMapIntensity: 1.9,
    emissive: 0x1a1204, emissiveIntensity: 0.12,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.035, 8, 128), inlayMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; ring.receiveShadow = true;
  group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.028, 8, 96), inlayMat);
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.012; group.add(ring2);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 2.5), inlayMat);
    spoke.position.set(Math.sin(a) * 3.35, 0.012, -Math.cos(a) * 3.35);
    spoke.rotation.y = -a;
    group.add(spoke);
  }

  /* ── foreground: the step up into the chamber ─────────────────────── */
  const stepMat = stone;
  for (let i = 0; i < 2; i++) {
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 1.2 - i * 1.1, R + 1.25 - i * 1.1, 0.16, 72, 1, false, deg(-70), deg(140)),
      stepMat
    );
    step.position.y = 0.08 + i * 0.16;
    step.receiveShadow = true; step.castShadow = true;
    group.add(step);
  }
  const stepEdge = new THREE.Mesh(
    new THREE.TorusGeometry(R + 0.6, 0.025, 8, 96, deg(120)),
    bronze
  );
  stepEdge.rotation.x = -Math.PI / 2;
  stepEdge.rotation.z = deg(-70 + 90);
  stepEdge.position.y = 0.33;
  group.add(stepEdge);

  /* shadow gap at the wall base: light must die before it reaches the floor */
  const gapMat = new THREE.MeshBasicMaterial({ color: 0x010104, side: THREE.DoubleSide });
  const gap = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.34, R + 0.34, 0.09, 96, 1, true, deg(-ARC_HALF), deg(ARC_HALF * 2)),
    gapMat
  );
  gap.position.y = 0.045;
  group.add(gap);

  const border = new THREE.Mesh(
    new THREE.TorusGeometry(R + 0.28, 0.012, 6, 120, deg(ARC_HALF * 1.7)),
    inlayMat
  );
  border.rotation.x = -Math.PI / 2;
  border.rotation.z = deg(-ARC_HALF * 0.85 + 90);
  border.position.y = 0.014;
  group.add(border);

  /* ── overhead: coffered ring + oculus ─────────────────────────────── */
  const ceilMat = stoneDeep;
  const dome = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 5.2, 0.5, 64, 1, true),
    ceilMat
  );
  dome.position.y = H + 0.25;
  dome.material.side = THREE.DoubleSide;
  group.add(dome);

  const ceilRing = new THREE.Mesh(new THREE.RingGeometry(2.1, 6.2, 96), ceilMat);
  ceilRing.rotation.x = -Math.PI / 2;
  ceilRing.position.y = H + 0.02;
  ceilRing.receiveShadow = true;
  group.add(ceilRing);

  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 3.9), ceilMat);
    rib.position.set(Math.sin(a) * 4.15, H + 0.14, -Math.cos(a) * 4.15);
    rib.rotation.y = -a;
    rib.castShadow = true;
    group.add(rib);
  }

  const oculusRing = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.18, 16, 96), bronze);
  oculusRing.rotation.x = Math.PI / 2;
  oculusRing.position.y = H - 0.02;
  oculusRing.castShadow = true;
  group.add(oculusRing);

  const oculusRim = new THREE.Mesh(
    new THREE.RingGeometry(2.02, 2.34, 72),
    new THREE.MeshBasicMaterial({ color: 0xfff0d2, side: THREE.DoubleSide })
  );
  oculusRim.rotation.x = -Math.PI / 2;
  oculusRim.position.y = H + 0.03;
  group.add(oculusRim);

  const oculusGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.0, 72),
    new THREE.MeshBasicMaterial({ color: 0xfff6e6, side: THREE.DoubleSide })
  );
  oculusGlow.rotation.x = -Math.PI / 2;
  oculusGlow.position.y = H + 0.45;
  (oculusGlow.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
  group.add(oculusGlow);

  /* a shaft of air: a stack of translucent discs, never a cone */
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xffe9c6, transparent: true, opacity: 0.045,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i++) {
    const rr = 1.75 + i * 0.19;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(rr, 48), shaftMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = H - 0.35 - i * 0.72;
    group.add(disc);
  }

  /* ── bronze construction: rails, lamps, filigree ──────────────────── */
  const railGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 10);

  function bronzeRail(a0deg: number, a1deg: number, y: number, r: number) {
    const steps = 16;
    const a0 = deg(a0deg), a1 = deg(a1deg);
    for (let s = 0; s < steps; s++) {
      const aA = a0 + (a1 - a0) * (s / steps);
      const aB = a0 + (a1 - a0) * ((s + 1) / steps);
      const pA = new THREE.Vector3(Math.sin(aA) * r, y, -Math.cos(aA) * r);
      const pB = new THREE.Vector3(Math.sin(aB) * r, y, -Math.cos(aB) * r);
      const mid = pA.clone().add(pB).multiplyScalar(0.5);
      const len = pA.distanceTo(pB) * 1.02;
      const seg = new THREE.Mesh(railGeo, bronze);
      seg.position.copy(mid);
      seg.scale.y = len;
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pB.clone().sub(pA).normalize());
      seg.castShadow = true;
      group.add(seg);
    }
  }
  bronzeRail(-NICHE_HALF_DEG + 0.5, NICHE_HALF_DEG - 0.5, 6.45, R - 0.05);
  bronzeRail(-BAY_HALF_END + 0.5, -BAY_HALF_START - 0.5, 4.15, R + 0.5);
  bronzeRail(BAY_HALF_START + 0.5, BAY_HALF_END - 0.5, 4.15, R + 0.5);

  function pictureLight(adeg: number, y: number, r: number) {
    const a = deg(adeg);
    const fixture = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 12), bronze);
    bar.rotation.z = Math.PI / 2;
    bar.castShadow = true;
    fixture.add(bar);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.26, 12, 1, true), bronze);
    hood.position.y = -0.16; hood.rotation.x = 0.3;
    fixture.add(hood);
    fixture.position.set(Math.sin(a) * r, y, -Math.cos(a) * r);
    fixture.rotation.y = -a;
    group.add(fixture);
    return fixture;
  }
  pictureLight(-NICHE_HALF_DEG + 2.2, 6.2, R - 0.1);
  pictureLight(NICHE_HALF_DEG - 2.2, 6.2, R - 0.1);
  pictureLight(-BAY_HALF_END + 2.0, 4.65, R + 0.45);
  pictureLight(BAY_HALF_END - 2.0, 4.65, R + 0.45);

  /* opal inlays set into the niche reveals (embedded, not stuck on) */
  for (const s of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.4, 0.12), opal);
    const a = deg(s * (NICHE_HALF_DEG - 0.22));
    strip.position.set(Math.sin(a) * (R + 0.12), 2.9, -Math.cos(a) * (R + 0.12));
    strip.rotation.y = -a;
    group.add(strip);
  }

  /* glyph relief carved into the frieze: real geometry, lit by grazing light */
  const glyphMat = bronze;
  const glyphGroup = new THREE.Group();
  for (let k = 0; k < 22; k++) {
    const t = k / 21;
    const adeg2 = -ARC_HALF + 3 + t * (ARC_HALF * 2 - 6);
    const a = deg(adeg2);
    const rr = (Math.abs(adeg2) < NICHE_HALF_DEG + 0.4 ? R + NICHE_DEPTH : R) - 0.19;
    const ringG = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 24), glyphMat);
    ringG.position.set(Math.sin(a) * rr, 6.72, -Math.cos(a) * rr);
    ringG.rotation.y = -a;
    glyphGroup.add(ringG);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), glyphMat);
    bar.position.set(Math.sin(a) * rr, 6.72, -Math.cos(a) * rr);
    bar.rotation.y = -a;
    glyphGroup.add(bar);
  }
  glyphGroup.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
  group.add(glyphGroup);

  /* ── the three works ──────────────────────────────────────────────── */
  const plateMeshes: { slug: string; mesh: THREE.Mesh; a: number; r: number; y: number; w: number; h: number }[] = [];
  const platePositions = [
    { adeg: -23, r: R + 0.42, y: 3.0, w: 2.35, h: 1.76 },
    { adeg: 0, r: R + NICHE_DEPTH - 0.12, y: 3.35, w: 3.5, h: 2.62 },
    { adeg: 23, r: R + 0.42, y: 3.0, w: 2.35, h: 1.76 },
  ];

  platePositions.forEach((p, i) => {
    const work = opts.works[i];
    if (!work) return;
    const tex = loader.load(work.image);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h, 1, 1), mat);
    const a = deg(p.adeg);
    mesh.position.set(Math.sin(a) * p.r, p.y, -Math.cos(a) * p.r);
    mesh.rotation.y = -a;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    (mesh as any).userData.slug = work.slug;
    group.add(mesh);

    // bronze surround, mitred, standing 6 cm proud of the stone
    const frameT = 0.06, depth = 0.09;
    const bars: Array<[number, number, number, number, number]> = [
      [p.w + frameT * 2, frameT, depth, 0, p.h / 2 + frameT / 2],
      [p.w + frameT * 2, frameT, depth, 0, -p.h / 2 - frameT / 2],
      [frameT, p.h + frameT * 2, depth, -p.w / 2 - frameT / 2, 0],
      [frameT, p.h + frameT * 2, depth, p.w / 2 + frameT / 2, 0],
    ];
    for (const [w, h, d, x, y] of bars) {
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bronze);
      bar2.position.set(x, y, 0.02);
      bar2.castShadow = true;
      mesh.add(bar2);
    }
    // mounting plate behind, so the work sits in the architecture
    const backer = new THREE.Mesh(
      new THREE.BoxGeometry(p.w + 0.3, p.h + 0.3, 0.1),
      stoneDeep
    );
    backer.position.set(0, 0, -0.08);
    mesh.add(backer);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(p.w, p.h),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true,
        opacity: 0.10, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    glass.position.z = 0.012;
    mesh.add(glass);

    // the work lights its own stone: a soft bounce in front of the frame
    const bounce = new THREE.PointLight(0xffeedd, 55, 11, 2);
    bounce.position.set(Math.sin(a) * (p.r - 0.55), p.y, -Math.cos(a) * (p.r - 0.55));
    scene.add(bounce);

    // and a faint halo on the wall behind, so the stone answers the plate
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(p.w * 2.4, p.h * 2.4),
      new THREE.MeshBasicMaterial({
        color: 0xfff0dc, transparent: true, opacity: 0.06,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    halo.position.set(Math.sin(a) * (p.r + 0.06), p.y, -Math.cos(a) * (p.r + 0.06));
    halo.rotation.y = -a;
    group.add(halo);

    plateMeshes.push({ slug: work.slug, mesh, a: p.adeg, r: p.r, y: p.y, w: p.w, h: p.h });
  });

  /* ── lighting ─────────────────────────────────────────────────────── */
  const oculus = new THREE.SpotLight(0xffe7c4, 5200, 0, deg(opts.mobile ? 44 : 42), 0.8, 1.25);
  oculus.position.set(0, H + 0.7, 0);
  oculus.target.position.set(0, 0, -R * 0.5);
  oculus.castShadow = !opts.lite;
  oculus.shadow.mapSize.set(opts.mobile ? 1024 : 1536, opts.mobile ? 1024 : 1536);
  oculus.shadow.camera.near = 1; oculus.shadow.camera.far = 26;
  oculus.shadow.bias = -0.0006; oculus.shadow.normalBias = 0.02;
  oculus.shadow.radius = 3;
  scene.add(oculus, oculus.target);

  const sideLightL = new THREE.SpotLight(0xffd7a4, 240, 0, deg(26), 0.95, 1.5);
  sideLightL.position.set(-5.4, 5.2, -6.4);
  sideLightL.target.position.set(-5.4, 2.9, -R + 0.6);
  sideLightL.castShadow = false;
  sideLightL.shadow.mapSize.set(1024, 1024);
  sideLightL.shadow.bias = -0.0008;
  scene.add(sideLightL, sideLightL.target);

  const sideLightR = new THREE.SpotLight(0xffd7a4, 240, 0, deg(26), 0.95, 1.5);
  sideLightR.position.set(5.4, 5.2, -6.4);
  sideLightR.target.position.set(5.4, 2.9, -R + 0.6);
  sideLightR.castShadow = false;
  sideLightR.shadow.mapSize.set(1024, 1024);
  sideLightR.shadow.bias = -0.0008;
  scene.add(sideLightR, sideLightR.target);

  const frontKey = new THREE.SpotLight(0xcbb9ff, 150, 0, deg(50), 1.0, 1.4);
  frontKey.position.set(-3.2, 5.6, 6.5);
  frontKey.target.position.set(0, 2.2, -R);
  frontKey.castShadow = false;
  frontKey.shadow.mapSize.set(1024, 1024);
  frontKey.shadow.bias = -0.0009;
  scene.add(frontKey, frontKey.target);

  const grazeL = new THREE.SpotLight(0xffdcb0, 95, 0, deg(64), 1.0, 1.9);
  grazeL.position.set(-11.5, 4.6, 1.5);
  grazeL.target.position.set(-6.0, 3.2, -R + 0.2);
  scene.add(grazeL, grazeL.target);

  const grazeR = new THREE.SpotLight(0xffdcb0, 95, 0, deg(64), 1.0, 1.9);
  grazeR.position.set(11.5, 4.6, 1.5);
  grazeR.target.position.set(6.0, 3.2, -R + 0.2);
  scene.add(grazeR, grazeR.target);

  const spectral = new THREE.PointLight(0x8ee6f5, 190, 26, 2);
  spectral.position.set(-8.5, 3.2, -9.5);
  scene.add(spectral);

  const ambient = new THREE.HemisphereLight(0x3b3560, 0x08060f, 0.5);
  scene.add(ambient);

  const fill = new THREE.PointLight(0xffd9a8, 60, 20, 2);
  fill.position.set(0, 4.2, -R + 2.2);
  scene.add(fill);

  /* ── cameras ──────────────────────────────────────────────────────── */
  const camPos = opts.mobile
    ? new THREE.Vector3(0.42, 1.46, -3.1)
    : new THREE.Vector3(2.1, 1.55, 4.4);
  camera.position.copy(camPos);
  camera.lookAt(lookAt);

  /* ── interaction: project the plates into DOM rectangles ──────────── */
  let width = 1, height = 1;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (opts.mobile) camera.fov = width / height > 0.9 ? 52 : 62;
    camera.updateProjectionMatrix();
  };
  resize();

  const v = new THREE.Vector3();
  function plateRects(): PlateRect[] {
    return plateMeshes.map(({ slug, mesh, w, h }) => {
      const corners = [
        new THREE.Vector3(-w / 2, h / 2, 0), new THREE.Vector3(w / 2, h / 2, 0),
        new THREE.Vector3(-w / 2, -h / 2, 0), new THREE.Vector3(w / 2, -h / 2, 0),
      ].map((p) => p.clone().applyMatrix4(mesh.matrixWorld).project(camera));
      const xs = corners.map((c) => (c.x * 0.5 + 0.5) * width);
      const ys = corners.map((c) => (-c.y * 0.5 + 0.5) * height);
      const left = Math.min(...xs), right = Math.max(...xs);
      const top = Math.min(...ys), bottom = Math.max(...ys);
      return { slug, left, top, width: right - left, height: bottom - top };
    });
  }

  /* ── loop ─────────────────────────────────────────────────────────── */
  let raf = 0;
  let focusSlug: string | null = null;
  let freezeFrames = opts.freeze ? 2 : Infinity;
  let t0 = performance.now();
  function frame(now: number) {
    const dt = (now - t0) / 1000; t0 = now;
    if (!opts.reducedMotion) {
      // the room breathes very slightly; light, not camera drift
      const k = Math.sin(now * 0.00035) * 0.5 + 0.5;
      oculus.intensity = 1400 * (0.96 + 0.04 * k);
      spectral.intensity = 90 * (0.85 + 0.3 * k);
    }
    if (focusSlug) {
      // the surrounding room recedes physically: exposure and fog, not an overlay
      renderer.toneMappingExposure += (0.62 - renderer.toneMappingExposure) * Math.min(1, dt * 5);
      (scene.fog as THREE.FogExp2).density += (0.055 - (scene.fog as THREE.FogExp2).density) * Math.min(1, dt * 5);
    } else {
      renderer.toneMappingExposure += (1.15 - renderer.toneMappingExposure) * Math.min(1, dt * 5);
      (scene.fog as THREE.FogExp2).density += (0.022 - (scene.fog as THREE.FogExp2).density) * Math.min(1, dt * 5);
    }
    renderer.render(scene, camera);
    if (freezeFrames > 0) { freezeFrames -= 1; raf = requestAnimationFrame(frame); }
    else { raf = 0; }
  }
  raf = requestAnimationFrame(frame);

  const onResize = () => { resize(); };
  window.addEventListener("resize", onResize);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    },
    plateRects,
    setHover() {},
    focusOn(slug) { focusSlug = slug; },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures };
    },
  };
}
