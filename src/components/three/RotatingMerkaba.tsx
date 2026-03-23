"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/* Two interlocking tetrahedra — the Merkaba
 * Critically: one tetra rotates CW, the other CCW
 * Gold = ascending/solar. Cyan = descending/lunar.
 * Both are inside a parent group for unified tilt/float.
 */
function Merkaba() {
  const upperRef = useRef<THREE.Group>(null);
  const lowerRef = useRef<THREE.Group>(null);
  const parentRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Parent group: slow global rotation + gentle tilt
    if (parentRef.current) {
      parentRef.current.rotation.y = t * 0.3;
      parentRef.current.rotation.x = Math.sin(t * 0.15) * 0.3;
    }

    // Upper tetra: rotates CLOCKWISE (ascending / solar = gold)
    if (upperRef.current) {
      upperRef.current.rotation.y = t * 0.4;
    }

    // Lower tetra: rotates COUNTER-CLOCKWISE (descending / lunar = cyan)
    if (lowerRef.current) {
      lowerRef.current.rotation.y = -t * 0.4;
    }
  });

  const tetraGeo = new THREE.TetrahedronGeometry(1.5, 0);

  return (
    <group ref={parentRef}>
      {/* Upper tetrahedron — point up, gold wireframe */}
      <group ref={upperRef}>
        <mesh geometry={tetraGeo} position={[0, 0.6, 0]}>
          <meshBasicMaterial
            color="#d4a847"
            wireframe
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Lower tetrahedron — point down, cyan wireframe */}
      <group ref={lowerRef} rotation={[Math.PI, 0, 0]}>
        <mesh geometry={tetraGeo} position={[0, 0.6, 0]}>
          <meshBasicMaterial
            color="#22d3ee"
            wireframe
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Inner sphere — purple glow at center */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#9333ea" transparent opacity={0.2} />
      </mesh>

      {/* Orbiting ring — faint magenta orbit plane */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.2, 0.015, 8, 64]} />
        <meshBasicMaterial color="#d946ef" transparent opacity={0.25} />
      </mesh>
      <mesh rotation={[-Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.2, 0.015, 8, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#050508"]} />
      <fog attach="fog" args={["#050508", 8, 30]} />
      <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.4}>
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
