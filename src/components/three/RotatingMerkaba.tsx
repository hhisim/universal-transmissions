"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   True Merkaba — Star Tetrahedron
   Two interpenetrating tetrahedra sharing a center:
     • Upper (ascending): points UP, gold wireframe
     • Lower (descending): points DOWN, cyan wireframe
   Surrounded by counter-rotating sacred geometry rings
   and a central violet/plasma glow sphere.
   ───────────────────────────────────────────────────────────── */

function StarTetrahedron() {
  const upperRef = useRef<THREE.Mesh>(null);
  const lowerRef = useRef<THREE.Mesh>(null);
  const parentRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Group>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const midRing1Ref = useRef<THREE.Mesh>(null);
  const midRing2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Parent group: slow, hypnotic full rotation with gentle tilt
    if (parentRef.current) {
      parentRef.current.rotation.y = t * 0.18;
      parentRef.current.rotation.x = Math.sin(t * 0.09) * 0.22;
    }

    // Upper tetra: rotates clockwise when viewed from above
    if (upperRef.current) {
      upperRef.current.rotation.y = t * 0.4;
    }

    // Lower tetra: rotates counter-clockwise when viewed from above
    if (lowerRef.current) {
      lowerRef.current.rotation.y = -t * 0.4;
    }

    // Outer star hexagram: slow counter-rotation
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = -t * 0.12;
    }

    // Inner torus ring: faster counter-rotation
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = t * 0.25;
    }

    // Mid counter-rotating rings
    if (midRing1Ref.current) {
      midRing1Ref.current.rotation.x = t * 0.15;
      midRing1Ref.current.rotation.z = -t * 0.1;
    }
    if (midRing2Ref.current) {
      midRing2Ref.current.rotation.x = -t * 0.12;
      midRing2Ref.current.rotation.y = t * 0.18;
    }

    // Core sphere: pulsing scale for "breathing" glow effect
    if (coreRef.current) {
      const pulse = 1 + 0.18 * Math.sin(t * 2.4);
      coreRef.current.scale.setScalar(pulse);
    }
  });

  const tetraGeo = new THREE.TetrahedronGeometry(1.65, 0);

  return (
    <group ref={parentRef}>

      {/* ── Upper (Ascending) Tetrahedron — GOLD ─────────── */}
      <mesh ref={upperRef} geometry={tetraGeo}>
        <meshBasicMaterial
          color="#d4a847"
          wireframe
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solid translucent inner glow layer — upper */}
      <mesh ref={upperRef} geometry={tetraGeo} scale={0.97}>
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Lower (Descending) Tetrahedron — CYAN ──────────── */}
      <mesh ref={lowerRef} geometry={tetraGeo} rotation={[Math.PI, 0, 0]}>
        <meshBasicMaterial
          color="#00e5ff"
          wireframe
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solid translucent inner glow layer — lower */}
      <mesh ref={lowerRef} geometry={tetraGeo} rotation={[Math.PI, 0, 0]} scale={0.97}>
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

      {/* ── Inner Counter-Rotating Torus (cyan) ────────────── */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.006, 8, 64]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.18} />
      </mesh>

      {/* ── Mid Counter-Rotating Octagon Ring (magenta) ─────── */}
      <mesh ref={midRing1Ref} rotation={[Math.PI / 2, 0, Math.PI / 8]}>
        <torusGeometry args={[1.5, 0.004, 8, 8]} />
        <meshBasicMaterial color="#d946ef" transparent opacity={0.12} />
      </mesh>

      {/* ── Second Mid Ring (gold, tilted) ───────────────────── */}
      <mesh ref={midRing2Ref} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[1.35, 0.004, 8, 8]} />
        <meshBasicMaterial color="#d4a847" transparent opacity={0.12} />
      </mesh>

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
