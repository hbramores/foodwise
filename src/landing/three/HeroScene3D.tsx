import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Image as Photo } from "@react-three/drei";
import * as THREE from "three";
import { HERO_IMAGE, LANDING_DISHES } from "../data";

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

function GoldenParticles({ count }: { count: number }) {
  const texture = useDotTexture();
  const group = useRef<THREE.Group>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    return arr;
  }, [count]);

  useFrame((state, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.02;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.35;
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

/** A matching pair of metallic rings: a decorative 3D plate rim. */
function PlateRim() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_s, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.12;
  });
  return (
    <group ref={ref} position={[0, 0, -0.35]}>
      <mesh>
        <torusGeometry args={[2.05, 0.03, 20, 128]} />
        <meshStandardMaterial color="#f2d454" metalness={1} roughness={0.22} envMapIntensity={1.2} />
      </mesh>
      <mesh>
        <torusGeometry args={[2.32, 0.011, 16, 128]} />
        <meshStandardMaterial color="#e6c547" metalness={1} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** The plated hero photograph, floating and reacting to the pointer. */
function HeroDish({ scroll }: { scroll: { current: number } }) {
  const tilt = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const g = tilt.current;
    if (!g) return;
    const p = state.pointer;
    const s = scroll.current;
    const targetY = p.x * 0.34 + Math.sin(state.clock.elapsedTime * 0.35) * 0.06;
    const targetX = -p.y * 0.24 + s * 0.9;
    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, dt * 3);
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, dt * 3);
  });

  return (
    <group ref={tilt} position={[0, 0.1, 0]}>
      <Float speed={1.1} rotationIntensity={0.16} floatIntensity={0.7}>
        <Photo
          url={HERO_IMAGE}
          scale={[2.8, 2.8]}
          radius={0.2}
          transparent
          toneMapped={false}
        />
        <PlateRim />
      </Float>
    </group>
  );
}

/** Small floating ingredient photographs for depth. */
function IngredientChips() {
  const group = useRef<THREE.Group>(null);
  const chips = useMemo(
    () => LANDING_DISHES.filter((d) => d.id !== "fried-chicken").slice(0, 5),
    []
  );
  useFrame((_s, dt) => {
    if (group.current) group.current.rotation.y -= dt * 0.04;
  });

  const layout: Array<[number, number, number, number]> = [
    [-2.25, 1.15, -1.5, 0.8],
    [2.3, 0.95, -1.6, 0.86],
    [-2.4, -1.1, -1.4, 0.72],
    [2.35, -1.2, -1.5, 0.76],
    [0.05, 1.95, -2.1, 0.6],
  ];

  return (
    <group ref={group} position={[0, 0, -1.2]}>
      {chips.map((dish, i) => {
        const [x, y, z, s] = layout[i];
        return (
          <Float key={dish.id} speed={0.9 + i * 0.12} rotationIntensity={0.25} floatIntensity={1.1}>
            <Photo
              url={dish.image}
              position={[x, y, z]}
              scale={[s, s]}
              radius={0.14}
              transparent
              toneMapped={false}
            />
          </Float>
        );
      })}
    </group>
  );
}

/** Scales and lifts the arrangement so it frames well in any canvas shape. */
function Content({ scroll }: { scroll: { current: number } }) {
  const { viewport } = useThree();
  const scale = Math.min(1, Math.max(0.46, viewport.width / 5.4));
  return (
    <group scale={scale} position={[0, 0.05, 0]}>
      <HeroDish scroll={scroll} />
      <IngredientChips />
    </group>
  );
}

/** Camera dolly/heights driven by pointer and scroll progress. */
function Rig({ scroll }: { scroll: { current: number } }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const s = scroll.current;
    const p = state.pointer;
    target.set(p.x * 0.5, p.y * 0.32 + s * 0.5, 6.4 - s * 2.7);
    camera.position.lerp(target, Math.min(1, dt * 2.2));
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export interface HeroCanvasProps {
  scroll: { current: number };
  quality?: "high" | "low";
}

/**
 * Genuine interactive Three.js / React Three Fiber scene:
 * floating dish photography on a metallic gold plate rim, drifting golden
 * dust, real lights, and a camera that responds to pointer + scroll.
 */
export default function HeroScene3D({ scroll, quality = "high" }: HeroCanvasProps) {
  const low = quality === "low";
  return (
    <Canvas
      dpr={[1, low ? 1.3 : 1.8]}
      camera={{ position: [0, 0, 6.4], fov: 42 }}
      gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 6]} intensity={1.5} color="#fff3d0" />
      <pointLight position={[-5, -2, 3]} intensity={22} color="#e6c547" distance={16} />
      <pointLight position={[5, 3, -4]} intensity={16} color="#59a04a" distance={18} />

      <Suspense fallback={null}>
        <Content scroll={scroll} />
      </Suspense>

      <GoldenParticles count={low ? 90 : 260} />
      <Rig scroll={scroll} />
    </Canvas>
  );
}
