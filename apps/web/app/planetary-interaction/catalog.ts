import type {
  PiCatalog,
  PiSchematic,
} from "~/components/PlanetaryInteraction/catalog";
import {
  commodityTiers,
  PI_PIN_CATEGORY_ID,
} from "~/components/PlanetaryInteraction/catalog";
import { prisma } from "~/lib/db";
import { cacheSdeRead } from "~/lib/sdeCache";

/**
 * Every schematic, and the name and group of every commodity and pin type, for
 * the static PI pages.
 *
 * Argument-free, so the build prerenders it into the pages' HTML; SDE-only, so
 * it is kept until the next ingest. Deliberately uncaught: see CLAUDE.md →
 * "Never catch a database error inside a `"use cache"` scope".
 */
export async function readPiCatalog(): Promise<PiCatalog> {
  "use cache";
  cacheSdeRead();

  const rows = await prisma.planetSchematic.findMany({
    where: { isDeleted: false },
    select: {
      planetSchematicId: true,
      name: true,
      cycleTime: true,
      types: {
        where: { isDeleted: false },
        select: { typeId: true, isInput: true, quantity: true },
        orderBy: { typeId: "asc" },
      },
      pins: {
        where: { isDeleted: false },
        select: { pinTypeId: true },
        orderBy: { pinTypeId: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const schematics: PiSchematic[] = rows.map((row) => {
    const output = row.types.find((type) => !type.isInput);
    return {
      schematicId: row.planetSchematicId,
      name: row.name,
      cycleTime: row.cycleTime,
      inputs: row.types
        .filter((type) => type.isInput)
        .map(({ typeId, quantity }) => ({ typeId, quantity })),
      output: output
        ? { typeId: output.typeId, quantity: output.quantity }
        : null,
      pinTypeIds: row.pins.map((pin) => pin.pinTypeId),
    };
  });

  const commodityIds = [
    ...new Set(rows.flatMap((row) => row.types.map((type) => type.typeId))),
  ];
  const types = await prisma.type.findMany({
    where: {
      OR: [
        { typeId: { in: commodityIds } },
        { group: { categoryId: PI_PIN_CATEGORY_ID }, published: true },
      ],
    },
    select: {
      typeId: true,
      name: true,
      groupId: true,
      group: { select: { name: true } },
    },
  });

  const tiers = commodityTiers(schematics);
  return {
    schematics,
    types: Object.fromEntries(
      types.map((type) => [
        type.typeId,
        {
          typeId: type.typeId,
          name: type.name,
          groupId: type.groupId,
          groupName: type.group.name,
          tier: tiers.get(type.typeId) ?? null,
        },
      ]),
    ),
  };
}
