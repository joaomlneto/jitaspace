/**
 * Writes a player-facing name and description for each dogma effect category
 * into `DogmaEffectCategory.customName` and `.customDescription`. CCP ships
 * only internal names (`dgmEffPassive`), and the SDE has no category table at
 * all — the rows come from Hoboleaks. There are eight, so the text is written
 * here by hand rather than generated.
 *
 *   pnpm --filter @jitaspace/background-jobs describe-dogma-effect-categories [write]
 *
 * Without `write` it only prints what would change.
 *
 * The descriptions were written from the effects each category holds and the
 * types that carry them, under the rules the effect descriptions follow: no
 * values, and no individual ships, modules or NPCs — kinds of item only.
 */
import { prisma } from "../db";

const CATEGORIES: Record<number, { name: string; description: string }> = {
  0: {
    name: "Passive",
    description:
      "Always applies while the item is where it belongs: a trained skill, a plugged-in implant or a booster in effect, a ship's hull, a fitted rig or subsystem, or a loaded charge. Nothing turns it on or off. This category also holds the markers that say which slot a module fits.",
  },
  1: {
    name: "Activated",
    description:
      "Applies while the item is switched on and cycling, and acts on the item or its own ship: repairers and boosters, propulsion modules, active hardeners, cloaks, jump drives, anchoring. Cycles usually cost capacitor or fuel. Bringing a module online is itself an activated effect.",
  },
  2: {
    name: "Targeted",
    description:
      "Applies while the item is switched on against a locked target, and acts on that target rather than on its own ship: weapons, electronic warfare, remote repairs and capacitor transfers, mining lasers, salvagers, scanners, tractor beams.",
  },
  3: {
    name: "Area of effect",
    description:
      "Hits everything in range of its source at once, with no target lock. Rarely used: player smartbombs and doomsday bursts are Activated effects instead.",
  },
  4: {
    name: "Online",
    description:
      "Applies while a module is online, without activating it: armor plates, damage and rate-of-fire modules, power and capacitor upgrades, sensor and tracking enhancers. It stops when the module goes offline, and needs no capacitor per cycle.",
  },
  5: {
    name: "Overheated",
    description:
      "An extra bonus on top of a module's Activated or Targeted effect, for as long as the module is overheated. Overheating damages the module, and neighbouring modules in the same rack, with heat.",
  },
  6: {
    name: "Site environment",
    description:
      "Applies to ships inside one deadspace site, from a beacon placed in it. It can help or hinder whoever enters, and stops when the ship leaves the site.",
  },
  7: {
    name: "System-wide",
    description:
      "Applies to every ship in a solar system, from an effect beacon there: wormhole phenomena, incursions, faction warfare headquarters, Triglavian and Pochven effects, metaliminal storms, and similar events.",
  },
};

const write = process.argv.slice(2).includes("write");

const rows = await prisma.dogmaEffectCategory.findMany({
  select: {
    effectCategoryId: true,
    name: true,
    customName: true,
    customDescription: true,
  },
  orderBy: { effectCategoryId: "asc" },
});

const known = new Set(rows.map((row) => row.effectCategoryId));
for (const id of Object.keys(CATEGORIES).map(Number)) {
  if (!known.has(id)) console.warn(`Category ${id} is not in the database.`);
}

const changes = rows.flatMap((row) => {
  const wanted = CATEGORIES[row.effectCategoryId];
  if (!wanted) {
    console.warn(
      `Category ${row.effectCategoryId} (${row.name}) has no text here.`,
    );
    return [];
  }
  if (
    row.customName === wanted.name &&
    row.customDescription === wanted.description
  ) {
    return [];
  }
  return [{ id: row.effectCategoryId, from: row.name, ...wanted }];
});

for (const change of changes) {
  console.log(`${change.id} ${change.from} → ${change.name}`);
}
console.log(
  `${changes.length} of ${rows.length} categories ${write ? "updated" : "would change (pass write to apply)"}.`,
);

if (write) {
  for (const change of changes) {
    await prisma.dogmaEffectCategory.update({
      where: { effectCategoryId: change.id },
      data: { customName: change.name, customDescription: change.description },
    });
  }
}

await prisma.$disconnect();
