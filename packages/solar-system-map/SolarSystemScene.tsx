"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { ComponentRef } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
  Vec3,
} from "./layout";
import {
  focusDistance,
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

/** World point + direction + distance the camera should ease toward. */
interface FocusTarget {
  position: Vec3;
  dir: Vec3;
  distance: number;
}

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;
type FocusHandler = (e: ThreeEvent<MouseEvent>, size: number) => void;

function pointerXY(e: ThreeEvent<PointerEvent>) {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}

/** Build a focus target from a click on a body's mesh. */
function focusFromEvent(
  e: ThreeEvent<MouseEvent>,
  size: number,
  extent: number,
): FocusTarget {
  const position = e.object.getWorldPosition(new THREE.Vector3());
  const dir = e.camera.position.clone().sub(position);
  if (dir.lengthSq() < 1e-9) dir.set(0, 0.6, 1);
  dir.normalize();
  return {
    position: [position.x, position.y, position.z],
    dir: [dir.x, dir.y, dir.z],
    distance: focusDistance(size, extent),
  };
}

/** Eases the OrbitControls target + camera toward the selected body, then releases. */
function CameraFocus({
  focus,
  controlsRef,
  onArrived,
}: Readonly<{
  focus: FocusTarget | null;
  controlsRef: { current: OrbitControlsRef | null };
  onArrived: () => void;
}>) {
  const camera = useThree((state) => state.camera);
  const target = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || !focus) return;
    target.current.set(focus.position[0], focus.position[1], focus.position[2]);
    desired.current.set(
      focus.position[0] + focus.dir[0] * focus.distance,
      focus.position[1] + focus.dir[1] * focus.distance,
      focus.position[2] + focus.dir[2] * focus.distance,
    );
    controls.target.lerp(target.current, 0.14);
    camera.position.lerp(desired.current, 0.14);
    controls.update();
    if (camera.position.distanceTo(desired.current) < focus.distance * 0.03) {
      onArrived();
    }
  });
  return null;
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
  onFocus,
}: Readonly<{
  star: PlacedStar;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
  onFocus: FocusHandler;
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
        onClick={(e) => {
          e.stopPropagation();
          onFocus(e, size);
        }}
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
  onFocus,
}: Readonly<{
  satellite: PlacedSatellite;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
  onFocus: FocusHandler;
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
      onClick={(e) => {
        e.stopPropagation();
        onFocus(e, size);
      }}
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
  onFocus,
}: Readonly<{
  planet: PlacedPlanet;
  flat: boolean;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
  onFocus: FocusHandler;
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
          onClick={(e) => {
            e.stopPropagation();
            onFocus(e, planet.size);
          }}
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
            onFocus={onFocus}
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
  onFocus,
}: Readonly<{
  gate: PlacedStargate;
  hover: HoverTarget | null;
  setHover: (hover: HoverTarget | null) => void;
  onFocus: FocusHandler;
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
      onClick={(e) => {
        e.stopPropagation();
        onFocus(e, gate.size);
      }}
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

  const controlsRef = useRef<OrbitControlsRef>(null);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const handleFocus = useCallback<FocusHandler>(
    (e, size) => setFocus(focusFromEvent(e, size, layout.extent)),
    [layout.extent],
  );
  const clearFocus = useCallback(() => setFocus(null), []);

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
      <Star
        star={layout.star}
        hover={hover}
        setHover={setHover}
        onFocus={handleFocus}
      />
      {layout.planets.map((planet) => (
        <PlanetBody
          key={planet.id}
          planet={planet}
          flat={layout.flat}
          hover={hover}
          setHover={setHover}
          onFocus={handleFocus}
        />
      ))}
      {layout.stargates.map((gate) => (
        <StargateMarker
          key={gate.id}
          gate={gate}
          hover={hover}
          setHover={setHover}
          onFocus={handleFocus}
        />
      ))}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.2}
        maxDistance={camDistance * 2.4}
        autoRotate={autoRotate && !hover && !focus}
        autoRotateSpeed={0.25}
      />
      <CameraFocus
        focus={focus}
        controlsRef={controlsRef}
        onArrived={clearFocus}
      />
    </Canvas>
  );
}
