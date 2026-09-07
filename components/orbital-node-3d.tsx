"use client";

import { useRef, useEffect, Suspense, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

/**
 * Procedural brutalist orbital node geometry.
 * Features dark metallic faceted obsidian body with cybernetic cyan wireframe cage and orbital rings.
 */
function OrbitalNodeMesh({
  reducedMotion,
  mouseRef,
}: {
  reducedMotion: boolean;
  mouseRef: React.RefObject<{ x: number; y: number } | null>;
}) {
  const tiltGroupRef = useRef<THREE.Group>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    elapsedRef.current += delta;

    // 1. Autonomous Rotational Drift
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.y += delta * 0.25;
      meshGroupRef.current.rotation.x += delta * 0.08;
    }

    // 2. Vertical Floating Drift & Mouse Parallax Tilt
    if (tiltGroupRef.current) {
      const floatOffset = Math.sin(elapsedRef.current * 0.75) * 0.12;
      tiltGroupRef.current.position.y = floatOffset;

      const targetRotX = (mouseRef.current?.y ?? 0) * -0.35;
      const targetRotY = (mouseRef.current?.x ?? 0) * 0.45;

      tiltGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        tiltGroupRef.current.rotation.x,
        targetRotX,
        delta * 3
      );
      tiltGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        tiltGroupRef.current.rotation.y,
        targetRotY,
        delta * 3
      );
    }
  });

  return (
    <group ref={tiltGroupRef}>
      {/* =========================================================================
          CUSTOM SATELLITE MODEL (.GLB) SWAP LOCATION:
          When you are ready to replace this procedural geometric node with your custom 3D model:
          1. Place your satellite file in /public/models/satellite.glb (or /public/satellite.glb)
          2. Import { useGLTF } from "@react-three/drei"
          3. Inside this component, call:
             const { scene } = useGLTF("/models/satellite.glb")
          4. Replace the entire <group ref={meshGroupRef}> below with:
             <primitive object={scene} scale={1.5} />
          5. Add preload at the bottom of this file:
             useGLTF.preload("/models/satellite.glb")
         ========================================================================= */}
      <group ref={meshGroupRef} name="brutalist-geometric-node">
        {/* Main Solid Faceted Icosahedron (Obsidian Metallic Body) */}
        <mesh castShadow receiveShadow>
          <icosahedronGeometry args={[1.75, 0]} />
          <meshPhysicalMaterial
            color="#0f1318"
            roughness={0.22}
            metalness={0.92}
            clearcoat={0.35}
            clearcoatRoughness={0.15}
            flatShading={true}
          />
        </mesh>

        {/* Outer Accent Wireframe Lattice */}
        <mesh scale={[1.015, 1.015, 1.015]}>
          <icosahedronGeometry args={[1.75, 0]} />
          <meshBasicMaterial
            wireframe
            color="#38bdf8"
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Equatorial Orbital Sensor Ring 1 */}
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.45, 0.015, 16, 100]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.95}
            roughness={0.15}
          />
        </mesh>

        {/* Inclined Orbital Sensor Ring 2 */}
        <mesh rotation={[-Math.PI / 3.5, Math.PI / 4, 0]}>
          <torusGeometry args={[2.75, 0.012, 16, 100]} />
          <meshStandardMaterial
            color="#38bdf8"
            metalness={0.85}
            roughness={0.2}
            transparent
            opacity={0.5}
          />
        </mesh>

        {/* Inner Glowing Core */}
        <mesh>
          <octahedronGeometry args={[0.6, 0]} />
          <meshBasicMaterial
            wireframe
            color="#38bdf8"
            transparent
            opacity={0.65}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * 3D Hero Scene Canvas with cinematic lighting and deep space environment.
 */
function OrbitalNodeScene({ reducedMotion }: { reducedMotion: boolean }) {
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalized coordinates [-1, 1]
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseRef.current = { x, y };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [reducedMotion]);

  return (
    <Canvas
      camera={{ position: [0, 0, 5.8], fov: 45 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      className="w-full h-full"
    >
      <Suspense fallback={null}>
        {/* Dim Ambient Light for Deep Shadows */}
        <ambientLight intensity={0.25} />

        {/* Sharp Directional Key Light for Harsh Specular Highlights */}
        <directionalLight
          position={[6, 8, 4]}
          intensity={2.8}
          color="#ffffff"
          castShadow
        />

        {/* Cold Cyan Rim Light */}
        <directionalLight
          position={[-6, -4, -4]}
          intensity={0.6}
          color="#38bdf8"
        />

        {/* Space-themed Environment for Physical Reflections */}
        <Environment preset="night" />

        {/* Center Orbital Node */}
        <OrbitalNodeMesh reducedMotion={reducedMotion} mouseRef={mouseRef} />
      </Suspense>
    </Canvas>
  );
}

const emptySubscribe = () => () => {};

function subscribeResize(callback: () => void) {
  window.addEventListener("resize", callback, { passive: true });
  return () => window.removeEventListener("resize", callback);
}

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * Main OrbitalNode3D Container with responsive mobile fallback and accessibility.
 */
export default function OrbitalNode3D() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isMobile = useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth < 768,
    () => false
  );

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  // SSR placeholder to prevent layout shift
  if (!isMounted) {
    return <div className="absolute inset-0 -z-10 bg-black" aria-hidden="true" />;
  }

  // Mobile fallback (< 768px): do not mount WebGL Canvas to save battery and GPU
  if (isMobile) {
    return (
      <div
        className="absolute inset-0 -z-10 w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        {/* Radial cybernetic grid and vignette poster */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12)_0%,rgba(0,0,0,0.95)_70%)]" />
        <div className="relative w-48 h-48 rounded-full border border-sky-400/20 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full border border-dashed border-sky-400/30 animate-[spin_20s_linear_infinite]" />
          <div className="absolute w-20 h-20 bg-gradient-to-br from-neutral-800 to-black rounded-lg border border-white/20 rotate-45 shadow-[0_0_25px_rgba(56,189,248,0.2)]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 -z-10 w-full h-full overflow-hidden bg-black pointer-events-none"
      aria-hidden="true"
    >
      <OrbitalNodeScene reducedMotion={reducedMotion} />
    </div>
  );
}
