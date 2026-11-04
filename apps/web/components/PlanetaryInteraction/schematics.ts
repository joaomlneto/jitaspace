import type { PiCatalog, PiSchematic } from "./catalog";
import { perHour, schematicsByInput } from "./catalog";

/** A schematic with what the browser shows beside it. */
export interface SchematicEntry extends PiSchematic {
  tier: number | null;
  /** Other schematics that consume this one's output. */
  usedBy: PiSchematic[];
  outputPerHour: number;
}

export function schematicEntries(catalog: PiCatalog): SchematicEntry[] {
  const byInput = schematicsByInput(catalog.schematics);
  return catalog.schematics.map((schematic) => ({
    ...schematic,
    tier: schematic.output
      ? (catalog.types[schematic.output.typeId]?.tier ?? null)
      : null,
    usedBy: schematic.output
      ? (byInput.get(schematic.output.typeId) ?? [])
      : [],
    outputPerHour: schematic.output
      ? perHour(schematic.output.quantity, schematic.cycleTime)
      : 0,
  }));
}

/** Whether a schematic's name, or a commodity it uses or makes, contains `query`. */
export function schematicMatches(
  schematic: PiSchematic,
  catalog: PiCatalog,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const names = [
    schematic.name,
    ...schematic.inputs.map((input) => catalog.types[input.typeId]?.name),
    schematic.output ? catalog.types[schematic.output.typeId]?.name : undefined,
  ];
  return names.some((name) => name?.toLowerCase().includes(needle));
}

/** "1 h", "30 min", "2 h 30 min". */
export function formatCycleTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} s`;
}

export const schematicAnchorId = (schematicId: number) =>
  `schematic-${schematicId}`;
