import type { MercenaryTacticalOperationKind } from "~/components/MercenaryTacticalOperations";
import { prisma } from "~/lib/db";
import { cacheSdeRead } from "~/lib/sdeCache";

/**
 * What the SDE says about each kind of Mercenary Tactical Operation: its name,
 * what it asks of the pilot, and what completing it does to the den.
 *
 * ESI describes an operation by its dungeon alone, and the SDE keys
 * mercenaryTacticalOperations.yaml by that same dungeon id, so this is the
 * lookup that turns ESI's ids into something a player recognises.
 *
 * Deliberately uncaught, so a database failure fails the build or the
 * revalidation instead of caching a page that names nothing. See CLAUDE.md →
 * "Never catch a database error inside a `"use cache"` scope".
 */
export async function readMercenaryTacticalOperationKinds(): Promise<
  MercenaryTacticalOperationKind[]
> {
  "use cache";
  cacheSdeRead();
  return prisma.mercenaryTacticalOperation.findMany({
    select: {
      dungeonId: true,
      name: true,
      description: true,
      anarchyImpact: true,
      developmentImpact: true,
      infomorphBonus: true,
    },
    where: { isDeleted: false },
    orderBy: { mercenaryTacticalOperationId: "asc" },
  });
}
