import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Soft round sprite used for the golden dust particles. */
function useDotTexture() {
  return useMemo(() => {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, "rgba(255,246,205,1)");
      g.addColorStop(0.35, "rgba(242,212,84,0.85)");
      g.addColorStop(1, "rgba(230,197,71,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Drifting golden dust that fills the hero stage. */
function GoldenParticles({ count }: { count: number }) {
  const texture = useDotTexture();
  const group = useRef<THREE.Group>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 13;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 9 - 2;
    }
    return arr;
  }, [count]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += dt * 0.016;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.4;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={texture}
          size={0.28}
          sizeAttenuation
          transparent
          depthWrite={false}
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/** Gentle pointer parallax — the particles are ambient, so nothing misaligns. */
function Rig() {
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const p = state.pointer;
    target.set(p.x * 0.55, p.y * 0.4, 6.4);
    state.camera.position.lerp(target, Math.min(1, dt * 1.6));
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export interface HeroCanvasProps {
  scroll: { current: number };
  quality?: "high" | "low";
}

/**
 * The hero's atmospheric layer: a genuine Three.js particle field with
 * pointer parallax. The plated food, gold rings and steam are rendered in
 * the DOM so the transparent drumette asset keeps its alpha and the steam
 * stays perfectly aligned to the food at every size.
 */
export default function HeroScene3D({ quality = "high" }: HeroCanvasProps) {
  const low = quality === "low";
  return (
    <Canvas
      dpr={[1, low ? 1.3 : 1.8]}
      camera={{ position: [0, 0, 6.4], fov: 42 }}
      gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <GoldenParticles count={low ? 90 : 240} />
      <Rig />
    </Canvas>
  );
}
