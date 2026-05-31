"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { HoverTarget, ScenePlanet } from "./layout";
import {
  buildSystemLayout,
  MOON_COLOR,
  moonLayout,
  ringMarkerPosition,
  STAR_COLOR,
  STAR_RADIUS,
  STARGATE_COLOR,
  STATION_COLOR,
} from "./layout";

export interface SolarSystemSceneProps {
  planets: ScenePlanet[];
  stationIds: number[];
  stargateIds: number[];
  autoRotate: boolean;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}

function pointerXY(e: ThreeEvent<PointerEvent>) {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}

function OrbitPath({ radius }: Readonly<{ radius: number }>) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.012, radius + 0.012, 128]} />
      <meshBasicMaterial
        color="#2b3b52"
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Star() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[STAR_RADIUS, 48, 48]} />
        <meshBasicMaterial color={STAR_COLOR} />
      </mesh>
      <mesh>
        <sphereGeometry args={[STAR_RADIUS * 1.55, 32, 32]} />
        <meshBasicMaterial color="#ffb648" transparent opacity={0.16} />
      </mesh>
      <pointLight intensity={2.4} decay={0} color="#fff1d4" />
    </group>
  );
}

function Belt({ radius, seed }: Readonly<{ radius: number; seed: number }>) {
  const positions = useMemo(() => {
    const count = 160;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (seed % 7);
      const jitter = Math.abs((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1);
      const r = radius + jitter * 0.28;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 1] = ((Math.sin(i * 78.233 + seed) * 1000) % 1) * 0.08;
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    return arr;
  }, [radius, seed]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        color="#b39b6e"
        transparent
        opacity={0.85}
      />
    </points>
  );
}

function Moon({
  id,
  index,
  planetSize,
  hover,
  setHover,
}: Readonly<{
  id: number;
  index: number;
  planetSize: number;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}>) {
  const ref = useRef<THREE.Group>(null);
  const { orbit, speed } = moonLayout(planetSize, index);
  const phase = ((id % 360) * Math.PI) / 180;
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed;
  });
  const isHovered = hover?.kind === "moon" && hover.id === id;
  return (
    <group ref={ref} rotation={[0, phase, 0]}>
      <mesh
        position={[orbit, 0, 0]}
        scale={isHovered ? 1.6 : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover({ kind: "moon", id, ...pointerXY(e) });
        }}
        onPointerOut={() => setHover(null)}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={MOON_COLOR} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Planet({
  planet,
  orbit,
  size,
  color,
  speed,
  phase,
  hover,
  setHover,
}: Readonly<{
  planet: ScenePlanet;
  orbit: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}>) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed;
  });
  const isHovered = hover?.kind === "planet" && hover.id === planet.planetId;
  return (
    <group>
      <OrbitPath radius={orbit} />
      <group ref={ref} rotation={[0, phase, 0]}>
        <group position={[orbit, 0, 0]}>
          <mesh
            scale={isHovered ? 1.25 : 1}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover({
                kind: "planet",
                id: planet.planetId,
                ...pointerXY(e),
              });
            }}
            onPointerOut={() => setHover(null)}
          >
            <sphereGeometry args={[size, 32, 32]} />
            <meshStandardMaterial
              color={color}
              roughness={0.78}
              metalness={0.05}
              emissive={color}
              emissiveIntensity={isHovered ? 0.35 : 0}
            />
          </mesh>
          {planet.moonIds.map((moonId, i) => (
            <Moon
              key={moonId}
              id={moonId}
              index={i}
              planetSize={size}
              hover={hover}
              setHover={setHover}
            />
          ))}
          {planet.beltIds.length > 0 && (
            <Belt radius={size * 2.1} seed={planet.planetId} />
          )}
        </group>
      </group>
    </group>
  );
}

function Marker({
  id,
  kind,
  color,
  position,
  hover,
  setHover,
}: Readonly<{
  id: number;
  kind: "station" | "stargate";
  color: string;
  position: [number, number, number];
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}>) {
  const isHovered = hover?.kind === kind && hover.id === id;
  return (
    <mesh
      position={position}
      scale={isHovered ? 1.5 : 1}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover({ kind, id, ...pointerXY(e) });
      }}
      onPointerOut={() => setHover(null)}
    >
      {kind === "stargate" ? (
        <octahedronGeometry args={[0.34, 0]} />
      ) : (
        <boxGeometry args={[0.34, 0.34, 0.34]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isHovered ? 0.9 : 0.45}
        roughness={0.4}
      />
    </mesh>
  );
}

function RingMarkers({
  ids,
  radius,
  kind,
  color,
  hover,
  setHover,
}: Readonly<{
  ids: number[];
  radius: number;
  kind: "station" | "stargate";
  color: string;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}>) {
  return (
    <group>
      {ids.map((id, i) => (
        <Marker
          key={id}
          id={id}
          kind={kind}
          color={color}
          position={ringMarkerPosition(i, ids.length, radius)}
          hover={hover}
          setHover={setHover}
        />
      ))}
    </group>
  );
}

export default function SolarSystemScene({
  planets,
  stationIds,
  stargateIds,
  autoRotate,
  hover,
  setHover,
}: Readonly<SolarSystemSceneProps>) {
  const layout = useMemo(() => buildSystemLayout(planets), [planets]);
  const { stationRing, stargateRing, camDistance } = layout;

  return (
    <Canvas
      camera={{ position: [0, camDistance * 0.6, camDistance], fov: 50 }}
      dpr={[1, 2]}
      onPointerMissed={() => setHover(null)}
    >
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#05070d", camDistance, camDistance * 3]} />
      <ambientLight intensity={0.4} />
      <Stars radius={140} depth={50} count={2200} factor={4} fade speed={0.4} />
      <Star />
      {layout.planets.map((p) => (
        <Planet
          key={p.planet.planetId}
          planet={p.planet}
          orbit={p.orbit}
          size={p.size}
          color={p.color}
          speed={p.speed}
          phase={p.phase}
          hover={hover}
          setHover={setHover}
        />
      ))}
      <RingMarkers
        ids={stationIds}
        radius={stationRing}
        kind="station"
        color={STATION_COLOR}
        hover={hover}
        setHover={setHover}
      />
      <RingMarkers
        ids={stargateIds}
        radius={stargateRing}
        kind="stargate"
        color={STARGATE_COLOR}
        hover={hover}
        setHover={setHover}
      />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={camDistance * 2.4}
        autoRotate={autoRotate && !hover}
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
}
