import { prisma } from "~/lib/db";

/**
 * Display names for the given type ids, from our SDE tables, in one query —
 * the change lists' names arrive with the changes, rather than each row fetching
 * its own (one server action per row, which Next runs one at a time: a list of a
 * thousand types took minutes to finish naming). Prisma splits an `in` list past
 * the driver's bind-value limit itself, so a years-wide comparison is still one
 * call here.
 *
 * Blank names are left out, like unknown ids (a type newer than the ingested
 * SDE — history is decoded from the game client): either way the row falls back
 * to its #id.
 *
 * Throws on failure, so that inside a `"use cache"` scope (the build page's read)
 * an outage fails the render instead of caching a day of missing names.
 */
export async function readTypeNames(
  typeIds: readonly number[],
): Promise<Record<number, string>> {
  if (typeIds.length === 0) return {};
  const rows = await prisma.type.findMany({
    select: { typeId: true, name: true },
    where: { typeId: { in: [...typeIds] } },
  });
  const names: Record<number, string> = {};
  for (const { typeId, name } of rows) {
    if (name.trim() !== "") names[typeId] = name;
  }
  return names;
}
