"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import type {
  BodyInput,
  HoverKind,
  HoverTarget,
  LayoutMode,
  PlanetInput,
  StarInput,
} from "./layout";
import {
  LAYOUT_MODES,
  MOON_COLOR,
  PLANET_COLORS,
  STAR_COLOR,
  STARGATE_COLOR,
  STATION_COLOR,
} from "./layout";
import SolarSystemScene from "./SolarSystemScene";

export interface SolarSystemMapProps {
  /** The system's star, with its real radius. */
  star: StarInput;
  /** Planets with their real position, radius and moons. */
  planets: PlanetInput[];
  /** Stations with their real position (assigned to their nearest planet). */
  stations: BodyInput[];
  /** Stargates with their real position. */
  stargates: BodyInput[];
  /** Height of the map. Defaults to 460. */
  height?: number | string;
  /** Initial layout mode. Defaults to "realistic". */
  defaultMode?: LayoutMode;
  /**
   * Renders the label shown while hovering a body. Receives the body's kind
   * and id so the host application can resolve names however it likes.
   */
  renderLabel?: (target: { kind: HoverKind; id: number }) => ReactNode;
  /** Show the colour legend overlay. Defaults to true. */
  showLegend?: boolean;
  /** Slowly auto-rotate the camera (pauses while hovering). Defaults to false. */
  autoRotate?: boolean;
  /** Extra styles merged into the container element. */
  style?: CSSProperties;
}

const labelStyle: CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  zIndex: 2,
  padding: "2px 8px",
  borderRadius: 4,
  background: "rgba(8, 12, 20, 0.88)",
  border: "1px solid rgba(120, 150, 180, 0.4)",
  color: "#dbe6f0",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
  letterSpacing: "0.02em",
  transform: "translateY(-50%)",
};

const overlayTextStyle: CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  zIndex: 2,
  color: "rgba(219, 230, 240, 0.65)",
  fontSize: 11,
  letterSpacing: "0.02em",
};

const LEGEND: { color: string; label: string }[] = [
  { color: STAR_COLOR, label: "Star" },
  { color: PLANET_COLORS[0], label: "Planet" },
  { color: MOON_COLOR, label: "Moon" },
  { color: STATION_COLOR, label: "Station" },
  { color: STARGATE_COLOR, label: "Stargate" },
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SolarSystemMap({
  star,
  planets,
  stations,
  stargates,
  height = 460,
  defaultMode = "realistic",
  renderLabel,
  showLegend = true,
  autoRotate = false,
  style,
}: Readonly<SolarSystemMapProps>) {
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const [mode, setMode] = useState<LayoutMode>(defaultMode);

  return (
    <div
      style={{
        position: "relative",
        height,
        overflow: "hidden",
        borderRadius: 6,
        backgroundColor: "#05070d",
        border: "1px solid rgba(108, 132, 151, 0.28)",
        ...style,
      }}
    >
      <SolarSystemScene
        star={star}
        planets={planets}
        stations={stations}
        stargates={stargates}
        mode={mode}
        autoRotate={autoRotate}
        hover={hover}
        setHover={setHover}
      />

      {hover && (
        <div style={{ ...labelStyle, left: hover.x + 14, top: hover.y }}>
          {renderLabel?.({ kind: hover.kind, id: hover.id }) ?? (
            <>
              {capitalize(hover.kind)} {hover.id}
            </>
          )}
        </div>
      )}

      {/* Layout-mode selector */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          zIndex: 3,
          display: "flex",
          gap: 2,
          padding: 2,
          borderRadius: 5,
          background: "rgba(8, 12, 20, 0.82)",
          border: "1px solid rgba(108, 132, 151, 0.28)",
        }}
      >
        {LAYOUT_MODES.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(option.value)}
              style={{
                cursor: "pointer",
                padding: "3px 9px",
                borderRadius: 3,
                border: "none",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: active ? "#eaf8fc" : "rgba(219, 230, 240, 0.7)",
                background: active ? "rgba(53, 148, 157, 0.85)" : "transparent",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {showLegend && (
        <div
          style={{
            ...overlayTextStyle,
            left: 12,
            bottom: 8,
            display: "flex",
            gap: 12,
          }}
        >
          {LEGEND.map((item) => (
            <span
              key={item.label}
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: item.color,
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}

      <div style={{ ...overlayTextStyle, right: 12, top: 8 }}>
        Drag to rotate · scroll to zoom · hover for names
      </div>
    </div>
  );
}
