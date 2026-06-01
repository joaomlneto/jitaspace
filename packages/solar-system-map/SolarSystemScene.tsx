"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import type {
  BodyInput,
  HoverTarget,
  LayoutMode,
  PlacedPlanet,
  PlacedSatellite,
  PlacedStar,
  PlacedStargate,
  PlanetInput,
  StarInput,
} from "./layout";
import {
  layoutSystem,
  MOON_COLOR,
  STAR_COLOR,
  STARGATE_COLOR,
  STATION_COLOR,
} from "./layout";

export interface SolarSystemSceneProps {
  star: StarInput;
  planets: PlanetInput[];
  stations: BodyInput[];
  stargates: BodyInput[];
  mode: LayoutMode;
  autoRotate: boolean;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}

function pointerXY(e: ThreeEvent<PointerEvent>) {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}

function OrbitRing({ radius }: Readonly<{ radius: number }>) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.015, radius + 0.015, 160]} />
      <meshBasicMaterial
        color="#2b3b52"
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Star({
  star,
  hover,
  setHover,
}: Readonly<{
  star: PlacedStar;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}>) {
  const isHovered = hover?.kind === "star";
  const size = star.size;
  return (
    <group>
      <mesh
        scale={isHovered ? 1.12 : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover({ kind: "star", id: star.id, ...pointerXY(e) });
        }}
        onPointerOut={() => setHover(null)}
      >
        <sphereGeometry args={[size, 48, 48]} />
        <meshBasicMaterial color={STAR_COLOR} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.55, 32, 32]} />
        <meshBasicMaterial color="#ffb648" transparent opacity={0.16} />
      </mesh>
      <pointLight intensity={2.4} decay={0} color="#fff1d4" />
    </group>
  );
}

function Satellite({
  satellite,
  hover,
  setHover,
}: Readonly<{
  satellite: PlacedSatellite;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}>) {
  const { id, kind, position, size } = satellite;
  const isHovered = hover?.kind === kind && hover.id === id;
  const color = kind === "moon" ? MOON_COLOR : STATION_COLOR;
  return (
    <mesh
      position={position}
      scale={isHovered ? 1.7 : 1}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover({ kind, id, ...pointerXY(e) });
      }}
      onPointerOut={() => setHover(null)}
    >
      {kind === "moon" ? (
        <sphereGeometry args={[size, 16, 16]} />
      ) : (
        <boxGeometry args={[size, size, size]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={kind === "station" ? color : "#000000"}
        emissiveIntensity={kind === "station" ? 0.5 : 0}
        roughness={0.85}
      />
    </mesh>
  );
}

function PlanetBody({
  planet,
  flat,
  hover,
  setHover,
}: Readonly<{
  planet: PlacedPlanet;
  flat: boolean;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}>) {
  const isHovered = hover?.kind === "planet" && hover.id === planet.id;
  return (
    <>
      {flat && <OrbitRing radius={planet.orbitRadius} />}
      <group position={planet.position}>
        <mesh
          scale={isHovered ? 1.25 : 1}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover({ kind: "planet", id: planet.id, ...pointerXY(e) });
          }}
          onPointerOut={() => setHover(null)}
        >
          <sphereGeometry args={[planet.size, 32, 32]} />
          <meshStandardMaterial
            color={planet.color}
            roughness={0.78}
            metalness={0.05}
            emissive={planet.color}
            emissiveIntensity={isHovered ? 0.35 : 0}
          />
        </mesh>
        {planet.satellites.map((satellite) => (
          <Satellite
            key={`${satellite.kind}-${satellite.id}`}
            satellite={satellite}
            hover={hover}
            setHover={setHover}
          />
        ))}
      </group>
    </>
  );
}

function StargateMarker({
  gate,
  hover,
  setHover,
}: Readonly<{
  gate: PlacedStargate;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
}>) {
  const isHovered = hover?.kind === "stargate" && hover.id === gate.id;
  return (
    <mesh
      position={gate.position}
      scale={isHovered ? 1.5 : 1}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover({ kind: "stargate", id: gate.id, ...pointerXY(e) });
      }}
      onPointerOut={() => setHover(null)}
    >
      <octahedronGeometry args={[gate.size, 0]} />
      <meshStandardMaterial
        color={STARGATE_COLOR}
        emissive={STARGATE_COLOR}
        emissiveIntensity={isHovered ? 0.9 : 0.45}
        roughness={0.4}
      />
    </mesh>
  );
}

export default function SolarSystemScene({
  star,
  planets,
  stations,
  stargates,
  mode,
  autoRotate,
  hover,
  setHover,
}: Readonly<SolarSystemSceneProps>) {
  const layout = useMemo(
    () => layoutSystem(star, planets, stations, stargates, mode),
    [star, planets, stations, stargates, mode],
  );
  const camDistance = layout.extent * 1.9 + 6;

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
      <Star star={layout.star} hover={hover} setHover={setHover} />
      {layout.planets.map((planet) => (
        <PlanetBody
          key={planet.id}
          planet={planet}
          flat={layout.flat}
          hover={hover}
          setHover={setHover}
        />
      ))}
      {layout.stargates.map((gate) => (
        <StargateMarker
          key={gate.id}
          gate={gate}
          hover={hover}
          setHover={setHover}
        />
      ))}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.2}
        maxDistance={camDistance * 2.4}
        autoRotate={autoRotate && !hover}
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
}
