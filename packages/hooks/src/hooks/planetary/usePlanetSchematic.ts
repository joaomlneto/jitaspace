"use client";

import type { Localized, SdePlanetSchematic } from "../../sde";
import { useSdeRecord, useSdeRecords } from "../../sde";

/**
 * A planetary-industry schematic from the SDE: its name, how long a run takes
 * (`cycleTime`, in seconds), and the types it consumes and produces.
 */
export type PlanetSchematic = Localized<SdePlanetSchematic>;

/** A planetary-industry schematic. */
export const usePlanetSchematic = (schematicId?: number) =>
  useSdeRecord("planetSchematics", schematicId);

/** Several schematics at once, keyed by schematic id. See `useSdeRecords`. */
export const usePlanetSchematics = (schematicIds: readonly number[]) =>
  useSdeRecords("planetSchematics", schematicIds);
