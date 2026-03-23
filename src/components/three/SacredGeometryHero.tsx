"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, Icosahedron } from "@react-three/drei";
import * as THREE from "three";

/* Particle field background */
function ParticleField({ count = 800 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      const t = Math.random();
      col[i * 3] = 0.3 + t * 0.5;
      col[i * 3 + 1] = 0.1 + t * 0.8;
      col[i * 3 + 2] = 0.9 - t * 0.3;
    }
    return [pos, col];
  }, [count]);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
      ref.current.rotation.x += delta * 0.005;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

/* Wireframe icosahedron — sacred geometry core */
function IcosahedronCore() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = t * 0.15;
    ref.current.rotation.y = t * 0.2;
    ref.current.rotation.z = t * 0.08;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <Icosahedron ref={ref} args={[1.8, 1]}>
        <meshBasicMaterial
          color="#00e5ff"
          wireframe
          transparent
          opacity={0.25}
        />
      </Icosahedron>
      <Sphere args={[1.6, 16, 16]}>
        <meshBasicMaterial
          color="#7c4dff"
          transparent
          opacity={0.06}
        />
      </Sphere>
    </Float>
  );
}

/* Grid floor */
function GridFloor() {
  return (
    <gridHelper
      args={[40, 40, "#1a1a2e", "#0a0a14"]}
      position={[0, -4, 0]}
    />
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#050508"]} />
      <fog attach="fog" args={["#050508", 10, 40]} />
      <ParticleField />
      <IcosahedronCore />
      <GridFloor />
    </>
  );
}

export default function SacredGeometryHero() {
  return (
    <div className="w-full h-full" style={{ minHeight: "500px" }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
