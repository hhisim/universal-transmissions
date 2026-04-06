"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   True Merkaba — Star Tetrahedron
   Two interpenetrating tetrahedra sharing a center:
     • Upper (ascending): points UP, gold wireframe  — CW rotation
     • Lower (descending): points DOWN, cyan wireframe — CCW rotation
   Scroll accelerates the rotation speed.
   Two counter-rotating orbiting torus rings (gold + cyan).
   ───────────────────────────────────────────────────────────── */

function StarTetrahedron() {
  // Upper tetra refs — wireframe + inner glow (separate so both animate)
  const upperWireRef = useRef<THREE.Mesh>(null);
  const upperGlowRef = useRef<THREE.Mesh>(null);
  // Lower tetra refs — wireframe + inner glow
  const lowerWireRef = useRef<THREE.Mesh>(null);
  const lowerGlowRef = useRef<THREE.Mesh>(null);

  const parentRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  // Torus ring refs — gold (outer) + cyan (inner)
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  // Torus ring orbit refs — rings orbit the center
  const ringOrbit1Ref = useRef<THREE.Group>(null);
  const ringOrbit2Ref = useRef<THREE.Group>(null);

  // Scroll speed tracking — use a ref so we don't trigger re-renders
  const scrollSpeedRef = useRef(1);

  // Attach scroll listener on mount
  if (typeof window !== "undefined") {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      // Base speed 1, increases up to 5x at 2000px scroll
      scrollSpeedRef.current = 1 + Math.min(scrollY / 400, 4);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = scrollSpeedRef.current;

    // Parent group: slow hypnotic full rotation with gentle tilt
    if (parentRef.current) {
      parentRef.current.rotation.y = t * 0.18;
      parentRef.current.rotation.x = Math.sin(t * 0.09) * 0.22;
    }

    // Upper tetra — GOLD — rotates CLOCKWISE when viewed from above
    // (negative Y because Three.js default camera looks down -Z)
    const cwSpeed = 0.4 * speed;
    if (upperWireRef.current) upperWireRef.current.rotation.y = -t * cwSpeed;
    if (upperGlowRef.current) upperGlowRef.current.rotation.y = -t * cwSpeed;

    // Lower tetra — CYAN — rotates COUNTER-CLOCKWISE when viewed from above
    // (positive Y = CCW from above, opposite to upper)
    const ccwSpeed = 0.4 * speed;
    if (lowerWireRef.current) lowerWireRef.current.rotation.y = t * ccwSpeed;
    if (lowerGlowRef.current) lowerGlowRef.current.rotation.y = t * ccwSpeed;

    // Outer hexagram ring: slow counter-rotation
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = -t * 0.12;
    }

    // Core sphere: pulsing scale for "breathing" glow effect
    if (coreRef.current) {
      const pulse = 1 + 0.18 * Math.sin(t * 2.4);
      coreRef.current.scale.setScalar(pulse);
    }

    // Gold torus ring orbits CW around center
    if (ringOrbit1Ref.current) {
      ringOrbit1Ref.current.rotation.y = t * 0.3 * speed;
      ringOrbit1Ref.current.rotation.x = Math.sin(t * 0.15) * 0.3;
    }

    // Cyan torus ring orbits CCW (opposite direction)
    if (ringOrbit2Ref.current) {
      ringOrbit2Ref.current.rotation.y = -t * 0.25 * speed;
      ringOrbit2Ref.current.rotation.z = Math.cos(t * 0.18) * 0.25;
    }

    // Individual torus ring spin (counter-rotate inside orbit)
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.35 * speed;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.28 * speed;
    }
  });

  const tetraGeo = new THREE.TetrahedronGeometry(1.65, 0);

  return (
    <group ref={parentRef}>

      {/* ── Upper (Ascending) Tetrahedron — GOLD wireframe ─── */}
      <mesh ref={upperWireRef} geometry={tetraGeo}>
        <meshBasicMaterial
          color="#d4a847"
          wireframe
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solid translucent inner glow layer — upper (same ref, same rotation) */}
      <mesh ref={upperGlowRef} geometry={tetraGeo} scale={0.97}>
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Lower (Descending) Tetrahedron — CYAN wireframe ─── */}
      <mesh ref={lowerWireRef} geometry={tetraGeo} rotation={[Math.PI, 0, 0]}>
        <meshBasicMaterial
          color="#00e5ff"
          wireframe
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solid translucent inner glow layer — lower */}
      <mesh ref={lowerGlowRef} geometry={tetraGeo} rotation={[Math.PI, 0, 0]} scale={0.97}>
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Central Plasma Core — MAGENTA/VIOLET GLOW ────── */}
      {/* Outer glow shell */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshBasicMaterial
          color="#d946ef"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      {/* Mid glow */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial
          color="#c026d3"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      {/* Core bright point */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      {/* ── Hexagram Outer Ring (two interlocking triangles) ── */}
      <group ref={outerRingRef}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={(() => {
                const pts: number[] = [];
                for (let i = 0; i < 3; i++) {
                  const a1 = ((90 + i * 120) * Math.PI) / 180;
                  pts.push(Math.cos(a1) * 2.1, 0, Math.sin(a1) * 2.1);
                  const a1n = (((90 + i * 120) + 120) * Math.PI) / 180;
                  pts.push(Math.cos(a1n) * 2.1, 0, Math.sin(a1n) * 2.1);
                }
                for (let i = 0; i < 3; i++) {
                  const a2 = ((270 + i * 120) * Math.PI) / 180;
                  pts.push(Math.cos(a2) * 2.1, 0, Math.sin(a2) * 2.1);
                  const a2n = (((270 + i * 120) + 120) * Math.PI) / 180;
                  pts.push(Math.cos(a2n) * 2.1, 0, Math.sin(a2n) * 2.1);
                }
                return new Float32Array(pts);
              })()}
              count={12}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#d946ef" transparent opacity={0.25} />
        </lineSegments>
      </group>

      {/* ── Gold Torus Ring — outer orbit group (CW) ─────── */}
      <group ref={ringOrbit1Ref}>
        <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.9, 0.012, 12, 80]} />
          <meshBasicMaterial color="#d4a847" transparent opacity={0.35} />
        </mesh>
      </group>

      {/* ── Cyan Torus Ring — inner orbit group (CCW, opposite) */}
      <group ref={ringOrbit2Ref}>
        <mesh
          ref={ring2Ref}
          rotation={[Math.PI / 3, Math.PI / 5, 0]}
        >
          <torusGeometry args={[1.5, 0.012, 12, 80]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.35} />
        </mesh>
      </group>

      {/* ── Vertical Axis Line (violet) ─────────────────────── */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([0, -2.2, 0, 0, 2.2, 0])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#9333ea" transparent opacity={0.12} />
      </line>

    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#050508"]} />
      <fog attach="fog" args={["#050508", 9, 32]} />
      <ambientLight intensity={0.05} />
      <Float speed={1.0} rotationIntensity={0.25} floatIntensity={0.25}>
        <StarTetrahedron />
      </Float>
    </>
  );
}

export default function RotatingMerkaba() {
  return (
    <div className="w-full h-full" style={{ minHeight: "400px" }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
