"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";

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
  partitionStations,
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
  /** Initial layout mode. Defaults to "compressed" (readable at a glance). */
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
  /**
   * Render the visually-hidden text alternative — a nested list of every body
   * the canvas draws, so assistive technology can read the system instead of
   * meeting an anonymous `<canvas>`. Defaults to true and is never visible on
   * screen; turn it off only when the host page already exposes the same
   * bodies accessibly and would otherwise duplicate them.
   */
  describeContents?: boolean;
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

/**
 * Takes the element out of the visual flow without taking it out of the
 * accessibility tree. `display: none`, `visibility: hidden` and the `hidden`
 * attribute would all prune it from that tree as well — the opposite of the
 * point here — so it is instead clipped to a 1x1 box that paints nothing.
 */
const visuallyHiddenStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
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

/**
 * A body's display name: whatever the host resolves through `renderLabel`,
 * falling back to the capitalised kind plus the id. Shared by the hover label
 * and the text alternative so the two can never drift apart.
 */
function bodyLabel(
  kind: HoverKind,
  id: number,
  renderLabel: SolarSystemMapProps["renderLabel"],
): ReactNode {
  return renderLabel?.({ kind, id }) ?? `${capitalize(kind)} ${id}`;
}

/** One entry of the text alternative: "Planet: Nakugard I". */
function BodyEntry({
  kind,
  id,
  renderLabel,
  children,
}: Readonly<{
  kind: HoverKind;
  id: number;
  renderLabel: SolarSystemMapProps["renderLabel"];
  /** Nested list of this body's own bodies, if it has any. */
  children?: ReactNode;
}>) {
  return (
    <li>
      {capitalize(kind)}: {bodyLabel(kind, id, renderLabel)}
      {children}
    </li>
  );
}

export function SolarSystemMap({
  star,
  planets,
  stations,
  stargates,
  height = 460,
  defaultMode = "compressed",
  renderLabel,
  showLegend = true,
  autoRotate = false,
  describeContents = true,
  style,
}: Readonly<SolarSystemMapProps>) {
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const [mode, setMode] = useState<LayoutMode>(defaultMode);
  // Group stations exactly the way the scene does, so the text alternative
  // describes the same hierarchy a sighted user sees.
  const stationGroups = useMemo(
    () => partitionStations(stations, planets),
    [stations, planets],
  );

  return (
    <div
      role="region"
      aria-label="Solar system map"
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
          {bodyLabel(hover.kind, hover.id, renderLabel)}
        </div>
      )}

      {/* Layout-mode selector */}
      <div
        role="group"
        aria-label="Layout mode"
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

      {/*
        Every affordance listed here is a pointer gesture, so it is hidden from
        assistive technology: there is nothing for a screen-reader user to act
        on, and the names "hover for names" points at are read from the text
        alternative below instead.
      */}
      <div
        aria-hidden="true"
        style={{ ...overlayTextStyle, right: 12, top: 8 }}
      >
        Drag to rotate · scroll to zoom · click to focus · hover for names
      </div>

      {/*
        Text alternative for the canvas: the same bodies, as real semantic DOM.
        The nesting mirrors the system — a planet's moons and stations sit in a
        list inside that planet's entry — and the whole thing is visually
        hidden rather than removed, so it costs no pixels but is fully
        available to screen readers.
      */}
      {describeContents && (
        <ul aria-label="Solar system contents" style={visuallyHiddenStyle}>
          <BodyEntry kind="star" id={star.id} renderLabel={renderLabel} />

          {planets.map((planet) => {
            const satellites: { kind: HoverKind; id: number }[] = [
              ...planet.moons.map((moon) => ({
                kind: "moon" as const,
                id: moon.id,
              })),
              ...(stationGroups.byPlanet.get(planet.id) ?? []).map(
                (station) => ({ kind: "station" as const, id: station.id }),
              ),
            ];
            return (
              <BodyEntry
                key={planet.id}
                kind="planet"
                id={planet.id}
                renderLabel={renderLabel}
              >
                {satellites.length > 0 && (
                  <ul>
                    {satellites.map((satellite) => (
                      <BodyEntry
                        key={`${satellite.kind}-${satellite.id}`}
                        kind={satellite.kind}
                        id={satellite.id}
                        renderLabel={renderLabel}
                      />
                    ))}
                  </ul>
                )}
              </BodyEntry>
            );
          })}

          {stationGroups.orphans.map((station) => (
            <BodyEntry
              key={station.id}
              kind="station"
              id={station.id}
              renderLabel={renderLabel}
            />
          ))}

          {stargates.map((gate) => (
            <BodyEntry
              key={gate.id}
              kind="stargate"
              id={gate.id}
              renderLabel={renderLabel}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
