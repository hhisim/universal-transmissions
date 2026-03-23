"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/* Two interlocking tetrahedra — the Merkaba */
function Merkaba() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.3;
    groupRef.current.rotation.x = Math.sin(t * 0.15) * 0.3;
  });

  // Tetrahedron geometry
  const geo = new THREE.TetrahedronGeometry(1.5, 0);

  return (
    <group ref={groupRef}>
      {/* Upper tetrahedron (pointing up) — cyan */}
      <mesh geometry={geo} position={[0, 0.6, 0]}>
        <meshBasicMaterial
          color="#00e5ff"
          wireframe
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Lower tetrahedron (pointing down) — gold */}
      <mesh geometry={geo} position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]}>
        <meshBasicMaterial
          color="#d4a847"
          wireframe
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner sphere — purple glow */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#7c4dff" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#050508"]} />
      <fog attach="fog" args={["#050508", 8, 30]} />
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Merkaba />
      </Float>
    </>
  );
}

export default function RotatingMerkaba() {
  return (
    <div className="w-full h-full" style={{ minHeight: "400px" }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
